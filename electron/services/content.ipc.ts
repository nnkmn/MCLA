/**
 * 内容服务单例管理
 * 统一管理 CurseForge + Modrinth 内容服务实例
 */
import { ContentService } from './content.service'
import { DownloadService } from './download.service'

let _contentService: ContentService | null = null

/**
 * 初始化内容服务（在 app.whenReady() 中调用一次）
 */
export function initializeContentService(
  curseForgeApiKey: string,
  modrinthUserAgent: string,
  downloadService: DownloadService
): ContentService {
  _contentService = new ContentService(curseForgeApiKey, modrinthUserAgent, downloadService)
  return _contentService
}

/**
 * 获取内容服务单例
 */
export function getContentService(): ContentService {
  if (!_contentService) {
    throw new Error('ContentService 未初始化，请先调用 initializeContentService()')
  }
  return _contentService
}
