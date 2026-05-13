import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
      const listener = (_event: any, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('window:maximized-changed', listener)
      return () => ipcRenderer.removeListener('window:maximized-changed', listener)
    },
  },

  // 应用信息
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
  },

  // 应用配置
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    // 敏感配置（自动加解密，用于 API Key 等）
    getSecure: (key: string) => ipcRenderer.invoke('config:get-secure', key),
    setSecure: (key: string, value: string) => ipcRenderer.invoke('config:set-secure', key, value),
  },

  // 实例管理
  instance: {
    list: () => ipcRenderer.invoke('instance:list'),
    create: (data: unknown) => ipcRenderer.invoke('instance:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('instance:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('instance:delete', id),
    getById: (id: string) => ipcRenderer.invoke('instance:get-by-id', id),
    // 快捷更新
    updateName: (id: string, name: string) => ipcRenderer.invoke('instance:update-name', id, name),
    updateDescription: (id: string, description: string) =>
      ipcRenderer.invoke('instance:update-description', id, description),
    toggleFavorite: (id: string) => ipcRenderer.invoke('instance:toggle-favorite', id),
    // 导入导出
    scanMinecraft: (dirPath: string) => ipcRenderer.invoke('instance:scan-minecraft', dirPath),
    exportInstance: (id: string, destPath: string, options?: { includeMods?: boolean; includeConfigs?: boolean; includeSaves?: boolean }) =>
      ipcRenderer.invoke('instance:export', id, destPath, options),
    importInstance: (mclaFilePath: string, targetDir: string) =>
      ipcRenderer.invoke('instance:import', mclaFilePath, targetDir),
  },

  // 账户管理
  account: {
    list: () => ipcRenderer.invoke('account:list'),
    getDeviceCode: () => ipcRenderer.invoke('account:get-device-code'),
    loginMicrosoft: () => ipcRenderer.invoke('account:login-microsoft'),
    cancelLogin: () => ipcRenderer.invoke('account:cancel-login'),
    loginOffline: (username: string) => ipcRenderer.invoke('account:login-offline', username),
    delete: (id: string) => ipcRenderer.invoke('account:delete', id),
    setActive: (id: string) => ipcRenderer.invoke('account:set-active', id),
    refreshToken: (id: string) => ipcRenderer.invoke('account:refresh-token', id),
    openVerificationUrl: () => ipcRenderer.invoke('account:open-verification-url'),
    getSkinDataUrl: (uuid: string) => ipcRenderer.invoke('account:get-skin-data-url', uuid),
    onLoginProgress: (callback: (payload: { stage: string; detail?: string }) => void) => {
      const listener = (_event: any, payload: any) => callback(payload)
      ipcRenderer.on('account:login-progress', listener)
      return () => ipcRenderer.removeListener('account:login-progress', listener)
    },
  },

  // 下载管理
  download: {
    searchMods: (params: {
      query?: string
      source?: string
      offset?: number
      limit?: number
      gameVersion?: string
      loader?: string
      category?: string
      projectType?: string
    }) =>
      ipcRenderer.invoke('download:search-mods', params),
    getProject: (projectId: string, platform: string) =>
      ipcRenderer.invoke('download:get-project', projectId, platform),
    getFiles: (projectId: string, platform: string, options?: Record<string, unknown>) =>
      ipcRenderer.invoke('download:get-files', projectId, platform, options ?? {}),
    /** 下载 Mod 文件到指定目录 */
    downloadFile: (file: {
      id: string
      fileName: string
      url: string
      gameVersions: string[]
      loaders: string[]
      releaseType: string
      datePublished: string
      size: number
      downloads: number
      platform: string
    }, dest: string) =>
      ipcRenderer.invoke('download:file', file, dest),
    getActive: () => ipcRenderer.invoke('download:get-active'),
    getQueue: () => ipcRenderer.invoke('download:get-queue'),
    onProgress: (callback: (progress: unknown) => void) => {
      const listener = (_event: any, progress: any) => callback(progress)
      ipcRenderer.on('download:progress', listener)
      return () => ipcRenderer.removeListener('download:progress', listener)
    },
    cancelDownload: (id: string) => ipcRenderer.invoke('download:cancel', id)
  },

  // Java 管理
  java: {
    detect: () => ipcRenderer.invoke('java:detect'),
    getDefault: () => ipcRenderer.invoke('java:get-default')
  },

  // 游戏版本
  version: {
    listVersions: () => ipcRenderer.invoke('version:list'),
    listLoaders: (mcVersion: string) => ipcRenderer.invoke('version:list-loaders', mcVersion)
  },

  // 已安装版本扫描
  versions: {
    scanFolder: (gameDir: string) =>
      ipcRenderer.invoke('versions:scan-folder', { gameDir }),
    /** 检查单个版本是否已安装（支持 ModLoader 继承版本） */
    isInstalled: (versionId: string, gameDir: string) =>
      ipcRenderer.invoke('versions:is-installed', { versionId, gameDir }),
    list: () => ipcRenderer.invoke('versions:list'),
    getLatest: () => ipcRenderer.invoke('versions:get-latest'),
    getInfo: (versionId: string) => ipcRenderer.invoke('versions:get-info', versionId),
    /** 阻塞式下载 MC 版本 */
    download: (versionId: string, gameDir: string) =>
      ipcRenderer.invoke('versions:download', { versionId, gameDir }),
    /** 启动带进度的后台下载（立即返回 taskId） */
    downloadStart: (versionId: string, gameDir: string) =>
      ipcRenderer.invoke('versions:download-start', { versionId, gameDir }),
    /** 删除目录下的 MC 版本 */
    delete: (versionId: string, gameDir: string) =>
      ipcRenderer.invoke('versions:delete', { versionId, gameDir }),
    /** 检测缺失的文件 */
    validate: (versionId: string, gameDir: string) =>
      ipcRenderer.invoke('versions:validate', { versionId, gameDir }),
    /** 下载缺失的文件 */
    downloadMissing: (versionId: string, gameDir: string) =>
      ipcRenderer.invoke('versions:download-missing', { versionId, gameDir }),
    /** 监听版本下载进度（带 phase/speed 的详细进度） */
    onDownloadProgress: (callback: (data: {
      taskId: string; versionId: string; phase: string; phaseLabel: string
      progress: number; downloaded: number; total: number; speed: number; gameDir: string
    }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('version:download-progress', listener)
      return () => ipcRenderer.removeListener('version:download-progress', listener)
    },
    /** 监听版本下载完成 */
    onDownloadComplete: (callback: (data: { taskId: string; versionId: string; gameDir: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('version:download-complete', listener)
      return () => ipcRenderer.removeListener('version:download-complete', listener)
    },
    /** 监听版本下载失败 */
    onDownloadError: (callback: (data: { taskId: string; versionId: string; error: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('version:download-error', listener)
      return () => ipcRenderer.removeListener('version:download-error', listener)
    },
  },

  // ModLoader
  modloader: {
    getLoaders: (mcVersion: string) => ipcRenderer.invoke('modloader:get-loaders', { minecraftVersion: mcVersion }),
    install: (instanceId: string, loaderType: string, loaderVersion: string, gameDir: string) =>
      ipcRenderer.invoke('modloader:install', {
        instanceId,
        loaderType,
        loaderVersion,
        gameDir
      }),
    onProgress: (callback: (data: { instanceId: string; stage: string; progress: number; message: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('modloader:progress', listener)
      return () => ipcRenderer.removeListener('modloader:progress', listener)
    },
  },

  // 游戏启动
  game: {
    launch: (instanceId: string, accountId: string, versionId?: string) =>
      ipcRenderer.invoke('game:launch', { instanceId, accountId, versionId }),
    getLog: (instanceId: string) => ipcRenderer.invoke('game:get-log', { instanceId }),
    onProgress: (callback: (progress: { phase: string; message: string; detail?: string }) => void) => {
      const listener = (_event: any, progress: { phase: string; message: string; detail?: string }) => callback(progress)
      ipcRenderer.on('game:progress', listener)
      return () => ipcRenderer.removeListener('game:progress', listener)
    },
    onLog: (callback: (log: string) => void) => {
      const listener = (_event: any, log: string) => callback(log)
      ipcRenderer.on('game:log', listener)
      return () => ipcRenderer.removeListener('game:log', listener)
    },
    onExit: (callback: (code: number) => void) => {
      const listener = (_event: any, code: number) => callback(code)
      ipcRenderer.on('game:exit', listener)
      return () => ipcRenderer.removeListener('game:exit', listener)
    },
  },

  // 文件对话框
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
    selectFile: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
      ipcRenderer.invoke('dialog:select-file', options ?? {})
  },

  // Shell 操作
  shell: {
    openPath: (absPath: string) => ipcRenderer.invoke('shell:open-path', absPath)
  },

  // 路径工具
  path: {
    getMinecraft: () => ipcRenderer.invoke('path:minecraft'),
    getDefault: () => ipcRenderer.invoke('path:get-default'),
    getAppPath: () => ipcRenderer.invoke('path:app-path'),
    exists: (p: string) => ipcRenderer.invoke('path:exists', p),
    /** 获取自定义 .minecraft 路径（null=未设置） */
    getCustom: () => ipcRenderer.invoke('path:custom:get') as Promise<string | null>,
    /** 设置自定义 .minecraft 路径 */
    setCustom: (path: string) => ipcRenderer.invoke('path:custom:set', path),
    /** 清除自定义路径，恢复默认 */
    clearCustom: () => ipcRenderer.invoke('path:custom:clear'),
    /** 创建目录 */
    createDir: (path: string) => ipcRenderer.invoke('path:create-dir', path),
  },

  // 版本选择器文件夹列表
  folders: {
    /** 获取已保存的文件夹列表 */
    list: () => ipcRenderer.invoke('folders:list') as Promise<string[]>,
    /** 保存完整文件夹列表 */
    save: (paths: string[]) => ipcRenderer.invoke('folders:save', paths),
    /** 添加一个文件夹 */
    add: (path: string) => ipcRenderer.invoke('folders:add', path) as Promise<string[]>,
    /** 移除一个文件夹 */
    remove: (path: string) => ipcRenderer.invoke('folders:remove', path) as Promise<string[]>,
    /** 获取上次选中的文件夹 */
    getLast: () => ipcRenderer.invoke('folders:last:get') as Promise<string | null>,
    /** 保存上次选中的文件夹 */
    setLast: (path: string) => ipcRenderer.invoke('folders:last:set', path),
  },

  // 崩溃分析
  crash: {
    parse: (logPath: string, instanceId: string) =>
      ipcRenderer.invoke('crash:parse', { logPath, instanceId }),
    diagnose: (logPath: string, instanceId: string) =>
      ipcRenderer.invoke('crash:diagnose', { logPath, instanceId }),
    list: (gameDir: string) =>
      ipcRenderer.invoke('crash:list', { gameDir }),
    latest: (gameDir: string) =>
      ipcRenderer.invoke('crash:latest', { gameDir }),
    onCrash: (callback: (data: { reason: string; crashReportPath?: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('crash:detected', listener)
      return () => ipcRenderer.removeListener('crash:detected', listener)
    }
  },

  // 通知系统
  notification: {
    getHistory: (limit?: number) => ipcRenderer.invoke('notification:get-history', limit),
    markRead: (id: string) => ipcRenderer.invoke('notification:mark-read', id),
    markAllRead: () => ipcRenderer.invoke('notification:mark-all-read'),
    clear: () => ipcRenderer.invoke('notification:clear'),
    getUnreadCount: () => ipcRenderer.invoke('notification:get-unread-count') as Promise<number>,
    onNotify: (callback: (item: { id: string; title: string; body: string; type: string; timestamp: number; route?: string }) => void) => {
      const listener = (_event: any, item: any) => callback(item)
      ipcRenderer.on('notification:new', listener)
      return () => ipcRenderer.removeListener('notification:new', listener)
    },
    onClicked: (callback: (data: { id: string; route?: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('notification:clicked', listener)
      return () => ipcRenderer.removeListener('notification:clicked', listener)
    },
  },

  // Mod 管理
  mod: {
    list: (gameDir: string) => ipcRenderer.invoke('mod:list', { gameDir }),
    install: (sourcePath: string, gameDir: string) =>
      ipcRenderer.invoke('mod:install', { sourcePath, gameDir }),
    uninstall: (modPath: string) =>
      ipcRenderer.invoke('mod:uninstall', { modPath }),
    enable: (modPath: string) =>
      ipcRenderer.invoke('mod:enable', { modPath }),
    disable: (modPath: string) =>
      ipcRenderer.invoke('mod:disable', { modPath }),
    installBatch: (sourcePaths: string[], gameDir: string) =>
      ipcRenderer.invoke('mod:install-batch', { sourcePaths, gameDir }),
    checkCompat: (mods: any[], targetVersion: string, loader?: string) =>
      ipcRenderer.invoke('mod:check-compat', { mods, targetVersion, loader }),
    ensureDir: (gameDir: string) =>
      ipcRenderer.invoke('mod:ensure-dir', { gameDir }),
    // Config 文件读写
    listConfigs: (gameDir: string) => ipcRenderer.invoke('mod:read-config', { gameDir }),
    getConfigContent: (filePath: string) => ipcRenderer.invoke('mod:get-config-content', { filePath }),
    saveConfigContent: (filePath: string, content: string) =>
      ipcRenderer.invoke('mod:save-config-content', { filePath, content }),
    openConfigDir: (gameDir: string) => ipcRenderer.invoke('mod:open-config-dir', { gameDir }),
    // 更新检测
    checkUpdate: (mods: any[], mcVersion?: string, loader?: string) =>
      ipcRenderer.invoke('mod:check-update', { mods, mcVersion, loader }),
    update: (mod: any, updateInfo: any) =>
      ipcRenderer.invoke('mod:update', { mod, updateInfo }),
    onUpdateProgress: (callback: (data: { filePath: string; progress: number }) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('mod:update-progress', listener)
      return () => ipcRenderer.removeListener('mod:update-progress', listener)
    },
  }
}

export type MclaAPI = typeof api

contextBridge.exposeInMainWorld('electronAPI', api)
