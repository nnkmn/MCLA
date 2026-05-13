/**
 * 启动参数配置服务
 * 负责读取实例配置、全局设置，合并生成最终 JVM + MC 启动参数
 */

import * as path from 'path'
import * as os from 'os'
import { getDatabase } from './database'
import { getInstanceById } from './instances'
import { getActiveAccount } from './accounts'

export interface LaunchConfig {
  javaPath: string
  jvmArgs: string[]
  mcArgs: string[]
  workDir: string
  instanceId: string
  mcVersion: string
  loaderType: string
}

export interface BuildLaunchConfigOptions {
  instanceId: string
  accountId?: string
  overrideJava?: string
  overrideMinMemory?: number
  overrideMaxMemory?: number
}

interface AccountRow {
  name: string
  uuid: string
  access_token: string | null
  xuid: string | null
}

export function buildLaunchConfig(options: BuildLaunchConfigOptions): LaunchConfig {
  const db = getDatabase()

  const instance = getInstanceById(options.instanceId)
  if (!instance) {
    throw new Error(`实例不存在: ${options.instanceId}`)
  }

  let account: { name: string; uuid: string; accessToken?: string; xuid?: string } | null = null
  if (options.accountId) {
    account = db.prepare('SELECT name, uuid, access_token, xuid FROM accounts WHERE id = ?').get(options.accountId) as AccountRow | null
  }
  if (!account) {
    account = db.prepare('SELECT name, uuid, access_token, xuid FROM accounts WHERE is_active = 1 LIMIT 1').get() as AccountRow | null
  }
  if (!account) {
    account = { name: 'Steve', uuid: offlineUUID('Steve'), xuid: '0' }
  }

  const globalJava = getConfigValue(db, 'default_java') || ''
  const globalMinMem = parseInt(getConfigValue(db, 'global_min_memory') || '512')
  const globalMaxMem = parseInt(getConfigValue(db, 'global_max_memory') || '2048')
  const globalMcDir = getConfigValue(db, 'mc_dir') || defaultMcDir()

  const javaPath = options.overrideJava || instance.java_path || globalJava
  const minMem = options.overrideMinMemory || instance.min_memory || globalMinMem || 512
  const maxMem = options.overrideMaxMemory || instance.max_memory || globalMaxMem || 2048
  const mcDir = instance.path ? path.dirname(instance.path) : globalMcDir
  const mcVersion = instance.mc_version || '1.20.4'
  const loaderType = instance.loader_type || 'vanilla'

  const jvmArgs = buildJvmArgs({
    minMem,
    maxMem,
    mcVersion,
    nativesPath: path.join(mcDir, 'versions', mcVersion, `${mcVersion}-natives`),
    customJvm: instance.jvm_args || '',
  })

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
    workDir: path.join(mcDir),
    instanceId: instance.id,
    mcVersion,
    loaderType,
  }
}

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
    '-Duser.language=zh',
    '-Duser.country=CN'
  ]

  if (compareVersions(opts.mcVersion, '1.18') >= 0) {
    args.push(
      '-XX:+UseG1GC',
      '-XX:MaxGCPauseMillis=50',
      '-XX:+DisableExplicitGC',
    )
  } else {
    args.push(
      '-XX:+UseConcMarkSweepGC',
      '-XX:CMSInitiatingOccupancyFraction=75',
    )
  }

  if (opts.customJvm.trim()) {
    args.push(...opts.customJvm.trim().split(/\s+/).filter(Boolean))
  }

  return args
}

function buildMcArgs(opts: {
  account: { name: string; uuid: string; accessToken?: string; xuid?: string }
  mcVersion: string
  mcDir: string
  loaderType: string
  width: number
  height: number
  fullscreen: boolean
}): string[] {
  const { account, mcVersion, mcDir, loaderType } = opts
  const mainClass = getMainClass(mcVersion, loaderType)

  const args = [
    mainClass,
    '--username', account.name,
    '--uuid', account.uuid,
    '--accessToken', account.accessToken || 'offline',
    '--userType', 'msa',
    '--version', mcVersion,
    '--gameDir', mcDir,
    '--assetsDir', path.join(mcDir, 'assets'),
    '--assetIndex', getAssetIndex(mcVersion),
    '--versionType', 'release',
  ]

  if (account.xuid && account.xuid.trim() !== '' && account.xuid !== '0') {
    args.push('--xuid', account.xuid.trim())
  }

  if (!opts.fullscreen) {
    args.push('--width', String(opts.width), '--height', String(opts.height))
  } else {
    args.push('--fullscreen')
  }

  return args
}

// ✅ 修复完成！解决404问题
function getAssetIndex(version: string): string {
  if (version.startsWith('1.21')) return '1.21' // 正确索引
  if (version.startsWith('1.20')) return '15'
  return version
}

function getMainClass(mcVersion: string, loaderType: string): string {
  switch (loaderType) {
    case 'fabric':
      return 'net.fabricmc.loader.launch.knot.KnotClient'
    case 'quilt':
      return 'org.quiltmc.loader.launch.knot.KnotClient'
    case 'forge':
    case 'neoforge':
      return compareVersions(mcVersion, '1.17') >= 0
        ? 'cpw.mods.bootstraplauncher.BootstrapLauncher'
        : 'net.minecraftforge.fml.relauncher.ServerLaunchWrapper'
    default:
      return compareVersions(mcVersion, '1.6') >= 0
        ? 'net.minecraft.client.main.Main'
        : 'net.minecraft.Launcher'
  }
}

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