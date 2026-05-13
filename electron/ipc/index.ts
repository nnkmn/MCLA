/**
 * IPC Handler 统一注册入口
 *
 * 将 main.ts 中内联的 IPC handler 拆分为独立模块
 * 每个模块负责一类功能的 channel 注册
 */
import type { BrowserWindow } from 'electron'
import { registerWindowHandlers } from './window.ipc'
import { registerConfigHandlers } from './config.ipc'
import { registerInstanceHandlers } from './instance.ipc'
import { registerAccountHandlers } from './account.ipc'
import { registerDownloadHandlers } from './download.ipc'
import { registerGameHandlers, setGameDependencies } from './game.ipc'
import { registerJavaHandlers } from './java.ipc'
import { registerContentHandlers } from './content.ipc'
import { registerDialogHandlers } from './dialog.ipc'
import { registerCrashIpcHandlers } from './crash.ipc'
import { registerModIpcHandlers } from './mod.ipc'
import { registerModLoaderHandlers } from './modloader.ipc'
import { registerNotificationHandlers } from './notification.ipc'
import { updateModLoaderMainWindow } from './modloader.ipc'
import { logger } from '../utils/logger'
const log = logger.child('IPC')

// DEBUG: 模块加载时输出
// console.error('[IPC] >>>>> ipc/index.ts module loaded')

/**
 * 注册所有 IPC 处理器
 * @param mainWindow - 主窗口实例
 * @param deps - 游戏相关依赖（版本服务、ModLoader 服务）
 */
export function registerAllIpcHandlers(
  mainWindow: BrowserWindow,
  deps?: { 
    versionsService?: any; 
    modLoaderService?: any;
    crashService?: any;
    modService?: any;
  }
): void {
  // console.error('[IPC] >>>>> registerAllIpcHandlers called')
  // 注入游戏依赖
  if (deps) {
    setGameDependencies(deps.versionsService, deps.modLoaderService)
  }

  // 按模块注册（每个单独 try-catch，一个失败不影响后面的）
  try { registerWindowHandlers(mainWindow); log.error('[IPC] window handlers done') } catch(e: any) { log.error('[IPC] window handlers FAILED:', e.message) }
  try { registerConfigHandlers(); log.error('[IPC] config handlers done') } catch(e: any) { log.error('[IPC] config handlers FAILED:', e.message) }
  try { registerInstanceHandlers(); log.error('[IPC] instance handlers done') } catch(e: any) { log.error('[IPC] instance handlers FAILED:', e.message) }
  try { registerAccountHandlers(); log.error('[IPC] account handlers done') } catch(e: any) { log.error('[IPC] account handlers FAILED:', e.message) }
  try { registerDownloadHandlers(); log.error('[IPC] download handlers done') } catch(e: any) { log.error('[IPC] download handlers FAILED:', e.message) }
  try { registerGameHandlers(mainWindow); log.error('[IPC] game handlers done') } catch(e: any) { log.error('[IPC] game handlers FAILED:', e.message) }
  try { registerJavaHandlers(); log.error('[IPC] java handlers done') } catch(e: any) { log.error('[IPC] java handlers FAILED:', e.message) }
  try { registerContentHandlers(); log.error('[IPC] content handlers done') } catch(e: any) { log.error('[IPC] content handlers FAILED:', e.message) }
  try { registerDialogHandlers(mainWindow); log.error('[IPC] dialog handlers done') } catch(e: any) { log.error('[IPC] dialog handlers FAILED:', e.message) }

  // 崩溃分析
  if (deps?.crashService) {
    try { registerCrashIpcHandlers(deps.crashService); log.error('[IPC] crash handlers done') } catch(e: any) { log.error('[IPC] crash handlers FAILED:', e.message) }
  }

  // Mod 管理
  if (deps?.modService) {
    try { registerModIpcHandlers(deps.modService); log.error('[IPC] mod handlers done') } catch(e: any) { log.error('[IPC] mod handlers FAILED:', e.message) }
  }

  // ModLoader 安装（进度推送）
  try { registerModLoaderHandlers(mainWindow, deps?.modLoaderService); log.error('[IPC] modloader handlers done') } catch(e: any) { log.error('[IPC] modloader handlers FAILED:', e.message) }

  // 通知系统（关键：必须注册上）
  try {
    registerNotificationHandlers()
    log.error('[IPC] notification handlers done')
  } catch(e: any) {
    log.error('[IPC] notification handlers FAILED:', e.message)
  }

  // console.error('[IPC] >>>>> All handlers registered')
}

/**
 * 仅更新各 IPC 模块中的 mainWindow 引用（不重复注册 handlers）
 * 供 app.on('activate') 重建窗口后调用
 */
export function updateMainWindowRefs(win: BrowserWindow): void {
  // 仅更新已知存在的 mainWindow 引用
  try { updateModLoaderMainWindow(win) } catch (e: any) { log.error('[IPC] update modloader win failed:', e.message) }
  // 其他模块的 update 函数按需在此补充
}
