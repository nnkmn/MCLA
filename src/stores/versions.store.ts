/**
 * Versions Store - Minecraft 版本管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** 本地存储缓存 Key（版本列表持久化，离线可用） */
const CACHE_KEY = 'mcla_versions_cache'
/** 前端缓存过期时间（10 分钟） */
const CACHE_TTL = 10 * 60 * 1000

/** 从 electron 侧返回的版本数据结构 */
interface McVersionInfo {
  id: string
  type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta'
  releaseTime: string
  url: string
  time?: string
}

/** 前端 Store 使用的版本对象 */
export interface MCVersion {
  id: string
  name: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  releaseTime: string
  url?: string
}

/** Mod Loader 版本 */
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
  const latestRelease = computed(() => versions.value.find((v) => v.type === 'release'))

  /** 版本选择列表（用于下拉框） */
  const versionOptions = computed(() =>
    versions.value.map((v) => ({
      value: v.id,
      label: v.name,
      type: v.type
    }))
  )

  /** 筛选正式版 */
  const releaseVersions = computed(() => versions.value.filter((v) => v.type === 'release'))

  // ====== 操作 ======

  /** 获取版本列表（双层缓存：前端 localStorage + 主进程内存/DB 缓存） */
  async function fetchVersions(forceRefresh = false) {
    // 1. 尝试前端持久化缓存（离线 / 弱网络场景）
    if (!forceRefresh) {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as { data: MCVersion[]; timestamp: number }
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            versions.value = parsed.data
            cacheTime.value = parsed.timestamp
            return parsed.data
          }
        }
      } catch {
        // 解析失败，忽略
      }
    }

    // 2. 通过 ipc 向主进程请求（主进程本身也有内存 + DB + 网络三级缓存）
    loading.value = true
    error.value = null
    try {
      const data = (await window.electronAPI?.versions?.list()) as McVersionInfo[] | undefined
      versions.value = (data || []).map((v) => ({
        id: v.id,
        name: v.id,
        type: v.type,
        releaseTime: v.releaseTime,
        url: v.url
      }))
      cacheTime.value = Date.now()

      // 3. 写入前端持久化缓存（下次进入页面即使离线也有数据）
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: versions.value, timestamp: cacheTime.value })
        )
      } catch {
        // 忽略（例如隐私模式 / 配额超限）
      }

      return versions.value
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '获取版本列表失败'
      error.value = message
      return []
    } finally {
      loading.value = false
    }
  }

  /** 获取 ModLoader 版本列表（当前仅做类型收紧，缓存可后续按需加入） */
  async function fetchModLoaderVersions(mcVersion: string) {
    loading.value = true
    try {
      const loaders = (await window.electronAPI?.modloader?.getLoaders?.(mcVersion)) as
        | {
            fabric?: Array<{ id?: string; version: string; stable?: boolean }>
            forge?: Array<{ id?: string; version: string; stable?: boolean }>
          }
        | undefined

      if (loaders) {
        fabricVersions.value = (loaders.fabric || []).map((v) => ({
          id: v.id || v.version,
          name: `Fabric ${v.version}`,
          version: v.version,
          stable: v.stable !== false
        }))

        forgeVersions.value = (loaders.forge || []).map((v) => ({
          id: v.id || v.version,
          name: `Forge ${v.version}`,
          version: v.version,
          stable: true
        }))
      }
    } catch {
      // 静默处理（Mod Loader 列表非核心功能）
    } finally {
      loading.value = false
    }
  }

  /** 根据版本 ID 获取详细信息 */
  function getVersionById(id: string): MCVersion | undefined {
    return versions.value.find((v) => v.id === id)
  }

  /** 清除缓存（包括前端 localStorage + Pinia 状态） */
  function clearCache() {
    versions.value = []
    cacheTime.value = null
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      // 忽略
    }
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
    setCurrentVersion
  }
})
