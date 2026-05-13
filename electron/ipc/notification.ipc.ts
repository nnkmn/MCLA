/**
 * 通知系统 IPC Handlers
 */
import { ipcMain, BrowserWindow } from 'electron'
import * as notification from '../services/notification'

export function registerNotificationHandlers(): void {
  // 推送通知到渲染进程
  notification.onNotify((item) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('notification:new', item)
      }
    }
  })

  ipcMain.handle('notification:get-history', async (_event, limit?: number) => {
    try {
      const history = notification.getHistory(limit)
      return { ok: true, data: history }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  ipcMain.handle('notification:mark-read', async (_event, id: string) => {
    try {
      notification.markAsRead(id)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  ipcMain.handle('notification:mark-all-read', async () => {
    try {
      notification.markAllAsRead()
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  ipcMain.handle('notification:clear', async () => {
    try {
      notification.clearHistory()
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  ipcMain.handle('notification:get-unread-count', async () => {
    try {
      return { ok: true, data: notification.getUnreadCount() }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })
}
