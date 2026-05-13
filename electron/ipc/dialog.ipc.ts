/**
 * 对话框 / 路径工具 / Shell 操作 IPC
 */
import { app, ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import * as configService from '../services/config'
import { logger } from '../utils/logger'
const log = logger.child('Dialog-IPC')

// 配置键名
const CUSTOM_MC_PATH_KEY = 'custom_minecraft_path'

/** 获取默认 .minecraft 路径 */
function getDefaultMinecraftPath(): string {
  const home = app.getPath('home')
  const platform = process.platform
  if (platform === 'win32') return join(home, 'AppData', 'Roaming', '.minecraft')
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'minecraft')
  return join(home, '.minecraft')
}

/** 获取 .minecraft 路径（优先自定义，其次默认） */
function getMinecraftPath(): string {
  const customPath = configService.getConfig<string>(CUSTOM_MC_PATH_KEY)
  if (customPath) {
    return customPath
  }
  return getDefaultMinecraftPath()
}

export function registerDialogHandlers(mainWindow: BrowserWindow): void {
  log.error('[IPC dialog] ===== registerDialogHandlers called =====')
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择 .minecraft 文件夹',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:select-file', async (_event, options: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
    defaultPath?: string
  }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: options.title || '选择文件',
      filters: options.filters || [],
      defaultPath: options.defaultPath,
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('path:minecraft', () => getMinecraftPath())
  ipcMain.handle('path:exists', (_event, p: string) => existsSync(p))
  ipcMain.handle('path:get-default', () => getDefaultMinecraftPath())

  // 自定义 .minecraft 路径
  ipcMain.handle('path:custom:get', () => {
    const val = configService.getConfig<string>(CUSTOM_MC_PATH_KEY) ?? null
    log.info('[IPC path:custom:get] 读取结果:', val)
    return val
  })
  ipcMain.handle('path:custom:set', (_event, path: string) => {
    log.info('[IPC path:custom:set] 保存路径:', path)
    configService.setConfig(CUSTOM_MC_PATH_KEY, path)
    const verify = configService.getConfig<string>(CUSTOM_MC_PATH_KEY)
    log.info('[IPC path:custom:set] 验证读取:', verify)
  })
  ipcMain.handle('path:custom:clear', () => {
    configService.deleteConfig(CUSTOM_MC_PATH_KEY)
  })

  // 获取 MCLA 安装目录（exe 所在目录）
  ipcMain.handle('path:app-path', () => {
    return dirname(app.getPath('exe'))
  })

  // 创建目录
  ipcMain.handle('path:create-dir', (_event, dirPath: string) => {
    const fs = require('fs')
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    return fs.existsSync(dirPath)
  })

  // 版本选择器的文件夹列表持久化
  const GAME_FOLDERS_KEY = 'game_folders'
  ipcMain.handle('folders:list', () => {
    return configService.getConfig<string[]>(GAME_FOLDERS_KEY) ?? []
  })
  ipcMain.handle('folders:save', (_event, folders: string[]) => {
    configService.setConfig(GAME_FOLDERS_KEY, folders)
  })
  ipcMain.handle('folders:add', (_event, path: string) => {
    const current = configService.getConfig<string[]>(GAME_FOLDERS_KEY) ?? []
    if (!current.includes(path)) {
      current.push(path)
      configService.setConfig(GAME_FOLDERS_KEY, current)
    }
    return current
  })
  ipcMain.handle('folders:remove', (_event, path: string) => {
    const current = configService.getConfig<string[]>(GAME_FOLDERS_KEY) ?? []
    const updated = current.filter(p => p !== path)
    configService.setConfig(GAME_FOLDERS_KEY, updated)
    return updated
  })

  // 上次选中的文件夹
  const LAST_FOLDER_KEY = 'last_selected_folder'
  ipcMain.handle('folders:last:get', () => {
    return configService.getConfig<string>(LAST_FOLDER_KEY) ?? null
  })
  ipcMain.handle('folders:last:set', (_event, path: string) => {
    configService.setConfig(LAST_FOLDER_KEY, path)
  })

  // Shell 打开文件夹（跨平台兼容）
  ipcMain.handle('shell:open-path', async (_event, absPath: string) => {
    try {
      if (!existsSync(absPath)) {
        // 目录不存在，先创建
        const fs = require('fs')
        fs.mkdirSync(absPath, { recursive: true })
      }
      await shell.openPath(absPath)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })
}
