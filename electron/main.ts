/**
 * MCLA 主进程入口
 */
import { app, BrowserWindow, shell, nativeImage, type NativeImage, ipcMain } from 'electron'
import { execSync } from 'child_process'

if (process.platform === 'win32') {
  try {
    process.env.LANG = 'zh_CN.UTF-8'
    process.env.LC_ALL = 'zh_CN.UTF-8'
    process.env.NODE_ENV === 'development' && execSync('chcp 65001 > nul', { stdio: 'ignore' })
  } catch {}
}
import { join } from 'path'
import { existsSync, mkdirSync, appendFileSync } from 'fs'
import { initDatabase } from './services/database'
import { getConfig, getSecureConfig } from './services/config'
import { VersionsService } from './services/versions'
import { ModLoaderService } from './services/modloader.service'
import { DownloadService } from './services/download.service'
import { initializeContentService } from './services/content.ipc'
import { registerAllIpcHandlers, updateMainWindowRefs } from './ipc'
import { CrashService } from './services/crash.service'
import { ModService } from './services/mod.service'
import { initAutoUpdater, checkForUpdates } from './services/updater.service'
import { cleanupShareOnExit } from './ipc/share.ipc'
import { logger } from './utils/logger'

const log = logger.child('Main')

/** 判断是否为开发环境 */
function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}

if (process.env.NODE_ENV === 'development') {
  require('dotenv').config()
}

// ── 服务实例（模块级，供 IPC 使用）──────────────────────────
let versionsService: VersionsService
let modLoaderService: ModLoaderService
let crashService: CrashService
let modService: ModService

// 文件日志用于调试（追加模式）
let logFile: string
function writeLog(...args: any[]) {
  if (!logFile) {
    log.error('[MAIN NO_LOG]', ...args)
    return
  }
  const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    appendFileSync(logFile, line)
  } catch {}
  log.error('[MAIN]', msg)
}

writeLog('>>> main.ts TOP OF FILE')

// 自定义协议处理（分享功能）
const PROTOCOL_NAME = 'mcla'
let pendingShareCode: string | null = null

function parseShareUrl(url: string): string | null {
  try {
    const match = url.match(/^mcla:\/\/share:([0-9a-zA-Z]{6,})/i)
    if (match) {
      return match[1]
    }
    return null
  } catch {
    return null
  }
}

// Windows：处理协议唤起（单实例模式）
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // 第二个实例启动时，解析命令行中的协议 URL
    for (const arg of commandLine) {
      const code = parseShareUrl(arg)
      if (code) {
        pendingShareCode = code
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          const win = windows[0]
          win.show()
          win.focus()
          // 通知渲染进程打开分享导入弹窗
          win.webContents.once('did-finish-load', () => {
            win.webContents.send('share:protocol-invoke', { shareCode: code })
          })
          if (win.webContents.isLoading()) {
            // 等待加载完成后再发送
          } else {
            win.webContents.send('share:protocol-invoke', { shareCode: code })
          }
        }
        break
      }
    }
  })
}

// 全局错误处理
process.on('uncaughtException', (error) => {
  writeLog('[FATAL] Uncaught exception:', error.message, error.stack)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  writeLog('[FATAL] Unhandled rejection:', reason)
})

function createWindow(): BrowserWindow {
  // dev 模式使用 out/ 目录，生产用 resourcesPath
  const resPath =
    process.env.NODE_ENV === 'development'
      ? join(__dirname, '..', 'renderer')
      : process.resourcesPath
  writeLog('createWindow resourcesPath:', resPath)

  // 加载图标 - 根据环境使用不同路径
  let appIcon: NativeImage | undefined
  const iconPathDev = join(__dirname, '..', '..', 'resources', 'icons', 'icon.ico')
  const iconPathProd = join(resPath, 'icons', 'icon.ico')
  if (existsSync(iconPathDev)) {
    appIcon = nativeImage.createFromPath(iconPathDev)
    writeLog('Using dev icon path:', iconPathDev)
  } else if (existsSync(iconPathProd)) {
    appIcon = nativeImage.createFromPath(iconPathProd)
    writeLog('Using prod icon path:', iconPathProd)
  } else {
    writeLog('Icon file not found')
  }

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'MCLA',
    backgroundColor: '#0D0D1A',
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // DevTools 默认不自动打开，用户可通过 F12 快捷键手动打开

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 在窗口中打开外部链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 渲染进程崩溃时记录错误
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    writeLog(`[FATAL] Render process gone: reason=${details.reason}`)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // dev: resPath = out/renderer/ (直接是渲染文件根目录)
    // prod: resPath = resources/，渲染文件在 resources/renderer/
    const htmlPath =
      process.env.NODE_ENV === 'development'
        ? join(resPath, 'index.html')
        : join(resPath, 'renderer', 'index.html')
    mainWindow.loadFile(htmlPath)
  }

  return mainWindow
}

// ========== IPC Handler 注册（拆分到 electron/ipc/ 模块）==========
function registerIpcHandlers(mainWindow: BrowserWindow): void {
  registerAllIpcHandlers(mainWindow, {
    versionsService,
    modLoaderService,
    crashService,
    modService
  })
}

app.whenReady().then(() => {
  logFile = join(app.getPath('userData'), 'mcla-main.log')
  writeLog('>>> INSIDE whenReady callback')

  // 注册自定义协议
  if (process.platform === 'win32') {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME)
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME)
  }
  writeLog('Custom protocol registered:', PROTOCOL_NAME)

  // 处理启动时的协议参数
  for (const arg of process.argv) {
    const code = parseShareUrl(arg)
    if (code) {
      pendingShareCode = code
      writeLog('Found share code in startup args:', code)
      break
    }
  }

  // Windows：设置 AppUserModelID，让任务栏图标正确显示
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev() ? process.execPath : 'com.mcla.launcher')
  }

  // 初始化数据库（只调一次）
  const db = initDatabase()

  // 初始化服务（赋值到模块级变量供 IPC 使用）
  versionsService = new VersionsService(db)
  modLoaderService = new ModLoaderService()

  // 初始化下载服务
  const downloadService = new DownloadService(db)

  // 初始化内容服务（CurseForge + Modrinth）
  // 优先从数据库配置获取，其次从环境变量获取
  const cfApiKey = getSecureConfig('curseforge_api_key') || process.env.CURSEFORGE_API_KEY || ''
  if (!cfApiKey) {
    log.warn('[Content Service] CurseForge API Key not configured, some features may be limited')
  }
  initializeContentService(cfApiKey, 'MCLA-Launcher/1.0', downloadService)

  // 初始化崩溃分析服务
  crashService = new CrashService()

  // 初始化 Mod 管理服务
  modService = new ModService()

  app.on('browser-window-created', (_, window) => {
    // 开发环境下 F12 切换 DevTools
    window.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        if (window.webContents.isDevToolsOpened()) {
          window.webContents.closeDevTools()
        } else {
          window.webContents.openDevTools({ mode: 'undocked' })
        }
      }
    })
  })

  const win = createWindow()

  // 如果有挂起的分享码，通知渲染进程
  if (pendingShareCode) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('share:protocol-invoke', { shareCode: pendingShareCode })
      writeLog('Sent pending share code to renderer:', pendingShareCode)
      pendingShareCode = null
    })
  }

  // 初始化自动更新服务
  initAutoUpdater(win)

  // 注册所有 IPC 处理器
  try {
    registerIpcHandlers(win)
    writeLog('>>> Handlers registered successfully')

    // 启动时回填旧账户缺失的 xuid（修复旧版本创建的账户）
    // 延迟调用，等待渲染进程就绪
    setTimeout(async () => {
      try {
        if (win && !win.isDestroyed()) {
          const result = await win.webContents.executeJavaScript(`
            window.electronAPI?.account?.backfillXuid?.()
              .then(r => JSON.stringify(r))
              .catch(e => JSON.stringify({ok:false, error: e.message}))
          `)
          writeLog('[startup] xuid 回填结果:', result)
        }
      } catch (e: any) {
        writeLog('[startup] xuid 回填失败:', e.message)
      }
    }, 3000)

    // 启动 5 秒后检查更新
    setTimeout(() => {
      checkForUpdates()
    }, 5000)
  } catch (err: any) {
    writeLog('[IPC] >>> Handlers registration FAILED:', err.message, err.stack)
  }

  // activate：重建窗口，但不重复注册 IPC handlers（已在 whenReady 中注册过）
  // 仅更新各 IPC 模块中的 mainWindow 引用
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow()
      updateMainWindowRefs(newWin)
    }
  })
})

app.on('window-all-closed', () => {
  // 清理分享会话和临时文件
  cleanupShareOnExit()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  cleanupShareOnExit()
})

// 打印已注册的 handlers（调试用）
app.on('web-contents-created', (_, contents) => {
  contents.on('did-finish-load', () => {
    writeLog(
      'Renderer loaded, ipcMain handlers:',
      Object.keys(
        (require('electron') as { ipcMain?: { _events?: Record<string, unknown> } }).ipcMain
          ?._events || {}
      )
    )
  })
})
