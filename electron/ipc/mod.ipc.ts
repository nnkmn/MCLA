import { ipcMain } from 'electron';
import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import { ModService, ModInfo, ModUpdateInfo } from '../services/mod.service';

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

  /**
   * 读取 config 目录下的配置文件列表
   */
  ipcMain.handle('mod:read-config', async (_event, { gameDir }) => {
    try {
      const configDir = path.join(gameDir, 'config');
      const configFiles: Array<{ name: string; path: string; size: number; modified: string }> = [];

      const entries = await fs.readdir(configDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /\.(toml|json|cfg|conf|ini)$/i.test(entry.name)) {
          const filePath = path.join(configDir, entry.name);
          const stat = await fs.stat(filePath);
          configFiles.push({
            name: entry.name,
            path: filePath,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          });
        }
      }

      return { ok: true, data: configFiles };
    } catch (error: any) {
      // config 目录不存在不算错，返回空列表
      if (error.code === 'ENOENT') return { ok: true, data: [] };
      return { ok: false, error: error.message };
    }
  });

  /**
   * 读取单个 config 文件内容
   */
  ipcMain.handle('mod:get-config-content', async (_event, { filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { ok: true, data: content };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  /**
   * 写入 config 文件内容
   */
  ipcMain.handle('mod:save-config-content', async (_event, { filePath, content }) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  /**
   * 打开 config 目录（创建如果不存在）
   */
  ipcMain.handle('mod:open-config-dir', async (_event, { gameDir }) => {
    try {
      const configDir = path.join(gameDir, 'config');
      await fs.mkdir(configDir, { recursive: true });
      return { ok: true, data: configDir };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  /**
   * 批量检查 mod 更新（Modrinth）
   * @param mods ModInfo[] 需要检查的 mod 列表
   * @param mcVersion string 当前 MC 版本（可选）
   * @param loader string mod loader（可选）
   */
  ipcMain.handle('mod:check-update', async (_event, { mods, mcVersion, loader }) => {
    try {
      const results = await modService.checkModsUpdate(mods, mcVersion, loader)
      return { ok: true, data: results }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  /**
   * 下载并替换 mod 到最新版本
   * @param mod ModInfo 当前 mod 信息
   * @param updateInfo ModUpdateInfo 更新信息
   */
  ipcMain.handle('mod:update', async (event, { mod, updateInfo }: { mod: ModInfo; updateInfo: ModUpdateInfo }) => {
    try {
      const result = await modService.updateMod(mod, updateInfo, (progress) => {
        event.sender.send('mod:update-progress', {
          filePath: mod.filePath,
          progress,
        })
      })
      if (!result) return { ok: false, error: '更新失败' }
      return { ok: true, data: result }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })
}
