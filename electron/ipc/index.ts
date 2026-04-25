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
  // 注入游戏依赖
  if (deps) {
    setGameDependencies(deps.versionsService, deps.modLoaderService)
  }

  // 按模块注册
  registerWindowHandlers(mainWindow)    // 窗口控制
  registerConfigHandlers()              // 应用配置
  registerInstanceHandlers()            // 实例管理
  registerAccountHandlers()             // 账户管理
  registerDownloadHandlers()            // 下载管理
  registerGameHandlers(mainWindow)      // 游戏启动 + 版本
  registerJavaHandlers()                // Java 管理
  registerContentHandlers()             // 内容平台
  registerDialogHandlers(mainWindow)   // 对话框 + 路径
  
  // 崩溃分析
  if (deps?.crashService) {
    registerCrashIpcHandlers(deps.crashService)
  }
  
  // Mod 管理
  if (deps?.modService) {
    registerModIpcHandlers(deps.modService)
  }

  console.log('[IPC] All handlers registered')
}
