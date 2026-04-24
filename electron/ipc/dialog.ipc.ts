/**
 * 对话框 / 路径工具 IPC
 */
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

/** 获取 .minecraft 默认路径 */
function getMinecraftPath(): string {
  const home = app.getPath('home')
  const platform = process.platform
  if (platform === 'win32') return join(home, 'AppData', 'Roaming', '.minecraft')
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'minecraft')
  return join(home, '.minecraft')
}

export function registerDialogHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择 .minecraft 文件夹',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('path:minecraft', () => getMinecraftPath())
  ipcMain.handle('path:exists', (_event, p: string) => existsSync(p))
}
