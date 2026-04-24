export interface VersionInfo {
  id: string
  type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta'
  releaseTime: string
  url: string
}

export interface ModLoader {
  id: string
  name: string
  version: string
  downloadUrl: string
  installCommand: string
  requiresJava: boolean
}

export interface InstanceVersion {
  minecraft: string
  modloader?: string
  fabric?: string
  forge?: string
  neoforge?: string
}

export interface VersionManifest {
  latest: {
    release: string
    snapshot: string
  }
  versions: VersionInfo[]
}