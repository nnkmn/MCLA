/**
 * 启动参数配置服务
 * 负责读取实例配置、全局设置，合并生成最终 JVM + MC 启动参数
 */

import * as path from 'path'
import * as os from 'os'
import { getDatabase } from './database'
import { getInstanceById } from './instances'
import { getActiveAccount } from './accounts'
import { recommendedJavaMajor } from './java.management.service'

export interface LaunchConfig {
  // Java
  javaPath: string
  // JVM 参数
  jvmArgs: string[]
  // Minecraft 参数（--username 等）
  mcArgs: string[]
  // 工作目录
  workDir: string
  // 实例快照（供调用方记录日志）
  instanceId: string
  mcVersion: string
  loaderType: string
}

export interface BuildLaunchConfigOptions {
  instanceId: string
  accountId?: string
  /** 覆盖 javaPath */
  overrideJava?: string
  /** 覆盖内存（MB） */
  overrideMinMemory?: number
  overrideMaxMemory?: number
}

/**
 * 构建最终启动配置
 * 优先级：调用方传入 > 实例配置 > 全局设置 > 默认值
 */
export function buildLaunchConfig(options: BuildLaunchConfigOptions): LaunchConfig {
  const db = getDatabase()

  // 1. 读取实例
  const instance = getInstanceById(options.instanceId)
  if (!instance) {
    throw new Error(`实例不存在: ${options.instanceId}`)
  }

  // 2. 读取账户（可选）
  let account: { name: string; uuid: string; accessToken?: string } | null = null
  if (options.accountId) {
    account = db.prepare('SELECT name, uuid, access_token FROM accounts WHERE id = ?').get(options.accountId) as any
  }
  if (!account) {
    account = db.prepare('SELECT name, uuid, access_token FROM accounts WHERE is_active = 1 LIMIT 1').get() as any
  }
  // 最终兜底：离线 Steve
  if (!account) {
    account = { name: 'Steve', uuid: offlineUUID('Steve') }
  }

  // 3. 读取全局设置
  const globalJava = getConfigValue(db, 'default_java') || ''
  const globalMinMem = parseInt(getConfigValue(db, 'global_min_memory') || '512')
  const globalMaxMem = parseInt(getConfigValue(db, 'global_max_memory') || '2048')
  const globalMcDir = getConfigValue(db, 'mc_dir') || defaultMcDir()

  // 4. 合并优先级
  const javaPath = options.overrideJava || instance.java_path || globalJava
  const minMem = options.overrideMinMemory || instance.min_memory || globalMinMem || 512
  const maxMem = options.overrideMaxMemory || instance.max_memory || globalMaxMem || 2048
  const mcDir = instance.path ? path.dirname(instance.path) : globalMcDir
  const mcVersion = instance.mc_version || '1.20.4'
  const loaderType = instance.loader_type || 'vanilla'

  // 5. 构建 JVM 参数
  const jvmArgs = buildJvmArgs({
    minMem,
    maxMem,
    mcVersion,
    nativesPath: path.join(mcDir, 'versions', mcVersion, `${mcVersion}-natives`),
    customJvm: instance.jvm_args || '',
  })

  // 6. 构建 MC 参数
  const mcArgs = buildMcArgs({
    account,
    mcVersion,
    mcDir,
    loaderType,
    width: instance.width || 854,
    height: instance.height || 480,
    fullscreen: instance.fullscreen === 1,
  })

  return {
    javaPath,
    jvmArgs,
    mcArgs,
    workDir: path.join(mcDir, '.minecraft'),
    instanceId: instance.id,
    mcVersion,
    loaderType,
  }
}

// ===== 内部构建函数 =====

function buildJvmArgs(opts: {
  minMem: number
  maxMem: number
  mcVersion: string
  nativesPath: string
  customJvm: string
}): string[] {
  const args = [
    `-Xms${opts.minMem}M`,
    `-Xmx${opts.maxMem}M`,
    `-Djava.library.path=${opts.nativesPath}`,
    '-Dminecraft.launcher.brand=MCLA',
    '-Dminecraft.launcher.version=2.0.0',
    '-Dfile.encoding=UTF-8',
  ]

  // GC 策略按版本选择
  if (compareVersions(opts.mcVersion, '1.18') >= 0) {
    args.push(
      '-XX:+UseG1GC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50',
      '-XX:G1HeapRegionSize=32M',
      '-XX:+DisableExplicitGC',
    )
  } else {
    args.push(
      '-XX:+UseConcMarkSweepGC',
      '-XX:CMSInitiatingOccupancyFraction=75',
      '-XX:+CMSUseFastHandshake',
    )
  }

  // 用户自定义 JVM 参数
  if (opts.customJvm.trim()) {
    args.push(...opts.customJvm.trim().split(/\s+/).filter(Boolean))
  }

  return args
}

function buildMcArgs(opts: {
  account: { name: string; uuid: string; accessToken?: string }
  mcVersion: string
  mcDir: string
  loaderType: string
  width: number
  height: number
  fullscreen: boolean
}): string[] {
  const { account, mcVersion, mcDir, loaderType } = opts
  const versionDir = path.join(mcDir, 'versions', mcVersion)
  const jarPath = path.join(versionDir, `${mcVersion}.jar`)
  const mainClass = getMainClass(mcVersion, loaderType)

  const args = [
    // classpath
    '-cp', jarPath,
    // 主类
    mainClass,
    // Minecraft 参数
    '--username', account.name,
    '--uuid', account.uuid,
    '--accessToken', account.accessToken || 'offline',
    '--version', mcVersion,
    '--gameDir', mcDir,
    '--assetsDir', path.join(mcDir, 'assets'),
    '--assetIndex', mcVersion,
    '--userType', account.accessToken ? 'msa' : 'legacy',
    '--versionType', 'MCLA',
  ]

  // 窗口尺寸
  if (!opts.fullscreen) {
    args.push('--width', String(opts.width), '--height', String(opts.height))
  } else {
    args.push('--fullscreen')
  }

  return args
}

function getMainClass(mcVersion: string, loaderType: string): string {
  switch (loaderType) {
    case 'fabric':
      return 'net.fabricmc.loader.launch.knot.KnotClient'
    case 'quilt':
      return 'org.quiltmc.loader.launch.knot.KnotClient'
    case 'forge':
    case 'neoforge':
      // Forge 的主类在 version.json 里，这里给默认值
      return compareVersions(mcVersion, '1.17') >= 0
        ? 'cpw.mods.bootstraplauncher.BootstrapLauncher'
        : 'net.minecraftforge.fml.relauncher.ServerLaunchWrapper'
    default:
      return compareVersions(mcVersion, '1.6') >= 0
        ? 'net.minecraft.client.main.Main'
        : 'net.minecraft.Launcher'
  }
}

// ===== 工具函数 =====

function getConfigValue(db: any, key: string): string | null {
  const row = db.prepare('SELECT value FROM configs WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value || null
}

function defaultMcDir(): string {
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft')
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'minecraft')
  } else {
    return path.join(os.homedir(), '.minecraft')
  }
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

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}
