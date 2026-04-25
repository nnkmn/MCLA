import { Database } from './database'
import { VersionInfo } from '../types'

// BMCLAPI API 端点
const BMCLAPI_BASE = 'https://bmclapi2.bangbang93.com'
const BMCLAPI_MIRROR = 'https://mcplayer.cn'

interface MojangVersionManifest {
  latest: {
    release: string
    snapshot: string
  }
  versions: Array<{
    id: string
    type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta'
    url: string
    time: string
    releaseTime: string
  }>
}

interface MojangVersion {
  id: string
  type: string
  time: string
  releaseTime: string
  downloads: {
    client: {
      sha1: string
      size: number
      url: string
    }
    server?: {
      sha1: string
      size: number
      url: string
    }
    windows_server?: {
      sha1: string
      size: number
      url: string
    }
  }
  logging?: {
    client: {
      [key: string]: string
    }
  }
}

// BMCLAPI 版本列表响应
interface BMCLVersionList {
  versions: Array<{
    id: string
    type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta'
    releaseTime: string
    url: string
  }>
  latest: {
    release: string
    snapshot: string
  }
}

// 下载源配置
export type DownloadSource = 'bmclapi' | 'mcbbs' | 'official'

export class VersionsService {
  private db: Database
  private source: DownloadSource = 'bmclapi'
  private cache: Map<string, any> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5分钟缓存

  constructor(db: Database) {
    this.db = db
  }

  setSource(source: DownloadSource) {
    this.source = source
  }

  private getBaseUrl(): string {
    switch (this.source) {
      case 'bmclapi': return BMCLAPI_BASE
      case 'mcbbs': return BMCLAPI_MIRROR
      default: return BMCLAPI_BASE
    }
  }

  // 获取版本列表（优先 BMCLAPI）
  async getVersionList(): Promise<BMCLVersionList> {
    const cacheKey = `versionList_${this.source}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }

    try {
      const baseUrl = this.getBaseUrl()
      const response = await fetch(`${baseUrl}/mc/game/version_manifest`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      this.cache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      console.error('[VersionsService] 获取版本列表失败:', error)
      // 降级到官方 API
      const fallback = await this.getMojangManifest()
      return fallback
    }
  }

  // 获取 Mojang 版本清单（降级方案）
  async getMojangManifest(): Promise<MojangVersionManifest> {
    const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json')
    if (!response.ok) {
      throw new Error('Failed to fetch version manifest')
    }
    return response.json()
  }

  // 获取所有可用版本
  async getAllVersions(): Promise<VersionInfo[]> {
    const manifest = await this.getVersionList()
    return manifest.versions.map(v => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
      url: v.url
    }))
  }

  // 获取最新版本
  async getLatestVersion(): Promise<{ release: string; snapshot: string }> {
    const manifest = await this.getVersionList()
    return manifest.latest
  }

  // 获取版本详细信息
  async getVersionInfo(versionId: string): Promise<MojangVersion | null> {
    const cacheKey = `versionInfo_${versionId}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }

    try {
      const baseUrl = this.getBaseUrl()
      const response = await fetch(`${baseUrl}/mc/game/version/${versionId}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      this.cache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      console.error(`[VersionsService] 获取版本 ${versionId} 信息失败:`, error)
      return null
    }
  }

  // 获取版本下载 URL
  async getVersionDownloadUrl(versionId: string): Promise<{
    client: string
    server?: string
    windows_server?: string
  } | null> {
    const versionInfo = await this.getVersionInfo(versionId)
    if (!versionInfo || !versionInfo.downloads) return null

    const urls: any = {}
    
    // 优先使用 BMCLAPI 的下载地址
    const baseUrl = this.getBaseUrl()
    if (versionInfo.downloads.client) {
      // 转换为 BMCLAPI URL
      urls.client = `${baseUrl}/mc/version/${versionId}/client`
    }
    if (versionInfo.downloads.server) {
      urls.server = `${baseUrl}/mc/version/${versionId}/server`
    }
    if (versionInfo.downloads.windows_server) {
      urls.windows_server = `${baseUrl}/mc/version/${versionId}/windows_server`
    }

    return urls
  }

  // 过滤版本（按类型）
  async getVersionsByType(type: 'release' | 'snapshot' | 'old' | 'all' = 'all'): Promise<VersionInfo[]> {
    const versions = await this.getAllVersions()
    
    if (type === 'all') return versions
    if (type === 'old') {
      return versions.filter(v => v.type === 'old_alpha' || v.type === 'old_beta')
    }
    return versions.filter(v => v.type === type)
  }

  // 获取推荐版本列表（最近的主要版本）
  async getRecommendedVersions(count: number = 5): Promise<VersionInfo[]> {
    const versions = await this.getVersionsByType('release')
    return versions.slice(0, count)
  }

  // 获取支持的 Java 版本
  getRecommendedJavaVersion(mcVersion: string): { min: string; recommended: string } {
    const version = parseFloat(mcVersion)
    
    if (version >= 1.21) {
      return { min: '17', recommended: '21' }
    } else if (version >= 1.18) {
      return { min: '16', recommended: '17' }
    } else if (version >= 1.17) {
      return { min: '16', recommended: '16' }
    } else if (version >= 1.12) {
      return { min: '8', recommended: '8' }
    } else {
      return { min: '8', recommended: '8' }
    }
  }

  // 检查版本是否已安装
  async isVersionInstalled(versionId: string, gameDir: string): Promise<boolean> {
    const versionDir = `${gameDir}/versions/${versionId}`
    const jarPath = `${versionDir}/${versionId}.jar`
    // 这里需要 fs 模块，但由于是服务类，在实例方法中可以使用
    return false // TODO: 实现文件检查
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear()
  }

  // 保存版本信息到数据库
  async saveVersionInfo(version: VersionInfo): Promise<void> {
    await this.db.run(
      'INSERT OR REPLACE INTO versions (id, type, releaseTime, url) VALUES (?, ?, ?, ?)',
      [version.id, version.type, version.releaseTime, version.url]
    )
  }

  // 从数据库获取版本信息
  async getVersionFromDB(versionId: string): Promise<VersionInfo | null> {
    const result = await this.db.get(
      'SELECT * FROM versions WHERE id = ?',
      [versionId]
    )
    return result ? {
      id: result.id,
      type: result.type,
      releaseTime: result.releaseTime,
      url: result.url
    } : null
  }
}