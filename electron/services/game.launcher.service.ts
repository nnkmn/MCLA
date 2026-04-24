/**
 * 游戏启动服务（增强版）
 * 整合 launch.config.service + java.management.service
 * 负责参数构建、进程管理、日志收集、崩溃分析
 */

import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { buildLaunchConfig, BuildLaunchConfigOptions } from './launch.config.service'
import { getDefaultJava, validateJava } from './java.management.service'
import { updateLastPlayed } from './instances'

export interface LaunchResult {
  success: boolean
  error?: string
  pid?: number
}

export type GameStatus = 'idle' | 'launching' | 'running' | 'exiting'

// 运行状态
let currentProcess: ChildProcess | null = null
let currentInstanceId: string | null = null
let gameStatus: GameStatus = 'idle'
let logBuffer = ''

// ===== 公共 API =====

/** 启动游戏实例 */
export async function launchGame(
  mainWindow: BrowserWindow,
  options: BuildLaunchConfigOptions
): Promise<LaunchResult> {

  if (gameStatus === 'running' || gameStatus === 'launching') {
    return { success: false, error: '已有游戏在运行中，请先关闭' }
  }

  setStatus(mainWindow, 'launching')
  logBuffer = ''

  try {
    // 1. 构建启动配置（从 DB 读取实例和账户）
    let config: ReturnType<typeof buildLaunchConfig>
    try {
      config = buildLaunchConfig(options)
    } catch (e: any) {
      setStatus(mainWindow, 'idle')
      return { success: false, error: e.message }
    }

    // 2. 校验/获取 Java
    let javaPath = config.javaPath
    if (!javaPath) {
      const defaultJava = await getDefaultJava()
      if (!defaultJava) {
        setStatus(mainWindow, 'idle')
        return { success: false, error: '未找到 Java，请在设置 → Java 管理中配置' }
      }
      javaPath = defaultJava.path
    }

    // 验证 Java 可执行
    const javaInfo = await validateJava(javaPath)
    if (!javaInfo) {
      setStatus(mainWindow, 'idle')
      return { success: false, error: `Java 无效或无法执行: ${javaPath}` }
    }

    // 3. 验证游戏文件存在
    const gameDir = config.workDir
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true })
    }

    // 4. 组合参数：jvmArgs + mcArgs
    const allArgs = [...config.jvmArgs, ...config.mcArgs]

    console.log(`[GameLauncher] 启动实例: ${config.instanceId}`)
    console.log(`[GameLauncher] MC版本: ${config.mcVersion} / Loader: ${config.loaderType}`)
    console.log(`[GameLauncher] Java: ${javaPath} (${javaInfo.vendor} ${javaInfo.version})`)
    console.log(`[GameLauncher] 工作目录: ${gameDir}`)

    // 5. 通知前端 Java 信息
    sendToWindow(mainWindow, 'game:launch-info', {
      javaPath,
      javaVersion: javaInfo.version,
      instanceId: config.instanceId,
      mcVersion: config.mcVersion,
    })

    // 6. 启动进程
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

    // stdout
    currentProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      sendToWindow(mainWindow, 'game:log', { text, level: 'info' })
    })

    // stderr
    currentProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      logBuffer += text
      sendToWindow(mainWindow, 'game:log', { text, level: 'error' })
    })

    // 进程退出
    currentProcess.on('exit', (code, signal) => {
      console.log(`[GameLauncher] 进程退出: code=${code}, signal=${signal}`)
      const exitedId = currentInstanceId
      currentProcess = null
      currentInstanceId = null
      setStatus(mainWindow, 'idle')

      sendToWindow(mainWindow, 'game:exit', { code: code ?? -1, signal, instanceId: exitedId })

      // 崩溃分析
      if (code !== 0 && code !== null) {
        const crash = analyzeCrash(logBuffer, code)
        if (crash) {
          sendToWindow(mainWindow, 'game:crash', crash)
        }
      }

      // 更新最后游玩时间
      if (exitedId && code === 0) {
        try { updateLastPlayed(exitedId) } catch {}
      }
    })

    // 进程错误
    currentProcess.on('error', (err) => {
      console.error('[GameLauncher] 启动失败:', err.message)
      currentProcess = null
      currentInstanceId = null
      setStatus(mainWindow, 'idle')
      sendToWindow(mainWindow, 'game:error', { message: err.message })
    })

    setStatus(mainWindow, 'running')
    return { success: true, pid: currentProcess.pid }

  } catch (e: any) {
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
    console.error('[GameLauncher] 终止进程失败:', e)
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
