/**
 * Versions Store - Minecraft 版本管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface MCVersion {
  id: string
  name: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  releaseTime: string
  url?: string
}

export interface ModLoaderVersion {
  id: string
  name: string
  version: string
  stable: boolean
}

export const useVersionsStore = defineStore('versions', () => {
  // ====== 状态 ======
  const versions = ref<MCVersion[]>([])
  const currentVersionId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cacheTime = ref<number | null>(null)

  // ModLoader 版本
  const fabricVersions = ref<ModLoaderVersion[]>([])
  const forgeVersions = ref<ModLoaderVersion[]>([])

  // ====== 计算属性 ======

  /** 最新正式版 */
  const latestRelease = computed(() =>
    versions.value.find(v => v.type === 'release')
  )

  /** 版本选择列表（用于下拉框） */
  const versionOptions = computed(() =>
    versions.value.map(v => ({
      value: v.id,
      label: v.name,
      type: v.type,
    }))
  )

  /** 筛选正式版 */
  const releaseVersions = computed(() =>
    versions.value.filter(v => v.type === 'release')
  )

  // ====== 操作 ======

  /** 获取版本列表（带缓存） */
  async function fetchVersions(forceRefresh = false) {
    // 5分钟缓存
    if (!forceRefresh && cacheTime.value && Date.now() - cacheTime.value < 5 * 60 * 1000) {
      return versions.value
    }

    loading.value = true
    error.value = null
    try {
      const data = await window.electronAPI?.versions?.list()
      versions.value = (data || []).map((v: any) => ({
        id: v.id,
        name: v.id,
        type: v.type,
        releaseTime: v.releaseTime,
        url: v.url,
      }))
      cacheTime.value = Date.now()
      return versions.value
    } catch (e: any) {
      error.value = e.message || '获取版本列表失败'
      return []
    } finally {
      loading.value = false
    }
  }

  /** 获取 ModLoader 版本列表 */
  async function fetchModLoaderVersions(mcVersion: string) {
    loading.value = true
    try {
      // Fabric
      const fabricRes = await window.electronAPI?.game.getFabricVersions(mcVersion)
      fabricVersions.value = ((fabricRes as any)?.data || []).map((v: any) => ({
        id: v.version,
        name: `Fabric ${v.version}`,
        version: v.version,
        stable: v.stable !== false,
      }))

      // Forge
      const forgeRes = await window.electronAPI?.game.getForgeVersions?.(mcVersion)
      forgeVersions.value = ((forgeRes as any)?.data || []).map((v: any) => ({
        id: v.version,
        name: `Forge ${v.version}`,
        version: v.version,
        stable: true,
      }))
    } catch (e: any) {
    } finally {
      loading.value = false
    }
  }

  /** 根据版本 ID 获取详细信息 */
  function getVersionById(id: string): MCVersion | undefined {
    return versions.value.find(v => v.id === id)
  }

  /** 清除缓存 */
  function clearCache() {
    versions.value = []
    cacheTime.value = null
  }

  /** 设置当前选中的版本 ID */
  function setCurrentVersion(id: string | null) {
    currentVersionId.value = id
  }

  return {
    // 状态
    versions,
    currentVersionId,
    loading,
    error,
    fabricVersions,
    forgeVersions,

    // 计算属性
    latestRelease,
    versionOptions,
    releaseVersions,

    // 操作
    fetchVersions,
    fetchModLoaderVersions,
    getVersionById,
    clearCache,
    setCurrentVersion,
  }
})
