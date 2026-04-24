import { Database } from './database'
import { VersionInfo } from '../types'

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

export class VersionsService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  // 获取 Mojang 版本清单
  async getMojangManifest(): Promise<MojangVersionManifest> {
    const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json')
    if (!response.ok) {
      throw new Error('Failed to fetch version manifest')
    }
    return response.json()
  }

  // 获取具体版本信息
  async getVersionInfo(versionId: string): Promise<MojangVersion> {
    const manifest = await this.getMojangManifest()
    const version = manifest.versions.find(v => v.id === versionId)
    if (!version) {
      throw new Error(`Version ${versionId} not found`)
    }

    const response = await fetch(version.url)
    if (!response.ok) {
      throw new Error(`Failed to fetch version info for ${versionId}`)
    }
    return response.json()
  }

  // 获取所有可用版本
  async getAllVersions(): Promise<VersionInfo[]> {
    const manifest = await this.getMojangManifest()
    return manifest.versions.map(v => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
      url: v.url
    }))
  }

  // 获取最新版本
  async getLatestVersion(): Promise<string> {
    const manifest = await this.getMojangManifest()
    return manifest.latest.release
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