import Database from 'better-sqlite3'
import type { McVersionInfo } from '../types'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../utils/logger'
const log = logger.child('VersionsService')

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
    time?: string
  }>
  latest: {
    release: string
    snapshot: string
  }
}

// 下载源配置
export type DownloadSource = 'bmclapi' | 'mcbbs' | 'official'

export class VersionsService {
  private db: Database.Database
  private source: DownloadSource = 'bmclapi'
  private cache: Map<string, any> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5分钟缓存

  constructor(db: Database.Database) {
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
      const response = await fetch(`${baseUrl}/mc/game/version_manifest.json`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      this.cache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      log.error('[VersionsService] 获取版本列表失败:', error)
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
  async getAllVersions(): Promise<McVersionInfo[]> {
    const manifest = await this.getVersionList()
    return manifest.versions.map(v => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
      url: v.url,
      time: v.time || v.releaseTime
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
      // 先从版本清单获取该版本的 URL
      const manifestRes = await fetch(`${this.getBaseUrl()}/mc/game/version_manifest.json`)
      if (!manifestRes.ok) throw new Error(`HTTP ${manifestRes.status}`)
      const manifest = await manifestRes.json() as { versions: Array<{ id: string; url: string }> }
      const verEntry = manifest.versions.find((v: any) => v.id === versionId)
      if (!verEntry) return null

      // 用 manifest 中的 URL（已镜像）下载
      const response = await fetch(verEntry.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      this.cache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      log.error(`[VersionsService] 获取版本 ${versionId} 信息失败:`, error)
      return null
    }
  }

  // 获取版本下载 URL（StarLight.Core 方案：始终构造 URL，不依赖 downloads 字段存在性）
  async getVersionDownloadUrl(versionId: string): Promise<{
    client: string
    server?: string
    windows_server?: string
  } | null> {
    const versionInfo = await this.getVersionInfo(versionId)
    if (!versionInfo) return null

    const baseUrl = this.getBaseUrl()
    const urls: any = {}

    // client.jar — 优先 version.json 里的 Mojang URL，兜底 BMCLAPI
    urls.client = versionInfo.downloads?.client?.url
      ?? `${baseUrl}/mc/version/${versionId}/client`

    // server.jar — 有则覆盖
    if (versionInfo.downloads?.server?.url) {
      urls.server = versionInfo.downloads.server.url
    }

    // windows_server — 有则覆盖
    if (versionInfo.downloads?.windows_server?.url) {
      urls.windows_server = versionInfo.downloads.windows_server.url
    }

    return urls
  }

  // 过滤版本（按类型）
  async getVersionsByType(type: 'release' | 'snapshot' | 'old' | 'all' = 'all'): Promise<McVersionInfo[]> {
    const versions = await this.getAllVersions()
    
    if (type === 'all') return versions
    if (type === 'old') {
      return versions.filter(v => v.type === 'old_alpha' || v.type === 'old_beta')
    }
    return versions.filter(v => v.type === type)
  }

  // 获取推荐版本列表（最近的主要版本）
  async getRecommendedVersions(count: number = 5): Promise<McVersionInfo[]> {
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
    const versionDir = path.join(gameDir, 'versions', versionId)
    const jsonPath = path.join(versionDir, `${versionId}.json`)

    // JSON 必须存在
    try {
      await fs.promises.access(jsonPath)
    } catch {
      return false
    }

    // 检查 jar 是否存在（原版需要）
    const jarPath = path.join(versionDir, `${versionId}.jar`)
    try {
      await fs.promises.access(jarPath)
      return true // 原版：jar + json 都存在
    } catch {
      // jar 不存在，继续检查
    }

    // jar 不存在时，检查是否是 ModLoader 继承版本
    try {
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
      const meta = JSON.parse(jsonContent)
      if (meta.inheritsFrom) {
        return true // ModLoader 版本，继承基版本 jar
      }
    } catch {
      // JSON 解析失败，忽略
    }

    return false
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear()
  }

  // 保存版本信息到数据库
  saveVersionInfo(version: McVersionInfo): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO versions (id, type, releaseTime, url) VALUES (?, ?, ?, ?)'
    ).run([version.id, version.type, version.releaseTime, version.url])
  }

  // 从数据库获取版本信息
  getVersionFromDB(versionId: string): McVersionInfo | null {
    const result = this.db.prepare(
      'SELECT * FROM versions WHERE id = ?'
    ).get([versionId]) as McVersionInfo | undefined
    return result ? {
      id: result.id,
      type: result.type,
      releaseTime: result.releaseTime,
      url: result.url,
      time: result.releaseTime || ''
    } : null
  }
}