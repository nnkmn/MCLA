import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Mod 信息
 */
export interface ModInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  authors?: string[];
  url?: string;
  filePath: string;
  fileName: string;
  size: number;
  hash?: string;
  enabled: boolean;
  loader?: 'fabric' | 'forge' | 'quilt' | 'neoforge';
  mcVersion: string;
  dependencies?: string[];
  logoUrl?: string;
}

/**
 * Mod 文件类型
 */
export enum ModType {
  Jar = 'jar',
  Fabric = 'fabric-mod-json',
  Forge = 'mods.toml'
}

/**
 * Mod 管理服务
 */
export class ModService {
  
  /**
   * 获取 mods 目录路径
   */
  getModsDir(gameDir: string): string {
    return path.join(gameDir, 'mods');
  }
  
  /**
   * 获取所有已安装的 Mod
   */
  async getInstalledMods(gameDir: string): Promise<ModInfo[]> {
    const modsDir = this.getModsDir(gameDir);
    const mods: ModInfo[] = [];
    
    try {
      const files = await fs.readdir(modsDir);
      
      for (const file of files) {
        if (!file.endsWith('.jar')) continue;
        
        const filePath = path.join(modsDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          const modInfo = await this.readModInfo(filePath);
          mods.push({
            id: this.generateModId(file),
            name: modInfo.name || this.extractModName(file),
            version: modInfo.version || 'Unknown',
            description: modInfo.description,
            authors: modInfo.authors,
            url: modInfo.url,
            filePath,
            fileName: file,
            size: stat.size,
            enabled: true,
            loader: modInfo.loader,
            mcVersion: modInfo.mcVersion,
            dependencies: modInfo.dependencies,
            logoUrl: modInfo.logoUrl
          });
        }
      }
      
      return mods;
    } catch (error) {
      console.error('[ModService] 读取 mods 目录失败:', error);
      return [];
    }
  }
  
  /**
   * 从文件名提取 Mod 名称
   */
  private extractModName(fileName: string): string {
    // 移除版本号和扩展名
    return fileName
      .replace(/\.jar$/i, '')
      .replace(/-[\d.]+(-[\w]+)?$/i, '')
      .replace(/_/g, ' ')
      .trim();
  }
  
  /**
   * 生成 Mod ID
   */
  private generateModId(fileName: string): string {
    const name = fileName.replace(/\.jar$/i, '').toLowerCase();
    // 简单的哈希
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return `mod_${Math.abs(hash).toString(16)}`;
  }
  
  /**
   * 读取 Mod 信息（从 jar 文件）
   * 注意：这里需要解压 jar 读取 META-INF 中的信息
   * 简化版本直接从文件名解析
   */
  private async readModInfo(filePath: string): Promise<{
    name?: string;
    version?: string;
    description?: string;
    authors?: string[];
    url?: string;
    loader?: 'fabric' | 'forge' | 'quilt' | 'neoforge';
    mcVersion?: string;
    dependencies?: string[];
    logoUrl?: string;
  }> {
    // 简化实现：尝试从文件名解析
    // 完整实现需要解压 jar 文件读取 MANIFEST.MF 或 fabric.mod.json
    
    const fileName = path.basename(filePath);
    const info: any = {};
    
    // 解析版本号
    const versionMatch = fileName.match(/-(\d[\d.]*(?:-[\w]+)?)/);
    if (versionMatch) {
      info.version = versionMatch[1];
    }
    
    // 检测 Mod Loader 类型
    if (/fabric/i.test(fileName)) {
      info.loader = 'fabric';
    } else if (/forge/i.test(fileName)) {
      info.loader = 'forge';
    } else if (/quilt/i.test(fileName)) {
      info.loader = 'quilt';
    } else if (/neoforge/i.test(fileName)) {
      info.loader = 'neoforge';
    }
    
    // 解析 MC 版本
    const mcMatch = fileName.match(/(1\.\d+(?:\.\d+)?)/);
    if (mcMatch) {
      info.mcVersion = mcMatch[1];
    }
    
    return info;
  }
  
  /**
   * 安装 Mod（复制文件到 mods 目录）
   */
  async installMod(sourcePath: string, gameDir: string): Promise<ModInfo | null> {
    try {
      const fileName = path.basename(sourcePath);
      const destDir = this.getModsDir(gameDir);
      const destPath = path.join(destDir, fileName);
      
      // 确保目录存在
      await fs.mkdir(destDir, { recursive: true });
      
      // 复制文件
      await fs.copyFile(sourcePath, destPath);
      
      // 获取文件信息
      const stat = await fs.stat(destPath);
      
      return {
        id: this.generateModId(fileName),
        name: this.extractModName(fileName),
        version: 'Unknown',
        filePath: destPath,
        fileName,
        size: stat.size,
        enabled: true,
        loader: undefined,
        mcVersion: ''
      };
    } catch (error) {
      console.error('[ModService] 安装 Mod 失败:', error);
      return null;
    }
  }
  
  /**
   * 卸载 Mod（删除文件）
   */
  async uninstallMod(modInfo: ModInfo): Promise<boolean> {
    try {
      await fs.unlink(modInfo.filePath);
      return true;
    } catch (error) {
      console.error('[ModService] 卸载 Mod 失败:', error);
      return false;
    }
  }
  
  /**
   * 启用 Mod（重命名恢复）
   */
  async enableMod(modInfo: ModInfo): Promise<boolean> {
    if (!modInfo.fileName.includes('.disabled')) {
      return true; // 已经启用
    }
    
    try {
      const newFileName = modInfo.fileName.replace(/\.disabled$/, '');
      const newPath = path.join(path.dirname(modInfo.filePath), newFileName);
      await fs.rename(modInfo.filePath, newPath);
      return true;
    } catch (error) {
      console.error('[ModService] 启用 Mod 失败:', error);
      return false;
    }
  }
  
  /**
   * 禁用 Mod（重命名为 .disabled）
   */
  async disableMod(modInfo: ModInfo): Promise<boolean> {
    if (modInfo.fileName.endsWith('.disabled')) {
      return true; // 已经禁用
    }
    
    try {
      const disabledFileName = modInfo.fileName + '.disabled';
      const disabledPath = path.join(path.dirname(modInfo.filePath), disabledFileName);
      await fs.rename(modInfo.filePath, disabledPath);
      return true;
    } catch (error) {
      console.error('[ModService] 禁用 Mod 失败:', error);
      return false;
    }
  }
  
  /**
   * 批量安装 Mod
   */
  async installMods(sourcePaths: string[], gameDir: string): Promise<{ success: ModInfo[]; failed: string[] }> {
    const success: ModInfo[] = [];
    const failed: string[] = [];
    
    for (const sourcePath of sourcePaths) {
      const mod = await this.installMod(sourcePath, gameDir);
      if (mod) {
        success.push(mod);
      } else {
        failed.push(sourcePath);
      }
    }
    
    return { success, failed };
  }
  
  /**
   * 检查 Mod 兼容性
   */
  async checkCompatibility(mods: ModInfo[], targetVersion: string, loader?: string): Promise<{
    compatible: ModInfo[];
    incompatible: { mod: ModInfo; reason: string }[];
    missingDeps: { mod: ModInfo; deps: string[] }[];
  }> {
    const compatible: ModInfo[] = [];
    const incompatible: { mod: ModInfo; reason: string }[] = [];
    const missingDeps: { mod: ModInfo; deps: string[] }[] = [];
    
    const modNames = mods.map(m => m.name.toLowerCase());
    
    for (const mod of mods) {
      let reason: string | null = null;
      
      // 检查 MC 版本
      if (mod.mcVersion && mod.mcVersion !== targetVersion) {
        reason = `需要 Minecraft ${mod.mcVersion}，当前版本 ${targetVersion}`;
      }
      
      // 检查 Mod Loader
      if (loader && mod.loader && mod.loader !== loader) {
        reason = `需要 ${mod.loader}，当前选择 ${loader}`;
      }
      
      if (reason) {
        incompatible.push({ mod, reason });
      } else {
        compatible.push(mod);
      }
    }
    
    return { compatible, incompatible, missingDeps };
  }
  
  /**
   * 获取 Mod 文件大小（格式化）
   */
  formatModSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  /**
   * 创建 mods 目录（如果不存在）
   */
  async ensureModsDir(gameDir: string): Promise<string> {
    const modsDir = this.getModsDir(gameDir);
    await fs.mkdir(modsDir, { recursive: true });
    return modsDir;
  }
}
