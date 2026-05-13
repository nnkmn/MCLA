/**
 * 应用配置 IPC
 */
import { ipcMain } from 'electron'
import * as configService from '../services/config'

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (_event, key: string) => configService.getConfig(key))
  ipcMain.handle('config:set', (_event, key: string, value: unknown) =>
    configService.setConfig(key, value))

  // 敏感配置（自动加解密，用于 API Key 等）
  ipcMain.handle('config:get-secure', (_event, key: string) =>
    configService.getSecureConfig(key))
  ipcMain.handle('config:set-secure', (_event, key: string, value: string) =>
    configService.setSecureConfig(key, value))
}
