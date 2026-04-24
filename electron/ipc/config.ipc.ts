/**
 * 应用配置 IPC
 */
import { ipcMain } from 'electron'
import * as configService from '../services/config'

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (_event, key: string) => configService.getConfig(key))
  ipcMain.handle('config:set', (_event, key: string, value: unknown) =>
    configService.setConfig(key, value))
}
