/**
 * 实例管理 IPC（接入增强服务）
 */
import { ipcMain } from 'electron'
import * as instanceService from '../services/instances'
import type { Instance } from '../services/instances'
import * as enhanced from '../services/instance.enhanced.service'

export function registerInstanceHandlers(): void {
  // ===== 基础 CRUD =====
  ipcMain.handle('instance:list', () => instanceService.listInstances())
  ipcMain.handle('instance:get-by-id', (_event, id: string) => instanceService.getInstanceById(id))
  ipcMain.handle('instance:update', (_event, id: string, data: unknown) =>
    instanceService.updateInstance(id, data as Partial<Instance>))

  // ===== 单字段快捷更新 =====
  ipcMain.handle('instance:update-name', (_event, id: string, name: string) =>
    instanceService.updateInstance(id, { name }))
  ipcMain.handle('instance:toggle-favorite', (_event, id: string) => {
    const inst = instanceService.getInstanceById(id)
    if (!inst) return null
    return instanceService.updateInstance(id, { is_favorited: inst.is_favorited === 1 ? 0 : 1 })
  })

  // ===== 创建（带目录初始化） =====
  ipcMain.handle('instance:create', (_event, input) =>
    enhanced.createInstanceWithDir(input))

  // ===== 删除（可选删文件） =====
  ipcMain.handle('instance:delete', (_event, id: string, deleteFiles = false) =>
    enhanced.deleteInstanceWithDir(id, deleteFiles))

  // ===== 文件系统操作 =====
  ipcMain.handle('instance:open-folder', (_event, id: string) =>
    enhanced.openInstanceFolder(id))

  ipcMain.handle('instance:open-mods-folder', (_event, id: string) =>
    enhanced.openModsFolder(id))

  // ===== Mod 文件管理 =====
  ipcMain.handle('instance:list-mods', (_event, id: string) =>
    enhanced.listModFiles(id))

  ipcMain.handle('instance:toggle-mod', (_event, id: string, filename: string, enabled: boolean) =>
    enhanced.toggleMod(id, filename, enabled))

  ipcMain.handle('instance:delete-mod', (_event, id: string, filename: string) =>
    enhanced.deleteMod(id, filename))

  // ===== 统计 =====
  ipcMain.handle('instance:disk-usage', (_event, id: string) =>
    enhanced.getInstanceDiskUsage(id))

  // ===== 导入导出 =====
  ipcMain.handle('instance:scan-minecraft', async (_event, dirPath: string) => {
    try {
      const result = await import('../services/instance.export').then(m => m.scanMinecraftDir(dirPath))
      return { ok: true, data: result }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('instance:export', async (_event, instanceId: string, destPath: string, options?: {
    includeMods?: boolean
    includeConfigs?: boolean
    includeSaves?: boolean
  }) => {
    try {
      const { exportInstance } = await import('../services/instance.export')
      const result = await exportInstance(instanceId, destPath, options)
      return result
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('instance:import', async (_event, mclaFilePath: string, targetDir: string) => {
    try {
      const { importInstance } = await import('../services/instance.export')
      const result = await importInstance(mclaFilePath, targetDir)
      return result
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })
}
