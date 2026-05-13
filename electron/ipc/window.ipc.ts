/**
 * 窗口控制 IPC 处理器
 */
import { app, BrowserWindow, ipcMain } from 'electron'

export function registerWindowHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('window:minimize', () => mainWindow.minimize())

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
    return mainWindow.isMaximized()
  })

  ipcMain.handle('window:close', () => mainWindow.close())
  ipcMain.handle('window:is-maximized', () => mainWindow.isMaximized())

  // 获取应用版本号（从 package.json）
  ipcMain.handle('app:get-version', () => app.getVersion())

  // 最大化状态变化通知渲染进程
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-changed', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-changed', false)
  })
}
