import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './services/database'
import { VersionsService } from './services/versions'
import { initializeModLoaderService, getModLoaderService } from './services/modloader'
import { DownloadService } from './services/download.service'
import { initializeContentService } from './services/content.ipc'
import { registerAllIpcHandlers } from './ipc'

// ── 服务实例（模块级，供 IPC 使用）──────────────────────────
let versionsService: VersionsService
let modLoaderService: ReturnType<typeof getModLoaderService>

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0D1A',
    icon: join(__dirname, '../../resources/icons/icon.png'),
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
} else {
  mainWindow.loadFile(join(__dirname, '../src/index.html'))
}

  return mainWindow
}

// ========== IPC Handler 注册（拆分到 electron/ipc/ 模块）==========
function registerIpcHandlers(mainWindow: BrowserWindow): void {
  registerAllIpcHandlers(mainWindow, {
    versionsService,
    modLoaderService,
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
