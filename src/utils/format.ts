/**
 * 前端工具函数 - 格式化
 * 文件大小、时间、数字等格式化
 */

// ========== 文件大小 ==========

/** 字节数转人类可读大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (!bytes || isNaN(bytes)) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)

  // < 10 保留1位小数，否则整数
  return size < 10 ? `${size.toFixed(1)} ${units[i]}` : `${Math.round(size)} ${units[i]}`
}

// ========== 时间/日期 ==========

/** ISO 时间字符串转为相对时间（如 "3分钟前"） */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}个月前`

  return `${Math.floor(diffDay / 365)}年前`
}

/** ISO 时间字符串格式化为本地显示 */
export function formatDate(
  dateStr: string,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'

  switch (format) {
    case 'short':
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    case 'long':
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    case 'full':
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    default:
      return dateStr
  }
}

/** 秒数转可读时长（如 "2h 35m"） */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 && parts.length < 2) parts.push(`${s}s`)

  return parts.join(' ')
}

// ========== 数字 ==========

/** 数字千分位 + 简写（如 1.2M, 3.5K） */
export function formatNumber(num: number): string {
  if (!num || num === 0) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 10000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString('en-US')
}

/** 百分比 */
export function formatPercent(value: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/** 下载速度（bytes/sec → 可读） */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatFileSize(bytesPerSec)}/s`
}

// ========== 游戏相关 ==========

/** MC 版本号展示 */
export function formatVersion(mcVersion: string, loaderType?: string, loaderVer?: string): string {
  let result = mcVersion
  if (loaderType && loaderType !== 'vanilla') {
    result += ` ${loaderType}`
    if (loaderVer) result += ` ${loaderVer}`
  }
  return result
}

/** 加载器名称映射（用于显示） */
export const LOADER_NAMES: Record<string, string> = {
  vanilla: '原版',
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  quilt: 'Quilt',
}

/** 获取加载器显示名 */
export function getLoaderName(loaderType: string): string {
  return LOADER_NAMES[loaderType] || loaderType
}
