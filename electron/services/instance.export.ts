/**
 * 实例导入导出服务
 * 支持从已有 .minecraft 目录导入实例，以及将实例导出为可分享的压缩包
 */
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import * as instances from './instances'
import { createInstanceWithDir } from './instance.enhanced.service'

export interface ExportPackage {
  version: 1
  instanceId: string
  instanceName: string
  exportedAt: string
  manifest: {
    name: string
    mcVersion: string
    loaderType: string
    loaderVersion: string
    javaPath: string
    jvmArgs: string
    minMemory: number
    maxMemory: number
    width: number
    height: number
    createdAt: string
  }
  /** 包含的文件相对路径列表（不含 gameDir 路径） */
  includedFiles: string[]
  /** 被排除的目录 */
  excludedDirs: string[]
}

const DEFAULT_EXCLUDES = [
  'crash-reports',
  'logs',
  'backups',
  'journeymap',
  'shaderpacks',
  'resourcepacks',
  'screenshots',
  '.cache',
  'crash',
]

const CONFIG_INCLUDES = ['options.txt', 'optionsof.txt', 'servers.dat']

/**
 * 扫描 .minecraft 目录，返回可导入的信息
 */
export async function scanMinecraftDir(dirPath: string): Promise<{
  valid: boolean
  mcVersion?: string
  loaderType?: string
  loaderVersion?: string
  versionJsonPath?: string
  modsCount?: number
  configCount?: number
  suggestions: string[]
}> {
  try {
    const stats = await fs.promises.stat(dirPath)
    if (!stats.isDirectory()) return { valid: false, suggestions: ['路径不是目录'] }

    const versionJsonPath = path.join(dirPath, 'versions')
    let mcVersion = ''
    let loaderType: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt' = 'vanilla'
    let loaderVersion = ''
    let versionJsonResolved = ''

    // 尝试从 versions 目录检测版本
    try {
      const versionDirs = await fs.promises.readdir(versionJsonPath)
      // 找最新的版本目录
      const sorted = versionDirs
        .map(v => ({ name: v, mtime: fs.statSync(path.join(versionJsonPath, v)).mtime.getTime() }))
        .sort((a, b) => b.mtime - a.mtime)

      if (sorted.length > 0) {
        const latestVerDir = sorted[0].name
        const jsonFile = path.join(versionJsonPath, latestVerDir, `${latestVerDir}.json`)
        try {
          await fs.promises.access(jsonFile)
          const json = JSON.parse(await fs.promises.readFile(jsonFile, 'utf-8'))
          mcVersion = json.id || latestVerDir
          versionJsonResolved = jsonFile

          // 检测 Mod Loader
          const modsDir = path.join(dirPath, 'mods')
          const configDir = path.join(dirPath, 'config')

          // 检查 fabric mod
          const fabricMeta = path.join(dirPath, 'fabric.mod.json')
          if (fs.existsSync(fabricMeta)) {
            loaderType = 'fabric'
            try {
              const fm = JSON.parse(await fs.promises.readFile(fabricMeta, 'utf-8'))
              loaderVersion = fm.loaderVersion || ''
            } catch {}
          }

          // 检查 forge
          const forgeJson = path.join(versionJsonPath, latestVerDir, `${latestVerDir}-forge.json`)
          if (fs.existsSync(forgeJson)) {
            loaderType = 'forge'
            try {
              const fj = JSON.parse(await fs.promises.readFile(forgeJson, 'utf-8'))
              loaderVersion = fj._id || ''
            } catch {}
          }

          // 检查 neoforge
          const neoforgeJson = path.join(versionJsonPath, latestVerDir, `${latestVerDir}-neoforge.json`)
          if (fs.existsSync(neoforgeJson)) {
            loaderType = 'neoforge'
            try {
              const nf = JSON.parse(await fs.promises.readFile(neoforgeJson, 'utf-8'))
              loaderVersion = nf._id || ''
            } catch {}
          }

          // 检查 quilt
          const quiltJson = path.join(versionJsonPath, latestVerDir, `${latestVerDir}-quilt.json`)
          if (fs.existsSync(quiltJson)) {
            loaderType = 'quilt'
            try {
              const qj = JSON.parse(await fs.promises.readFile(quiltJson, 'utf-8'))
              loaderVersion = qj.loader_version || ''
            } catch {}
          }
        } catch {}
      }
    } catch {}

    // 统计 mods 和 config
    let modsCount = 0
    let configCount = 0
    try {
      const modsDir = path.join(dirPath, 'mods')
      if (fs.existsSync(modsDir)) {
        modsCount = (await fs.promises.readdir(modsDir)).filter(f => f.endsWith('.jar')).length
      }
    } catch {}
    try {
      const configDir = path.join(dirPath, 'config')
      if (fs.existsSync(configDir)) {
        const cfgFiles = await fs.promises.readdir(configDir, { withFileTypes: true })
        configCount = cfgFiles.filter(e => e.isFile()).length
      }
    } catch {}

    const suggestions: string[] = []
    if (!mcVersion) suggestions.push('未检测到版本，可能不是有效的 Minecraft 目录')
    if (modsCount === 0) suggestions.push('未找到 Mod')
    if (configCount === 0) suggestions.push('未找到配置文件')

    return {
      valid: true,
      mcVersion,
      loaderType,
      loaderVersion,
      versionJsonPath: versionJsonResolved,
      modsCount,
      configCount,
      suggestions,
    }
  } catch (e: any) {
    return { valid: false, suggestions: [e.message || '扫描失败'] }
  }
}

/**
 * 导出实例为压缩包（.mcla 文件）
 * @param instanceId 数据库中的实例 ID
 * @param destPath 保存路径
 * @param options 导出选项
 */
export async function exportInstance(
  instanceId: string,
  destPath: string,
  options: {
    includeMods?: boolean
    includeConfigs?: boolean
    includeSaves?: boolean
  } = {}
): Promise<{ ok: boolean; error?: string; filePath?: string }> {
  const { includeMods = true, includeConfigs = true, includeSaves = false } = options

  const instance = instances.getInstanceById(instanceId)
  if (!instance) return { ok: false, error: '实例不存在' }

  try {
    const archiver = require('archiver')
    const output = fs.createWriteStream(destPath)
    const archive = archiver('zip', { zlib: { level: 5 } })

    const gameDir = instance.path
    const manifest: ExportPackage = {
      version: 1,
      instanceId,
      instanceName: instance.name,
      exportedAt: new Date().toISOString(),
      manifest: {
        name: instance.name,
        mcVersion: instance.mc_version,
        loaderType: instance.loader_type,
        loaderVersion: instance.loader_version,
        javaPath: instance.java_path,
        jvmArgs: instance.jvm_args,
        minMemory: instance.min_memory,
        maxMemory: instance.max_memory,
        width: instance.width,
        height: instance.height,
        createdAt: instance.created_at,
      },
      includedFiles: [],
      excludedDirs: [],
    }

    // 写入 manifest.json
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

    // 复制版本目录（核心）
    const versionsDir = path.join(gameDir, 'versions')
    if (fs.existsSync(versionsDir)) {
      manifest.includedFiles.push('versions/')
      archive.directory(versionsDir, 'versions')
    }

    // 复制 libraries 和 assets（核心）
    const librariesDir = path.join(gameDir, 'libraries')
    if (fs.existsSync(librariesDir)) {
      manifest.includedFiles.push('libraries/')
      archive.directory(librariesDir, 'libraries')
    }

    const assetsDir = path.join(gameDir, 'assets')
    if (fs.existsSync(assetsDir)) {
      manifest.includedFiles.push('assets/')
      archive.directory(assetsDir, 'assets')
    }

    // 可选：mods
    if (includeMods) {
      const modsDir = path.join(gameDir, 'mods')
      if (fs.existsSync(modsDir)) {
        manifest.includedFiles.push('mods/')
        archive.directory(modsDir, 'mods')
      }
    } else {
      manifest.excludedDirs.push('mods')
    }

    // 可选：config
    if (includeConfigs) {
      const configDir = path.join(gameDir, 'config')
      if (fs.existsSync(configDir)) {
        manifest.includedFiles.push('config/')
        archive.directory(configDir, 'config')
      }
    } else {
      manifest.excludedDirs.push('config')
    }

    // 可选：saves
    if (includeSaves) {
      const savesDir = path.join(gameDir, 'saves')
      if (fs.existsSync(savesDir)) {
        manifest.includedFiles.push('saves/')
        archive.directory(savesDir, 'saves')
      }
    } else {
      manifest.excludedDirs.push('saves')
    }

    // 总是复制关键配置文件
    for (const cfg of CONFIG_INCLUDES) {
      const cfgPath = path.join(gameDir, cfg)
      if (fs.existsSync(cfgPath)) {
        archive.file(cfgPath, { name: cfg })
        manifest.includedFiles.push(cfg)
      }
    }

    return new Promise((resolve) => {
      output.on('close', () => {
        resolve({ ok: true, filePath: destPath })
      })
      archive.on('error', (err: Error) => {
        resolve({ ok: false, error: err.message })
      })
      archive.pipe(output)
      archive.finalize()
    })
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

/**
 * 导入 .mcla 文件
 * @param mclaFilePath .mcla 压缩包路径
 * @param targetDir 目标目录（MCLA 的 .minecraft 根目录）
 */
export async function importInstance(
  mclaFilePath: string,
  targetDir: string
): Promise<{ ok: boolean; error?: string; instanceId?: string }> {
  try {
    const JSZip = require('jszip')
    const zipData = await fs.promises.readFile(mclaFilePath)
    const zip = await JSZip.loadAsync(zipData)

    // 读取 manifest
    const manifestEntry = zip.file('manifest.json')
    if (!manifestEntry) return { ok: false, error: '不是有效的 MCLA 导出文件（缺少 manifest.json）' }

    const manifest: ExportPackage = JSON.parse(await manifestEntry.async('string'))
    if (!manifest.version || !manifest.manifest) {
      return { ok: false, error: 'manifest.json 格式无效' }
    }

    // 生成实例 ID 和目录名
    const instanceName = manifest.instanceName + ' (导入)'
    const dirName = `import_${Date.now()}`
    const instancePath = path.join(targetDir, dirName)

    // 创建实例目录
    await fs.promises.mkdir(instancePath, { recursive: true })

    // 解压所有文件
    const entries = zip.filter((_: any, file: any) => !file.dir && file.name !== 'manifest.json')
    for (const entry of entries) {
      const destPath = path.join(instancePath, entry.name)
      const destDir = path.dirname(destPath)
      await fs.promises.mkdir(destDir, { recursive: true })
      const data = await entry.async('nodebuffer')
      await fs.promises.writeFile(destPath, data)
    }

    const validLoaderTypes = ['vanilla', 'forge', 'fabric', 'neoforge', 'quilt'] as const
    type LoaderType = typeof validLoaderTypes[number]
    const rawLoader = manifest.manifest.loaderType as string
    const resolvedLoader: LoaderType = validLoaderTypes.includes(rawLoader as LoaderType)
      ? (rawLoader as LoaderType)
      : 'vanilla'

    // 在数据库中创建实例
    const newInstance = createInstanceWithDir({
      name: instanceName,
      mcVersion: manifest.manifest.mcVersion,
      loaderType: resolvedLoader,
      loaderVersion: manifest.manifest.loaderVersion,
      javaPath: manifest.manifest.javaPath || '',
      jvmArgs: manifest.manifest.jvmArgs || '',
      minMemory: manifest.manifest.minMemory || 1024,
      maxMemory: manifest.manifest.maxMemory || 4096,
      width: manifest.manifest.width || 854,
      height: manifest.manifest.height || 480,
    })

    if (newInstance) {
      // 更新实例路径
      instances.updateInstance(newInstance.id, { path: instancePath })
      return { ok: true, instanceId: newInstance.id }
    }

    return { ok: false, error: '创建实例失败' }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

/**
 * 导出默认目标目录（用户可选择的保存位置）
 */
export function getExportDir(): string {
  return app.getPath('downloads')
}
