import { promises as fs, createReadStream } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../utils/logger'
const log = logger.child('ModService')

/* eslint-disable @typescript-eslint/no-var-requires */
const AdmZip = require('adm-zip');
/* eslint-enable @typescript-eslint/no-var-requires */

const MR_BASE = 'https://api.modrinth.com/v2'

/** Mod 更新信息 */
export interface ModUpdateInfo {
  /** 本地 mod 的文件路径 */
  filePath: string
  /** 本地 mod 的 sha1 hash */
  hash: string
  /** 是否有更新 */
  hasUpdate: boolean
  /** Modrinth 上对应的项目 ID（如果找到） */
  projectId?: string
  /** 当前版本名（Modrinth 上的） */
  currentVersionName?: string
  /** 最新版本 ID */
  latestVersionId?: string
  /** 最新版本名 */
  latestVersionName?: string
  /** 最新版本文件下载 URL */
  latestDownloadUrl?: string
  /** 最新版本文件名 */
  latestFileName?: string
  /** 最新版本文件大小 */
  latestFileSize?: number
}

/** Modrinth version_files API 返回的版本对象（精简） */
interface MrVersionFile {
  id: string
  project_id: string
  name: string
  version_number: string
  loaders: string[]
  game_versions: string[]
  date_published: string
  version_type: 'release' | 'beta' | 'alpha'
  files: { url: string; filename: string; primary: boolean; size: number; hashes: { sha1: string; sha512: string } }[]
}

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
  mcVersion?: string;
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

/** fabric.mod.json / quilt.mod.json 接口 */
interface FabricModJson {
  schemaVersion?: number;
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  authors?: Array<{ name: string } | string>;
  contact?: { homepage?: string; sources?: string; issues?: string };
  icon?: string;
  depends?: Record<string, string>;
  recommends?: Record<string, string>;
  suggests?: Record<string, string>;
  breaks?: Record<string, string>;
  conflicts?: Record<string, string>;
}

/**
 * Mod 管理服务
 */
export class ModService {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    // 默认缓存目录：%APPDATA%\mcla\mod-icons（Windows）或 ~/.mcla/mod-icons
    this.cacheDir =
      cacheDir ||
      path.join(process.env.APPDATA || process.env.HOME || '.', 'mcla', 'mod-icons');
  }

  /**
   * 获取 mods 目录路径
   */
  getModsDir(gameDir: string): string {
    return path.join(gameDir, 'mods');
  }

  /**
   * 获取所有已安装的 Mod（包括已禁用的 .jar.disabled）
   */
  async getInstalledMods(gameDir: string): Promise<ModInfo[]> {
    const modsDir = this.getModsDir(gameDir);
    const mods: ModInfo[] = [];

    try {
      const files = await fs.readdir(modsDir);

      for (const file of files) {
        const filePath = path.join(modsDir, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) continue;

        const isDisabled = file.endsWith('.disabled');
        const isJar = file.endsWith('.jar') || isDisabled;
        if (!isJar) continue;

        const modInfo = await this.readModInfo(filePath);
        const baseName = isDisabled ? file.replace(/\.disabled$/, '') : file;

        mods.push({
          id: this.generateModId(baseName),
          name: modInfo.name || this.extractModName(baseName),
          version: modInfo.version || 'Unknown',
          description: modInfo.description,
          authors: modInfo.authors,
          url: modInfo.url,
          filePath,
          fileName: file,
          size: stat.size,
          enabled: !isDisabled,
          loader: modInfo.loader,
          mcVersion: modInfo.mcVersion,
          dependencies: modInfo.dependencies,
          logoUrl: modInfo.logoUrl,
        });
      }

      return mods;
    } catch (error) {
      log.error('[ModService] 读取 mods 目录失败:', error);
      return [];
    }
  }

  /**
   * 从文件名提取 Mod 名称
   */
  private extractModName(fileName: string): string {
    return fileName
      .replace(/\.jar(\.disabled)?$/i, '')
      .replace(/-\d[\d.]*(?:-[\w]+)?$/i, '')
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * 从文件名提取版本号
   */
  private extractVersionFromFileName(fileName: string): string {
    const match = fileName.match(/-\d[\d.]*(?:-[\w]+)?(?=\.jar)/i);
    return match ? match[1] : 'Unknown';
  }

  /**
   * 生成 Mod ID
   */
  private generateModId(fileName: string): string {
    const name = fileName.replace(/\.jar(\.disabled)?$/i, '').toLowerCase();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return `mod_${Math.abs(hash).toString(16)}`;
  }

  /**
   * 读取 Mod 信息（从 jar 文件）
   * 尝试读取 fabric.mod.json / quilt.mod.json，提取元数据和图标
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
    const fileName = path.basename(filePath);
    const result: any = {};

    try {
      let zip: any;
      try {
        zip = new AdmZip(filePath);
      } catch (zipErr) {
        // 不是有效 zip（可能正在下载中）
        throw zipErr;
      }

      let manifest: FabricModJson | null = null;
      let iconPathInJar: string | undefined;

      // 尝试读取 fabric.mod.json
      let entry = zip.getEntry('fabric.mod.json');
      if (entry) {
        const content = zip.readAsText(entry);
        manifest = JSON.parse(content);
        result.loader = 'fabric';
        if (manifest?.icon) {
          iconPathInJar = manifest.icon;
        }
      } else {
        // 尝试 quilt.mod.json
        entry = zip.getEntry('quilt.mod.json');
        if (entry) {
          const content = zip.readAsText(entry);
          manifest = JSON.parse(content);
          result.loader = 'quilt';
          if (manifest?.icon) {
            iconPathInJar = manifest.icon;
          }
        }
      }

      // 从 manifest 提取信息
      if (manifest) {
        result.name = manifest.name || manifest.id;
        result.version = manifest.version;
        result.description = manifest.description;

        if (manifest.authors) {
          result.authors = manifest.authors
            .map((a: any) => (typeof a === 'string' ? a : a.name))
            .filter(Boolean);
        }

        if (manifest.contact?.homepage || manifest.contact?.sources) {
          result.url = manifest.contact.homepage || manifest.contact.sources;
        }

        if (manifest.depends) {
          result.dependencies = Object.keys(manifest.depends);
        }

        // 提取图标
        if (iconPathInJar) {
          result.logoUrl = await this.extractIconToCache(
            filePath,
            iconPathInJar,
            fileName,
          );
        }
      }

      // 没读到 manifest，尝试从文件名解析
      if (!manifest) {
        result.version = this.extractVersionFromFileName(fileName);
        if (/fabric/i.test(fileName)) result.loader = 'fabric';
        else if (/forge/i.test(fileName)) result.loader = 'forge';
        else if (/quilt/i.test(fileName)) result.loader = 'quilt';
        else if (/neoforge/i.test(fileName)) result.loader = 'neoforge';

        const mcMatch = fileName.match(/(1\.\d+(?:\.\d+)?)/);
        if (mcMatch) result.mcVersion = mcMatch[1];
      }

      return result;
    } catch (e: any) {
      log.warn(
        '[ModService] 读取 jar 信息失败，回退到文件名解析:',
        filePath,
        e?.message,
      );
      return {
        name: this.extractModName(fileName),
        version: this.extractVersionFromFileName(fileName),
        loader: /fabric/i.test(fileName) ? 'fabric' : undefined,
      };
    }
  }

  /**
   * 从 jar 文件中提取图标并缓存到本地
   * 返回 file:// 格式的 URL 字符串，失败返回 undefined
   */
  private async extractIconToCache(
    jarPath: string,
    iconPathInJar: string,
    jarFileName: string,
  ): Promise<string | undefined> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });

      // 生成缓存文件名
      const iconExt = path.extname(iconPathInJar) || '.png';
      const safeIconPath = iconPathInJar.replace(/[^a-zA-Z0-9.]/g, '_').slice(0, 50);
      const cacheBaseName = `${path.basename(
        jarFileName,
        path.extname(jarFileName),
      )}__${safeIconPath}${iconExt}`;
      const cachePath = path.join(this.cacheDir, cacheBaseName);

      // 已缓存则直接返回
      try {
        await fs.access(cachePath);
        return `file://${cachePath.replace(/\\/g, '/')}`;
      } catch {
        // 未缓存，继续提取
      }

      const zip = new AdmZip(jarPath);
      const entry = zip.getEntry(iconPathInJar);
      if (!entry) {
        log.warn(`[ModService] 图标在 jar 中未找到: ${iconPathInJar}`);
        return undefined;
      }

      const iconData: Buffer = zip.readFile(entry);
      if (!iconData) {
        log.warn(`[ModService] 读取图标数据失败: ${iconPathInJar}`);
        return undefined;
      }

      await fs.writeFile(cachePath, iconData);
      return `file://${cachePath.replace(/\\/g, '/')}`;
    } catch (e: any) {
      log.warn('[ModService] 提取图标失败:', e?.message);
      return undefined;
    }
  }

  /**
   * 安装 Mod（复制文件到 mods 目录）
   */
  async installMod(sourcePath: string, gameDir: string): Promise<ModInfo | null> {
    try {
      const fileName = path.basename(sourcePath);
      const destDir = this.getModsDir(gameDir);
      const destPath = path.join(destDir, fileName);

      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(sourcePath, destPath);

      const stat = await fs.stat(destPath);
      const modInfo = await this.readModInfo(destPath);

      return {
        id: this.generateModId(fileName),
        name: modInfo.name || this.extractModName(fileName),
        version: modInfo.version || 'Unknown',
        description: modInfo.description,
        authors: modInfo.authors,
        url: modInfo.url,
        filePath: destPath,
        fileName,
        size: stat.size,
        enabled: true,
        loader: modInfo.loader,
        mcVersion: modInfo.mcVersion,
        dependencies: modInfo.dependencies,
        logoUrl: modInfo.logoUrl,
      };
    } catch (error) {
      log.error('[ModService] 安装 Mod 失败:', error);
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
      log.error('[ModService] 卸载 Mod 失败:', error);
      return false;
    }
  }

  /**
   * 启用 Mod（重命名恢复）
   */
  async enableMod(modInfo: ModInfo): Promise<boolean> {
    if (!modInfo.fileName.includes('.disabled')) return true;
    try {
      const newFileName = modInfo.fileName.replace(/\.disabled$/, '');
      const newPath = path.join(path.dirname(modInfo.filePath), newFileName);
      await fs.rename(modInfo.filePath, newPath);
      return true;
    } catch (error) {
      log.error('[ModService] 启用 Mod 失败:', error);
      return false;
    }
  }

  /**
   * 禁用 Mod（重命名为 .disabled）
   */
  async disableMod(modInfo: ModInfo): Promise<boolean> {
    if (modInfo.fileName.endsWith('.disabled')) return true;
    try {
      const disabledFileName = modInfo.fileName + '.disabled';
      const disabledPath = path.join(path.dirname(modInfo.filePath), disabledFileName);
      await fs.rename(modInfo.filePath, disabledPath);
      return true;
    } catch (error) {
      log.error('[ModService] 禁用 Mod 失败:', error);
      return false;
    }
  }

  /**
   * 批量安装 Mod
   */
  async installMods(
    sourcePaths: string[],
    gameDir: string,
  ): Promise<{ success: ModInfo[]; failed: string[] }> {
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
  async checkCompatibility(
    mods: ModInfo[],
    targetVersion: string,
    loader?: string,
  ): Promise<{
    compatible: ModInfo[];
    incompatible: { mod: ModInfo; reason: string }[];
    missingDeps: { mod: ModInfo; deps: string[] }[];
  }> {
    const compatible: ModInfo[] = [];
    const incompatible: { mod: ModInfo; reason: string }[] = [];
    const missingDeps: { mod: ModInfo; deps: string[] }[] = [];

    for (const mod of mods) {
      let reason: string | null = null;

      if (mod.mcVersion && mod.mcVersion !== targetVersion) {
        reason = `需要 Minecraft ${mod.mcVersion}，当前版本 ${targetVersion}`;
      }

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

  // ─────────────────────────────────────────────
  // Mod 更新检测（Modrinth API）
  // ─────────────────────────────────────────────

  /**
   * 计算文件 sha1 hash
   */
  async computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1')
      const stream = createReadStream(filePath)
      stream.on('data', (chunk: string | Buffer) => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  /**
   * 批量检查 mod 是否有更新（通过 Modrinth API）
   * @param mods 需要检查的 mod 列表
   * @param mcVersion 当前 MC 版本（用于过滤兼容版本），传 undefined 则不过滤
   * @param loader mod loader 类型（如 'fabric'/'forge'），传 undefined 则不过滤
   */
  async checkModsUpdate(
    mods: ModInfo[],
    mcVersion?: string,
    loader?: string,
  ): Promise<ModUpdateInfo[]> {
    // 只检查已启用的 .jar 文件
    const enabledMods = mods.filter(m => m.enabled && m.filePath.endsWith('.jar'))
    if (enabledMods.length === 0) return []

    // 计算所有 hash（并发）
    const hashResults = await Promise.allSettled(
      enabledMods.map(async m => ({
        mod: m,
        hash: await this.computeFileHash(m.filePath),
      }))
    )

    const hashMap: { mod: ModInfo; hash: string }[] = []
    for (const r of hashResults) {
      if (r.status === 'fulfilled') hashMap.push(r.value)
    }

    if (hashMap.length === 0) return []

    // 用 hash 批量查 Modrinth（POST /version_files）
    const hashToMod = new Map(hashMap.map(h => [h.hash, h]))
    const hashes = hashMap.map(h => h.hash)

    let currentVersions: Record<string, MrVersionFile> = {}
    try {
      const resp = await fetch(`${MR_BASE}/version_files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MCLA-Launcher/1.0',
        },
        body: JSON.stringify({ hashes, algorithm: 'sha1' }),
      })
      if (resp.ok) {
        currentVersions = await resp.json() as Record<string, MrVersionFile>
      }
    } catch (e) {
      log.error('[ModService] Modrinth version_files API 失败:', e)
    }

    const results: ModUpdateInfo[] = []

    for (const { mod, hash } of hashMap) {
      const currentVer = currentVersions[hash]
      if (!currentVer) {
        // hash 不在 Modrinth 上（本地 mod 或私有 mod），跳过
        results.push({ filePath: mod.filePath, hash, hasUpdate: false })
        continue
      }

      // 查该项目的最新版本
      let latestVer: MrVersionFile | null = null
      try {
        const qs = new URLSearchParams()
        if (mcVersion) qs.set('game_versions', JSON.stringify([mcVersion]))
        if (loader) qs.set('loaders', JSON.stringify([loader]))
        const query = qs.toString() ? `?${qs}` : ''
        const verResp = await fetch(
          `${MR_BASE}/project/${currentVer.project_id}/version${query}`,
          { headers: { 'User-Agent': 'MCLA-Launcher/1.0' } }
        )
        if (verResp.ok) {
          const versions = await verResp.json() as MrVersionFile[]
          // 优先取 release，其次 beta/alpha，取第一个（最新）
          const releases = versions.filter(v => v.version_type === 'release')
          latestVer = releases.length > 0 ? releases[0] : versions[0] ?? null
        }
      } catch (e) {
        log.error('[ModService] 查最新版本失败:', e)
      }

      const hasUpdate = latestVer ? latestVer.id !== currentVer.id : false
      const primaryFile = latestVer?.files.find(f => f.primary) ?? latestVer?.files[0]

      results.push({
        filePath: mod.filePath,
        hash,
        hasUpdate,
        projectId: currentVer.project_id,
        currentVersionName: currentVer.version_number,
        latestVersionId: latestVer?.id,
        latestVersionName: latestVer?.version_number,
        latestDownloadUrl: primaryFile?.url,
        latestFileName: primaryFile?.filename,
        latestFileSize: primaryFile?.size,
      })
    }

    return results
  }

  /**
   * 下载并替换 mod 到最新版本
   * @param mod 当前 mod 信息
   * @param updateInfo 更新信息（来自 checkModsUpdate）
   * @param onProgress 下载进度回调（0~1）
   */
  async updateMod(
    mod: ModInfo,
    updateInfo: ModUpdateInfo,
    onProgress?: (progress: number) => void,
  ): Promise<ModInfo | null> {
    if (!updateInfo.latestDownloadUrl || !updateInfo.latestFileName) {
      log.error('[ModService] 更新信息不完整')
      return null
    }

    const destDir = path.dirname(mod.filePath)
    const newFilePath = path.join(destDir, updateInfo.latestFileName)

    try {
      // 下载新版本
      const resp = await fetch(updateInfo.latestDownloadUrl, {
        headers: { 'User-Agent': 'MCLA-Launcher/1.0' },
      })
      if (!resp.ok) throw new Error(`下载失败: ${resp.status} ${resp.statusText}`)

      const contentLength = Number(resp.headers.get('content-length') ?? '0')
      const chunks: Buffer[] = []
      let downloaded = 0

      if (resp.body) {
        const reader = resp.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(Buffer.from(value))
          downloaded += value.length
          if (contentLength > 0 && onProgress) {
            onProgress(downloaded / contentLength)
          }
        }
      }

      const buffer = Buffer.concat(chunks)
      await fs.writeFile(newFilePath, buffer)

      // 删除旧文件（如果新旧文件名不同）
      if (newFilePath !== mod.filePath) {
        try { await fs.unlink(mod.filePath) } catch { /* ignore */ }
      }

      onProgress?.(1)

      // 读取新文件信息
      const stat = await fs.stat(newFilePath)
      const modInfo = await this.readModInfo(newFilePath)
      const newFileName = path.basename(newFilePath)

      return {
        ...mod,
        filePath: newFilePath,
        fileName: newFileName,
        version: modInfo.version || updateInfo.latestVersionName || mod.version,
        name: modInfo.name || mod.name,
        description: modInfo.description || mod.description,
        logoUrl: modInfo.logoUrl || mod.logoUrl,
        size: stat.size,
      }
    } catch (e: any) {
      log.error('[ModService] 更新 mod 失败:', e)
      return null
    }
  }
}
