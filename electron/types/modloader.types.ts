/**
 * ModLoader 相关类型定义
 */

/**
 * Mod 加载器类型
 */
export type ModLoaderType = 'forge' | 'fabric' | 'quilt' | 'neoforge';

/**
 * Mod 加载器信息
 */
export interface ModLoader {
  type: ModLoaderType;
  name: string;
  supportedVersions: string[];
}

/**
 * Mod 加载器安装配置
 */
export interface ModLoaderInstallConfig {
  instanceId: string;
  loaderType: ModLoaderType;
  loaderVersion: string;
  gameDir: string;
}

/**
 * Mod 加载器安装结果
 */
export interface ModLoaderInstallResult {
  success: boolean;
  message: string;
  installedVersion?: string;
  errors?: string[];
}

/**
 * Mod 加载器状态
 */
export interface ModLoaderStatus {
  type: ModLoaderType;
  version: string;
  installed: boolean;
  lastChecked: number;
  path?: string;
}

/**
 * Mod 加载器安装进度
 */
export interface ModLoaderInstallProgress {
  percentage: number;
  status: string;
  estimatedTime: number;
  speed: string;
}