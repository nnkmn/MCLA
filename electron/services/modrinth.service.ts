const MR_BASE = 'https://api.modrinth.com/v2'

export interface ModrinthSearchParams {
  query?: string
  limit?: number
  offset?: number
  facets?: string[][]
  index?: string
}

export interface ModrinthProject {
  id: string
  slug: string
  title: string
  description: string
  categories: string[]
  client_side: string
  server_side: string
  game_versions: string[]
  loaders: string[]
  icon_url: string | null
  downloads: number
  team: string
  project_type: string
}

export interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  version_type: 'release' | 'beta' | 'alpha'
  loaders: string[]
  game_versions: string[]
  downloads: number
  date_published: string
  files: {
    url: string
    filename: string
    primary: boolean
    size: number
  }[]
}

export interface ModrinthCategory {
  name: string
  project_type: string
}

export interface ModrinthLoader {
  name: string
}

export class ModrinthService {
  private userAgent: string

  constructor(userAgent: string = 'MCLA-Launcher/1.0') {
    this.userAgent = userAgent
  }

  setUserAgent(ua: string): void {
    this.userAgent = ua
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    })
    if (!resp.ok) {
      throw new Error(`Modrinth API error ${resp.status}: ${resp.statusText}`)
    }
    return resp.json() as Promise<T>
  }

  async searchProjects(params: ModrinthSearchParams): Promise<{ hits: ModrinthProject[] }> {
    const qs = new URLSearchParams({
      limit: String(params.limit || 20),
      offset: String(params.offset || 0)
    })
    if (params.query) qs.set('query', params.query)
    if (params.index) qs.set('index', params.index)
    if (params.facets && params.facets.length > 0) {
      qs.set('facets', JSON.stringify(params.facets))
    }
    return this.fetchJson<{ hits: ModrinthProject[] }>(`${MR_BASE}/search?${qs}`)
  }

  async getProject(projectId: string): Promise<ModrinthProject> {
    return this.fetchJson<ModrinthProject>(`${MR_BASE}/project/${projectId}`)
  }

  async getProjectVersions(
    projectId: string,
    options: { game_versions?: string[]; loaders?: string[] } = {}
  ): Promise<ModrinthVersion[]> {
    const qs = new URLSearchParams()
    if (options.game_versions?.length) qs.set('game_versions', JSON.stringify(options.game_versions))
    if (options.loaders?.length) qs.set('loaders', JSON.stringify(options.loaders))
    const query = qs.toString() ? `?${qs}` : ''
    return this.fetchJson<ModrinthVersion[]>(`${MR_BASE}/project/${projectId}/version${query}`)
  }

  async getCategories(): Promise<ModrinthCategory[]> {
    return this.fetchJson<ModrinthCategory[]>(`${MR_BASE}/tag/category`)
  }

  async getLoaders(): Promise<ModrinthLoader[]> {
    return this.fetchJson<ModrinthLoader[]>(`${MR_BASE}/tag/loader`)
  }

  getDownloadUrl(url: string): string {
    return url
  }
}
