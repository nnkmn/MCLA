import { net } from 'electron'

export interface CurseForgeSearchParams {
  query?: string
  gameVersion?: string
  pageSize?: number
  index?: number
  categoryId?: number
  modLoaderType?: 0 | 1 | 2  // 0=Any, 1=Forge, 2=Fabric
}

export interface CurseForgeMod {
  id: number
  name: string
  summary: string
  downloadCount: number
  featuredImage: string
  authors: { id: number; name: string }[]
  categories: { id: number; name: string; slug: string }[]
  latestFiles: CurseForgeFile[]
  links: { websiteUrl: string }
}

export interface CurseForgeFile {
  id: number
  displayName: string
  fileName: string
  fileLength: number
  downloadUrl: string
  gameVersions: string[]
  sortableGameVersions: { name: string; gameVersion: string }[]
  releaseType: 1 | 2 | 3  // 1=Release, 2=Beta, 3=Alpha
  fileDate: string
}

export interface CurseForgeCategory {
  id: number
  name: string
  slug: string
}

const CF_BASE = 'https://api.curseforge.com/v1'
const MINECRAFT_GAME_ID = 432
const MODS_CLASS_ID = 6

export class CurseForgeService {
  private apiKey: string

  constructor(apiKey: string = '') {
    this.apiKey = apiKey
  }

  setApiKey(key: string): void {
    this.apiKey = key
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey
    }

    const resp = await fetch(url, { headers })
    if (!resp.ok) {
      throw new Error(`CurseForge API error ${resp.status}: ${resp.statusText}`)
    }
    return resp.json() as Promise<T>
  }

  async searchMods(params: CurseForgeSearchParams): Promise<{ data: CurseForgeMod[] }> {
    if (!this.apiKey) {
      // 无 API Key 时返回空结果
      return { data: [] }
    }
    const qs = new URLSearchParams({
      gameId: String(MINECRAFT_GAME_ID),
      classId: String(MODS_CLASS_ID),
      pageSize: String(params.pageSize || 20),
      index: String(params.index || 0)
    })
    if (params.query) qs.set('searchFilter', params.query)
    if (params.gameVersion) qs.set('gameVersion', params.gameVersion)
    if (params.categoryId) qs.set('categoryId', String(params.categoryId))
    if (params.modLoaderType) qs.set('modLoaderType', String(params.modLoaderType))

    const result = await this.fetchJson<{ data: CurseForgeMod[] }>(`${CF_BASE}/mods/search?${qs}`)
    return result
  }

  async getMod(modId: number): Promise<CurseForgeMod> {
    const result = await this.fetchJson<{ data: CurseForgeMod }>(`${CF_BASE}/mods/${modId}`)
    return result.data
  }

  async getModFiles(modId: number): Promise<CurseForgeFile[]> {
    const result = await this.fetchJson<{ data: CurseForgeFile[] }>(`${CF_BASE}/mods/${modId}/files`)
    return result.data
  }

  async getCategories(): Promise<CurseForgeCategory[]> {
    if (!this.apiKey) return []
    const result = await this.fetchJson<{ data: CurseForgeCategory[] }>(
      `${CF_BASE}/categories?gameId=${MINECRAFT_GAME_ID}&classId=${MODS_CLASS_ID}`
    )
    return result.data
  }

  getDownloadUrl(url: string): string {
    return url
  }
}
