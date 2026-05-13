/**
 * 下载相关类型定义
 */

export type DownloadStatus =
  | 'pending'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'error'

export interface DownloadTask {
  id: string
  url: string
  destination: string
  fileName: string
  totalSize: number
  downloadedSize: number
  status: DownloadStatus
  speed: number        // bytes/s
  progress: number     // 0-100
  error?: string
  instanceId?: string  // 关联实例（可选）
  type?: 'mod' | 'resourcepack' | 'version' | 'modloader' | 'asset' | 'other'
  createdAt: Date
  updatedAt: Date
}

export interface DownloadConfig {
  maxConcurrentDownloads: number  // 最大并发下载数
  downloadPath: string            // 默认下载路径
  retryAttempts: number           // 失败重试次数
  timeout: number                 // 超时时间（毫秒）
  chunkSize: number               // 分块大小（字节）
}

export interface DownloadProgress {
  taskId: string
  progress: number
  speed: number
  downloadedSize: number
  totalSize: number
}
