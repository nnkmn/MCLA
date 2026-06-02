/**
 * 游戏启动服务（StarLight 风格重构版）
 * 模块化设计：配置类 + 启动器类 + 辅助服务
 */

import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
const { join } = path
import { getDefaultJava, validateJava } from './java.management.service'
import { updateLastPlayed } from './instances'
import { getDatabase } from './database'
import { logger } from '../utils/logger'
const log = logger.child('GameLauncher')

// ===== 配置类定义 =====

export interface GameAccount {
  name: string
  uuid: string
  accessToken?: string | null
  xuid?: string | null
}

export interface GameWindowConfig {
  width: number
  height: number
  isFullScreen: boolean
}

export interface JavaConfig {
  javaPath: string
  maxMemory: number
  minMemory: number
  disabledOptimizationAdvancedArgs: boolean
  disabledOptimizationGcArgs: boolean
}

export interface GameCoreConfig {
  root: string
  version: string
  isVersionIsolation: boolean
  ip?: string
  port?: number
  gameArguments?: string[]
}

export interface LaunchConfig {
  account: GameAccount
  gameWindowConfig: GameWindowConfig
  gameCoreConfig: GameCoreConfig
  javaConfig: JavaConfig
}

// ===== 类型定义 =====

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

export interface CrashReport {
  type: string
  message: string
  suggestion?: string
  stackTrace?: string
}

// ===== 内部类型 =====

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
  arguments?: {
    game?: Array<string | { rules: unknown[]; value?: string | string[] }>
    jvm?: Array<string | { rules: unknown[]; value?: string | string[] }>
  }
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

interface AccountRow {
  name: string
  uuid: string
  access_token: string | null
  xuid: string | null
}

// ===== 常量 =====

const BMCLAPI = 'https://bmclapi2.bangbang93.com'

// ===== MinecraftLauncher 类 =====

class MinecraftLauncher {
  private currentProcess: ChildProcess | null = null
  private currentInstanceId: string | null = null
  private gameStatus: GameStatus = 'idle'
  private logBuffer = ''
  private mainWindow: BrowserWindow | null = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  get status(): GameStatus {
    return this.gameStatus
  }

  get pid(): number | null {
    return this.currentProcess?.pid ?? null
  }

  /**
   * 启动游戏
   */
  async launch(config: LaunchConfig): Promise<LaunchResult> {
    if (this.gameStatus === 'running' || this.gameStatus === 'launching') {
      return { success: false, error: '已有游戏在运行中，请先关闭' }
    }

    this.setStatus('launching')
    this.sendProgress('building-config', '正在构建启动参数...')
    this.logBuffer = ''

    try {
      const { account, gameWindowConfig, gameCoreConfig, javaConfig } = config

      // 1. 验证 Java
      this.sendProgress('validating-java', '正在检测 Java 环境...')
      const javaValidation = await this.validateJava(javaConfig, gameCoreConfig.version)
      if (!javaValidation.success) {
        this.sendProgress('error', 'Java 验证失败', javaValidation.error)
        this.setStatus('idle')
        return { success: false, error: javaValidation.error }
      }
      const javaPath = javaValidation.javaPath

      // 2. 解析版本信息
      this.sendProgress('checking-files', '正在检查版本信息...')
      const versionJson = await this.resolveVersionJson(gameCoreConfig)
      if (!versionJson) {
        this.sendProgress('error', '版本文件缺失', `找不到 ${gameCoreConfig.version} 的版本 JSON`)
        this.setStatus('idle')
        return { success: false, error: `版本文件不存在: ${gameCoreConfig.version}` }
      }

      // 3. 补全游戏文件
      this.sendProgress('checking-files', '正在检查支持库和资源文件...')
      await this.completeGameFiles(gameCoreConfig, versionJson)

      // 4. 处理继承版本
      const finalVersionJson = await this.resolveInheritedVersion(gameCoreConfig, versionJson)

      // 5. 构建类路径
      const classpath = await this.buildClasspath(gameCoreConfig, finalVersionJson)
      const classpathStr = classpath.join(process.platform === 'win32' ? ';' : ':')

      // 6. 构建启动参数
      const jvmArgs = this.buildJvmArguments(
        finalVersionJson,
        gameCoreConfig,
        javaConfig,
        classpathStr
      )
      const mcArgs = this.buildGameArguments(
        finalVersionJson,
        gameCoreConfig,
        account,
        gameWindowConfig
      )

      // 7. 启动进程
      log.info(
        `[GameLauncher] [launch] 准备启动游戏: version=${gameCoreConfig.version}, java=${javaPath}, account=${account.name}`
      )
      log.info(
        `[GameLauncher] [launch] JVM参数数量: ${jvmArgs.length}, MC参数数量: ${mcArgs.length}`
      )

      const result = await this.spawnProcess(
        javaPath,
        jvmArgs,
        mcArgs,
        finalVersionJson.mainClass,
        gameCoreConfig.root
      )

      if (result.success) {
        this.setStatus('running')
        this.sendProgress('running', '游戏运行中')
      } else {
        log.error(`[GameLauncher] [launch] 启动失败: ${result.error}`)
        this.sendProgress('error', '启动失败', result.error)
      }
      return result
    } catch (e: any) {
      log.error(`[GameLauncher] [launch] 异常: ${e.stack || e.message}`)
      this.sendProgress('error', '启动失败', e.message)
      this.setStatus('idle')
      return { success: false, error: e.message }
    }
  }

  /**
   * 终止游戏进程
   */
  terminate(): void {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGTERM')
      } catch {
        this.currentProcess.kill('SIGKILL')
      }
      this.currentProcess = null
    }
    this.currentInstanceId = null
    this.setStatus('idle')
  }

  /**
   * 验证 Java 环境
   */
  private async validateJava(
    javaConfig: JavaConfig,
    versionId: string
  ): Promise<{ success: boolean; javaPath: string; error?: string }> {
    const { javaPath: configJavaPath, maxMemory, minMemory } = javaConfig

    // 检查内存配置
    if (minMemory > maxMemory) {
      return { success: false, javaPath: '', error: '最小内存不能大于最大内存' }
    }

    // 如果配置了路径，直接使用
    if (configJavaPath && fs.existsSync(configJavaPath)) {
      return { success: true, javaPath: configJavaPath }
    }

    // 否则自动选择
    const defaultJava = await getDefaultJava(versionId)
    if (!defaultJava) {
      return { success: false, javaPath: '', error: '未找到 Java，请在设置中配置 Java' }
    }

    log.info(`[validateJava] 自动选择 Java: ${defaultJava.vendor} ${defaultJava.version}`)
    this.sendProgress(
      'validating-java',
      `自动选择 Java: ${defaultJava.vendor} ${defaultJava.version}`
    )
    return { success: true, javaPath: defaultJava.path }
  }

  /**
   * 解析版本 JSON
   */
  private async resolveVersionJson(gameCoreConfig: GameCoreConfig): Promise<VersionJson | null> {
    const { root, version } = gameCoreConfig
    const versionJsonPath = join(root, 'versions', version, `${version}.json`)

    if (!fs.existsSync(versionJsonPath)) {
      log.error(`[resolveVersionJson] 版本 JSON 不存在: ${versionJsonPath}`)
      return null
    }

    try {
      return JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))
    } catch (e) {
      log.error(`[resolveVersionJson] JSON 解析失败: ${versionJsonPath}`, e)
      return null
    }
  }

  /**
   * 解析继承版本
   */
  private async resolveInheritedVersion(
    gameCoreConfig: GameCoreConfig,
    versionJson: VersionJson
  ): Promise<VersionJson> {
    if (!versionJson.inheritsFrom) {
      return versionJson
    }

    const parentJson = await this.resolveVersionJson({
      ...gameCoreConfig,
      version: versionJson.inheritsFrom
    })

    if (!parentJson) {
      return versionJson
    }

    return {
      ...parentJson,
      ...versionJson,
      libraries: [...(versionJson.libraries || []), ...(parentJson.libraries || [])]
    }
  }

  /**
   * 补全游戏文件
   */
  private async completeGameFiles(
    gameCoreConfig: GameCoreConfig,
    versionJson: VersionJson
  ): Promise<void> {
    const { root } = gameCoreConfig
    const baseLibPath = join(root, 'libraries')
    const assetsPath = join(root, 'assets')

    // 1. 下载缺失的 libraries
    const missingLibs: Array<{ url: string; path: string }> = []
    for (const lib of versionJson.libraries || []) {
      if (!this.checkLibRules(lib.rules)) continue

      const dl = lib.downloads?.artifact
      if (!dl) continue

      const fullPath = join(baseLibPath, dl.path)
      if (!fs.existsSync(fullPath)) {
        const bmclUrl = `${BMCLAPI}/libraries/${dl.path}`
        missingLibs.push({ url: bmclUrl, path: fullPath })
      }
    }

    if (missingLibs.length > 0) {
      this.sendProgress('checking-files', `正在补全支持库 (${missingLibs.length} 个)...`)
      for (let i = 0; i < missingLibs.length; i++) {
        const { url, path: destPath } = missingLibs[i]
        this.sendProgress(
          'checking-files',
          `正在补全支持库 (${i + 1}/${missingLibs.length})`,
          path.basename(destPath)
        )
        try {
          await this.downloadFile(url, destPath)
        } catch (e: any) {
          log.warn(`[completeGameFiles] 库文件下载失败: ${url} -> ${destPath}: ${e.message}`)
        }
      }
    }

    // 2. 下载并解压 natives
    await this.downloadAndExtractNatives(root, versionJson)

    // 3. 下载 assets
    await this.downloadAssets(root, versionJson)
  }

  /**
   * 检查库文件规则
   */
  private checkLibRules(rules?: Array<{ action: string; os?: { name?: string } }>): boolean {
    if (!rules?.length) return true

    return rules.every((rule) => {
      if (rule.action === 'allow') {
        if (rule.os?.name && rule.os.name !== process.platform) return false
        return true
      }
      return true
    })
  }

  /**
   * 下载并解压 natives
   */
  private async downloadAndExtractNatives(
    gameDir: string,
    versionJson: VersionJson
  ): Promise<void> {
    const versionId = versionJson.id
    const nativesDir = join(gameDir, 'versions', versionId, `${versionId}-natives`)
    if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true })

    for (const lib of versionJson.libraries || []) {
      const classifiers = lib.downloads?.classifiers
      if (!classifiers) continue

      const key =
        process.platform === 'win32'
          ? 'natives-windows'
          : process.platform === 'darwin'
            ? 'natives-osx'
            : 'natives-linux'

      const nativeInfo = classifiers[key]
      if (!nativeInfo) continue

      const nativeUrl = nativeInfo.url || `${BMCLAPI}/libraries/${nativeInfo.path}`
      const jarName = path.basename(nativeInfo.path || `natives-${versionId}.jar`)
      const nativeJarPath = join(nativesDir, jarName)

      if (!fs.existsSync(nativeJarPath)) {
        this.sendProgress('checking-files', `下载原生库: ${jarName}`)
        try {
          await this.downloadFile(nativeUrl, nativeJarPath)
        } catch (e: any) {
          log.warn(`[natives] 下载失败: ${nativeUrl}, ${e.message}`)
          continue
        }
      }

      try {
        this.sendProgress('checking-files', `解压原生库: ${jarName}`)
        await this.extractJar(nativeJarPath, nativesDir)
      } catch (e: any) {
        log.warn(`[natives] 解压失败: ${nativeJarPath}, ${e.message}`)
      }
    }
  }

  /**
   * 下载资源文件
   */
  private async downloadAssets(gameDir: string, versionJson: VersionJson): Promise<void> {
    const assetIndexId = versionJson.assetIndex?.id
    if (!assetIndexId || !versionJson.assetIndex) return

    const assetsPath = join(gameDir, 'assets')
    const indexPath = join(assetsPath, 'indexes', `${assetIndexId}.json`)

    if (!fs.existsSync(indexPath)) {
      this.sendProgress('checking-files', '正在下载资源索引...')
      const indexUrl = versionJson.assetIndex.url.replace(
        'https://launchermeta.mojang.com',
        BMCLAPI
      )
      try {
        await this.downloadFile(indexUrl, indexPath)
      } catch (e: any) {
        log.warn(`[downloadAssets] asset index 下载失败: ${indexUrl}: ${e.message}`)
        return
      }
    }

    if (fs.existsSync(indexPath)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
        const objects: Array<{ hash: string; size: number }> = Object.values(
          indexData.objects || {}
        )

        let missingCount = 0
        for (const obj of objects) {
          const objPath = join(assetsPath, 'objects', obj.hash.substring(0, 2), obj.hash)
          if (!fs.existsSync(objPath)) missingCount++
        }

        if (missingCount > 0) {
          this.sendProgress('checking-files', `正在补全资源文件 (${missingCount} 个)...`)
          let done = 0
          for (const obj of objects) {
            const objPath = join(assetsPath, 'objects', obj.hash.substring(0, 2), obj.hash)
            if (!fs.existsSync(objPath)) {
              const objUrl = `${BMCLAPI}/assets/${obj.hash.substring(0, 2)}/${obj.hash}`
              try {
                await this.downloadFile(objUrl, objPath)
              } catch (e: any) {
                log.warn(`[downloadAssets] 资源文件下载失败: ${objUrl}: ${e.message}`)
              }
              done++
              if (done % 50 === 0) {
                this.sendProgress('checking-files', `正在补全资源文件 (${done}/${missingCount})`)
              }
            }
          }
        }
      } catch (e: any) {
        log.warn(`[downloadAssets] asset index 解析失败: ${e.message}`)
      }
    }
  }

  /**
   * 构建类路径
   */
  private async buildClasspath(
    gameCoreConfig: GameCoreConfig,
    versionJson: VersionJson
  ): Promise<string[]> {
    const { root, version } = gameCoreConfig
    const baseLibPath = join(root, 'libraries')
    const cp: string[] = []

    for (const lib of versionJson.libraries || []) {
      if (!this.checkLibRules(lib.rules)) continue

      const dl = lib.downloads?.artifact
      if (!dl) continue

      const fullPath = join(baseLibPath, dl.path)
      if (fs.existsSync(fullPath)) {
        cp.push(fullPath)
      } else {
        log.warn(`[buildClasspath] 库文件缺失: ${fullPath}`)
      }
    }

    const versionJar = join(root, 'versions', version, `${version}.jar`)
    if (fs.existsSync(versionJar)) {
      cp.push(versionJar)
    }

    return cp
  }

  /**
   * 构建 JVM 参数
   */
  private buildJvmArguments(
    versionJson: VersionJson,
    gameCoreConfig: GameCoreConfig,
    javaConfig: JavaConfig,
    classpathStr: string
  ): string[] {
    const { root, version } = gameCoreConfig
    const { maxMemory, minMemory, disabledOptimizationGcArgs, disabledOptimizationAdvancedArgs } =
      javaConfig

    const args: string[] = []

    // 内存参数
    args.push(`-Xms${minMemory}M`, `-Xmx${maxMemory}M`)

    // natives 路径
    const nativesPath = join(root, 'versions', version, `${version}-natives`)
    args.push(`-Djava.library.path=${nativesPath}`)

    // 基础系统参数
    args.push(
      '-Dfile.encoding=UTF-8',
      '-Duser.language=zh',
      '-Duser.country=CN',
      '-Dminecraft.launcher.brand=MCLA',
      '-Dminecraft.launcher.version=2.0.0'
    )

    // 处理版本自带 JVM 参数
    if (versionJson.arguments?.jvm) {
      // 检查是否包含实验性 JVM 选项，需要先添加解锁选项
      const hasExperimentalOption = versionJson.arguments.jvm.some((entry) => {
        if (typeof entry === 'string') {
          return entry.includes('G1NewSizePercent') || entry.includes('UnlockExperimental')
        }
        if (entry.value) {
          const values = Array.isArray(entry.value) ? entry.value : [entry.value]
          return values.some((v) => (v as string).includes('G1NewSizePercent'))
        }
        return false
      })

      if (hasExperimentalOption && !args.includes('-XX:+UnlockExperimentalVMOptions')) {
        args.push('-XX:+UnlockExperimentalVMOptions')
      }
      for (const entry of versionJson.arguments.jvm) {
        if (typeof entry === 'string') {
          const val = entry
            .replace(/\$\{natives_directory\}/g, nativesPath)
            .replace(/\$\{launcher_name\}/g, 'MCLA')
            .replace(/\$\{launcher_version\}/g, '2.0.0')
            .replace(/\${classpath}/g, '')
            .trim()

          if (!val || val.startsWith('-cp')) continue

          if (val.includes('=') && val.includes('Main')) {
            const eqIdx = val.indexOf('=')
            const fabricFlag = val.substring(0, eqIdx + 1).trimEnd()
            if (fabricFlag) args.push(fabricFlag)
          } else {
            args.push(val)
          }
        } else if (entry.rules) {
          const allowed = this.checkJvmRules(
            entry.rules as Array<{ action: string; os?: { name?: string | undefined } | undefined }>
          )
          if (allowed && entry.value) {
            const vals = Array.isArray(entry.value) ? entry.value : [entry.value]
            for (const v of vals) {
              const val = (v as string)
                .replace(/\$\{natives_directory\}/g, nativesPath)
                .replace(/\${classpath}/g, '')
                .trim()
              if (val && !val.startsWith('-cp')) args.push(val)
            }
          }
        }
      }
    }

    // GC 参数（1.18+）
    if (!disabledOptimizationGcArgs && this.compareVersions(version, '1.18') >= 0) {
      args.push('-XX:+UseG1GC', '-XX:MaxGCPauseMillis=50', '-XX:+DisableExplicitGC')
    }

    // 高级优化参数
    if (!disabledOptimizationAdvancedArgs) {
      args.push('-Xss1M')
    }

    // 去重 + 过滤空值
    return Array.from(new Set(args.filter(Boolean)))
  }

  /**
   * 检查 JVM 规则
   */
  private checkJvmRules(
    rules: Array<{ action: string; os?: { name?: string | undefined } | undefined }>
  ): boolean {
    return rules.every((rule) => {
      if (rule.action === 'allow' && rule.os?.name && rule.os.name !== process.platform)
        return false
      return true
    })
  }

  /**
   * 构建游戏参数
   */
  private buildGameArguments(
    versionJson: VersionJson,
    gameCoreConfig: GameCoreConfig,
    account: GameAccount,
    windowConfig: GameWindowConfig
  ): string[] {
    const args: string[] = []
    const { root, version } = gameCoreConfig
    const { width, height } = windowConfig
    const clientId = `MCLA-${Date.now()}`
    const versionType = 'release'
    const assetsDir = join(root, 'assets')

    const hasMsa = !!(account.accessToken && account.xuid)
    const userType = hasMsa ? 'msa' : 'legacy'
    const isOffline = !account.accessToken || !hasMsa

    const replaceMap: Record<string, string> = {
      '${auth_player_name}': account.name,
      '${auth_uuid}': account.uuid,
      '${auth_access_token}': account.accessToken || 'offline',
      '${user_type}': userType,
      '${version_name}': version,
      '${game_directory}': root,
      '${assets_root}': assetsDir,
      '${assets_index_name}': versionJson.assetIndex?.id || version,
      '${user_properties}': '{}',
      '${launcher_name}': 'MCLA',
      '${launcher_version}': '2.0.0',
      '${width}': String(width),
      '${height}': String(height),
      '${clientid}': clientId,
      '${auth_xuid}': account.xuid || '',
      '${version_type}': versionType,
      '${resolution_width}': String(width),
      '${resolution_height}': String(height)
    }

    // 旧格式参数
    if (versionJson.minecraftArguments) {
      let str = versionJson.minecraftArguments
      for (const [k, v] of Object.entries(replaceMap)) {
        str = str.replace(new RegExp(k.replace(/\$/g, '\\$'), 'g'), v)
      }
      args.push(...str.split(' ').filter(Boolean))
    }

    // 新格式参数
    if (versionJson.arguments?.game) {
      args.push(...this.parseGameArguments(versionJson.arguments.game, replaceMap, { isOffline }))
    }

    // 添加自定义参数
    if (gameCoreConfig.gameArguments?.length) {
      args.push(...gameCoreConfig.gameArguments)
    }

    // 过滤 quickPlay 和空参数
    return args.filter(
      (item) => !item.includes('quickPlay') && !item.startsWith('${quickPlay') && item.trim() !== ''
    )
  }

  /**
   * 解析游戏参数
   */
  private parseGameArguments(
    gameArgArray: Array<string | { rules?: any[]; value?: string | string[] }>,
    replaceMap: Record<string, string>,
    extraRules: { isOffline: boolean }
  ): string[] {
    const args: string[] = []

    const replacePlaceholders = (str: string): string => {
      let result = str
      for (const [k, v] of Object.entries(replaceMap)) {
        result = result.replace(new RegExp(k.replace(/\$/g, '\\$'), 'g'), v)
      }
      return result
    }

    const checkFeatureRules = (rules: any[]): boolean => {
      return rules.every((rule) => {
        if (rule.action !== 'allow') return true
        if (rule.os?.name && rule.os.name !== process.platform) return false
        if (rule.os?.arch && process.arch !== rule.os.arch) return false
        if (rule.features) {
          if (rule.features['is_demo_user'] === true && !extraRules.isOffline) return false
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
          } else {
            args.push(key, replacePlaceholders(rawValue))
          }
        } else {
          if (!entry.startsWith('--')) {
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

    return args.filter(
      (item) => !item.startsWith('--quickPlay') && !item.includes('quickPlay') && item.trim() !== ''
    )
  }

  /**
   * 启动进程
   */
  private async spawnProcess(
    javaPath: string,
    jvmArgs: string[],
    mcArgs: string[],
    mainClass: string,
    cwd: string
  ): Promise<LaunchResult> {
    const allArgs = [...jvmArgs, '-cp', jvmArgs.includes('-cp') ? '' : '', mainClass, ...mcArgs]

    // 移除重复的 -cp 和空参数
    const cleanArgs = allArgs.filter((arg, index) => {
      if (arg === '-cp' && allArgs[index + 1] === '') return false
      if (arg === '' && allArgs[index - 1] === '-cp') return false
      return arg.trim() !== ''
    })

    log.info(`[spawnProcess] Java: ${javaPath}`)
    log.info(`[spawnProcess] 工作目录: ${cwd}`)
    log.info(`[spawnProcess] 主类: ${mainClass}`)
    log.info(`[spawnProcess] 完整命令: ${javaPath} ${cleanArgs.join(' ')}`)

    this.sendProgress('launching-process', '正在启动游戏进程...')

    // 设置环境变量（移除可能干扰的变量）
    const spawnEnv: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(process.env)) {
      if (k === '_JAVA_OPTIONS' || k === 'JDK_JAVA_OPTIONS') {
        spawnEnv[k] = undefined
      } else {
        spawnEnv[k] = v
      }
    }

    return new Promise((resolve) => {
      this.currentProcess = spawn(javaPath, cleanArgs, {
        cwd,
        env: spawnEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      })

      this.currentInstanceId = cwd

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        this.logBuffer += text
        this.sendToWindow('game:log', { text, level: 'info' })
      })

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        this.logBuffer += text
        this.sendToWindow('game:log', { text, level: 'error' })
      })

      const processRef = this.currentProcess
      this.currentProcess.on('exit', (code, signal) => {
        log.info(`[spawnProcess] 进程退出: code=${code}, signal=${signal}`)
        const exitedId = this.currentInstanceId
        this.currentProcess = null
        this.currentInstanceId = null
        this.setStatus('idle')
        this.sendToWindow('game:exit', { code: code ?? -1, signal, instanceId: exitedId })

        if (code !== 0 && this.logBuffer.length > 0) {
          this.saveCrashLog(this.logBuffer)
        }

        if (code === 0) {
          resolve({ success: true, pid: processRef?.pid })
        } else {
          const crash = this.analyzeCrash(this.logBuffer, code ?? -1)
          if (crash) {
            this.sendToWindow('game:crash', crash)
            resolve({ success: false, error: `${crash.message}: ${crash.suggestion}` })
          } else {
            resolve({ success: false, error: `进程异常退出，代码: ${code}` })
          }
        }
      })

      this.currentProcess.on('error', (err) => {
        log.error('[spawnProcess] 启动失败:', err.message)
        this.currentProcess = null
        this.currentInstanceId = null
        this.setStatus('idle')
        this.sendToWindow('game:error', { message: err.message })
        this.sendProgress('error', '启动失败', err.message)
        resolve({ success: false, error: err.message })
      })
    })
  }

  /**
   * 分析崩溃日志
   */
  private analyzeCrash(logBuffer: string, exitCode: number): CrashReport | null {
    if (logBuffer.includes('OutOfMemoryError')) {
      return {
        type: 'OutOfMemory',
        message: '内存不足',
        suggestion: '请降低最大内存设置，或关闭其他占用内存的程序',
        stackTrace: this.extractStackTrace(logBuffer)
      }
    }

    if (
      logBuffer.includes('UnsatisfiedLinkError') ||
      logBuffer.includes('Native code library failed to load')
    ) {
      return {
        type: 'NativeLibraryError',
        message: '原生库加载失败',
        suggestion: '请重新下载游戏文件，或更新显卡驱动',
        stackTrace: this.extractStackTrace(logBuffer)
      }
    }

    if (logBuffer.includes('java.lang.ClassNotFoundException')) {
      return {
        type: 'ClassNotFound',
        message: '类文件缺失',
        suggestion: '请重新下载游戏文件',
        stackTrace: this.extractStackTrace(logBuffer)
      }
    }

    if (exitCode === 1) {
      const logPath = path.join(app.getPath('userData'), 'logs', 'latest.log')
      return {
        type: 'GenericError',
        message: '游戏启动失败',
        suggestion: `请检查日志获取更多信息。日志位置: ${logPath}。常见原因：Java版本不兼容（1.20.x需要Java 17）、游戏文件缺失、内存不足。`,
        stackTrace: this.extractStackTrace(logBuffer)
      }
    }

    return null
  }

  /**
   * 提取堆栈跟踪
   */
  private extractStackTrace(logBuffer: string): string | undefined {
    const lines = logBuffer.split('\n')
    const stackStart = lines.findIndex((line) => line.startsWith('java.lang.'))
    if (stackStart === -1) return undefined

    const stackEnd = lines
      .slice(stackStart)
      .findIndex((line) => !line.startsWith('\t') && !line.startsWith('java.lang.'))
    const stackLines =
      stackEnd === -1
        ? lines.slice(stackStart, stackStart + 20)
        : lines.slice(stackStart, stackStart + stackEnd)

    return stackLines.join('\n')
  }

  /**
   * 保存崩溃日志到文件
   */
  private saveCrashLog(logBuffer: string): void {
    try {
      const logsDir = path.join(app.getPath('userData'), 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const logPath = path.join(logsDir, `crash-${timestamp}.log`)

      fs.writeFileSync(logPath, logBuffer, 'utf-8')
      log.info(`[saveCrashLog] 崩溃日志已保存到: ${logPath}`)
    } catch (e) {
      log.error(`[saveCrashLog] 保存日志失败: ${e}`)
    }
  }

  /**
   * 下载文件
   */
  private downloadFile(url: string, destPath: string, timeout = 30000): Promise<void> {
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
        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('下载超时'))
      })
    })
  }

  /**
   * 解压 JAR
   */
  private extractJar(jarPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(jarPath)) return resolve()
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

      if (process.platform === 'win32') {
        const psScript = [
          '[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null',
          `[System.IO.Compression.ZipFile]::ExtractToDirectory('${jarPath.replace(/'/g, "''")}', '${destDir.replace(/'/g, "''")}')`
        ].join('\n')

        const tmpPs = join(require('os').tmpdir(), `mcla-extract-${Date.now()}.ps1`)
        fs.writeFileSync(tmpPs, psScript, 'utf-8')

        const ps = spawn('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          tmpPs
        ])
        let errMsg = ''
        ps.stderr?.on('data', (d: Buffer) => {
          errMsg += d.toString()
        })
        ps.on('exit', (code) => {
          try {
            fs.unlinkSync(tmpPs)
          } catch {}
          if (code === 0) resolve()
          else reject(new Error(`PowerShell 解压失败(code=${code}): ${errMsg}`))
        })
        ps.on('error', reject)
      } else {
        const unzip = spawn('unzip', ['-o', jarPath, '-d', destDir])
        let errMsg = ''
        unzip.stderr?.on('data', (d: Buffer) => {
          errMsg += d.toString()
        })
        unzip.on('exit', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`unzip 失败(code=${code}): ${errMsg}`))
        })
        unzip.on('error', reject)
      }
    })
  }

  /**
   * 版本比较
   */
  private compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1
      if ((pa[i] || 0) < (pb[i] || 0)) return -1
    }
    return 0
  }

  /**
   * 设置状态
   */
  private setStatus(status: GameStatus): void {
    this.gameStatus = status
    this.sendToWindow('game:status', { status })
  }

  /**
   * 发送进度
   */
  private sendProgress(phase: LaunchPhase, message: string, detail?: string): void {
    this.sendToWindow('game:progress', { phase, message, detail })
  }

  /**
   * 发送消息到窗口
   */
  private sendToWindow(channel: string, data: unknown): void {
    if (this.mainWindow && this.mainWindow.webContents) {
      try {
        this.mainWindow.webContents.send(channel, data)
      } catch (e) {
        log.warn(`[sendToWindow] 发送失败: ${channel}`, e)
      }
    }
  }
}

// ===== 全局实例管理 =====

let launcherInstance: MinecraftLauncher | null = null

function getLauncher(mainWindow: BrowserWindow): MinecraftLauncher {
  if (!launcherInstance) {
    launcherInstance = new MinecraftLauncher(mainWindow)
  }
  return launcherInstance
}

// ===== 公共 API =====

/**
 * 创建启动配置
 */
export function createLaunchConfig(
  mainWindow: BrowserWindow,
  options: {
    versionId: string
    accountId?: string
    gameDir?: string
    width?: number
    height?: number
    maxMemory?: number
    minMemory?: number
  }
): LaunchConfig {
  const db = getDatabase()

  // 获取游戏目录
  let mcDir = options.gameDir
  if (!mcDir) {
    const lastFolder = db
      .prepare("SELECT value FROM configs WHERE key = 'last_selected_folder'")
      .get() as { value: string } | undefined
    if (lastFolder?.value && fs.existsSync(lastFolder.value)) {
      mcDir = lastFolder.value
    }
  }
  if (!mcDir) {
    const customPath = db
      .prepare("SELECT value FROM configs WHERE key = 'custom_minecraft_path'")
      .get() as { value: string } | undefined
    if (customPath?.value && fs.existsSync(customPath.value)) {
      mcDir = customPath.value
    }
  }
  if (!mcDir || !fs.existsSync(mcDir)) {
    mcDir = defaultMcDir()
  }

  // 获取账户
  let account: GameAccount = { name: 'Steve', uuid: offlineUUID('Steve') }

  if (options.accountId) {
    const row = db
      .prepare('SELECT name, uuid, access_token, xuid FROM accounts WHERE id = ?')
      .get(options.accountId) as AccountRow | undefined
    if (row) {
      account = {
        name: row.name,
        uuid: row.uuid,
        accessToken: row.access_token,
        xuid: row.xuid
      }
    }
  }

  const activeRow = db
    .prepare('SELECT name, uuid, access_token, xuid FROM accounts WHERE is_active = 1 LIMIT 1')
    .get() as AccountRow | undefined
  if (activeRow) {
    account = {
      name: activeRow.name,
      uuid: activeRow.uuid,
      accessToken: activeRow.access_token,
      xuid: activeRow.xuid
    }
  }

  // 获取内存设置
  const memRow = db.prepare("SELECT value FROM configs WHERE key = 'global_max_memory'").get() as
    | { value: string }
    | undefined
  const maxMem = options.maxMemory || parseInt(memRow?.value || '2048')
  const minMem = options.minMemory || Math.min(512, Math.floor(maxMem / 4))

  // 获取 Java 路径
  const presetRow = db.prepare("SELECT value FROM configs WHERE key = 'java_preset'").get() as
    | { value: string }
    | undefined
  const preset = presetRow?.value || 'auto'
  const customJavaRow = db
    .prepare("SELECT value FROM configs WHERE key = 'java_custom_path'")
    .get() as { value: string } | undefined
  const customJavaPath = customJavaRow?.value || ''

  return {
    account,
    gameWindowConfig: {
      width: options.width || 854,
      height: options.height || 480,
      isFullScreen: false
    },
    gameCoreConfig: {
      root: mcDir,
      version: options.versionId,
      isVersionIsolation: false
    },
    javaConfig: {
      javaPath:
        preset === 'custom' && customJavaPath && fs.existsSync(customJavaPath)
          ? customJavaPath
          : '',
      maxMemory: maxMem,
      minMemory: minMem,
      disabledOptimizationAdvancedArgs: false,
      disabledOptimizationGcArgs: false
    }
  }
}

/**
 * 按版本 ID 启动游戏（主入口）
 */
export async function launchByVersion(
  mainWindow: BrowserWindow,
  options: { versionId: string; accountId?: string }
): Promise<LaunchResult> {
  const config = createLaunchConfig(mainWindow, options)
  const launcher = getLauncher(mainWindow)
  return launcher.launch(config)
}

/**
 * 按实例启动游戏
 */
export async function launchGame(
  mainWindow: BrowserWindow,
  options: { instanceId: string; accountId?: string }
): Promise<LaunchResult> {
  const db = getDatabase()
  const instance = db
    .prepare('SELECT version_id FROM instances WHERE id = ?')
    .get(options.instanceId) as { version_id: string } | undefined

  if (!instance) {
    return { success: false, error: '实例不存在' }
  }

  return launchByVersion(mainWindow, {
    versionId: instance.version_id,
    accountId: options.accountId
  })
}

/**
 * 终止游戏
 */
export function terminateGame(): void {
  if (launcherInstance) {
    launcherInstance.terminate()
  }
}

/**
 * 获取当前状态
 */
export function getGameStatus(): GameStatus {
  return launcherInstance?.status ?? 'idle'
}

/**
 * 检查游戏是否正在运行
 */
export function isRunning(): boolean {
  return launcherInstance?.status === 'running'
}

/**
 * 获取当前日志
 */
export function getCurrentLog(): string {
  return launcherInstance ? (launcherInstance as any).logBuffer || '' : ''
}

// ===== 工具函数 =====

function offlineUUID(name: string): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${name}`).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-')
}

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
