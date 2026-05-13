/**
 * MCLA 主进程入口
 */
import { app, BrowserWindow, shell, nativeImage, ipcMain } from 'electron'
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
import { logger } from './utils/logger'
const log = logger.child('Main')

/** 判断是否为开发环境 */
function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || (app && !app.isPackaged)
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
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    appendFileSync(logFile, line)
  } catch {}
  log.error('[MAIN]', msg)
}

writeLog('>>> main.ts TOP OF FILE')

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
  const resPath = process.env.NODE_ENV === 'development'
    ? join(__dirname, '..', 'renderer')
    : process.resourcesPath
  writeLog('createWindow resourcesPath:', resPath)

  // 用 nativeImage 加载图标（extraResources 映射到 resources/icons/）
  const appIcon = nativeImage.createFromPath(join(resPath, 'icons', 'icon.ico'))

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
      nodeIntegration: false,
    },
  })

  // dev 模式打开 DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

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
    const htmlPath = process.env.NODE_ENV === 'development'
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
    modService,
  })
}

app.whenReady().then(() => {
  logFile = join(app.getPath('userData'), 'mcla-main.log')
  writeLog('>>> INSIDE whenReady callback')

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
  // 优先从数据库读 CF key，降级到环境变量
  const cfApiKey = getSecureConfig('curseforge_api_key') || process.env.CURSEFORGE_API_KEY || ''
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 打印已注册的 handlers（调试用）
app.on('web-contents-created', (_, contents) => {
  contents.on('did-finish-load', () => {
    writeLog('Renderer loaded, ipcMain handlers:', Object.keys((require('electron') as { ipcMain?: { _events?: Record<string, unknown> } }).ipcMain?._events || {}))
  })
})
