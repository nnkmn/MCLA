import { ipcMain } from 'electron'
import {
  checkForUpdates,
  startDownload,
  installUpdate,
  getUpdateStatus,
  type UpdateStatus
} from '../services/updater.service'

export function registerUpdaterHandlers(): void {
  ipcMain.handle('updater:check', async () => {
    checkForUpdates()
    return { success: true }
  })

  ipcMain.handle('updater:download', async () => {
    startDownload()
    return { success: true }
  })

  ipcMain.handle('updater:install', async () => {
    installUpdate()
    return { success: true }
  })

  ipcMain.handle('updater:status', async (): Promise<{ success: boolean; data: UpdateStatus }> => {
    return { success: true, data: getUpdateStatus() }
  })
}
