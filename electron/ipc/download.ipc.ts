/**
 * 下载管理 IPC
 */
import { ipcMain } from 'electron'
import { getContentService } from '../services/content.ipc'
import { ContentPlatform } from '../services/content.service'
import type { ContentFile } from '../services/content.service'

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

  ipcMain.handle('download:file', async (_event, fileData: Record<string, unknown>, destination: string) => {
    const service = getContentService()

    // 将前端传来的数据转换为 ContentFile 格式
    const platform = (fileData.platform as ContentPlatform) ||
      (fileData.source === 'curseforge' ? ContentPlatform.CURSEFORGE : ContentPlatform.MODRINTH)

    const contentFile: ContentFile = {
      id: String(fileData.id || ''),
      platform,
      projectId: String(fileData.projectId || fileData.id || ''),
      name: String(fileData.fileName || fileData.displayName || ''),
      fileName: String(fileData.fileName || fileData.displayName || ''),
      version: '',
      size: Number(fileData.size || 0),
      downloadUrl: String(fileData.url || fileData.downloadUrl || ''),
      gameVersions: Array.isArray(fileData.gameVersions) ? fileData.gameVersions : [],
      loaders: Array.isArray(fileData.loaders) ? fileData.loaders : [],
      releaseType: (fileData.releaseType as 'release' | 'beta' | 'alpha') || 'release',
      datePublished: String(fileData.datePublished || ''),
      downloads: Number(fileData.downloads || 0),
    }

    const result = await service.downloadFile(contentFile, destination)
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
