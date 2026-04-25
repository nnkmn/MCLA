import { app, BrowserWindow, shell, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './services/database'
import { VersionsService } from './services/versions'
import { initializeModLoaderService, getModLoaderService } from './services/modloader'
import { DownloadService } from './services/download.service'
import { initializeContentService } from './services/content.ipc'
import { registerAllIpcHandlers } from './ipc'
import { CrashService } from './services/crash.service'
import { ModService } from './services/mod.service'

// ── 服务实例（模块级，供 IPC 使用）──────────────────────────
let versionsService: VersionsService
let modLoaderService: ReturnType<typeof getModLoaderService>
let crashService: CrashService
let modService: ModService

function createWindow(): BrowserWindow {
  // process.resourcesPath 永远指向 resources/ 目录（asar 外面）
  const resPath = process.resourcesPath

  // 用 nativeImage 加载图标（确保 Windows 正确识别）
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
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Windows：强制设置任务栏图标
  if (appIcon && !appIcon.isEmpty()) {
    appIcon.setTemplateImage?.(false) // 标记非模板图
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(resPath, 'renderer', 'index.html'))
    // 生产环境错误监听（静默记录，不影响性能）
    mainWindow.webContents.on('console-message', (_event, level, message) => {
      const prefix = level === 3 ? '[ERROR]' : level === 2 ? '[WARN]' : '[LOG]'
      console.log(`${prefix} renderer: ${message}`)
    })
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, _url) => {
      console.error(`[FATAL] Renderer load failed: code=${errorCode} desc=${errorDesc}`)
    })
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error(`[FATAL] Render process gone: reason=${details.reason}`)
    })
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
  electronApp.setAppUserModelId('com.mcla.launcher')

  // 初始化数据库（只调一次）
  const db = initDatabase()

  // 初始化服务（赋值到模块级变量供 IPC 使用）
  versionsService = new VersionsService(db)
  initializeModLoaderService()
  modLoaderService = getModLoaderService()

  // 初始化下载服务
  const downloadService = new DownloadService(db)

  // 初始化内容服务（CurseForge + Modrinth）
  initializeContentService(
    process.env.CURSEFORGE_API_KEY || '',
    'MCLA-Launcher/1.0',
    downloadService
  )

  // 初始化崩溃分析服务
  crashService = new CrashService()

  // 初始化 Mod 管理服务
  modService = new ModService()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const win = createWindow()

  // 注册所有 IPC 处理器
  registerIpcHandlers(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow()
      registerIpcHandlers(newWin)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
