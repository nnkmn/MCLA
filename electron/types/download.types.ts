/**
 * 下载相关类型定义
 */

export type DownloadStatus =
  | 'pending'
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
  maxConcurrent: number     // 最大并发数
  speedLimit: number        // 限速 bytes/s，0 = 不限速
  retryCount: number        // 失败重试次数
  savePath: string          // 默认保存路径
  verifyHash: boolean       // 下载后校验 SHA1
}

export interface DownloadProgress {
  taskId: string
  progress: number
  speed: number
  downloadedSize: number
  totalSize: number
}
