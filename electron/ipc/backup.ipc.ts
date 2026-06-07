/**
 * 数据备份与迁移 IPC 处理器
 */
import { ipcMain } from 'electron'
import { logger } from '../utils/logger'
import {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  getBackupDirPath,
  type BackupOptions,
  type BackupProgress
} from '../services/backup.service'

const log = logger.child('backup.ipc')

export function registerBackupHandlers(): void {
  log.info('Registering backup IPC handlers')

  ipcMain.handle('backup:create', async (_event, payload: { options?: BackupOptions }) => {
    try {
      log.info('开始创建备份')
      const res = await createBackup(payload.options || {}, (p: BackupProgress) => {
        try {
          _event.sender.send('backup:progress', {
            stage: p.stage,
            progress: p.progress,
            currentItem: p.currentItem
          })
        } catch {}
      })
      if (!res.ok) return { ok: false, error: res.error }
      log.info('备份完成', { filePath: res.filePath })
      return res
    } catch (e: any) {
      log.error('备份失败', e)
      return { ok: false, error: e.message || '备份失败' }
    }
  })

  ipcMain.handle('backup:restore', async (_event, payload: { backupPath: string }) => {
    try {
      log.info('开始恢复备份', { backupPath: payload.backupPath })
      const res = await restoreBackup(payload.backupPath, (p) => {
        try {
          _event.sender.send('backup:progress', {
            stage: p.stage,
            progress: p.progress,
            currentItem: p.currentItem
          })
        } catch {}
      })
      if (!res.ok) return { ok: false, error: res.error }
      log.info('备份恢复完成', { restoredTables: res.restoredTables })
      return res
    } catch (e: any) {
      log.error('恢复备份失败', e)
      return { ok: false, error: e.message || '恢复失败' }
    }
  })

  ipcMain.handle('backup:list', () => {
    return listBackups()
  })

  ipcMain.handle('backup:delete', (_event, payload: { fileName: string }) => {
    return { ok: deleteBackup(payload.fileName) }
  })

  ipcMain.handle('backup:get-dir', () => {
    return getBackupDirPath()
  })

  log.info('backup handlers registered')
}
