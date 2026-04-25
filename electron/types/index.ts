/**
 * electron/types/ 统一导出
 */

// 游戏适配器类型（核心业务模型）
export type {
  GameInfo,
  GameInstance,
  JavaInfo,
  ModLoaderType,
  ModLoader,
  GameVersion,
  CrashReport,
  IGameAdapter,
} from './adapter.types'
export { IpcChannels } from './adapter.types'

// IPC 类型安全
export type {
  // 响应包装
  IpcOk,
  IpcError,
  IpcResponse,
  // 窗口
  WindowMinimizeArgs,
  WindowMaximizeArgs,
  WindowCloseArgs,
  WindowIsMaximizedArgs,
  WindowIsMaximizedReturn,
  // 配置
  ConfigGetArgs,
  ConfigSetArgs,
  ConfigGetReturn,
  // 实例
  InstanceListArgs,
  InstanceCreateArgs,
  InstanceUpdateArgs,
  InstanceDeleteArgs,
  InstanceGetByIdArgs,
  InstanceListReturn,
  InstanceCreateReturn,
  InstanceGetByIdReturn,
  // 账户
  AccountData,
  AccountListArgs,
  AccountLoginMicrosoftArgs,
  AccountLoginOfflineArgs,
  AccountDeleteArgs,
  AccountSetActiveArgs,
  AccountListReturn,
  AccountLoginMicrosoftReturn,
  AccountLoginOfflineReturn,
  // 下载
  SearchModsArgs,
  GetProjectArgs,
  GetFilesArgs,
  DownloadFileArgs,
  CancelDownloadArgs,
  DownloadGetActiveArgs,
  DownloadGetQueueArgs,
  SearchModsResultItem,
  SearchModsReturn,
  DownloadGetActiveReturn,
  DownloadGetQueueReturn,
  // Java
  JavaInfoEntry,
  JavaDetectArgs,
  JavaGetDefaultArgs,
  JavaDetectReturn,
  JavaGetDefaultReturn,
  // 版本
  VersionListArgs,
  VersionListLoadersArgs,
  VersionListReturn,
  GameVersionEntry,
  // MC 版本清单
  VersionsListArgs,
  VersionsGetLatestArgs,
  VersionsGetInfoArgs,
  McVersionManifest,
  McVersionInfo,
  VersionsListReturn,
  // ModLoader
  ModloaderGetLoadersArgs,
  ModloaderInstallArgs,
  ModloaderGetStatusArgs,
  ModloaderGetProgressArgs,
  ModloaderInstallStatus,
  // 游戏启动
  GameLaunchArgs,
  GameGetLogArgs,
  GameTerminateArgs,
  GameIsRunningArgs,
  GameLaunchReturn,
  GameGetLogReturn,
  GameIsRunningReturn,
  // 内容平台
  ContentPlatform,
  ContentCategory,
  ContentGetPlatformsArgs,
  ContentGetCategoriesArgs,
  ContentGetLoadersArgs,
  // 对话框
  SelectFolderArgs,
  SelectFolderReturn,
  // 路径工具
  PathMinecraftArgs,
  PathExistsArgs,
  PathMinecraftReturn,
  PathExistsReturn,
  // 类型映射表
  IpcInvokeMap,
} from './ipc.types'

// 数据库类型
export type {
  DbInstance,
  DbAccount,
  DbDownload,
  DbMod,
  DbSetting,
  DbJavaVersion,
} from './database.types'
export { SCHEMA_DDL, TableName } from './database.types'

// 下载相关（独立文件）
export type {
  DownloadStatus,
  DownloadTask,
  DownloadConfig,
  DownloadProgress,
} from './download.types'

// ModLoader 配置类型
export type { ModloaderTypesConfig } from './modloader.types'
