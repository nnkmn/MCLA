/**
 * 主进程 IPC 通道参数与返回值类型定义
 *
 * 与 src/types/ipc.ts 中的通道名常量一一对应，
 * 提供类型安全的 invoke 调用签名。
 *
 * 使用方式：
 *   import { IpcRequest } from '../../electron/types/ipc.types'
 *   const instances = await ipcRenderer.invoke('instance:list') // 自动推断为 GameInstance[]
 */

import type { GameInstance } from './adapter.types'
import type { DownloadTask, DownloadConfig, DownloadProgress } from './download.types'
import type { ModLoaderType } from './adapter.types'

// ==================== 基础响应包装 ====================

/** 标准成功响应 */
export interface IpcOk<T = void> {
  ok: true
  data: T
}

/** 标准错误响应 */
export interface IpcError {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/** 统一 IPC 返回类型 */
export type IpcResponse<T = void> = IpcOk<T> | IpcError

// ==================== 窗口控制 ====================

export interface WindowMinimizeArgs { void }
export interface WindowMaximizeArgs { void }
export interface WindowCloseArgs { void }
export interface WindowIsMaximizedArgs { void }
export type WindowIsMaximizedReturn = boolean

// ==================== 配置管理 ====================

export interface ConfigGetArgs {
  key: string
}
export interface ConfigSetArgs {
  key: string
  value: unknown
}
export type ConfigGetReturn = unknown

// ==================== 实例管理 ====================

export interface InstanceListArgs { void }
export interface InstanceCreateArgs extends Partial<GameInstance> {
  /** 必填：实例名称 */
  name: string
  /** 必填：MC 版本 */
  version: string
  /** 必填：游戏目录路径 */
  gameDir?: string
}
export interface InstanceUpdateArgs {
  id: string
  changes: Partial<Pick<GameInstance, 'name' | 'version' | 'modLoader' | 'javaPath' | 'jvmArgs' | 'minMemory' | 'maxMemory'>>
}
export interface InstanceDeleteArgs {
  id: string
}
export interface InstanceGetByIdArgs {
  id: string
}
export type InstanceListReturn = GameInstance[]
export type InstanceCreateReturn = GameInstance
export type InstanceGetByIdReturn = GameInstance | null

// ==================== 账户管理 ====================

export interface AccountData {
  id: string
  type: 'microsoft' | 'offline'
  username: string
  uuid?: string
  accessToken?: string    // 加密存储
  refreshToken?: string    // 加密存储（微软账户）
  skinType?: 'default' | 'steve' | 'alex' | 'custom' | 'official'
  customSkinPath?: string
  officialSkinName?: string
  isActive: boolean
  createdAt: number
  lastUsedAt?: number
}

export interface AccountListArgs { void }
export interface AccountLoginMicrosoftArgs { void }
export interface AccountLoginOfflineArgs {
  username: string
}
export interface AccountDeleteArgs {
  id: string
}
export interface AccountSetActiveArgs {
  id: string
}
export type AccountListReturn = AccountData[]
export type AccountLoginMicrosoftReturn = AccountData
export type AccountLoginOfflineReturn = AccountData

// ==================== 下载管理 ====================

export interface SearchModsArgs {
  query: string
  source: 'curseforge' | 'modrinth'
  category?: string
  gameVersion?: string
  loaderType?: ModLoaderType
  page?: number
  pageSize?: number
}
export interface GetProjectArgs {
  projectId: string
  source: 'curseforge' | 'modrinth'
}
export interface GetFilesArgs {
  projectId: string
  source: 'curseforge' | 'modrinth'
  gameVersion?: string
  loaderType?: ModLoaderType
}
export interface DownloadFileArgs {
  fileId: string
  source: 'curseforge' | 'modrinth'
  destination: string
}
export interface CancelDownloadArgs {
  taskId: string
}
export interface DownloadGetActiveArgs { void }
export interface DownloadGetQueueArgs { void }
export type SearchModsResultItem = {
  id: string
  title: string
  description: string
  author: string
  iconUrl?: string
  downloadCount: number
  source: 'curseforge' | 'modrinth'
  categories: string[]
  gameVersions: string[]
  loaders: ModLoaderType[]
  pageUrl: string
}
export type SearchModsReturn = SearchModsResultItem[]
export type DownloadGetActiveReturn = DownloadTask[]
export type DownloadGetQueueReturn = DownloadTask[]

// ==================== Java 管理 ====================

export interface JavaInfoEntry {
  path: string
  version: string
  major: number
  isValid: boolean
  vendor?: string
  architecture?: string
}
export interface JavaDetectArgs { void }
export interface JavaGetDefaultArgs { void }
export type JavaDetectReturn = JavaInfoEntry[]
export type JavaGetDefaultReturn = string | null

// ==================== 版本管理 ====================

export interface VersionListArgs { void }
export interface VersionListLoadersArgs {
  minecraftVersion: string
}
export interface GameVersionEntry {
  id: string
  name: string
  releaseTime: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}
export type VersionListReturn = GameVersionEntry[]

// ==================== MC 版本清单 ====================

export interface VersionsListArgs {
  type?: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}
export interface VersionsGetLatestArgs {
  type?: 'release' | 'snapshot'
}
export interface VersionsGetInfoArgs {
  versionId: string
}
export interface McVersionManifest {
  latest: { release: string; snapshot: string }
  versions: McVersionInfo[]
}
export interface McVersionInfo {
  id: string
  type: string
  url: string
  time: string
  releaseTime: string
}
export type VersionsListReturn = McVersionManifest

// ==================== ModLoader ====================

export interface ModloaderGetLoadersArgs {
  minecraftVersion: string
}
export interface ModloaderInstallArgs {
  instanceId: string
  loaderType: ModLoaderType
  loaderVersion: string
  gameDir: string
}
export interface ModloaderGetStatusArgs {
  instanceId: string
}
export interface ModloaderGetProgressArgs {
  instanceId: string
}
export interface ModloaderInstallStatus {
  status: 'idle' | 'downloading' | 'installing' | 'complete' | 'error'
  progress: number      // 0-100
  currentStep?: string
  error?: string
}

// ==================== 游戏启动 ====================

export interface GameLaunchArgs {
  instanceId: string
  accountId?: string
}
export interface GameGetLogArgs {
  instanceId: string
  lines?: number
}
export interface GameTerminateArgs {
  instanceId: string
}
export interface GameIsRunningArgs {
  instanceId: string
}
export type GameLaunchReturn = void
export type GameGetLogReturn = string
export type GameIsRunningReturn = boolean

// ==================== 内容平台 ====================

export interface ContentPlatform {
  id: string
  name: string
  icon: string
  enabled: boolean
}

export interface ContentCategory {
  id: string
  name: string
  slug: string
}

export interface ContentGetPlatformsArgs { void }
export interface ContentGetCategoriesArgs {
  platformId: string
}
export interface ContentGetLoadersArgs {
  platformId: string
  gameVersion?: string
}

// ==================== 对话框 ====================

export interface SelectFolderArgs {
  title?: string
  defaultPath?: string
}
export type SelectFolderReturn = string | null

// ==================== 路径工具 ====================

export interface PathMinecraftArgs { void }
export interface PathExistsArgs {
  path: string
}
export type PathMinecraftReturn = string
export type PathExistsReturn = boolean

// ==================== 类型映射表 ====================

/**
 * 完整的 IPC 请求/返回类型映射
 * 用法：IpcInvokeMap['instance:list'] → { args: InstanceListArgs; return: InstanceListReturn; }
 */
export interface IpcInvokeMap {
  // 窗口
  'window:minimize': { args: WindowMinimizeArgs; return: void }
  'window:maximize': { args: WindowMaximizeArgs; return: void }
  'window:close': { args: WindowCloseArgs; return: void }
  'window:is-maximized': { args: WindowIsMaximizedArgs; return: WindowIsMaximizedReturn }

  // 配置
  'config:get': { args: ConfigGetArgs; return: ConfigGetReturn }
  'config:set': { args: ConfigSetArgs; return: void }

  // 实例
  'instance:list': { args: InstanceListArgs; return: InstanceListReturn }
  'instance:create': { args: InstanceCreateArgs; return: InstanceCreateReturn }
  'instance:update': { args: InstanceUpdateArgs; return: GameInstance }
  'instance:delete': { args: InstanceDeleteArgs; return: void }
  'instance:get-by-id': { args: InstanceGetByIdArgs; return: InstanceGetByIdReturn }

  // 账户
  'account:list': { args: AccountListArgs; return: AccountListReturn }
  'account:login-microsoft': { args: AccountLoginMicrosoftArgs; return: AccountLoginMicrosoftReturn }
  'account:login-offline': { args: AccountLoginOfflineArgs; return: AccountLoginOfflineReturn }
  'account:delete': { args: AccountDeleteArgs; return: void }
  'account:set-active': { args: AccountSetActiveArgs; return: void }

  // 下载
  'download:search-mods': { args: SearchModsArgs; return: SearchModsReturn }
  'download:get-project': { args: GetProjectArgs; return: unknown }
  'download:get-files': { args: GetFilesArgs; return: unknown }
  'download:file': { args: DownloadFileArgs; return: string }
  'download:cancel': { args: CancelDownloadArgs; return: void }
  'download:get-active': { args: DownloadGetActiveArgs; return: DownloadGetActiveReturn }
  'download:get-queue': { args: DownloadGetQueueArgs; return: DownloadGetQueueReturn }

  // Java
  'java:detect': { args: JavaDetectArgs; return: JavaDetectReturn }
  'java:get-default': { args: JavaGetDefaultArgs; return: JavaGetDefaultReturn }

  // 版本
  'version:list': { args: VersionListArgs; return: VersionListReturn }
  'version:list-loaders': { args: VersionListLoadersArgs; return: unknown }

  // MC 版本清单
  'versions:list': { args: VersionsListArgs; return: VersionsListReturn }
  'versions:get-latest': { args: VersionsGetLatestArgs; return: McVersionInfo }
  'versions:get-info': { args: VersionsGetInfoArgs; return: McVersionInfo }

  // ModLoader
  'modloader:get-loaders': { args: ModloaderGetLoadersArgs; return: unknown }
  'modloader:install': { args: ModloaderInstallArgs; return: unknown }
  'modloader:get-status': { args: ModloaderGetStatusArgs; return: ModloaderInstallStatus }
  'modloader:get-progress': { args: ModloaderGetProgressArgs; return: ModloaderInstallStatus }

  // 游戏启动
  'game:launch': { args: GameLaunchArgs; return: GameLaunchReturn }
  'game:get-log': { args: GameGetLogArgs; return: GameGetLogReturn }
  'game:terminate': { args: GameTerminateArgs; return: void }
  'game:is-running': { args: GameIsRunningArgs; return: GameIsRunningReturn }
  'game:log': { args: GameGetLogArgs; return: string }
  'game:exit': { args: never; return: void } // 事件，非调用

  // 内容平台
  'content:get-platforms': { args: ContentGetPlatformsArgs; return: ContentPlatform[] }
  'content:get-categories': { args: ContentGetCategoriesArgs; return: ContentCategory[] }
  'content:get-loaders': { args: ContentGetLoadersArgs; return: unknown }

  // 对话框
  'dialog:select-folder': { args: SelectFolderArgs; return: SelectFolderReturn }

  // 路径工具
  'path:minecraft': { args: PathMinecraftArgs; return: PathMinecraftReturn }
  'path:exists': { args: PathExistsArgs; return: PathExistsReturn }
}
