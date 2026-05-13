/**
 * 下载相关类型定义
 * 与 electron/services/download.service.ts 对齐
 */

/** 内容平台类型 */
export type ContentPlatform = 'curseforge' | 'modrinth'

/** 下载状态 */
export type DownloadStatus =
  | 'pending'       // 等待中
  | 'downloading'   // 下载中
  | 'paused'        // 已暂停
  | 'completed'     // 已完成
  | 'failed'        // 失败
  | 'cancelled'     // 已取消

/** 搜索排序方式 */
export type SearchSortBy =
  | 'relevance'     // 相关度
  | 'downloads'     // 下载量
  | 'follows'       // 关注数 / 点赞数
  | 'newest'        // 最新发布
  | 'updated'       // 最近更新

/** Mod 搜索参数 */
export interface ModSearchParams {
  query: string                    // 搜索关键词
  source: ContentPlatform          // 平台
  offset?: number                  // 分页偏移（默认 0）
  limit?: number                   // 每页数量（默认 20）
  sortBy?: SearchSortBy            // 排序方式
  category?: string                // 分类筛选
  gameVersion?: string             // MC 版本筛选
  loaderType?: string              // 加载器筛选
}

/** Mod 搜索结果项 */
export interface ModSearchResult {
  id: string                       // 项目 ID (平台原生)
  name: string                     // 项目名称
  author: string                   // 作者
  description: string              // 描述
  iconUrl: string                  // 封面/图标 URL
  downloads: number                // 下载量
  follows: number                  // 关注数 / 点赞数
  source: ContentPlatform           // 来源平台
  categories: string[]             // 标签分类
  gameVersions: string[]           // 支持的 MC 版本
  loaders?: string[]               // 兼容的加载器
}

/** 文件版本选项 */
export interface ProjectFile {
  id: string
  filename: string
  fileName?: string                // 兼容文件名（部分API返回）
  displayName: string
  size: number                     // 字节
  downloadUrl: string
  gameVersions: string[]
  loaders: string[]
  releaseType: 'release' | 'beta' | 'alpha'
  datePublished: string
  downloads?: number               // 下载次数
}

/** 下载任务 */
export interface DownloadTask {
  id: string
  fileName: string
  url: string
  destination: string
  status: DownloadStatus
  progress: number                 // 0-100
  speed: number                   // bytes/sec
  downloadedSize: number          // 已下载字节
  totalSize: number               // 总大小
  error?: string
  createdAt: string
}

/** 下载队列状态 */
export interface DownloadQueueState {
  active: DownloadTask[]           // 正在下载的
  queued: DownloadTask[]           // 排队中的
  completed: DownloadTask[]         // 已完成的
}

// ====== MC 版本下载任务 ======

/** MC 版本下载阶段 */
export type VersionDownloadPhase =
  | 'idle'           // 未开始
  | 'resolving'      // 解析版本清单
  | 'resolving_ok'
  | 'downloading_json' // 下载版本 JSON
  | 'downloading_json_ok'
  | 'downloading_jar'  // 下载 client.jar
  | 'completed'
  | 'failed'

/** MC 版本下载任务 */
export interface VersionDownloadTask {
  id: string                      // 版本号，如 '1.21.4'
  name: string                    // 显示名称，如 '1.21.4'
  phase: VersionDownloadPhase     // 当前阶段
  progress: number               // 0-100 总体进度
  /** 各阶段进度描述 */
  phaseLabel: string              // 如 '下载版本 JSON...'
  /** 总体速度（bytes/s），JSON 阶段为 0 */
  speed: number
  downloadedSize: number
  totalSize: number
  error?: string
  targetFolder: string            // 下载目标文件夹
  /** 当前时间戳（用于计算速度） */
  _lastBytes?: number
  _lastTime?: number
}
