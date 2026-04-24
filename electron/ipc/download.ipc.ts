/**
 * 下载管理 IPC
 */
import { ipcMain } from 'electron'
import { getContentService } from '../services/content.ipc'

export function registerDownloadHandlers(): void {
  ipcMain.handle('download:search-mods', async (_event, params) => {
    const service = getContentService()
    const result = await service.searchMods(params)
    return { success: true, data: result }
  })

  ipcMain.handle('download:get-project', async (_event, projectId, platform) => {
    const service = getContentService()
    const result = await service.getProject(projectId, platform)
    return { success: true, data: result }
  })

  ipcMain.handle('download:get-files', async (_event, projectId, platform, options) => {
    const service = getContentService()
    const result = await service.getProjectFiles(projectId, platform, options)
    return { success: true, data: result }
  })

  ipcMain.handle('download:file', async (_event, file, destination) => {
    const service = getContentService()
    const result = await service.downloadFile(file, destination)
    return { success: true, data: result }
  })

  ipcMain.handle('download:cancel', async (_event, taskId) => {
    const service = getContentService()
    const downloadService = service.getDownloadService()
    const result = downloadService.cancelDownload(taskId)
    return { success: result }
  })

  ipcMain.handle('download:get-active', async () => {
    const service = getContentService()
    const downloadService = service.getDownloadService()
    const result = downloadService.getActiveDownloads()
    return { success: true, data: result }
  })

  ipcMain.handle('download:get-queue', async () => {
    const service = getContentService()
    const downloadService = service.getDownloadService()
    const result = downloadService.getDownloadQueue()
    return { success: true, data: result }
  })
}
