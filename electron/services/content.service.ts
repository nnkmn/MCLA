import { CurseForgeService, CurseForgeMod, CurseForgeFile, CurseForgeSearchParams } from './curseforge.service';
import { ModrinthService, ModrinthProject, ModrinthVersion, ModrinthSearchParams } from './modrinth.service';
import { DownloadService, DownloadTask } from './download.service';
import { logger } from '../utils/logger'
const log = logger.child('ContentService')

/**
 * 内容平台类型
 */
export enum ContentPlatform {
  CURSEFORGE = 'curseforge',
  MODRINTH = 'modrinth'
}

/**
 * 内容项目类型（统一接口）
 */
export interface ContentProject {
  id: string;
  platform: ContentPlatform;
  name: string;
  description: string;
  author: string;
  downloads: number;
  iconUrl?: string;
  categories: string[];
  gameVersions: string[];
  loaders: string[];
  platformUrl?: string;
  // CurseForge 特有字段
  curseForgeId?: number;
  // Modrinth 特有字段
  modrinthSlug?: string;
}

/**
 * 内容文件类型（统一接口）
 */
export interface ContentFile {
  id: string;
  platform: ContentPlatform;
  projectId: string;
  name: string;
  fileName: string;
  version: string;
  size: number;
  downloadUrl: string;
  gameVersions: string[];
  loaders: string[];
  releaseType: 'release' | 'beta' | 'alpha';
  datePublished: string;
  downloads: number;
  // CurseForge 特有字段
  curseForgeFileId?: number;
  // Modrinth 特有字段
  modrinthVersionId?: string;
}

/**
 * 内容搜索参数（统一接口）
 */
export interface ContentSearchParams {
  query?: string;
  platform?: ContentPlatform;
  gameVersion?: string;
  loader?: string;
  limit?: number;
  offset?: number;
  category?: string;
  projectType?: string;
}

/**
 * 内容服务类
 * 统一管理 CurseForge 和 Modrinth 内容
 */
export class ContentService {
  private curseForgeService: CurseForgeService;
  private modrinthService: ModrinthService;
  private downloadService: DownloadService;

  constructor(
    curseForgeApiKey: string = '',
    modrinthUserAgent: string = 'MCLA-Launcher/1.0',
    downloadService: DownloadService
  ) {
    this.curseForgeService = new CurseForgeService(curseForgeApiKey);
    this.modrinthService = new ModrinthService(modrinthUserAgent);
    this.downloadService = downloadService;
  }

  /**
   * 搜索模组
   */
  async searchMods(params: ContentSearchParams): Promise<ContentProject[]> {
    const results: ContentProject[] = [];

    if (!params.platform || params.platform === ContentPlatform.CURSEFORGE) {
      const curseForgeResults = await this.searchCurseForgeMods(params);
      results.push(...curseForgeResults);
    }

    if (!params.platform || params.platform === ContentPlatform.MODRINTH) {
      const modrinthResults = await this.searchModrinthMods(params);
      results.push(...modrinthResults);
    }

    // 按下载量排序
    return results.sort((a, b) => b.downloads - a.downloads).slice(0, params.limit || 20);
  }

  /**
   * 从 CurseForge 搜索模组
   */
  private async searchCurseForgeMods(params: ContentSearchParams): Promise<ContentProject[]> {
    try {
      const searchParams: CurseForgeSearchParams = {
        query: params.query,
        gameVersion: params.gameVersion,
        pageSize: params.limit || 20,
        index: params.offset || 0,
        modLoaderType: this.mapLoaderToCurseForge(params.loader)
      };

      if (params.category) {
        // 需要根据分类名称查找对应的 categoryId
        searchParams.categoryId = await this.getCurseForgeCategoryId(params.category);
      }

      const response = await this.curseForgeService.searchMods(searchParams);

      return response.data.map(mod => this.curseForgeModToContentProject(mod));
    } catch (error) {
      log.error('CurseForge search error:', error);
      return [];
    }
  }

  /**
   * 从 Modrinth 搜索模组
   */
  private async searchModrinthMods(params: ContentSearchParams): Promise<ContentProject[]> {
    try {
      const searchParams: ModrinthSearchParams = {
        query: params.query,
        limit: params.limit || 20,
        offset: params.offset || 0
      };

      // 构建搜索条件
      const facets: string[][] = [];
      if (params.gameVersion) {
        facets.push([`versions:${params.gameVersion}`]);
      }
      if (params.loader) {
        facets.push([`categories:${params.loader}`]);
      }
      if (params.projectType) {
        facets.push([`project_type:${params.projectType}`]);
      }

      if (facets.length > 0) {
        searchParams.facets = facets;
      }

      const response = await this.modrinthService.searchProjects(searchParams);

      return response.hits.map(project => this.modrinthProjectToContentProject(project));
    } catch (error) {
      log.error('Modrinth search error:', error);
      return [];
    }
  }

  /**
   * 获取项目详情
   */
  async getProject(projectId: string, platform: ContentPlatform): Promise<ContentProject | null> {
    try {
      if (platform === ContentPlatform.CURSEFORGE) {
        const modId = parseInt(projectId);
        const mod = await this.curseForgeService.getMod(modId);
        return this.curseForgeModToContentProject(mod);
      } else {
        const project = await this.modrinthService.getProject(projectId);
        return this.modrinthProjectToContentProject(project);
      }
    } catch (error) {
      log.error('Get project error:', error);
      return null;
    }
  }

  /**
   * 获取项目文件列表
   */
  async getProjectFiles(projectId: string, platform: ContentPlatform, options: {
    gameVersion?: string;
    loader?: string;
  } = {}): Promise<ContentFile[]> {
    try {
      if (platform === ContentPlatform.CURSEFORGE) {
        const modId = parseInt(projectId);
        const files = await this.curseForgeService.getModFiles(modId);
        
        let filteredFiles = files;
        if (options.gameVersion) {
          filteredFiles = filteredFiles.filter(file => 
            file.gameVersions.includes(options.gameVersion!)
          );
        }
        if (options.loader) {
          filteredFiles = filteredFiles.filter(file =>
            file.sortableGameVersions.some(v => 
              v.name.toLowerCase().includes(options.loader!.toLowerCase())
            )
          );
        }

        return filteredFiles.map(file => this.curseForgeFileToContentFile(file, modId));
      } else {
        const versions = await this.modrinthService.getProjectVersions(projectId, {
          game_versions: options.gameVersion ? [options.gameVersion] : undefined,
          loaders: options.loader ? [options.loader] : undefined
        });

        return versions.map(version => this.modrinthVersionToContentFile(version, projectId));
      }
    } catch (error) {
      log.error('Get project files error:', error);
      return [];
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(file: ContentFile, destination: string): Promise<DownloadTask> {
    let downloadUrl = file.downloadUrl;

    // Modrinth 的下载URL需要重定向处理
    if (file.platform === ContentPlatform.MODRINTH) {
      downloadUrl = this.modrinthService.getDownloadUrl(downloadUrl);
    } else {
      downloadUrl = this.curseForgeService.getDownloadUrl(downloadUrl);
    }

    return this.downloadService.addDownload(downloadUrl, destination);
  }

  /**
   * 获取分类列表
   */
  async getCategories(platform: ContentPlatform): Promise<string[]> {
    try {
      if (platform === ContentPlatform.CURSEFORGE) {
        const categories = await this.curseForgeService.getCategories();
        return categories.map(cat => cat.name);
      } else {
        const categories = await this.modrinthService.getCategories();
        return categories.map(cat => cat.name);
      }
    } catch (error) {
      log.error('Get categories error:', error);
      return [];
    }
  }

  /**
   * 获取加载器列表
   */
  async getLoaders(platform: ContentPlatform): Promise<string[]> {
    try {
      if (platform === ContentPlatform.CURSEFORGE) {
        return ['Forge', 'Fabric', 'Quilt', 'NeoForge'];
      } else {
        const loaders = await this.modrinthService.getLoaders();
        return loaders.map(loader => loader.name);
      }
    } catch (error) {
      log.error('Get loaders error:', error);
      return [];
    }
  }

  /**
   * 工具方法：将加载器名称映射到 CurseForge ID
   */
  private mapLoaderToCurseForge(loader?: string): 0 | 1 | 2 {
    if (!loader) return 0;
    const lowerLoader = loader.toLowerCase();
    if (lowerLoader.includes('forge')) return 1;
    if (lowerLoader.includes('fabric')) return 2;
    return 0;
  }

  /**
   * 工具方法：根据分类名称获取 CurseForge 分类ID
   */
  private async getCurseForgeCategoryId(categoryName: string): Promise<number> {
    try {
      const categories = await this.curseForgeService.getCategories();
      const category = categories.find(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase() ||
        cat.slug.toLowerCase() === categoryName.toLowerCase()
      );
      return category?.id || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 工具方法：转换 CurseForge Mod 到统一格式
   */
  private curseForgeModToContentProject(mod: CurseForgeMod): ContentProject {
    return {
      id: mod.id.toString(),
      platform: ContentPlatform.CURSEFORGE,
      name: mod.name,
      description: mod.summary,
      author: mod.authors.map(a => a.name).join(', '),
      downloads: mod.downloadCount,
      iconUrl: mod.featuredImage,
      categories: mod.categories.map(c => c.name),
      gameVersions: mod.latestFiles.flatMap(f => f.gameVersions),
      loaders: mod.latestFiles.flatMap(f => 
        f.sortableGameVersions.map(v => v.name).filter(name => 
          ['Forge', 'Fabric', 'Quilt', 'NeoForge'].includes(name)
        )
      ),
      platformUrl: mod.links.websiteUrl,
      curseForgeId: mod.id
    };
  }

  /**
   * 工具方法：转换 Modrinth Project 到统一格式
   */
  private modrinthProjectToContentProject(project: ModrinthProject): ContentProject {
    return {
      id: project.id,
      platform: ContentPlatform.MODRINTH,
      name: project.title,
      description: project.description,
      author: project.team, // Modrinth 使用团队ID，需要进一步处理
      downloads: project.downloads,
      iconUrl: project.icon_url || undefined,
      categories: project.categories,
      gameVersions: project.game_versions,
      loaders: project.loaders,
      platformUrl: `https://modrinth.com/mod/${project.slug}`,
      modrinthSlug: project.slug
    };
  }

  /**
   * 工具方法：转换 CurseForge File 到统一格式
   */
  private curseForgeFileToContentFile(file: CurseForgeFile, modId: number): ContentFile {
    return {
      id: file.id.toString(),
      platform: ContentPlatform.CURSEFORGE,
      projectId: modId.toString(),
      name: file.displayName,
      fileName: file.fileName,
      version: file.displayName,
      size: file.fileLength,
      downloadUrl: file.downloadUrl,
      gameVersions: file.gameVersions,
      loaders: file.sortableGameVersions.map(v => v.name),
      releaseType: file.releaseType === 1 ? 'release' : file.releaseType === 2 ? 'beta' : 'alpha',
      datePublished: file.fileDate,
      downloads: 0, // CurseForge API 不提供单个文件的下载量
      curseForgeFileId: file.id
    };
  }

  /**
   * 工具方法：转换 Modrinth Version 到统一格式
   */
  private modrinthVersionToContentFile(version: ModrinthVersion, projectId: string): ContentFile {
    const primaryFile = version.files.find(f => f.primary) || version.files[0];
    
    return {
      id: version.id,
      platform: ContentPlatform.MODRINTH,
      projectId: projectId,
      name: version.name,
      fileName: primaryFile?.filename || '',
      version: version.version_number,
      size: primaryFile?.size || 0,
      downloadUrl: primaryFile?.url || '',
      gameVersions: version.game_versions,
      loaders: version.loaders,
      releaseType: version.version_type,
      datePublished: version.date_published,
      downloads: version.downloads,
      modrinthVersionId: version.id
    };
  }

  /**
   * 获取下载服务实例
   */
  getDownloadService(): DownloadService {
    return this.downloadService;
  }

  /**
   * 设置 CurseForge API 密钥
   */
  setCurseForgeApiKey(apiKey: string): void {
    this.curseForgeService.setApiKey(apiKey);
  }

  /**
   * 设置 Modrinth User-Agent
   */
  setModrinthUserAgent(userAgent: string): void {
    this.modrinthService.setUserAgent(userAgent);
  }
}