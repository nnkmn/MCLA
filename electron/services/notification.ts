/**
 * 系统通知服务
 * 支持 Windows/macOS 原生通知
 */
import { Notification, BrowserWindow } from 'electron'
import { logger } from '../utils/logger'
const log = logger.child('Notification')

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface NotificationOptions {
  title: string
  body: string
  type?: NotificationType
  silent?: boolean
  icon?: string
  /** 点击后跳转的路由路径 */
  route?: string
}

interface NotificationItem {
  id: string
  title: string
  body: string
  type: NotificationType
  timestamp: number
  read: boolean
  route?: string
}

// 内存中的通知历史（最多保留100条）
const history: NotificationItem[] = []
const MAX_HISTORY = 100

let onNotifyCallback: ((item: NotificationItem) => void) | null = null

/**
 * 发送原生系统通知
 */
export function notify(options: NotificationOptions): NotificationItem {
  const { title, body, type = 'info', silent = false, route } = options

  // 构建通知项
  const item: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    body,
    type,
    timestamp: Date.now(),
    read: false,
    route,
  }

  // 追加到历史
  history.unshift(item)
  if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)

  // 调用回调（供前端 UI 使用）
  if (onNotifyCallback) {
    onNotifyCallback(item)
  }

  // 发送原生通知
  if (Notification.isSupported()) {
    try {
      const notification = new Notification({
        title,
        body,
        silent,
      })

      notification.on('click', () => {
        // 点击通知：将路由推入渲染进程
        const wins = BrowserWindow.getAllWindows()
        if (wins.length > 0 && !wins[0].isDestroyed()) {
          wins[0].webContents.send('notification:clicked', { id: item.id, route: item.route })
        }
      })

      notification.show()
    } catch (e) {
      log.warn('[Notification] 发送失败:', e)
    }
  }

  return item
}

/**
 * 注册通知回调（供前端订阅）
 */
export function onNotify(callback: (item: NotificationItem) => void): () => void {
  onNotifyCallback = callback
  return () => { onNotifyCallback = null }
}

/**
 * 获取通知历史
 */
export function getHistory(limit = 20): NotificationItem[] {
  return history.slice(0, limit)
}

/**
 * 标记通知为已读
 */
export function markAsRead(id: string): void {
  const item = history.find(n => n.id === id)
  if (item) item.read = true
}

/**
 * 标记全部已读
 */
export function markAllAsRead(): void {
  history.forEach(n => { n.read = true })
}

/**
 * 清除历史
 */
export function clearHistory(): void {
  history.length = 0
}

/**
 * 获取未读数
 */
export function getUnreadCount(): number {
  return history.filter(n => !n.read).length
}

// ====== 快捷通知方法 ======

export function notifyInfo(title: string, body: string, route?: string) {
  return notify({ title, body, type: 'info', route })
}

export function notifySuccess(title: string, body: string, route?: string) {
  return notify({ title, body, type: 'success', silent: true, route })
}

export function notifyWarning(title: string, body: string, route?: string) {
  return notify({ title, body, type: 'warning', route })
}

export function notifyError(title: string, body: string, route?: string) {
  return notify({ title, body, type: 'error', silent: false, route })
}

/**
 * 版本下载完成通知
 */
export function notifyVersionDownloaded(versionName: string) {
  return notifySuccess(
    '下载完成',
    `${versionName} 已下载完成，可以开始游戏了`,
    '/'
  )
}

/**
 * Mod 下载完成通知
 */
export function notifyModDownloaded(modName: string) {
  return notifySuccess(
    'Mod 下载完成',
    `${modName} 已下载完成`
  )
}

/**
 * 新版本可用通知
 */
export function notifyNewVersion(available: string, current: string) {
  return notifyInfo(
    'MCLA 更新可用',
    `新版本 ${available} 可用（当前 ${current}）`,
    '/downloads'
  )
}

/**
 * 游戏启动失败通知
 */
export function notifyLaunchFailed(instanceName: string, reason?: string) {
  return notifyError(
    '启动失败',
    reason ? `${instanceName}: ${reason}` : `${instanceName} 启动失败`
  )
}

/**
 * Mod 加载器安装完成通知
 */
export function notifyModLoaderInstalled(loaderType: string, version: string) {
  return notifySuccess(
    '安装完成',
    `${loaderType} ${version} 安装成功`
  )
}
