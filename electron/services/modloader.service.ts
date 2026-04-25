import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import axios from 'axios';
import { GameInstance, ModLoader } from '../types/adapter.types';

// Fabric API 端点
const FABRIC_META_BASE = 'https://meta.fabricmc.net/v2'
const FABRIC_DOWNLOAD_BASE = 'https://maven.fabricmc.net'
const FORGE_MAVEN = 'https://maven.minecraftforge.net'
const NEOFORGE_MAVEN = 'https://maven.neoforged.net/releases'

export interface LoaderVersion {
  loader: string
  installer: string
}

export interface InstallationProgress {
  stage: 'downloading' | 'installing' | 'verifying' | 'complete' | 'error'
  progress: number
  message: string
}

export class ModLoaderService {
  private modLoaders: Map<string, ModLoaderInfo> = new Map();
  private progressCallback?: (progress: InstallationProgress) => void;

  constructor() {
    this.initializeModLoaders();
  }

  setProgressCallback(callback: (progress: InstallationProgress) => void) {
    this.progressCallback = callback;
  }

  private reportProgress(progress: InstallationProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * 初始化支持的 Mod 加载器信息
   */
  private initializeModLoaders(): void {
    // Forge 加载器
    this.modLoaders.set('forge', {
      name: 'Forge',
      supportedVersions: ['1.7.10', '1.8.9', '1.9.4', '1.10.2', '1.11.2', '1.12.2', '1.13.2', '1.14.4', '1.15.2', '1.16.5', '1.17.1', '1.18.2', '1.18.2', '1.19.2', '1.19.4', '1.20', '1.20.1', '1.20.2', '1.20.4'],
      downloadUrls: {
        windows: 'https://maven.minecraftforge.net/net/minecraftforge/forge/{version}/forge-{version}-installer-win.exe',
        macos: 'https://maven.minecraftforge.net/net/minecraftforge/forge/{version}/forge-{version}-installer-mac.dmg',
        linux: 'https://maven.minecraftforge.net/net/minecraftforge/forge/{version}/forge-{version}-installer.jar'
      }
    });

    // Fabric 加载器
    this.modLoaders.set('fabric', {
      name: 'Fabric',
      supportedVersions: ['1.14.4', '1.15.2', '1.16.1', '1.16.2', '1.16.3', '1.16.4', '1.16.5', '1.17.1', '1.18.1', '1.18.2', '1.19', '1.19.1', '1.19.2', '1.19.3', '1.19.4', '1.20', '1.20.1', '1.20.2', '1.20.4'],
      downloadUrls: {
        windows: 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/{version}/fabric-installer-{version}.exe',
        macos: 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/{version}/fabric-installer-{version}.dmg',
        linux: 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/{version}/fabric-installer-{version}.jar'
      }
    });

    // Quilt 加载器
    this.modLoaders.set('quilt', {
      name: 'Quilt',
      supportedVersions: ['1.16.5', '1.17.1', '1.18.2', '1.19', '1.19.2', '1.19.3', '1.19.4', '1.20', '1.20.1', '1.20.2', '1.20.4'],
      downloadUrls: {
        windows: 'https://maven.quiltmc.org/repository/release/net/quiltmc/quilt-installer/{version}/quilt-installer-{version}.exe',
        macos: 'https://maven.quiltmc.org/repository/release/net/quiltmc/quilt-installer/{version}/quilt-installer-{version}.dmg',
        linux: 'https://maven.quiltmc.org/repository/release/net/quiltmc/quilt-installer/{version}/quilt-installer-{version}.jar'
      }
    });

    // NeoForge 加载器
    this.modLoaders.set('neoforge', {
      name: 'NeoForge',
      supportedVersions: ['1.16.5', '1.17.1', '1.18.2', '1.19', '1.19.2', '1.19.3', '1.19.4', '1.20', '1.20.1', '1.20.2', '1.20.4'],
      downloadUrls: {
        windows: 'https://maven.neoforged.net/releases/net/neoforged/neoforge-installer/{version}/neoforge-installer-{version}.exe',
        macos: 'https://maven.neoforged.net/releases/net/neoforged/neoforge-installer/{version}/neoforge-installer-{version}.dmg',
        linux: 'https://maven.neoforged.net/releases/net/neoforged/neoforge-installer/{version}/neoforge-installer-{version}.jar'
      }
    });
  }

  /**
   * 获取 Fabric 可用版本列表（从 Fabric Meta API）
   */
  async getFabricVersions(): Promise<Array<{ gameVersion: string; loaderVersion: string; installerVersion: string }>> {
    try {
      const response = await axios.get(`${FABRIC_META_BASE}/versions`);
      const data = response.data;

      const results: Array<{ gameVersion: string; loaderVersion: string; installerVersion: string }> = [];
      
      for (const version of data.versions || []) {
        if (version.stable) {
          results.push({
            gameVersion: version.gameVersion,
            loaderVersion: version.loader.version,
            installerVersion: version.installer.version
          });
        }
      }

      return results.sort((a, b) => this.compareVersions(b.gameVersion, a.gameVersion));
    } catch (error) {
      console.error('[ModLoaderService] 获取 Fabric 版本失败:', error);
      return [];
    }
  }

  /**
   * 获取指定 Minecraft 版本的 Fabric 版本
   */
  async getFabricVersionForMinecraft(mcVersion: string): Promise<LoaderVersion | null> {
    try {
      const response = await axios.get(`${FABRIC_META_BASE}/versions/loader/${mcVersion}`);
      const data = response.data;

      if (data.length > 0) {
        // 返回最新稳定版本
        const latest = data[0];
        return {
          loader: latest.loader.version,
          installer: latest.installer.version
        };
      }
      return null;
    } catch (error) {
      console.error(`[ModLoaderService] 获取 ${mcVersion} 的 Fabric 版本失败:`, error);
      return null;
    }
  }

  /**
   * 安装 Fabric
   */
  async installFabric(gameDir: string, mcVersion: string): Promise<void> {
    this.reportProgress({ stage: 'downloading', progress: 0, message: '获取 Fabric 版本信息...' });

    const versionInfo = await this.getFabricVersionForMinecraft(mcVersion);
    if (!versionInfo) {
      throw new Error(`不支持 Minecraft ${mcVersion} 版本的 Fabric`);
    }

    // 下载 Fabric 安装器
    this.reportProgress({ stage: 'downloading', progress: 10, message: '下载 Fabric 安装器...' });
    
    const installerUrl = `${FABRIC_DOWNLOAD_BASE}/net/fabricmc/fabric-installer/${versionInfo.installer}/fabric-installer-${versionInfo.installer}.jar`;
    const installerPath = path.join(gameDir, 'temp', `fabric-installer-${versionInfo.installer}.jar`);

    // 确保目录存在
    await fs.mkdir(path.dirname(installerPath), { recursive: true });

    // 下载安装器
    await this.downloadFile(installerUrl, installerPath, (progress) => {
      this.reportProgress({ 
        stage: 'downloading', 
        progress: 10 + progress * 0.3, 
        message: `下载中... ${Math.round(progress * 100)}%` 
      });
    });

    this.reportProgress({ stage: 'installing', progress: 40, message: '安装 Fabric...' });

    // 运行安装器
    await this.runFabricInstaller(installerPath, gameDir, mcVersion);

    // 清理临时文件
    try {
      await fs.unlink(installerPath);
    } catch {}

    this.reportProgress({ stage: 'verifying', progress: 90, message: '验证安装...' });

    // 验证安装
    const loaderDir = path.join(gameDir, 'mods', 'fabric');
    try {
      await fs.access(loaderDir);
    } catch {
      // 尝试其他可能的位置
      const altDir = path.join(gameDir, 'libraries', 'net', 'fabricmc', 'fabric-loader');
      await fs.access(altDir);
    }

    this.reportProgress({ stage: 'complete', progress: 100, message: 'Fabric 安装完成！' });
  }

  /**
   * 下载文件（带进度回调）
   */
  private async downloadFile(url: string, destPath: string, onProgress: (progress: number) => void): Promise<void> {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 300000 // 5分钟超时
    });

    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloaded = 0;

    const writer = await fs.open(destPath, 'w');
    
    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (totalSize > 0) {
        onProgress(downloaded / totalSize);
      }
    });

    response.data.pipe(writer.createWriteStream());
    
    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        writer.close();
        resolve();
      });
      response.data.on('error', reject);
    });
  }

  /**
   * 运行 Fabric 安装器
   */
  private async runFabricInstaller(installerPath: string, gameDir: string, mcVersion: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-jar', installerPath,
        'install', 'server',
        mcVersion,
        '-dir', gameDir,
        '-noprofile'
      ];

      const child = spawn('java', args, {
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Fabric 安装器退出码: ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * 版本比较
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) return numB - numA;
    }
    return 0;
  }

  /**
   * 获取指定 Minecraft 版本支持的 Mod 加载器
   */
  public getModLoaders(minecraftVersion: string): ModLoader[] {
    const loaders: ModLoader[] = [];
    
    for (const [type, info] of this.modLoaders) {
      if (info.supportedVersions.includes(minecraftVersion)) {
        loaders.push({
          type,
          name: info.name,
          supportedVersions: info.supportedVersions
        });
      }
    }
    
    return loaders;
  }

  /**
   * 安装 Mod 加载器到游戏实例
   */
  public async installModLoader(instance: GameInstance, loaderType: string, loaderVersion: string): Promise<void> {
    const loaderInfo = this.modLoaders.get(loaderType);
    if (!loaderInfo) {
      throw new Error(`不支持的 Mod 加载器类型: ${loaderType}`);
    }

    if (!loaderInfo.supportedVersions.includes(instance.version)) {
      throw new Error(`版本 ${instance.version} 不支持 ${loaderInfo.name} 加载器`);
    }

    const installerPath = await this.downloadInstaller(loaderType, loaderVersion);
    await this.runInstaller(installerPath, instance.gameDir);
    
    // 更新实例配置
    instance.modLoader = {
      type: loaderType as 'forge' | 'fabric' | 'quilt' | 'neoforge',
      version: loaderVersion
    };

    // 验证安装
    await this.verifyInstallation(instance);
  }

  /**
   * 下载安装程序
   */
  private async downloadInstaller(loaderType: string, version: string): Promise<string> {
    const loaderInfo = this.modLoaders.get(loaderType);
    if (!loaderInfo) {
      throw new Error(`不支持的 Mod 加载器类型: ${loaderType}`);
    }

    const platform = this.getPlatform();
    const downloadUrl = loaderInfo.downloadUrls[platform]
      .replace('{version}', version);

    const installerPath = join(process.cwd(), 'downloads', `${loaderType}-${version}-${platform}.${this.getExtension(platform)}`);
    
    // 这里应该实现实际的下载逻辑
    // 暂时返回模拟路径
    return installerPath;
  }

  /**
   * 运行安装程序
   */
  private async runInstaller(installerPath: string, gameDir: string): Promise<void> {
    // 根据平台运行不同的安装程序
    const platform = this.getPlatform();
    
    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[] = [];

      switch (platform) {
        case 'windows':
          command = installerPath;
          args = ['--installServer', gameDir];
          break;
        case 'macos':
          command = 'open';
          args = ['-a', installerPath, '--args', '--installServer', gameDir];
          break;
        case 'linux':
          command = 'java';
          args = ['-jar', installerPath, '--installServer', gameDir];
          break;
        default:
          reject(new Error(`不支持的平台: ${platform}`));
          return;
      }

      const child = spawn(command, args);

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`安装程序退出码: ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 验证安装是否成功
   */
  private async verifyInstallation(instance: GameInstance): Promise<void> {
    const modsDir = join(instance.gameDir, 'mods');
    const librariesDir = join(instance.gameDir, 'libraries');
    
    try {
      await fs.access(modsDir);
      await fs.access(librariesDir);
      
      // 检查是否存在加载器核心文件
      const forgeCoreFile = join(librariesDir, 'net', 'minecraftforge', 'forge', 'forge', `${instance.version}-${instance.modLoader!.version}`, 'forge-${instance.version}-${instance.modLoader!.version}.jar');
      const fabricCoreFile = join(librariesDir, 'net', 'fabricmc', 'fabric-loader', 'fabric-loader', `${instance.modLoader!.version}`, 'fabric-loader-${instance.modLoader!.version}.jar');
      
      if (instance.modLoader!.type === 'forge') {
        await fs.access(forgeCoreFile);
      } else if (instance.modLoader!.type === 'fabric') {
        await fs.access(fabricCoreFile);
      }
    } catch (error) {
      throw new Error('Mod 加载器安装验证失败: ' + error.message);
    }
  }

  /**
   * 获取当前平台
   */
  private getPlatform(): 'windows' | 'macos' | 'linux' {
    const platform = process.platform;
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    return 'linux';
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(platform: string): string {
    switch (platform) {
      case 'windows': return 'exe';
      case 'macos': return 'dmg';
      case 'linux': return 'jar';
      default: return 'jar';
    }
  }
}

/**
 * Mod 加载器信息接口
 */
interface ModLoaderInfo {
  name: string;
  supportedVersions: string[];
  downloadUrls: {
    windows: string;
    macos: string;
    linux: string;
  };
}