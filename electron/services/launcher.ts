/**
 * 游戏启动服务
 * 负责 Java 检测、参数构建、进程管理和日志收集
 */

import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface LaunchOptions {
  instanceId: string
  accountId?: string
  // 实例配置覆盖（可选）
  javaPath?: string
  minMemory?: number
  maxMemory?: number
  jvmArgs?: string
  width?: number
  height?: number
  fullscreen?: boolean
}

// 当前运行的进程
let currentProcess: ChildProcess | null = null

/**
 * 构建 Minecraft 启动参数
 */
function buildLaunchArgs(
  instance: any,
  account: any,
  javaPath: string,
  mcDir: string
): string[] {
  const mcVersion = instance.mc_version || '1.20.4'
  const loaderType = instance.loader_type || 'vanilla'
  const minMem = instance.min_memory || 512
  const maxMem = instance.max_memory || 2048
  const customJvm = (instance.jvm_args || '').trim()
  const width = instance.width || 854
  const height = instance.height || 480
  const fullscreen = instance.fullscreen === 1

  // 基础 JVM 参数
  const jvmArgs = [
    `-Xms${minMem}M`,
    `-Xmx${maxMem}M`,
  ]

  // 根据版本调整 GC 策略
  if (compareVersions(mcVersion, '1.18') >= 0) {
    jvmArgs.push(
      '-XX:+UseG1GC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50',
      '-XX:G1HeapRegionSize=32M'
    )
  } else {
    jvmArgs.push(
      '-XX:+UseConcMarkSweepGC',
      '-XX:CMSInitiatingOccupancyFraction=75'
    )
  }

  // 用户自定义 JVM 参数
  if (customJvm) {
    jvmArgs.push(...customJvm.split(/\s+/).filter(Boolean))
  }

  // 窗口参数
  jvmArgs.push(`--width=${width}`, `--height=${height}`)
  if (fullscreen) {
    jvmArgs.push('--fullscreen')
  }

  // 工作目录和主类路径
  const versionPath = path.join(mcDir, 'versions', mcVersion)
  const jarPath = path.join(versionPath, `${mcVersion}.jar`)
  const nativesPath = path.join(versionPath, `${mcVersion}-natives`)

  // 构建完整参数列表
  return [
    ...jvmArgs,
    `-Djava.library.path=${nativesPath}`,
    `-Dminecraft.launcher.version=MCLA`,
    `-Dminecraft.launcher.brand=MCLA`,
    `-cp`, jarPath,
    getMainClass(mcVersion, loaderType)
  ]
}

/**
 * 获取游戏主类名
 */
function getMainClass(mcVersion: string, loaderType: string): string {
  switch (loaderType) {
    case 'fabric':
      return 'net.fabricmc.loader.launch.knot.KnotClient'
    case 'quilt':
      return 'org.quiltmc.loader.launch.knot.KnotClient'
    default:
      return compareVersions(mcVersion, '1.6') >= 0 ? 'net.minecraft.client.main.Main' : 'net.minecraft.Launcher'
  }
}

/**
 * 版本号比较辅助函数
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * 启动游戏实例
 */
export async function launchGame(
  mainWindow: BrowserWindow,
  options: LaunchOptions
): Promise<{ success: boolean; error?: string }> {
  // 如果已有运行中的进程，先终止
  if (currentProcess && !currentProcess.killed) {
    return { success: false, error: '已有游戏在运行中' }
  }

  try {
    const { app } = await import('electron')
    const mcDir = app.getPath('home')

    // TODO: 从数据库加载完整实例信息
    // 这里先用基础配置，后续接入数据库
    const instance = {
      id: options.instanceId,
      mc_version: '1.20.4',
      loader_type: 'vanilla',
      min_memory: options.minMemory || 512,
      max_memory: options.maxMemory || 2048,
      width: options.width || 854,
      height: options.height || 480,
      jvm_args: options.jvmArgs || '',
    }

    const account = {
      name: 'Steve',
      uuid: generateOfflineUUID('Steve'),
    }

    // 检测或使用指定 Java 路径
    const javaPath = options.javaPath || await detectJava()
    if (!javaPath) {
      return { success: false, error: '未找到 Java 运行环境，请在设置中配置' }
    }

    // 验证 Java 是否存在
    if (!fs.existsSync(javaPath)) {
      return { success: false, error: `Java 路径不存在: ${javaPath}` }
    }

    // 构建启动参数
    const launchArgs = buildLaunchArgs(instance, account, javaPath, mcDir)

    console.log(`[Launcher] 启动游戏: ${instance.id}`)
    console.log(`[Launcher] Java: ${javaPath}`)
    console.log(`[Launcher] 参数: ${launchArgs.join(' ')}`)

    // 启动进程
    currentProcess = spawn(javaPath, launchArgs, {
      cwd: path.join(mcDir, '.minecraft'),
      env: {
        ...process.env,
        _JAVA_OPTIONS: undefined, // 清除可能冲突的变量
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    let logBuffer = ''

    // 收集标准输出
    currentProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      mainWindow.webContents.send('game:log', text)

      // 发送到渲染进程显示日志
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:log', text)
      }
    })

    // 收集错误输出
    currentProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:log', text)
      }
    })

    // 进程退出处理
    currentProcess.on('exit', (code, signal) => {
      console.log(`[Launcher] 进程退出: code=${code}, signal=${signal}`)
      currentProcess = null

      // 通知前端
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:exit', code ?? -1)
      }

      // 分析崩溃原因
      if (code !== 0 && code !== null) {
        analyzeCrash(logBuffer, code)
      }
    })

    // 进程错误处理
    currentProcess.on('error', (err) => {
      console.error('[Launcher] 启动失败:', err.message)
      currentProcess = null
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game:error', err.message)
      }
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * 终止当前游戏进程
 */
export function terminateGame(): boolean {
  if (currentProcess && !currentProcess.killed) {
    try {
      // 先尝试正常关闭（Windows 上需要杀掉子进程树）
      if (process.platform === 'win32') {
        // Windows: 使用 taskkill 杀掉进程树
        spawn('taskkill', ['/pid', String(currentProcess.pid), '/T', '/F'], {
          stdio: 'ignore',
        })
      } else {
        currentProcess.kill('SIGTERM')
      }
      currentProcess = null
      return true
    } catch (e) {
      console.error('[Launcher] 终止进程失败:', e)
      return false
    }
  }
  return false
}

/**
 * 获取当前进程状态
 */
export function isRunning(): boolean {
  return currentProcess !== null && !currentProcess!.killed
}

/**
 * 自动检测 Java 安装
 */
export async function detectJava(): Promise<string | null> {
  const candidates: string[] = []

  if (process.platform === 'win32') {
    // Windows: 常见安装路径
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env['LOCALAPPDATA'] || ''

    candidates.push(
      `${programFiles}\\Java\\jdk-21\\bin\\java.exe`,
      `${programFiles}\\Java\\jdk-17\\bin\\java.exe`,
      `${localAppData}\\Programs\\AdoptOpenJDK\\jdk-17-hotspot\\bin\\java.exe`,
      `${programFiles}\\Microsoft\\jdk-17.0.x-hotspot\\bin\\java.exe`
    )
  } else if (process.platform === 'darwin') {
    candidates.push('/Library/Java/JavaVirtualMachines/jdk-17/Contents/Home/bin/java')
  } else {
    candidates.push('/usr/bin/java', '/usr/lib/jvm/java-17-openjdk/bin/java')
  }

  // 尝试从 PATH 找到 java
  try {
    const { execSync } = require('child_process')
    const whichResult = execSync('where java 2>nul || echo ""').toString().trim().split('\n')[0]
    if (whichResult) candidates.unshift(whichResult)
  } catch {}

  // 遍历候选路径
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`[Launcher] 找到 Java: ${candidate}`)
      return candidate
    }
  }

  return null
}

/**
 * 分析崩溃日志
 */
function analyzeCrash(log: string, exitCode: number): void {
  const lowerLog = log.toLowerCase()

  // 内存不足
  if (lowerLog.includes('outofmemoryerror') || lowerLog.includes('could not reserve enough space')) {
    console.warn('[Launcher] 崩溃原因: 内存不足')
    return
  }

  // Java 版本不兼容
  if (lowerLog.includes('unsupportedclassversion')) {
    console.warn('[Launcher] 崩溃原因: Java 版本不兼容')
    return
  }

  // 缺少文件
  if (lowerLog.includes('filenotfoundexception') || lowerLog.includes('nosuchfile')) {
    console.warn('[Launcher] 崩溃原因: 缺少必要文件')
    return
  }

  // OpenGL 问题
  if (lowerLog.includes('opengl') && lowerLog.includes('error')) {
    console.warn('[Launcher] 崩溃原因: GPU/驱动问题')
    return
  }

  console.log(`[Launcher] 崩溃分析: 退出码 ${exitCode}, 无法自动判断原因`)
}

/**
 * 生成离线 UUID
 */
function generateOfflineUUID(name: string): string {
  function md5hex(s: string): string {
    const crypto = require('crypto')
    return crypto.createHash('md5').update(`OfflinePlayer:${s}`).digest('hex')
  }

  const hash = md5hex(name)
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-')
}
