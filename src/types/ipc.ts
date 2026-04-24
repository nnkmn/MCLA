/**
 * IPC 通道名常量与类型定义
 * 与 electron/preload.ts 和 main.ts 的 registerIpcHandlers 对齐
 */

// ========== 窗口控制 ==========
export const IPC_WINDOW = {
  MINIMIZE: 'window:minimize',
  MAXIMIZE: 'window:maximize',
  CLOSE: 'window:close',
  IS_MAXIMIZED: 'window:is-maximized',
  MAXIMIZED_CHANGED: 'window:maximized-changed',
} as const

// ========== 配置 ==========
export const IPC_CONFIG = {
  GET: 'config:get',
  SET: 'config:set',
} as const

// ========== 实例管理 ==========
export const IPC_INSTANCE = {
  LIST: 'instance:list',
  CREATE: 'instance:create',
  UPDATE: 'instance:update',
  DELETE: 'instance:delete',
  GET_BY_ID: 'instance:get-by-id',
} as const

// ========== 账户管理 ==========
export const IPC_ACCOUNT = {
  LIST: 'account:list',
  LOGIN_MICROSOFT: 'account:login-microsoft',
  LOGIN_OFFLINE: 'account:login-offline',
  DELETE: 'account:delete',
  SET_ACTIVE: 'account:set-active',
} as const

// ========== 下载管理 ==========
export const IPC_DOWNLOAD = {
  SEARCH_MODS: 'download:search-mods',
  GET_PROJECT: 'download:get-project',
  GET_FILES: 'download:get-files',
  FILE: 'download:file',
  CANCEL: 'download:cancel',
  GET_ACTIVE: 'download:get-active',
  GET_QUEUE: 'download:get-queue',
  PROGRESS: 'download:progress',
} as const

// ========== Java 管理 ==========
export const IPC_JAVA = {
  DETECT: 'java:detect',
  GET_DEFAULT: 'java:get-default',
} as const

// ========== 版本管理（游戏） ==========
export const IPC_VERSION = {
  LIST: 'version:list',
  LIST_LOADERS: 'version:list-loaders',
} as const

// ========== MC 版本清单 ==========
export const IPC_VERSIONS = {
  LIST: 'versions:list',
  GET_LATEST: 'versions:get-latest',
  GET_INFO: 'versions:get-info',
} as const

// ========== ModLoader ==========
export const IPC_MODLOADER = {
  GET_LOADERS: 'modloader:get-loaders',
  INSTALL: 'modloader:install',
  GET_STATUS: 'modloader:get-status',
  GET_PROGRESS: 'modloader:get-progress',
} as const

// ========== 游戏启动 ==========
export const IPC_GAME = {
  LAUNCH: 'game:launch',
  GET_LOG: 'game:get-log',
  TERMINATE: 'game:terminate',
  IS_RUNNING: 'game:is-running',
  LOG: 'game:log',
  EXIT: 'game:exit',
} as const

// ========== 内容平台 ==========
export const IPC_CONTENT = {
  GET_PLATFORMS: 'content:get-platforms',
  GET_CATEGORIES: 'content:get-categories',
  GET_LOADERS: 'content:get-loaders',
} as const

// ========== 对话框 ==========
export const IPC_DIALOG = {
  SELECT_FOLDER: 'dialog:select-folder',
} as const

// ========== 路径工具 ==========
export const IPC_PATH = {
  MINECRAFT: 'path:minecraft',
  EXISTS: 'path:exists',
} as const

// ========== 统一导出所有通道名 ==========
export const IPC_CHANNELS = {
  ...IPC_WINDOW,
  ...IPC_CONFIG,
  ...IPC_INSTANCE,
  ...IPC_ACCOUNT,
  ...IPC_DOWNLOAD,
  ...IPC_JAVA,
  ...IPC_VERSION,
  ...IPC_VERSIONS,
  ...IPC_MODLOADER,
  ...IPC_GAME,
  ...IPC_CONTENT,
  ...IPC_DIALOG,
  ...IPC_PATH,
}
