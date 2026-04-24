/**
 * ModLoader 服务配置
 */
import { join } from 'path'

export interface ModLoaderConfig {
  /**
   * 下载缓存目录
   */
  downloadCacheDir: string;

  /**
   * 安装超时时间（毫秒）
   */
  installTimeout: number;

  /**
   * 最大重试次数
   */
  maxRetries: number;

  /**
   * 并发下载数
   */
  maxConcurrentDownloads: number;

  /**
   * 下载速度限制（KB/s），0 表示无限制
   */
  downloadSpeedLimit: number;

  /**
   * 验证安装的文件列表
   */
  verificationFiles: {
    forge: string[];
    fabric: string[];
    quilt: string[];
    neoforge: string[];
  };

  /**
   * 加载器版本映射
   */
  versionMappings: {
    [key: string]: {
      [key: string]: string; // minecraftVersion -> loaderVersion
    };
  };
}

/**
 * 默认配置
 */
export const DEFAULT_MODLOADER_CONFIG: ModLoaderConfig = {
  downloadCacheDir: join(process.cwd(), 'downloads', 'modloaders'),
  installTimeout: 300000, // 5分钟
  maxRetries: 3,
  maxConcurrentDownloads: 4,
  downloadSpeedLimit: 0,
  verificationFiles: {
    forge: [
      'libraries/net/minecraftforge/forge/forge/{version}/forge-{version}.jar',
      'mods'
    ],
    fabric: [
      'libraries/net/fabricmc/fabric-loader/fabric-loader/{version}/fabric-loader-{version}.jar',
      'mods'
    ],
    quilt: [
      'libraries/org/quiltmc/quilt-loader/quilt-loader/{version}/quilt-loader-{version}.jar',
      'mods'
    ],
    neoforge: [
      'libraries/net/neoforged/neoforge-installer/{version}/neoforge-{version}.jar',
      'mods'
    ]
  },
  versionMappings: {
    forge: {
      '1.7.10': '10.13.4.1614',
      '1.8.9': '11.15.1.2318',
      '1.9.4': '11.15.1.2318',
      '1.10.2': '12.18.3.2511',
      '1.11.2': '13.20.1.2588',
      '1.12.2': '14.23.5.2854',
      '1.13.2': '14.23.5.2855',
      '1.14.4': '28.1.0',
      '1.15.2': '31.1.60',
      '1.16.5': '36.2.20',
      '1.17.1': '37.1.1',
      '1.18.2': '40.2.0',
      '1.19.2': '43.2.5',
      '1.19.4': '45.0.9',
      '1.20': '47.1.16',
      '1.20.1': '47.1.56',
      '1.20.2': '47.1.80',
      '1.20.4': '47.1.108'
    },
    fabric: {
      '1.14.4': '0.3.0+build.17',
      '1.15.2': '0.4.43+build.176',
      '1.16.1': '0.5.0+build.255',
      '1.16.2': '0.5.0+build.255',
      '1.16.3': '0.5.0+build.255',
      '1.16.4': '0.5.0+build.255',
      '1.16.5': '0.7.3+build.299',
      '1.17.1': '0.11.2+build.326',
      '1.18.1': '0.12.12+build.386',
      '1.18.2': '0.14.17+build.499',
      '1.19': '0.14.22+build.524',
      '1.19.1': '0.14.22+build.524',
      '1.19.2': '0.14.22+build.524',
      '1.19.3': '0.14.22+build.524',
      '1.19.4': '0.14.22+build.524',
      '1.20': '0.14.22+build.524',
      '1.20.1': '0.14.22+build.524',
      '1.20.2': '0.14.22+build.524',
      '1.20.4': '0.14.22+build.524'
    },
    quilt: {
      '1.16.5': '0.18.0-beta.1',
      '1.17.1': '0.18.0-beta.1',
      '1.18.2': '0.18.0-beta.1',
      '1.19': '0.18.0-beta.1',
      '1.19.2': '0.18.0-beta.1',
      '1.19.3': '0.18.0-beta.1',
      '1.19.4': '0.18.0-beta.1',
      '1.20': '0.18.0-beta.1',
      '1.20.1': '0.18.0-beta.1',
      '1.20.2': '0.18.0-beta.1',
      '1.20.4': '0.18.0-beta.1'
    },
    neoforge: {
      '1.16.5': '1.20.4',
      '1.17.1': '1.20.4',
      '1.18.2': '1.20.4',
      '1.19': '1.20.4',
      '1.19.2': '1.20.4',
      '1.19.3': '1.20.4',
      '1.19.4': '1.20.4',
      '1.20': '1.20.4',
      '1.20.1': '1.20.4',
      '1.20.2': '1.20.4',
      '1.20.4': '1.20.4'
    }
  }
};