/**
 * 内容平台管理 IPC（CurseForge / Modrinth 分类/加载器）
 */
import { ipcMain, BrowserWindow, dialog } from 'electron'
import { getContentService } from '../services/content.ipc'

export function registerContentHandlers(): void {
  ipcMain.handle('content:get-platforms', async () => {
    return {
      success: true,
      data: [
        { id: 'curseforge', name: 'CurseForge', icon: 'curseforge' },
        { id: 'modrinth', name: 'Modrinth', icon: 'modrinth' },
      ],
    }
  })

  ipcMain.handle('content:get-categories', async (_event, platform) => {
    const service = getContentService()
    const result = await service.getCategories(platform)
    return { success: true, data: result }
  })

  ipcMain.handle('content:get-loaders', async (_event, platform) => {
    const service = getContentService()
    const result = await service.getLoaders(platform)
    return { success: true, data: result }
  })
}
