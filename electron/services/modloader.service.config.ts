/**
 * ModLoader 服务配置和注册
 */

import { ModLoaderService } from './modloader.service';
import { ModLoaderConfig, DEFAULT_MODLOADER_CONFIG } from './modloader.config';
import type { ModLoader, ModLoaderInstallConfig, ModLoaderInstallResult, ModLoaderStatus, ModLoaderInstallProgress } from '../types/modloader.types';

/**
 * ModLoader 服务注册配置
 */
export interface ModLoaderServiceConfig {
  /**
   * 服务实例
   */
  service: ModLoaderService;

  /**
   * IPC 通道配置
   */
  ipcChannels: {
    /**
     * 获取指定 Minecraft 版本支持的 Mod 加载器
     */
    'modloader:get-loaders': {
      args: { minecraftVersion: string };
      return: ModLoader[];
    };

    /**
     * 安装 Mod 加载器到游戏实例
     */
    'modloader:install': {
      args: ModLoaderInstallConfig;
      return: ModLoaderInstallResult;
    };

    /**
     * 获取 Mod 加载器状态
     */
    'modloader:get-status': {
      args: { instanceId: string };
      return: ModLoaderStatus;
    };

    /**
     * 获取 Mod 加载器安装进度
     */
    'modloader:get-progress': {
      args: { instanceId: string };
      return: ModLoaderInstallProgress;
    };
  };
}

/**
 * 创建 ModLoader 服务实例
 */
export function createModLoaderService(config?: Partial<ModLoaderConfig>): ModLoaderService {
  const finalConfig = { ...DEFAULT_MODLOADER_CONFIG, ...config };
  
  // 确保下载缓存目录存在
  const { downloadCacheDir } = finalConfig;
  // 这里应该实现目录创建逻辑
  
  return new ModLoaderService();
}

/**
 * 注册 ModLoader 服务到主进程
 */
export function registerModLoaderService(service: ModLoaderService): ModLoaderServiceConfig {
  // IPC 通道注册逻辑
  // 这里应该实现 contextBridge 暴露给渲染进程的 API
  
  return {
    service,
    ipcChannels: {
      'modloader:get-loaders': {
        args: { minecraftVersion: '' },
        return: []
      },
      'modloader:install': {
        args: { instanceId: '', loaderType: 'forge', loaderVersion: '', gameDir: '' },
        return: { success: false, message: '' }
      },
      'modloader:get-status': {
        args: { instanceId: '' },
        return: { type: 'forge', version: '', installed: false, lastChecked: 0 }
      },
      'modloader:get-progress': {
        args: { instanceId: '' },
        return: { percentage: 0, status: '', estimatedTime: 0, speed: '' }
      }
    }
  };
}

/**
 * ModLoader 服务工厂
 */
export const modLoaderServiceFactory = {
  create: (config?: Partial<ModLoaderConfig>) => createModLoaderService(config),
  register: (service: ModLoaderService) => registerModLoaderService(service)
};