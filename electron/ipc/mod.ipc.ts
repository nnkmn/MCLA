import { ipcMain } from 'electron';
import { ModService, ModInfo } from '../services/mod.service';

/**
 * 注册 Mod 管理 IPC handlers
 */
export function registerModIpcHandlers(modService: ModService) {
  
  /**
   * 获取已安装的 Mod 列表
   */
  ipcMain.handle('mod:list', async (_event, { gameDir }) => {
    try {
      const mods = await modService.getInstalledMods(gameDir);
      return { ok: true, data: mods };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 安装 Mod
   */
  ipcMain.handle('mod:install', async (_event, { sourcePath, gameDir }) => {
    try {
      const mod = await modService.installMod(sourcePath, gameDir);
      if (!mod) {
        return { ok: false, error: '安装失败' };
      }
      return { ok: true, data: mod };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 卸载 Mod
   */
  ipcMain.handle('mod:uninstall', async (_event, { modPath }) => {
    try {
      // 从路径构造 ModInfo
      const modInfo: ModInfo = {
        id: '',
        name: '',
        version: '',
        filePath: modPath,
        fileName: modPath.split(/[/\\]/).pop() || '',
        size: 0,
        enabled: true,
        mcVersion: ''
      };
      const success = await modService.uninstallMod(modInfo);
      return { ok: success };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 启用 Mod
   */
  ipcMain.handle('mod:enable', async (_event, { modPath }) => {
    try {
      const modInfo: ModInfo = {
        id: '',
        name: '',
        version: '',
        filePath: modPath,
        fileName: modPath.split(/[/\\]/).pop() || '',
        size: 0,
        enabled: false,
        mcVersion: ''
      };
      const success = await modService.enableMod(modInfo);
      return { ok: success };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 禁用 Mod
   */
  ipcMain.handle('mod:disable', async (_event, { modPath }) => {
    try {
      const modInfo: ModInfo = {
        id: '',
        name: '',
        version: '',
        filePath: modPath,
        fileName: modPath.split(/[/\\]/).pop() || '',
        size: 0,
        enabled: true,
        mcVersion: ''
      };
      const success = await modService.disableMod(modInfo);
      return { ok: success };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 批量安装 Mod
   */
  ipcMain.handle('mod:install-batch', async (_event, { sourcePaths, gameDir }) => {
    try {
      const result = await modService.installMods(sourcePaths, gameDir);
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 检查 Mod 兼容性
   */
  ipcMain.handle('mod:check-compat', async (_event, { mods, targetVersion, loader }) => {
    try {
      const result = await modService.checkCompatibility(mods, targetVersion, loader);
      return { ok: true, data: result };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 确保 mods 目录存在
   */
  ipcMain.handle('mod:ensure-dir', async (_event, { gameDir }) => {
    try {
      const modsDir = await modService.ensureModsDir(gameDir);
      return { ok: true, data: modsDir };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
}
