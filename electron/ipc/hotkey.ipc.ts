/**
 * 全局快捷键 IPC 处理器
 */
import { ipcMain } from 'electron'
import { logger } from '../utils/logger'
import {
  loadHotkeys,
  updateHotkey,
  toggleHotkey,
  validateAccelerator,
  registerAllEnabledHotkeys,
  type HotkeyConfig
} from '../services/hotkey.service'

const log = logger.child('hotkey.ipc')

export function registerHotkeyHandlers(): void {
  log.info('Registering hotkey IPC handlers')

  ipcMain.handle('hotkey:list', () => {
    return loadHotkeys()
  })

  ipcMain.handle('hotkey:update', (_event, payload: { hotkey: HotkeyConfig }) => {
    log.info('更新快捷键', { id: payload.hotkey.id, accelerator: payload.hotkey.accelerator })
    return updateHotkey(payload.hotkey)
  })

  ipcMain.handle('hotkey:toggle', (_event, payload: { id: string; enabled: boolean }) => {
    log.info('切换快捷键', payload)
    return toggleHotkey(payload.id, payload.enabled)
  })

  ipcMain.handle('hotkey:validate', (_event, payload: { accelerator: string }) => {
    return validateAccelerator(payload.accelerator)
  })

  ipcMain.handle('hotkey:reload', () => {
    registerAllEnabledHotkeys()
    return { ok: true }
  })

  log.info('hotkey handlers registered')
}
