/**
 * 实例打包服务（P2P 分享专用）
 *
 * 将游戏实例目录打包为 .mcla 压缩包，用于 P2P 分享传输。
 * 包含：
 * - 自动过滤缓存目录（logs、crash-reports 等）
 * - 生成文件元数据（大小、MD5、版本信息）
 * - 临时目录管理，程序退出自动清理
 * - 打包进度回调
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import unzipper from 'unzipper'
import { logger } from '../utils/logger'
import { hashFile } from '../utils/hash'
import { getInstanceById, type Instance } from './instances'

const log = logger.child('instanceSharePack')

export interface PackedInstance {
  instanceId: string
  instanceName: string
  mcVersion: string
  loaderType: string
  loaderVersion: string
  filePath: string
  fileSize: number
  fileMd5: string
  totalChunks: number
  chunkSize: number
  createdAt: number
}

export interface PackProgress {
  stage: 'scanning' | 'packing' | 'hashing' | 'done'
  progress: number
  currentFile?: string
}

export interface UnpackProgress {
  stage: 'verifying' | 'extracting' | 'done'
  progress: number
  currentFile?: string
}

const SHARE_EXCLUDES = [
  'logs',
  'crash-reports',
  'cache',
  '.cache',
  'tmp',
  'temp',
  'screenshots',
  'backups',
  'journeymap/web'
]

const CHUNK_SIZE = 1024 * 1024

let tempShareDir: string | null = null

function getTempShareDir(): string {
  if (!tempShareDir) {
    tempShareDir = path.join(app.getPath('temp'), 'mcla-share')
    try {
      if (!fs.existsSync(tempShareDir)) {
        fs.mkdirSync(tempShareDir, { recursive: true })
      }
    } catch (e) {
      log.warn('Failed to create temp share dir, using fallback', e)
      tempShareDir = app.getPath('temp')
    }
  }
  return tempShareDir
}

export function cleanupTempShareDir(): void {
  try {
    const dir = getTempShareDir()
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        try {
          const filePath = path.join(dir, file)
          fs.unlinkSync(filePath)
        } catch {
          // 忽略删除失败
        }
      }
      log.info('Cleaned up temp share directory')
    }
  } catch (e) {
    log.warn('Failed to cleanup temp share dir', e)
  }
}

export async function packInstanceForShare(
  instanceId: string,
  onProgress?: (progress: PackProgress) => void
): Promise<PackedInstance> {
  log.info('Starting to pack instance for share', { instanceId })

  const instance = getInstanceById(instanceId)
  if (!instance) {
    throw new Error('实例不存在')
  }

  const gameDir = instance.path
  if (!fs.existsSync(gameDir)) {
    throw new Error('实例目录不存在')
  }

  onProgress?.({ stage: 'scanning', progress: 0 })

  const tempDir = getTempShareDir()
  const outputPath = path.join(tempDir, `${instanceId}_${Date.now()}.mcla`)

  let totalFiles = 0
  let packedFiles = 0

  function scanDirectory(dir: string, baseDir: string): string[] {
    const results: string[] = []
    const relative = path.relative(baseDir, dir)

    for (const exclude of SHARE_EXCLUDES) {
      if (relative.startsWith(exclude) || relative.includes(`/${exclude}/`)) {
        return results
      }
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanDirectory(fullPath, baseDir))
        } else if (entry.isFile()) {
          results.push(fullPath)
          totalFiles++
        }
      }
    } catch (e) {
      log.warn('Failed to scan directory', dir, e)
    }
    return results
  }

  const allFiles = scanDirectory(gameDir, gameDir)
  log.info('Scanned files', { count: allFiles.length, instanceId })

  onProgress?.({ stage: 'packing', progress: 0 })

  const archiver = (await import('archiver')).default

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 5 } })

    output.on('close', async () => {
      try {
        onProgress?.({ stage: 'hashing', progress: 90 })

        const fileSize = fs.statSync(outputPath).size
        const fileMd5 = await hashFile(outputPath, 'md5')
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

        const result: PackedInstance = {
          instanceId: instance.id,
          instanceName: instance.name,
          mcVersion: instance.mc_version,
          loaderType: instance.loader_type,
          loaderVersion: instance.loader_version,
          filePath: outputPath,
          fileSize,
          fileMd5,
          totalChunks,
          chunkSize: CHUNK_SIZE,
          createdAt: Date.now()
        }

        onProgress?.({ stage: 'done', progress: 100 })
        log.info('Instance packed successfully', {
          instanceId,
          fileSize,
          totalChunks,
          fileMd5
        })
        resolve(result)
      } catch (e) {
        reject(new Error(`打包后处理失败: ${(e as Error).message}`))
      }
    })

    archive.on('error', (err) => {
      reject(new Error(`打包失败: ${err.message}`))
    })

    archive.on('entry', (entry) => {
      packedFiles++
      if (totalFiles > 0) {
        const progress = Math.min((packedFiles / totalFiles) * 80, 80)
        onProgress?.({ stage: 'packing', progress, currentFile: entry.name })
      }
    })

    archive.pipe(output)

    const manifest = {
      version: 1,
      shareFormat: 'p2p-v1',
      instanceId: instance.id,
      instanceName: instance.name,
      mcVersion: instance.mc_version,
      loaderType: instance.loader_type,
      loaderVersion: instance.loader_version,
      javaPath: instance.java_path,
      jvmArgs: instance.jvm_args,
      minMemory: instance.min_memory,
      maxMemory: instance.max_memory,
      width: instance.width,
      height: instance.height,
      packedAt: Date.now()
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: 'share_manifest.json' })

    for (const filePath of allFiles) {
      const relativePath = path.relative(gameDir, filePath)
      archive.file(filePath, { name: relativePath })
    }

    archive.finalize()
  })
}

export async function unpackSharedInstance(
  archivePath: string,
  targetDir: string,
  expectedMd5?: string,
  onProgress?: (progress: UnpackProgress) => void
): Promise<{
  instanceName: string
  mcVersion: string
  loaderType: string
  loaderVersion: string
  gameDir: string
  manifest: any
}> {
  log.info('Starting to unpack shared instance', { archivePath, targetDir })

  onProgress?.({ stage: 'verifying', progress: 0 })

  if (expectedMd5) {
    const actualMd5 = await hashFile(archivePath, 'md5')
    if (actualMd5.toLowerCase() !== expectedMd5.toLowerCase()) {
      throw new Error('文件校验失败，可能已损坏')
    }
  }

  onProgress?.({ stage: 'verifying', progress: 50 })

  const dir = await unzipper.Open.file(archivePath)

  const manifestEntry = dir.files.find((f: any) => f.path === 'share_manifest.json')
  if (!manifestEntry) {
    throw new Error('不是有效的分享文件（缺少 manifest）')
  }

  const manifestContent = await manifestEntry.buffer()
  const manifest = JSON.parse(manifestContent.toString('utf8'))

  onProgress?.({ stage: 'verifying', progress: 100 })

  const instanceName = `${manifest.instanceName} (分享)`
  const dirName = `shared_${Date.now()}`
  const gameDir = path.join(targetDir, dirName)

  await fs.promises.mkdir(gameDir, { recursive: true })

  const files = dir.files.filter((f: any) => !f.dir && f.path !== 'share_manifest.json')
  const totalFiles = files.length
  let extractedFiles = 0

  onProgress?.({ stage: 'extracting', progress: 0 })

  for (const file of files) {
    const destPath = path.join(gameDir, file.path)
    const destDir = path.dirname(destPath)

    await fs.promises.mkdir(destDir, { recursive: true })

    const content = await file.buffer()
    await fs.promises.writeFile(destPath, content)

    extractedFiles++
    const progress = (extractedFiles / totalFiles) * 100
    onProgress?.({ stage: 'extracting', progress, currentFile: file.path })
  }

  onProgress?.({ stage: 'done', progress: 100 })

  log.info('Shared instance unpacked successfully', {
    instanceName,
    gameDir,
    totalFiles
  })

  return {
    instanceName,
    mcVersion: manifest.mcVersion,
    loaderType: manifest.loaderType,
    loaderVersion: manifest.loaderVersion,
    gameDir,
    manifest
  }
}

export function deletePackedInstance(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      log.info('Deleted packed instance', { filePath })
    }
  } catch (e) {
    log.warn('Failed to delete packed instance', filePath, e)
  }
}

export function getChunk(
  filePath: string,
  chunkIndex: number,
  chunkSize: number = CHUNK_SIZE
): Buffer {
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)

  try {
    const offset = chunkIndex * chunkSize
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)

    if (bytesRead < chunkSize) {
      return buffer.subarray(0, bytesRead)
    }

    return buffer
  } finally {
    fs.closeSync(fd)
  }
}

export function getChunkCount(filePath: string, chunkSize: number = CHUNK_SIZE): number {
  const stats = fs.statSync(filePath)
  return Math.ceil(stats.size / chunkSize)
}
