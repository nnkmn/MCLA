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

  // 应用配置
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value)
  },

  // 实例管理
  instance: {
    list: () => ipcRenderer.invoke('instance:list'),
    create: (data: unknown) => ipcRenderer.invoke('instance:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('instance:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('instance:delete', id),
    getById: (id: string) => ipcRenderer.invoke('instance:get-by-id', id)
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
    searchMods: (query: string, source: string, offset?: number) =>
      ipcRenderer.invoke('download:search-mods', { query, source, offset }),
    downloadFile: (url: string, dest: string) => ipcRenderer.invoke('download:file', { url, dest }),
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

  // ModLoader
  modloader: {
    getLoaders: (mcVersion: string) => ipcRenderer.invoke('modloader:get-loaders', { minecraftVersion: mcVersion }),
    install: (instanceId: string, loaderType: string, loaderVersion: string, gameDir: string) =>
      ipcRenderer.invoke('modloader:install', {
        instanceId,
        loaderType,
        loaderVersion,
        gameDir
      })
  },

  // 游戏启动
  game: {
    launch: (instanceId: string, accountId: string) => ipcRenderer.invoke('game:launch', { instanceId, accountId }),
    getLog: (instanceId: string) => ipcRenderer.invoke('game:get-log', { instanceId }),
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
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder')
  },

  // 路径工具
  path: {
    getMinecraft: () => ipcRenderer.invoke('path:minecraft'),
    exists: (p: string) => ipcRenderer.invoke('path:exists', p)
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
      ipcRenderer.invoke('mod:ensure-dir', { gameDir })
  }
}

export type MclaAPI = typeof api

contextBridge.exposeInMainWorld('electronAPI', api)
