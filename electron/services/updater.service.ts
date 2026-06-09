import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { logger } from '../utils/logger'
const log = logger.child('Updater')

export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloading: boolean
  downloadProgress: number
  downloaded: boolean
  error: string | null
  version: string | null
  releaseNotes: string | null
}

let mainWindow: BrowserWindow | null = null
let cachedUpdateCheckResult: any = null
const currentStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloadProgress: 0,
  downloaded: false,
  error: null,
  version: null,
  releaseNotes: null
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  if (process.env.NODE_ENV === 'development') {
    autoUpdater.allowPrerelease = false
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    log.info('[updater.init] Development mode - auto-updater disabled')
    return
  }

  autoUpdater.channel = 'MCLA'
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    currentStatus.checking = true
    currentStatus.error = null
    broadcastStatus()
    log.info('[updater] Checking for update...')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    currentStatus.checking = false
    currentStatus.available = true
    currentStatus.version = info.version
    currentStatus.releaseNotes =
      typeof info.releaseNotes === 'string' ? info.releaseNotes : JSON.stringify(info.releaseNotes)
    broadcastStatus()
    log.info('[updater] Update available:', info.version)
    const files = (info as any).files
    log.info('[updater] Update files:', files ? files.map((f: any) => f.url || f.name).join(', ') : 'N/A')
  })

  autoUpdater.on('update-not-available', () => {
    currentStatus.checking = false
    currentStatus.available = false
    broadcastStatus()
    log.info('[updater] Update not available')
  })

  autoUpdater.on('download-progress', (progressObj) => {
    currentStatus.downloading = true
    currentStatus.downloadProgress = progressObj.percent
    broadcastStatus()
    log.info(`[updater] Download progress: ${progressObj.percent.toFixed(1)}%`)
  })

  autoUpdater.on('update-downloaded', () => {
    currentStatus.downloading = false
    currentStatus.downloaded = true
    currentStatus.downloadProgress = 100
    broadcastStatus()
    log.info('[updater] Update downloaded')
  })

  autoUpdater.on('error', (err) => {
    currentStatus.checking = false
    currentStatus.downloading = false
    currentStatus.error = err.message
    broadcastStatus()
    log.error('[updater] Error:', err.message)
  })

  log.info('[updater.init] Auto-updater initialized')
}

function broadcastStatus(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', currentStatus)
  }
}

export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') {
    log.info('[updater.check] Development mode - skip check')
    return
  }
  log.info('[updater.check] Starting update check...')
  autoUpdater.checkForUpdates().then((result) => {
    cachedUpdateCheckResult = result
    log.info('[updater.check] Check completed, result:', result ? 'got update info' : 'no update info')
    if (result && result.updateInfo) {
      log.info('[updater.check] Update version:', result.updateInfo.version)
    }
  }).catch((err) => {
    log.error('[updater.check] Failed:', err.message)
  })
}

export function startDownload(): void {
  if (!currentStatus.available) {
    log.warn('[updater.download] Cannot download - no update available, available flag is false')
    return
  }
  log.info('[updater.download] Initiating download, version:', currentStatus.version)
  log.info('[updater.download] Has cached result:', cachedUpdateCheckResult ? 'yes' : 'no')

  autoUpdater.downloadUpdate()
    .then((result: any) => {
      log.info('[updater.download] Download started, result type:', typeof result)
    })
    .catch((err: any) => {
      log.error('[updater.download] Failed to start download:', err && err.message ? err.message : err)
      log.error('[updater.download] Full error:', JSON.stringify(err))
    })
}

export function installUpdate(): void {
  if (!currentStatus.downloaded) {
    log.warn('[updater.install] No update downloaded')
    return
  }
  log.info('[updater.install] Installing update...')
  autoUpdater.quitAndInstall()
}

export function getUpdateStatus(): UpdateStatus {
  return { ...currentStatus }
}
