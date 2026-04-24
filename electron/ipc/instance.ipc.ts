/**
 * 实例管理 IPC（接入增强服务）
 */
import { ipcMain } from 'electron'
import * as instanceService from '../services/instances'
import * as enhanced from '../services/instance.enhanced.service'

export function registerInstanceHandlers(): void {
  // ===== 基础 CRUD =====
  ipcMain.handle('instance:list', () => instanceService.listInstances())
  ipcMain.handle('instance:get-by-id', (_event, id: string) => instanceService.getInstanceById(id))
  ipcMain.handle('instance:update', (_event, id: string, data: unknown) =>
    instanceService.updateInstance(id, data as any))

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
}
