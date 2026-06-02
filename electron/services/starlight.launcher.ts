/**
 * StarLight 风格的游戏启动器
 * 参考文档: https://wiki.conlux.studio/Launcher.html
 *
 * 模块化设计:
 * - LaunchConfig: 启动配置
 * - GameWindowConfig: 游戏窗口配置
 * - GameCoreConfig: 游戏核心配置
 * - JavaConfig: Java 配置
 * - Account: 账户信息
 */

import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const { join } = path

// ============ 配置类定义 ============

export interface Account {
  name: string
  uuid: string
  accessToken?: string | null
  xuid?: string | null
  userType?: 'msa' | 'legacy' | 'offline'
}

export interface GameWindowConfig {
  width: number
  height: number
  isFullScreen: boolean
}

export interface GameCoreConfig {
  root: string
  version: string
  isVersionIsolation: boolean
  ip?: string
  port?: string
  gameArguments?: string[]
}

export interface JavaConfig {
  javaPath: string
  maxMemory: number
  minMemory: number
  disabledOptimizationAdvancedArgs: boolean
  disabledOptimizationGcArgs: boolean
  advancedArguments?: string[]
  gcArguments?: string[]
}

export interface LaunchConfig {
  account: Account
  gameWindowConfig: GameWindowConfig
  gameCoreConfig: GameCoreConfig
  javaConfig: JavaConfig
}

export interface ProgressReport {
  phase: LaunchPhase
  message: string
  detail?: string
}

export type LaunchPhase =
  | 'idle'
  | 'validating-java'
  | 'checking-files'
  | 'launching-process'
  | 'running'
  | 'error'

export interface LaunchResponse {
  success: boolean
  error?: string
  pid?: number
}

// ============ 常量定义 ============

const BMCLAPI = 'https://bmclapi2.bangbang93.com'

// ============ 工具函数 ============

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

function extractJar(jarPath: string, destDir: string): Promise<void> {
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

// ============ 启动器类 ============

export class MinecraftLauncher {
  private launchConfig: LaunchConfig
  private process: ChildProcess | null = null
  private logger: (msg: string) => void

  public onOutput?: (output: string) => void
  public onError?: (error: string) => void

  constructor(launchConfig: LaunchConfig, logger?: (msg: string) => void) {
    this.launchConfig = launchConfig
    this.logger = logger || (() => {})
  }

  async launchAsync(
    onProgressChanged: (progress: ProgressReport) => void
  ): Promise<LaunchResponse> {
    const { gameCoreConfig, javaConfig, gameWindowConfig, account } = this.launchConfig
    const { root: gameDir, version: versionId } = gameCoreConfig

    // 1. 验证 Java
    onProgressChanged({ phase: 'validating-java', message: '正在验证 Java 环境...' })
    if (!(await this.validateJava(onProgressChanged))) {
      return { success: false, error: 'Java 验证失败' }
    }

    // 2. 解析版本 JSON
    const versionJson = await this.resolveVersionJson(gameDir, versionId)
    if (!versionJson) {
      return { success: false, error: `版本 ${versionId} 不存在` }
    }

    // 3. 补全游戏文件
    onProgressChanged({ phase: 'checking-files', message: '正在检查游戏文件...' })
    await this.completeGameFiles(gameDir, versionJson, onProgressChanged)

    // 4. 构建启动命令
    const command = this.buildLaunchCommand(gameDir, versionJson)

    // 5. 启动游戏进程
    onProgressChanged({ phase: 'launching-process', message: '正在启动游戏...' })
    return new Promise((resolve) => {
      this.process = spawn(command.javaPath, command.args, {
        cwd: gameDir,
        env: { ...process.env, LANG: 'zh_CN.UTF-8' }
      })

      this.process.on('spawn', () => {
        onProgressChanged({ phase: 'running', message: '游戏启动成功!' })
        resolve({ success: true, pid: this.process!.pid })
      })

      this.process.stdout?.on('data', (data) => {
        const output = data.toString('utf-8')
        this.logger(`[OUTPUT] ${output}`)
        this.onOutput?.(output)
      })

      this.process.stderr?.on('data', (data) => {
        const output = data.toString('utf-8')
        this.logger(`[ERROR] ${output}`)
        this.onError?.(output)
      })

      this.process.on('error', (err) => {
        onProgressChanged({ phase: 'error', message: `启动失败: ${err.message}` })
        resolve({ success: false, error: err.message })
      })

      this.process.on('exit', (code) => {
        onProgressChanged({ phase: 'idle', message: `游戏进程退出 (code=${code})` })
        if (code !== 0 && !this.process?.killed) {
          resolve({ success: false, error: `游戏异常退出 (code=${code})` })
        }
      })
    })
  }

  private async validateJava(
    onProgressChanged: (progress: ProgressReport) => void
  ): Promise<boolean> {
    const { javaPath } = this.launchConfig.javaConfig

    if (!fs.existsSync(javaPath)) {
      onProgressChanged({ phase: 'error', message: `Java 路径不存在: ${javaPath}` })
      return false
    }

    try {
      const version = await this.getJavaVersion(javaPath)
      this.logger(`[Java] 版本: ${version}`)
      return true
    } catch {
      onProgressChanged({ phase: 'error', message: '无法获取 Java 版本' })
      return false
    }
  }

  private async getJavaVersion(javaPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(javaPath, ['-version'])
      let version = ''
      proc.stderr?.on('data', (data) => {
        version += data.toString()
      })
      proc.on('exit', (code) => {
        if (code === 0) resolve(version.trim())
        else reject(new Error('获取 Java 版本失败'))
      })
      proc.on('error', reject)
    })
  }

  private resolveVersionJson(gameDir: string, versionId: string): any {
    const versionJsonPath = join(gameDir, 'versions', versionId, `${versionId}.json`)
    if (!fs.existsSync(versionJsonPath)) {
      this.logger(`[Launch] 版本 JSON 不存在: ${versionJsonPath}`)
      return null
    }
    try {
      return JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))
    } catch {
      this.logger(`[Launch] JSON 解析失败: ${versionJsonPath}`)
      return null
    }
  }

  private async completeGameFiles(
    gameDir: string,
    versionJson: any,
    onProgressChanged: (progress: ProgressReport) => void
  ): Promise<void> {
    const baseLibPath = join(gameDir, 'libraries')
    const assetsPath = join(gameDir, 'assets')

    // 下载缺失的 libraries
    const missingLibs: Array<{ url: string; path: string }> = []
    for (const lib of versionJson.libraries || []) {
      if (!this.checkLibRules(lib)) continue
      const dl = lib.downloads?.artifact
      if (!dl) continue

      const fullPath = join(baseLibPath, dl.path)
      if (!fs.existsSync(fullPath)) {
        const bmclUrl = `${BMCLAPI}/libraries/${dl.path}`
        missingLibs.push({ url: bmclUrl, path: fullPath })
      }
    }

    if (missingLibs.length > 0) {
      onProgressChanged({
        phase: 'checking-files',
        message: `正在补全支持库 (${missingLibs.length} 个)...`
      })
      for (let i = 0; i < missingLibs.length; i++) {
        const { url, path: destPath } = missingLibs[i]
        try {
          await downloadFile(url, destPath)
        } catch (e: any) {
          this.logger(`[Launch] 库文件下载失败: ${url}: ${e.message}`)
        }
      }
    }

    // 下载并解压 natives
    await this.downloadAndExtractNatives(gameDir, versionJson, onProgressChanged)

    // 下载 assets
    await this.downloadAssets(gameDir, versionJson, onProgressChanged)
  }

  private checkLibRules(lib: any): boolean {
    if (!lib.rules?.length) return true
    return lib.rules.every((rule: any) => {
      if (rule.action === 'allow') {
        if (rule.os?.name && rule.os.name !== process.platform) return false
        return true
      }
      return true
    })
  }

  private async downloadAndExtractNatives(
    gameDir: string,
    versionJson: any,
    onProgressChanged: (progress: ProgressReport) => void
  ): Promise<void> {
    const versionId = versionJson.id
    const nativesDir = join(gameDir, 'versions', versionId, `${versionId}-natives`)
    if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true })

    const key =
      process.platform === 'win32'
        ? 'natives-windows'
        : process.platform === 'darwin'
          ? 'natives-osx'
          : 'natives-linux'

    for (const lib of versionJson.libraries || []) {
      const nativeInfo = lib.downloads?.classifiers?.[key]
      if (!nativeInfo) continue

      const nativeUrl = nativeInfo.url || `${BMCLAPI}/libraries/${nativeInfo.path}`
      const jarName = path.basename(nativeInfo.path || `natives-${versionId}.jar`)
      const nativeJarPath = join(nativesDir, jarName)

      if (!fs.existsSync(nativeJarPath)) {
        try {
          await downloadFile(nativeUrl, nativeJarPath)
        } catch (e: any) {
          this.logger(`[Launch] natives 下载失败: ${nativeUrl}: ${e.message}`)
          continue
        }
      }

      try {
        await extractJar(nativeJarPath, nativesDir)
      } catch (e: any) {
        this.logger(`[Launch] natives 解压失败: ${nativeJarPath}: ${e.message}`)
      }
    }
  }

  private async downloadAssets(
    gameDir: string,
    versionJson: any,
    onProgressChanged: (progress: ProgressReport) => void
  ): Promise<void> {
    const assetIndexId = versionJson.assetIndex?.id
    if (!assetIndexId || !versionJson.assetIndex) return

    const assetsPath = join(gameDir, 'assets')
    const indexPath = join(assetsPath, 'indexes', `${assetIndexId}.json`)

    if (!fs.existsSync(indexPath)) {
      const indexUrl = versionJson.assetIndex.url.replace(
        'https://launchermeta.mojang.com',
        BMCLAPI
      )
      try {
        await downloadFile(indexUrl, indexPath)
      } catch (e: any) {
        this.logger(`[Launch] asset index 下载失败: ${indexUrl}: ${e.message}`)
        return
      }
    }

    if (!fs.existsSync(indexPath)) return

    try {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      const objects: Array<{ hash: string; size: number }> = Object.values(indexData.objects || {})

      for (const obj of objects) {
        const objPath = join(assetsPath, 'objects', obj.hash.substring(0, 2), obj.hash)
        if (!fs.existsSync(objPath)) {
          const objUrl = `${BMCLAPI}/assets/${obj.hash.substring(0, 2)}/${obj.hash}`
          try {
            await downloadFile(objUrl, objPath)
          } catch (e: any) {
            this.logger(`[Launch] 资源文件下载失败: ${objUrl}: ${e.message}`)
          }
        }
      }
    } catch (e: any) {
      this.logger(`[Launch] asset index 解析失败: ${e.message}`)
    }
  }

  private buildLaunchCommand(
    gameDir: string,
    versionJson: any
  ): { javaPath: string; args: string[] } {
    const { javaConfig, gameWindowConfig, gameCoreConfig, account } = this.launchConfig
    const {
      javaPath,
      maxMemory,
      minMemory,
      advancedArguments,
      gcArguments,
      disabledOptimizationAdvancedArgs,
      disabledOptimizationGcArgs
    } = javaConfig
    const { width, height } = gameWindowConfig
    const { version: versionId, gameArguments } = gameCoreConfig

    const args: string[] = []

    // Java 参数
    args.push(`-Xms${minMemory}M`, `-Xmx${maxMemory}M`)

    // 默认优化参数
    if (!disabledOptimizationGcArgs) {
      args.push(
        '-XX:+UseG1GC',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        '-XX:+DisableExplicitGC'
      )
    }
    if (gcArguments) args.push(...gcArguments)

    // Native 路径
    const nativesDir = join(gameDir, 'versions', versionId, `${versionId}-natives`)
    args.push(`-Djava.library.path=${nativesDir}`)

    // 编码和语言
    args.push('-Dfile.encoding=UTF-8', '-Duser.language=zh', '-Duser.country=CN')

    // 启动器信息
    args.push('-Dminecraft.launcher.brand=MCLA', '-Dminecraft.launcher.version=2.0.0')

    // 其他优化参数
    if (!disabledOptimizationAdvancedArgs) {
      args.push(
        '-Xss1M',
        `-Djna.tmpdir=${nativesDir}`,
        `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`,
        `-Dio.netty.native.workdir=${nativesDir}`
      )
    }
    if (advancedArguments) args.push(...advancedArguments)

    // Classpath
    const cp = this.buildClasspath(gameDir, versionJson)
    args.push('-cp', cp)

    // 主类
    args.push(versionJson.mainClass)

    // 游戏参数
    args.push(...this.buildGameArguments(gameDir, versionJson))

    return { javaPath, args }
  }

  private buildClasspath(gameDir: string, versionJson: any): string {
    const cp: string[] = []
    const baseLibPath = join(gameDir, 'libraries')

    for (const lib of versionJson.libraries || []) {
      if (!this.checkLibRules(lib)) continue
      const dl = lib.downloads?.artifact
      if (!dl) continue

      const fullPath = join(baseLibPath, dl.path)
      if (fs.existsSync(fullPath)) {
        cp.push(fullPath)
      }
    }

    // 添加版本 JAR
    cp.push(join(gameDir, 'versions', versionJson.id, `${versionJson.id}.jar`))

    // 跨平台 classpath 分隔符
    const separator = process.platform === 'win32' ? ';' : ':'
    return cp.join(separator)
  }

  private buildGameArguments(gameDir: string, versionJson: any): string[] {
    const { gameWindowConfig, gameCoreConfig, account } = this.launchConfig
    const { width, height } = gameWindowConfig
    const { version: versionId } = gameCoreConfig

    const hasMsa = !!(account.accessToken && account.xuid)
    const userType = hasMsa ? 'msa' : 'legacy'
    const clientId = `MCLA-${Date.now()}`
    const assetsDir = join(gameDir, 'assets')

    const replaceMap: Record<string, string> = {
      '${auth_player_name}': account.name,
      '${auth_uuid}': account.uuid,
      '${auth_access_token}': account.accessToken || 'offline',
      '${user_type}': userType,
      '${version_name}': versionId,
      '${game_directory}': gameDir,
      '${assets_root}': assetsDir,
      '${assets_index_name}': versionJson.assetIndex?.id || versionId,
      '${user_properties}': '{}',
      '${launcher_name}': 'MCLA',
      '${launcher_version}': '2.0.0',
      '${width}': String(width),
      '${height}': String(height),
      '${clientid}': clientId,
      '${auth_xuid}': account.xuid || ''
    }

    const args: string[] = []

    if (versionJson.arguments?.game) {
      const gameArgs = versionJson.arguments.game
      for (let i = 0; i < gameArgs.length; i++) {
        const entry = gameArgs[i]
        if (typeof entry === 'string') {
          const replaced = this.replacePlaceholders(entry, replaceMap)
          if (replaced && !replaced.startsWith('--quickPlay') && !replaced.includes('quickPlay')) {
            args.push(replaced)
          }
        } else if (entry.rules) {
          if (this.checkGameArgRules(entry.rules)) {
            const vals = Array.isArray(entry.value) ? entry.value : [entry.value]
            for (const v of vals) {
              const replaced = this.replacePlaceholders(v as string, replaceMap)
              if (
                replaced &&
                !replaced.startsWith('--quickPlay') &&
                !replaced.includes('quickPlay')
              ) {
                args.push(replaced)
              }
            }
          }
        }
      }
    } else if (versionJson.minecraftArguments) {
      const rawArgs = versionJson.minecraftArguments
      let replaced = rawArgs
      for (const [k, v] of Object.entries(replaceMap)) {
        replaced = replaced.replace(new RegExp(k.replace(/\$/g, '\\$'), 'g'), v)
      }
      args.push(...replaced.split(' ').filter((a: string) => a.trim() && !a.includes('quickPlay')))
    }

    // 添加服务器连接参数
    if (gameCoreConfig.ip) {
      args.push('--server', gameCoreConfig.ip)
      if (gameCoreConfig.port) {
        args.push('--port', gameCoreConfig.port)
      }
    }

    // 添加自定义游戏参数
    if (gameCoreConfig.gameArguments) {
      args.push(...gameCoreConfig.gameArguments)
    }

    return args
  }

  private checkGameArgRules(rules: any[]): boolean {
    return rules.every((rule: any) => {
      if (rule.action !== 'allow') return true
      if (rule.os?.name && rule.os.name !== process.platform) return false
      if (rule.os?.arch && process.arch !== rule.os.arch) return false
      return true
    })
  }

  private replacePlaceholders(str: string, replaceMap: Record<string, string>): string {
    let result = str
    for (const [k, v] of Object.entries(replaceMap)) {
      result = result.replace(new RegExp(k.replace(/\$/g, '\\$'), 'g'), v)
    }
    return result
  }

  terminate(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}
