/**
 * 整合包服务（Modrinth mrpack 兼容格式）
 *
 * 提供：
 *  - 从当前实例（或任意 .minecraft 目录）创建 mrpack 整合包
 *  - 导入 mrpack 整合包为新实例
 *
 * mrpack 格式参考：https://docs.modrinth.com/docs/modpacks/format_definition/
 *  - 根目录包含 modrinth.index.json（清单）
 *  - overrides/ 目录下是自定义文件（mods, config, resourcepacks 等）
 *  - 整体为 ZIP 压缩，后缀 .mrpack
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { logger } from '../utils/logger'
const log = logger.child('Modpack')

// ========== 类型定义 ==========

export interface ModpackManifest {
  formatVersion: 1
  game: 'minecraft'
  versionId: string
  name: string
  summary?: string
  files: ModpackFile[]
  dependencies: {
    minecraft: string
    'fabric-loader'?: string
    forge?: string
    neoforge?: string
    quilt?: string
  }
}

export interface ModpackFile {
  path: string
  hashes: { sha1: string; sha512?: string }
  env?: { client: 'required' | 'optional' | 'unsupported'; server: 'required' | 'optional' | 'unsupported' }
  downloads: string[]
  fileSize: number
}

export interface PackOptions {
  name: string
  version?: string
  summary?: string
  mcVersion: string
  loaderType: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt'
  loaderVersion?: string
  includeMods?: boolean
  includeConfigs?: boolean
  includeResourcePacks?: boolean
  includeShaderPacks?: boolean
  includeSaves?: boolean
  includeOptionsTxt?: boolean
  includeServersDat?: boolean
}

export interface PackProgress {
  stage: 'scanning' | 'adding' | 'finalizing'
  currentFile: string
  progress: number // 0-100
}

export interface ImportResult {
  ok: boolean
  error?: string
  instancePath?: string
  instanceName?: string
  fileCount?: number
}

// ========== 工具函数 ==========

function walkDir(dir: string, baseDir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(full, baseDir, out)
    } else if (entry.isFile()) {
      out.push(path.relative(baseDir, full).replace(/\\/g, '/'))
    }
  }
  return out
}

// ========== 打包：创建 mrpack ==========

/**
 * 将当前实例打包为 mrpack 整合包
 * @param instancePath 实例根目录（.minecraft 目录）
 * @param outputPath 输出文件路径
 * @param options 打包选项
 * @param onProgress 进度回调
 */
export async function packAsMrpack(
  instancePath: string,
  outputPath: string,
  options: PackOptions,
  onProgress?: (p: PackProgress) => void
): Promise<{ ok: boolean; filePath?: string; error?: string; fileCount?: number }> {
  try {
    if (!fs.existsSync(instancePath)) {
      return { ok: false, error: '实例目录不存在: ' + instancePath }
    }

    const name = options.name || 'MCLA-Modpack'
    const version = options.version || '1.0.0'

    // 收集文件（相对于 instancePath）
    const collectList: { relative: string; absolute: string }[] = []

    const pushDir = (dirName: string) => {
      const full = path.join(instancePath, dirName)
      const files = walkDir(full, full)
      for (const f of files) {
        collectList.push({
          relative: `overrides/${dirName}/${f}`,
          absolute: path.join(full, f)
        })
      }
    }

    if (options.includeMods) pushDir('mods')
    if (options.includeConfigs) pushDir('config')
    if (options.includeResourcePacks) pushDir('resourcepacks')
    if (options.includeShaderPacks) pushDir('shaderpacks')
    if (options.includeSaves) pushDir('saves')

    // 单个文件
    const pushFile = (fileName: string) => {
      const full = path.join(instancePath, fileName)
      if (fs.existsSync(full)) {
        collectList.push({
          relative: `overrides/${fileName}`,
          absolute: full
        })
      }
    }
    if (options.includeOptionsTxt) pushFile('options.txt')
    if (options.includeServersDat) pushFile('servers.dat')

    if (collectList.length === 0) {
      return { ok: false, error: '没有可打包的文件，请至少选择一项内容' }
    }

    // 构建 manifest
    const manifest: ModpackManifest = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: version,
      name,
      summary: options.summary || `由 MCLA 自动生成的整合包（${options.mcVersion}）`,
      files: [],
      dependencies: {
        minecraft: options.mcVersion
      }
    }

    // 依赖类型
    if (options.loaderType === 'fabric' && options.loaderVersion) {
      manifest.dependencies['fabric-loader'] = options.loaderVersion
    } else if (options.loaderType === 'forge' && options.loaderVersion) {
      manifest.dependencies.forge = options.loaderVersion
    } else if (options.loaderType === 'neoforge' && options.loaderVersion) {
      manifest.dependencies.neoforge = options.loaderVersion
    } else if (options.loaderType === 'quilt' && options.loaderVersion) {
      manifest.dependencies.quilt = options.loaderVersion
    }

    const archiver = (await import('archiver')).default

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(outputPath)
      const archive = archiver('zip', { zlib: { level: 6 } })

      output.on('close', () => resolve())
      archive.on('error', (err: Error) => reject(err))

      archive.pipe(output)

      // 写入 manifest.json
      archive.append(JSON.stringify(manifest, null, 2), { name: 'modrinth.index.json' })

      // 逐个添加文件
      const total = collectList.length
      let done = 0
      for (const f of collectList) {
        try {
          archive.file(f.absolute, { name: f.relative })
        } catch (e) {
          // 跳过无法读取的文件
        }
        done++
        if (onProgress) {
          onProgress({
            stage: 'adding',
            currentFile: f.relative,
            progress: Math.round((done / total) * 90)
          })
        }
      }

      if (onProgress) {
        onProgress({ stage: 'finalizing', currentFile: '', progress: 95 })
      }

      archive.finalize()
    })

    if (onProgress) onProgress({ stage: 'finalizing', currentFile: '', progress: 100 })

    return { ok: true, filePath: outputPath, fileCount: collectList.length }
  } catch (e: any) {
    return { ok: false, error: e.message || '打包失败' }
  }
}

// ========== 导入：解析 mrpack ==========

/**
 * 导入 mrpack 整合包为新实例
 * @param mrpackPath mrpack 文件路径
 * @param targetParentDir 目标父目录（新建子目录放内容）
 * @param instanceName 实例名
 * @param onProgress 进度回调
 */
export async function importMrpack(
  mrpackPath: string,
  targetParentDir: string,
  instanceName: string,
  onProgress?: (p: PackProgress) => void
): Promise<ImportResult> {
  try {
    if (!fs.existsSync(mrpackPath)) {
      return { ok: false, error: '文件不存在: ' + mrpackPath }
    }

    // 用 JSZip 解包（与 instance.export.ts 保持一致）
    const JSZip = require('jszip')
    const data = await fs.promises.readFile(mrpackPath)
    const zip = await JSZip.loadAsync(data)

    // 读取 manifest
    const manifestEntry = zip.file('modrinth.index.json')
    let manifest: ModpackManifest | null = null
    if (manifestEntry) {
      try {
        manifest = JSON.parse(await manifestEntry.async('string'))
      } catch {}
    }

    // 目标路径
    const safeName = instanceName.replace(/[\\/:*?"<>|]/g, '_') || 'imported-modpack'
    const targetDir = path.join(targetParentDir, safeName)
    await fs.promises.mkdir(targetDir, { recursive: true })

    // 解压 overrides/ 到目标目录
    const entries = Object.keys(zip.files).filter(
      (k) => k.startsWith('overrides/') && !zip.files[k].dir
    )

    let processed = 0
    const total = entries.length
    for (const entry of entries) {
      const rel = entry.replace(/^overrides\//, '')
      const dest = path.join(targetDir, rel)
      const parentDir = path.dirname(dest)
      await fs.promises.mkdir(parentDir, { recursive: true })

      const buf = await zip.files[entry].async('nodebuffer')
      await fs.promises.writeFile(dest, buf)

      processed++
      if (onProgress) {
        onProgress({
          stage: 'adding',
          currentFile: rel,
          progress: Math.round((processed / Math.max(total, 1)) * 100)
        })
      }
    }

    return {
      ok: true,
      instancePath: targetDir,
      instanceName: safeName,
      fileCount: total
    }
  } catch (e: any) {
    return { ok: false, error: e.message || '导入失败' }
  }
}

// ========== 便捷：默认输出路径 ==========

export function getDefaultModpackOutputDir(): string {
  const dir = path.join(app.getPath('downloads'), 'MCLA-Modpacks')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}
