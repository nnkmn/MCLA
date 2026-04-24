/**
 * ModLoader 服务注册和初始化
 */

import { ModLoaderService } from './modloader.service';
import { ModLoaderConfig, DEFAULT_MODLOADER_CONFIG } from './modloader.config';
import { registerModLoaderService, modLoaderServiceFactory } from './modloader.service.config';
import { ipcMain } from 'electron';
import { IpcChannels } from '../types/adapter.types';

/**
 * ModLoader 服务实例
 */
let modLoaderService: ModLoaderService;
let modLoaderConfig: ModLoaderConfig;

/**
 * 初始化 ModLoader 服务
 */
export function initializeModLoaderService(config?: Partial<ModLoaderConfig>): void {
  modLoaderConfig = { ...DEFAULT_MODLOADER_CONFIG, ...config };
  modLoaderService = modLoaderServiceFactory.create(modLoaderConfig);
  
  const serviceConfig = modLoaderServiceFactory.register(modLoaderService);
  
  // 注册 IPC 通道
  registerIpcChannels(serviceConfig);
}

/**
 * 注册 IPC 通道
 */
function registerIpcChannels(serviceConfig: any): void {
  const channels = serviceConfig.ipcChannels as IpcChannels;
  
  // 获取 Mod 加载器
  ipcMain.handle('modloader:get-loaders', async (event, args) => {
    try {
      return await modLoaderService.getModLoaders(args.minecraftVersion);
    } catch (error) {
      console.error('获取 Mod 加载器失败:', error);
      throw error;
    }
  });

  // 安装 Mod 加载器
  ipcMain.handle('modloader:install', async (event, args) => {
    try {
      await modLoaderService.installModLoader(
        { gameDir: args.gameDir, version: '', id: args.instanceId } as any,
        args.loaderType,
        args.loaderVersion
      );
      
      return { success: true, message: 'Mod 加载器安装成功' };
    } catch (error) {
      console.error('安装 Mod 加载器失败:', error);
      return { success: false, message: error.message, errors: [error.message] };
    }
  });

  // 获取 Mod 加载器状态
  ipcMain.handle('modloader:get-status', async (event, args) => {
    // 这里应该实现获取状态逻辑
    return {
      type: 'forge' as ModLoaderType,
      version: '',
      installed: false,
      lastChecked: Date.now()
    };
  });

  // 获取 Mod 加载器安装进度
  ipcMain.handle('modloader:get-progress', async (event, args) => {
    // 这里应该实现获取进度逻辑
    return {
      percentage: 0,
      status: '等待中',
      estimatedTime: 0,
      speed: '0 KB/s'
    };
  });
}

/**
 * 获取 ModLoader 服务实例
 */
export function getModLoaderService(): ModLoaderService {
  if (!modLoaderService) {
    throw new ExportError('ModLoader 服务未初始化');
  }
  return modLoaderService;
}

/**
 * 获取 ModLoader 配置
 */
export function getModLoaderConfig(): ModLoaderConfig {
  return modLoaderConfig;
}

/**
 * 停止 ModLoader 服务
 */
export function shutdownModLoaderService(): void {
  // 清理资源，停止下载等
  modLoaderService = undefined as any;
  modLoaderConfig = DEFAULT_MODLOADER_CONFIG;
}