/**
 * 游戏启动服务（增强版）
 * 整合 launch.config.service + java.management.service
 * 负责参数构建、进程管理、日志收集、崩溃分析
 */

import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
const { join } = path
import { buildLaunchConfig, BuildLaunchConfigOptions } from './launch.config.service'
import { getDefaultJava, validateJava } from './java.management.service'
import { updateLastPlayed } from './instances'
import { getDatabase } from './database'
import { logger } from '../utils/logger'
const log = logger.child('GameLauncher')

export interface LaunchResult {
  success: boolean
  error?: string
  pid?: number
}

export type GameStatus = 'idle' | 'launching' | 'running' | 'exiting'

export type LaunchPhase =
  | 'idle'
  | 'building-config'
  | 'validating-java'
  | 'checking-files'
  | 'launching-process'
  | 'running'
  | 'error'

export interface LaunchProgress {
  phase: LaunchPhase
  message: string
  detail?: string
}

// 运行状态
let currentProcess: ChildProcess | null = null
let currentInstanceId: string | null = null
let gameStatus: GameStatus = 'idle'
let logBuffer = ''

// ===== 公共 API =====

// ====== 按版本 ID 直接启动（绕过数据库实例） ======

export interface LaunchByVersionOptions {
  versionId: string
  accountId?: string
}

interface NativeArtifact {
  path: string
  sha1: string
  size: number
  url: string
}

interface VersionJson {
  id: string
  inheritsFrom?: string
  mainClass: string
  minecraftArguments?: string
  arguments?: { game?: Array<string | { rules: unknown[]; value?: string | string[] }>; jvm?: Array<string | { rules: unknown[]; value?: string | string[] }> }
  libraries: Array<{
    name: string
    downloads?: {
      artifact?: NativeArtifact
      classifiers?: Record<string, NativeArtifact>
    }
    rules?: Array<{ action: string; os?: { name?: string } }>
    natives?: Record<string, string>
    extract?: { exclude?: string[] }
  }>
  assetIndex?: { id: string; sha1: string; size: number; totalSize: number; url: string }
  assets?: string
}

function offlineUUID(name: string): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${name}`).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-')
}

function resolveVersionJson(gameDir: string, versionId: string): VersionJson | null {
  const versionJsonPath = join(gameDir, 'versions', versionId, `${versionId}.json`)
  if (!fs.existsSync(versionJsonPath)) {
    log.error(`[launchByVersion] 版本 JSON 不存在: ${versionJsonPath}`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))
  } catch (e) {
    log.error(`[launchByVersion] JSON 解析失败: ${versionJsonPath}`, e)
    return null
  }
}

function resolveLibraries(gameDir: string, libs: VersionJson['libraries']): string[] {
  const cp: string[] = []
  const baseLibPath = join(gameDir, 'libraries')

  for (const lib of libs) {
    if (lib.rules?.length) {
      const allowed = lib.rules.every((rule: any) => {
        if (rule.action === 'allow') {
          if (rule.os?.name && rule.os.name !== process.platform) return false
          return true
        }
        return true
      })
      if (!allowed) continue
    }

    const dl = lib.downloads?.artifact
    if (!dl) continue

    const fullPath = join(baseLibPath, dl.path)
    if (fs.existsSync(fullPath)) {
      cp.push(fullPath)
    } else {
      log.warn(`[launchByVersion] 库文件缺失: ${fullPath}`)
    }
  }

  return cp
}

// ====== 文件下载辅助 ======

const BMCLAPI = 'https://bmclapi2.bangbang93.com'
const MOJANG_ASSETS = 'https://resources.minecraft.net/assets/obj'

/**
 * 解压 natives jar 到目标目录
 * Windows: 用 .NET Framework 内置的 ZipFile（无需额外依赖）
 * Mac/Linux: 用 unzip 命令
 */
function extractJar(jarPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(jarPath)) return resolve()
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    if (process.platform === 'win32') {
      // Windows: 用 .NET Framework 内置 ZipFile（无额外依赖）
      // 用临时 ps1 脚本文件避免命令行转义问题
      const psScript = [
        '[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null',
        `[System.IO.Compression.ZipFile]::ExtractToDirectory('${(jarPath).replace(/'/g, "''")}', '${(destDir).replace(/'/g, "''")}')`
      ].join('\n')

      const tmpPs = join(require('os').tmpdir(), `mcla-extract-${(Date.now())}.ps1`)
      fs.writeFileSync(tmpPs, psScript, 'utf-8')

      const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpPs])
      let errMsg = ''
      ps.stderr?.on('data', (d: Buffer) => { errMsg += d.toString() })
      ps.on('exit', (code) => {
        try { fs.unlinkSync(tmpPs) } catch {}
        if (code === 0) resolve()
        else reject(new Error(`PowerShell 解压失败(code=${code}): ${errMsg}`))
      })
      ps.on('error', reject)
    } else {
      // Mac/Linux: 用 unzip
      const unzip = spawn('unzip', ['-o', jarPath, '-d', destDir])
      let errMsg = ''
      unzip.stderr?.on('data', (d: Buffer) => { errMsg += d.toString() })
      unzip.on('exit', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`unzip 失败(code=${code}): ${errMsg}`))
      })
      unzip.on('error', reject)
    }
  })
}

/**
 * 下载并解压所有 natives
 */
async function downloadAndExtractNatives(
  gameDir: string,
  versionJson: VersionJson,
  mainWindow: BrowserWindow,
): Promise<void> {
  const versionId = versionJson.id
  const nativesDir = join(gameDir, 'versions', versionId, `${versionId}-natives`)
  if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true })

  for (const lib of versionJson.libraries || []) {
    const classifiers = lib.downloads?.classifiers
    if (!classifiers) continue

    const key = process.platform === 'win32' ? 'natives-windows'
      : process.platform === 'darwin' ? 'natives-osx'
      : 'natives-linux'

    const nativeInfo = classifiers[key]
    if (!nativeInfo) continue

    const nativeUrl = nativeInfo.url || `${BMCLAPI}/libraries/${nativeInfo.path}`
    const jarName = path.basename(nativeInfo.path || `natives-${versionId}.jar`)
    const nativeJarPath = join(nativesDir, jarName)

    if (!fs.existsSync(nativeJarPath)) {
      sendProgress(mainWindow, 'checking-files', `下载原生库: ${jarName}`)
      try {
        await downloadFile(nativeUrl, nativeJarPath)
      } catch (e: any) {
        log.warn(`[natives] 下载失败: ${nativeUrl}, ${e.message}`)
        continue
      }
    }

    // 解压
    try {
      sendProgress(mainWindow, 'checking-files', `解压原生库: ${jarName}`)
      await extractJar(nativeJarPath, nativesDir)
    } catch (e: any) {
      log.warn(`[natives] 解压失败: ${nativeJarPath}, ${e.message}`)
    }
  }
}

/** 下载单个文件（Promise 封装） */
function downloadFile(url: string, destPath: string, timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) return resolve()
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, { timeout }, (res) => {
      if (res.statusCode === 404) {
        req.destroy()
        return reject(new Error(`404: ${url}`))
      }
      const file = fs.createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('下载超时')) })
  })
}

/**
 * 补全缺失的游戏文件（libraries + assets）
 * 返回是否全部完成（false = 有文件无法下载）
 */
async function completeGameFiles(
  gameDir: string,
  versionJson: VersionJson,
  mainWindow: BrowserWindow,
): Promise<boolean> {
  const baseLibPath = join(gameDir, 'libraries')
  const assetsPath = join(gameDir, 'assets')

  // ---- 1. 统计并下载缺失的 libraries ----
  const missingLibs: Array<{ url: string; path: string }> = []
  for (const lib of versionJson.libraries || []) {
    if (lib.rules?.length) {
      const allowed = lib.rules.every((rule: any) => {
        if (rule.action === 'allow') {
          if (rule.os?.name && rule.os.name !== process.platform) return false
          return true
        }
        return true
      })
      if (!allowed) continue
    }

    const dl = lib.downloads?.artifact
    if (!dl) continue

    const fullPath = join(baseLibPath, dl.path)
    if (!fs.existsSync(fullPath)) {
      const bmclUrl = `${BMCLAPI}/libraries/${dl.path}`
      missingLibs.push({ url: bmclUrl, path: fullPath })
    }
  }

  if (missingLibs.length > 0) {
    sendProgress(mainWindow, 'checking-files', `正在补全支持库 (${missingLibs.length} 个)...`)
    for (let i = 0; i < missingLibs.length; i++) {
      const { url, path: destPath } = missingLibs[i]
      sendProgress(mainWindow, 'checking-files',
        `正在补全支持库 (${i + 1}/${missingLibs.length})`,
        path.basename(destPath))
      try {
        await downloadFile(url, destPath)
      } catch (e: any) {
        log.warn(`[completeGameFiles] 库文件下载失败: ${url} -> ${destPath}: ${e.message}`)
      }
    }
  }

  // ---- 1.5 下载并解压原生库 ----
  sendProgress(mainWindow, 'checking-files', '正在准备原生库...')
  try {
    await downloadAndExtractNatives(gameDir, versionJson, mainWindow)
  } catch (e: any) {
    log.warn(`[completeGameFiles] natives 处理失败: ${e.message}`)
  }

  // ---- 2. 检查并下载 assets ----
  const assetIndexId = versionJson.assetIndex?.id
  if (assetIndexId && versionJson.assetIndex) {
    const indexPath = join(assetsPath, 'indexes', `${assetIndexId}.json`)

    if (!fs.existsSync(indexPath)) {
      sendProgress(mainWindow, 'checking-files', '正在下载资源索引...')
      const indexUrl = versionJson.assetIndex.url.replace("https://launchermeta.mojang.com", BMCLAPI);
      try {
        await downloadFile(indexUrl, indexPath)
      } catch (e: any) {
        log.warn(`[completeGameFiles] asset index 下载失败: ${indexUrl}: ${e.message}`)
      }
    }

    if (fs.existsSync(indexPath)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
        const objects: Array<{ hash: string; size: number }> = Object.values(indexData.objects || {})

        let missingCount = 0
        for (const obj of objects) {
          const objPath = join(assetsPath, 'objects', obj.hash.substring(0, 2), obj.hash)
          if (!fs.existsSync(objPath)) missingCount++
        }

        if (missingCount > 0) {
          sendProgress(mainWindow, 'checking-files', `正在补全资源文件 (${missingCount} 个)...`)
          let done = 0
          for (const obj of objects) {
            const objPath = join(assetsPath, 'objects', obj.hash.substring(0, 2), obj.hash)
            if (!fs.existsSync(objPath)) {
              const objUrl = `${BMCLAPI}/assets/${obj.hash.substring(0, 2)}/${obj.hash}`
              try {
                await downloadFile(objUrl, objPath)
              } catch (e: any) {
                log.warn(`[completeGameFiles] 资源文件下载失败: ${objUrl}: ${e.message}`)
              }
              done++
              if (done % 50 === 0) {
                sendProgress(mainWindow, 'checking-files',
                  `正在补全资源文件 (${done}/${missingCount})`)
              }
            }
          }
        }
      } catch (e: any) {
        log.warn(`[completeGameFiles] asset index 解析失败: ${e.message}`)
      }
    }
  }

  return true
}

interface AccountRow {
  name: string
  uuid: string
  access_token: string | null
  xuid: string | null
}

interface GameAccount {
  name: string
  uuid: string
  accessToken?: string
  xuid?: string
}

/**
 * 解析版本 JSON 的 game arguments
 * 处理 1.13+ 新版 arguments.game 格式
 */
function parseGameArguments(
  gameArgArray: Array<string | { rules?: any[]; value?: string | string[] }>,
  replaceMap: Record<string, string>,
  extraRules: { isOffline: boolean }
): string[] {
  let args: string[] = []

  function replacePlaceholders(str: string): string {
    let result = str
    for (const [k, v] of Object.entries(replaceMap)) {
      result = result.replace(new RegExp(k.replace(/\$/g, '\\$'), 'g'), v)
    }
    return result
  }

  function checkFeatureRules(rules: any[]): boolean {
    return rules.every((rule) => {
      if (rule.action !== 'allow') return true
      if (rule.os?.name && rule.os.name !== process.platform) return false
      if (rule.os?.arch && process.arch !== rule.os.arch) return false
      if (rule.features) {
        const feats = rule.features
        if (feats['is_demo_user'] === true && !extraRules.isOffline) return false
      }
      return true
    })
  }

  for (let i = 0; i < gameArgArray.length; i++) {
    const entry = gameArgArray[i]

    if (typeof entry === 'string') {
      const prevEntry = gameArgArray[i - 1]
      const isPrevKey = typeof prevEntry === 'string' && prevEntry.startsWith('--')

      if (isPrevKey) {
        const key = prevEntry as string
        const rawValue = entry

        if (key === '--xuid') {
          const xuidVal = replacePlaceholders(rawValue)
          if (xuidVal) args.push(key, xuidVal)
        } else if (key === '--userType') {
          const typeVal = replacePlaceholders(rawValue)
          if (typeVal) args.push(key, typeVal)
        } else if (key === '--width' || key === '--height' || key === '--clientId') {
          args.push(key, replacePlaceholders(rawValue))
        } else {
          args.push(key, replacePlaceholders(rawValue))
        }
      } else {
        if (entry.startsWith('--')) {
        } else {
          const replaced = replacePlaceholders(entry)
          if (replaced) args.push(replaced)
        }
      }
    } else if (entry.rules) {
      if (checkFeatureRules(entry.rules)) {
        const vals = Array.isArray(entry.value) ? entry.value : [entry.value]
        for (const v of vals) {
          const replaced = replacePlaceholders(v as string)
          if (replaced) args.push(replaced)
        }
      }
    } else if (entry.value !== undefined) {
      const vals = Array.isArray(entry.value) ? entry.value : [entry.value]
      for (const v of vals) {
        const replaced = replacePlaceholders(v as string)
        if (replaced) args.push(replaced)
      }
    }
  }

  return args.filter(item => 
    !item.startsWith('--quickPlay') && 
    !item.includes('quickPlay') &&
    item.trim() !== ''
  );
}

function getGameArguments(versionJson: VersionJson, mcDir: string, account: GameAccount, width: number, height: number): string[] {
  const args: string[] = []
  const versionId = versionJson.id
  const clientId = `MCLA-${Date.now()}`
  const versionType = 'release'
  const assetsDir = join(mcDir, 'assets')

  const hasMsa = !!(account.accessToken && account.xuid)
  const userType = hasMsa ? 'msa' : 'legacy'
  const isOffline = !account.accessToken || !hasMsa

  const replaceMap: Record<string, string> = {
    '${auth_player_name}': account.name,
    '${auth_uuid}': account.uuid,
    '${auth_access_token}': account.accessToken || 'offline',
    '${user_type}': userType,
    '${version_name}': versionId,
    '${game_directory}': mcDir,
    '${assets_root}': assetsDir,
    '${assets_index_name}': versionJson.assetIndex?.id || versionId,
    '${user_properties}': '{}',
    '${launcher_name}': 'MCLA',
    '${launcher_version}': '2.0.0',
    '${width}': String(width),
    '${height}': String(height),
    '${clientid}': clientId,
    '${auth_xuid}': account.xuid || '',
    '${version_type}': versionType,
    '${resolution_width}': String(width),
    '${resolution_height}': String(height), 
  }

  if (versionJson.minecraftArguments) {
    let str = versionJson.minecraftArguments
    for (const [k, v] of Object.entries(replaceMap)) {
      str = str.replace(new RegExp(k.replace(/\$/g, '\\$'), 'g'), v)
    }
    args.push(...str.split(' ').filter(Boolean))
  }

  if (versionJson.arguments?.game) {
    args.push(...parseGameArguments(versionJson.arguments.game, replaceMap, { isOffline }))
  }

  return args.filter(item => 
    !item.includes('quickPlay') && 
    !item.startsWith('${quickPlay') &&
    item.trim() !== ''
  );
}

function getJvmArguments(versionJson: VersionJson, mcDir: string, versionId: string, minMem: number, maxMem: number, classpathStr: string): string[] {
  const args: string[] = []

  // 内存参数
  args.push(`-Xms${minMem}M`, `-Xmx${maxMem}M`)

  // ✅ 正确拼接 natives 目录名（必须是模板字符串才能展开 ${versionId}）
  const nativesPath = join(mcDir, 'versions', versionId, `${versionId}-natives`)
  
  // 基础系统参数
  args.push(
    `-Djava.library.path=${nativesPath}`,
    '-Dfile.encoding=UTF-8',
    '-Duser.language=zh',
    '-Duser.country=CN',
    '-Dminecraft.launcher.brand=MCLA',
    '-Dminecraft.launcher.version=2.0.0'
  )

  // 处理版本自带JVM参数（正确替换占位符，过滤空值、重复CP）
  if (versionJson.arguments?.jvm) {
    for (const entry of versionJson.arguments.jvm) {
      if (typeof entry === 'string') {
        let val = entry
          .replace(/\$\{natives_directory\}/g, nativesPath)
          .replace(/\$\{launcher_name\}/g, 'MCLA')
          .replace(/\$\{launcher_version\}/g, '2.0.0')
          .replace(/\${classpath}/g, '') // 只删除classpath占位符，不删路径
          .trim()

        // ❌ 过滤：空参数、-cp 参数（杜绝重复）
        if (!val || val.startsWith('-cp')) continue

        // 特殊处理Forge/Fabric参数
        if (val.includes('=') && val.includes('Main')) {
          const eqIdx = val.indexOf('=')
          const fabricFlag = val.substring(0, eqIdx + 1).trimEnd()
          if (fabricFlag) args.push(fabricFlag)
        } else {
          args.push(val)
        }
      } else if (entry.rules) {
        const allowed = entry.rules.every((rule: any) => {
          if (rule.action === 'allow' && rule.os?.name && rule.os.name !== process.platform) return false
          return true
        })
        if (allowed && entry.value) {
          const vals = Array.isArray(entry.value) ? entry.value : [entry.value]
          for (const v of vals) {
            let val = (v as string)
              .replace(/\$\{natives_directory\}/g, nativesPath)
              .replace(/\${classpath}/g, '')
              .trim()
            if (val && !val.startsWith('-cp')) args.push(val)
          }
        }
      }
    }
  }

  // GC参数（1.18+）
  if (compareVersions(versionId, '1.18') >= 0) {
    args.push(
      '-XX:+UseG1GC', '-XX:G1NewSizePercent=20', '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50', '-XX:+DisableExplicitGC'
    )
  }

  // 去重 + 过滤空值
  return Array.from(new Set(args.filter(Boolean)))
}

/** 按版本 ID 直接启动（不依赖数据库实例） */
export async function launchByVersion(
  mainWindow: BrowserWindow,
  options: LaunchByVersionOptions
): Promise<LaunchResult> {
  const { versionId, accountId } = options

  if (gameStatus === 'running' || gameStatus === 'launching') {
    return { success: false, error: '已有游戏在运行中，请先关闭' }
  }

  setStatus(mainWindow, 'launching')
  sendProgress(mainWindow, 'building-config', '正在构建启动参数...')
  logBuffer = ''

  try {
    const db = getDatabase()
    let mcDir: string | null = null

    const lastFolder = db.prepare("SELECT value FROM configs WHERE key = 'last_selected_folder'").get() as { value: string } | undefined
    if (lastFolder?.value && fs.existsSync(lastFolder.value)) {
      mcDir = lastFolder.value
    }

    if (!mcDir) {
      const customPath = db.prepare("SELECT value FROM configs WHERE key = 'custom_minecraft_path'").get() as { value: string } | undefined
      if (customPath?.value && fs.existsSync(customPath.value)) {
        mcDir = customPath.value
      }
    }

    if (!mcDir || !fs.existsSync(mcDir)) {
      mcDir = defaultMcDir()
    }

    const gameDir = mcDir.endsWith('.minecraft') ? mcDir : join(mcDir, '.minecraft')

    sendProgress(mainWindow, 'checking-files', '正在检查游戏文件...')
    const versionJson = resolveVersionJson(gameDir, versionId)
    if (!versionJson) {
      sendProgress(mainWindow, 'error', '版本文件缺失', `找不到 ${versionId} 的版本 JSON`)
      setStatus(mainWindow, 'idle')
      return { success: false, error: `版本文件不存在: ${versionId}` }
    }

    sendProgress(mainWindow, 'checking-files', '正在检查支持库和资源文件...')
    const completeOk = await completeGameFiles(gameDir, versionJson, mainWindow)
    if (!completeOk) {
      sendProgress(mainWindow, 'error', '文件补全失败', '部分支持文件无法下载')
      setStatus(mainWindow, 'idle')
      return { success: false, error: '文件补全失败' }
    }

    let finalVersionJson = versionJson
    if (versionJson.inheritsFrom) {
      const parentJson = resolveVersionJson(gameDir, versionJson.inheritsFrom)
      if (parentJson) {
        finalVersionJson = {
          ...parentJson,
          ...versionJson,
          libraries: [...(versionJson.libraries || []), ...(parentJson.libraries || [])],
        }
      }
    }

    // ✅ 修复：提前初始化 account，解决 TS2454 错误
    let account: GameAccount = { name: 'Steve', uuid: offlineUUID('Steve') };

    if (accountId) {
      const row = db.prepare('SELECT name, uuid, access_token, xuid FROM accounts WHERE id = ?').get(accountId) as AccountRow | undefined
      log.info(`[launchByVersion] 查询账户 by id=${accountId}:`, JSON.stringify(row))
      if (row) {
        account = { 
          name: row.name, 
          uuid: row.uuid, 
          accessToken: row.access_token, 
          xuid: row.xuid 
        }
      }
    }
    
    const activeRow = db.prepare('SELECT name, uuid, access_token, xuid FROM accounts WHERE is_active = 1 LIMIT 1').get() as AccountRow | undefined
    if (activeRow) {
      account = { 
        name: activeRow.name, 
        uuid: activeRow.uuid, 
        accessToken: activeRow.access_token, 
        xuid: activeRow.xuid 
      }
    }

    const hasMsa = !!(account.accessToken && account.xuid)
    log.info(`[launchByVersion] 账户判断: accessToken=${!!account.accessToken}, xuid=${account.xuid}, hasMsa=${hasMsa}`)

    sendProgress(mainWindow, 'checking-files', '正在解析依赖库...')
    const libPaths = resolveLibraries(gameDir, finalVersionJson.libraries || [])
    const versionJar = join(gameDir, 'versions', versionId, `${versionId}.jar`)
    const classpath = [...libPaths, versionJar].filter(p => fs.existsSync(p))
    const classpathStr = classpath.join(process.platform === 'win32' ? ';' : ':')

    const memRow = db.prepare("SELECT value FROM configs WHERE key = 'global_max_memory'").get() as { value: string } | undefined
    const maxMem = parseInt(memRow?.value || '2048')
    const minMem = Math.min(512, Math.floor(maxMem / 4))

    const jvmArgs = getJvmArguments(finalVersionJson, gameDir, versionId, minMem, maxMem, classpathStr)
    const mcArgs = getGameArguments(finalVersionJson, gameDir, account, 854, 480)

    sendProgress(mainWindow, 'validating-java', '正在检测 Java 环境...')
    let javaPath = ''
    const javaRow = db.prepare("SELECT value FROM configs WHERE key = 'default_java'").get() as { value: string } | undefined
    if (javaRow?.value && fs.existsSync(javaRow.value)) {
      javaPath = javaRow.value
    }
    if (!javaPath) {
      const defaultJava = await getDefaultJava(versionId)
      if (!defaultJava) {
        sendProgress(mainWindow, 'error', '未找到 Java', '请在设置中配置 Java')
        setStatus(mainWindow, 'idle')
        return { success: false, error: '未找到 Java，请配置 Java 路径' }
      }
      javaPath = defaultJava.path
      sendProgress(mainWindow, 'validating-java', `自动选择 Java: ${defaultJava.vendor} ${defaultJava.version}`)
    }

    const mainClass = finalVersionJson.mainClass
    const allArgs = [...jvmArgs, '-cp', classpathStr, mainClass, ...mcArgs]

    log.info(`[launchByVersion] 启动版本: ${versionId}`)
    log.info(`[launchByVersion] Java: ${javaPath}`)
    log.info(`[launchByVersion] 工作目录: ${gameDir}`)
    log.info(`[launchByVersion] 主类: ${mainClass}`)
    log.info(`[launchByVersion] 完整命令: ${javaPath} ${allArgs.join(' ')}`)

    sendProgress(mainWindow, 'launching-process', '正在启动游戏进程...')

    const spawnEnv: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(process.env)) {
      if (k === '_JAVA_OPTIONS' || k === 'JDK_JAVA_OPTIONS') {
        spawnEnv[k] = undefined
      } else {
        spawnEnv[k] = v
      }
    }

    currentProcess = spawn(javaPath, allArgs, {
      cwd: gameDir,
      env: spawnEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    currentInstanceId = versionId

    currentProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      sendToWindow(mainWindow, 'game:log', { text, level: 'info' })
    })

    currentProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      sendToWindow(mainWindow, 'game:log', { text, level: 'error' })
    })

    currentProcess.on('exit', (code, signal) => {
      log.info(`[launchByVersion] 进程退出: code=${code}, signal=${signal}`)
      const exitedId = currentInstanceId
      currentProcess = null
      currentInstanceId = null
      setStatus(mainWindow, 'idle')
      sendToWindow(mainWindow, 'game:exit', { code: code ?? -1, signal, instanceId: exitedId })
      if (code !== 0 && code !== null) {
        const crash = analyzeCrash(logBuffer, code ?? -1)
        if (crash) sendToWindow(mainWindow, 'game:crash', crash)
      }
    })

    currentProcess.on('error', (err) => {
      log.error('[launchByVersion] 启动失败:', err.message)
      currentProcess = null
      currentInstanceId = null
      setStatus(mainWindow, 'idle')
      sendToWindow(mainWindow, 'game:error', { message: err.message })
      sendProgress(mainWindow, 'error', '启动失败', err.message)
    })

    setStatus(mainWindow, 'running')
    sendProgress(mainWindow, 'running', '游戏运行中')
    return { success: true, pid: currentProcess.pid }

  } catch (e: any) {
    sendProgress(mainWindow, 'error', '启动失败', e.message)
    setStatus(mainWindow, 'idle')
    return { success: false, error: e.message }
  }
}

// ====== 工具函数 ======

function defaultMcDir(): string {
  const os = require('os')
  if (process.platform === 'win32') {
    return join(os.homedir(), 'AppData', 'Roaming', '.minecraft')
  } else if (process.platform === 'darwin') {
    return join(os.homedir(), 'Library', 'Application Support', 'minecraft')
  } else {
    return join(os.homedir(), '.minecraft')
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

// ====== 原有按实例启动 ======
export async function launchGame(
  mainWindow: BrowserWindow,
  options: BuildLaunchConfigOptions
): Promise<LaunchResult> {

  if (gameStatus === 'running' || gameStatus === 'launching') {
    return { success: false, error: '已有游戏在运行中，请先关闭' }
  }

  setStatus(mainWindow, 'launching')
  sendProgress(mainWindow, 'building-config', '正在构建启动参数...')
  logBuffer = ''

  try {
    let config: ReturnType<typeof buildLaunchConfig>
    try {
      config = buildLaunchConfig(options)
    } catch (e: any) {
      sendProgress(mainWindow, 'error', '构建启动参数失败', e.message)
      setStatus(mainWindow, 'idle')
      return { success: false, error: e.message }
    }

    sendProgress(mainWindow, 'validating-java', '正在检测 Java 环境...')
    let javaPath = config.javaPath
    if (!javaPath) {
      const defaultJava = await getDefaultJava(config.mcVersion)
      if (!defaultJava) {
        sendProgress(mainWindow, 'error', '未找到 Java', '请在设置 → Java 管理中配置')
        setStatus(mainWindow, 'idle')
        return { success: false, error: '未找到 Java，请在设置 → Java 管理中配置' }
      }
      javaPath = defaultJava.path
      sendProgress(mainWindow, 'validating-java', `使用默认 Java: ${javaPath}`)
    }

    const javaInfo = await validateJava(javaPath)
    if (!javaInfo) {
      sendProgress(mainWindow, 'error', 'Java 无效', `无法执行: ${javaPath}`)
      setStatus(mainWindow, 'idle')
      return { success: false, error: `Java 无效或无法执行: ${javaPath}` }
    }

    sendProgress(mainWindow, 'checking-files', '正在检查游戏文件...')
    const gameDir = config.workDir
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true })
    }

    const allArgs = [...config.jvmArgs, ...config.mcArgs]

    log.info(`[GameLauncher] 启动实例: ${config.instanceId}`)
    log.info(`[GameLauncher] MC版本: ${config.mcVersion} / Loader: ${config.loaderType}`)
    log.info(`[GameLauncher] Java: ${javaPath} (${javaInfo.vendor} ${javaInfo.version})`)
    log.info(`[GameLauncher] 工作目录: ${gameDir}`)

    sendProgress(mainWindow, 'launching-process', '正在启动游戏进程...')
    sendToWindow(mainWindow, 'game:launch-info', {
      javaPath,
      javaVersion: javaInfo.version,
      instanceId: config.instanceId,
      mcVersion: config.mcVersion,
    })

    currentProcess = spawn(javaPath, allArgs, {
      cwd: gameDir,
      env: {
        ...process.env,
        _JAVA_OPTIONS: undefined,
        JDK_JAVA_OPTIONS: undefined,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    currentInstanceId = config.instanceId

    currentProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      sendToWindow(mainWindow, 'game:log', { text, level: 'info' })
    })

    currentProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      sendToWindow(mainWindow, 'game:log', { text, level: 'error' })
    })

    currentProcess.on('exit', (code, signal) => {
      log.info(`[GameLauncher] 进程退出: code=${code}, signal=${signal}`)
      const exitedId = currentInstanceId
      currentProcess = null
      currentInstanceId = null
      setStatus(mainWindow, 'idle')

      sendToWindow(mainWindow, 'game:exit', { code: code ?? -1, signal, instanceId: exitedId })

      if (code !== 0 && code !== null) {
        const crash = analyzeCrash(logBuffer, code)
        if (crash) {
          sendToWindow(mainWindow, 'game:crash', crash)
        }
      }

      if (exitedId && code === 0) {
        try { updateLastPlayed(exitedId) } catch {}
      }
    })

    currentProcess.on('error', (err) => {
      log.error('[GameLauncher] 启动失败:', err.message)
      currentProcess = null
      currentInstanceId = null
      setStatus(mainWindow, 'idle')
      sendToWindow(mainWindow, 'game:error', { message: err.message })
    })

    setStatus(mainWindow, 'running')
    sendProgress(mainWindow, 'running', '游戏运行中')
    return { success: true, pid: currentProcess.pid }

  } catch (e: any) {
    sendProgress(mainWindow, 'error', '启动失败', e.message)
    setStatus(mainWindow, 'idle')
    return { success: false, error: e.message }
  }
}

/** 终止当前游戏进程 */
export function terminateGame(): boolean {
  if (!currentProcess || currentProcess.killed) return false

  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(currentProcess.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      currentProcess.kill('SIGTERM')
    }
    currentProcess = null
    return true
  } catch (e) {
    log.error('[GameLauncher] 终止进程失败:', e)
    return false
  }
}

/** 获取运行状态 */
export function getGameStatus(): GameStatus {
  return gameStatus
}

/** 是否有游戏在运行 */
export function isRunning(): boolean {
  return gameStatus === 'running' || gameStatus === 'launching'
}

/** 获取当前日志 */
export function getCurrentLog(): string {
  return logBuffer
}

// ===== 内部函数 =====

function setStatus(mainWindow: BrowserWindow, status: GameStatus) {
  gameStatus = status
  sendToWindow(mainWindow, 'game:status', status)
}

function sendProgress(mainWindow: BrowserWindow, phase: LaunchPhase, message: string, detail?: string) {
  sendToWindow(mainWindow, 'game:progress', { phase, message, detail } satisfies LaunchProgress)
}

function sendToWindow(mainWindow: BrowserWindow, channel: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

interface CrashInfo {
  reason: string
  detail: string
  suggestion: string
}

function analyzeCrash(log: string, exitCode: number): CrashInfo | null {
  const lower = log.toLowerCase()

  if (lower.includes('outofmemoryerror') || lower.includes('could not reserve enough space')) {
    return {
      reason: '内存不足',
      detail: '游戏运行时内存耗尽（OutOfMemoryError）',
      suggestion: '在实例设置中增大最大内存（建议 4096MB+）',
    }
  }

  if (lower.includes('unsupportedclassversion')) {
    return {
      reason: 'Java 版本过低',
      detail: '当前 Java 版本不支持运行此版本的 Minecraft',
      suggestion: '请在设置 → Java 管理中切换到更高版本的 Java（Java 17 或 21）',
    }
  }

  if (lower.includes('filenotfoundexception') || lower.includes('nosuchfile')) {
    return {
      reason: '缺少游戏文件',
      detail: '游戏文件不完整，缺少必要文件',
      suggestion: '尝试重新安装或修复该实例',
    }
  }

  if (lower.includes('opengl') && (lower.includes('error') || lower.includes('failed'))) {
    return {
      reason: '显卡/驱动问题',
      detail: 'OpenGL 初始化失败',
      suggestion: '更新显卡驱动，或在 JVM 参数中添加 -Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=true',
    }
  }

  if (lower.includes('lwjgl')) {
    return {
      reason: 'LWJGL 原生库加载失败',
      detail: '游戏原生库（natives）缺失或损坏',
      suggestion: '重新安装游戏版本以修复 natives 目录',
    }
  }

  if (exitCode === 1 || exitCode === -1) {
    return {
      reason: `游戏异常退出（代码 ${exitCode}）`,
      detail: '游戏崩溃但无法自动识别原因',
      suggestion: '查看完整日志以获取更多信息',
    }
  }

  return null
}