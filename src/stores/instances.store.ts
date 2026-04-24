/**
 * Instances Store - 游戏实例管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameInstance, CreateInstanceParams, LoaderType } from '../types/instance'

export const useInstancesStore = defineStore('instances', () => {
  // ====== 状态 ======
  const instances = ref<GameInstance[]>([])
  const currentInstanceId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ====== 计算属性 ======

  /** 当前选中的实例 */
  const currentInstance = computed(() =>
    instances.value.find(i => i.id === currentInstanceId.value) ?? null
  )

  /** 最近游玩的实例（按 lastPlayed 排序） */
  const recentInstances = computed(() =>
    [...instances.value]
      .filter(i => i.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
      .slice(0, 5)
  )

  /** 收藏的实例 */
  const favoritedInstances = computed(() =>
    instances.value.filter(i => i.isFavorited === 1)
  )

  // ====== 操作 ======

  /** 从主进程加载实例列表 */
  async function fetchInstances() {
    loading.value = true
    error.value = null
    try {
      const rawList = await window.electronAPI?.instance.list()
      // 映射 snake_case -> camelCase
      instances.value = (rawList || []).map(mapRawToInstance)
    } catch (e: any) {
      error.value = e.message || '加载实例失败'
    } finally {
      loading.value = false
    }
  }

  /** 创建新实例 */
  async function createInstance(params: CreateInstanceParams) {
    const result = await window.electronAPI?.instance.create(params as any)
    if (result) {
      instances.value.unshift(mapRawToInstance(result))
      return result
    }
    return null
  }

  /** 更新实例 */
  async function updateInstance(id: string, data: Partial<GameInstance>) {
    await window.electronAPI?.instance.update(id, data as any)
    await fetchInstances() // 刷新列表
  }

  /** 删除实例 */
  async function deleteInstance(id: string) {
    await window.electronAPI?.instance.delete(id)
    instances.value = instances.value.filter(i => i.id !== id)
    if (currentInstanceId.value === id) {
      currentInstanceId.value = null
    }
  }

  /** 选择实例 */
  function selectInstance(id: string | null) {
    currentInstanceId.value = id
  }

  /** 切换收藏状态 */
  async function toggleFavorite(id: string) {
    const inst = instances.value.find(i => i.id === id)
    if (inst) {
      await updateInstance(id, { isFavorited: inst.isFavorited ? 0 : 1 })
    }
  }

  return {
    instances,
    currentInstanceId,
    loading,
    error,
    currentInstance,
    recentInstances,
    favoritedInstances,
    fetchInstances,
    createInstance,
    updateInstance,
    deleteInstance,
    selectInstance,
    toggleFavorite,
  }
})

// ====== 工具函数 ======

/** 主进程返回的 snake_case 数据转前端 camelCase */
function mapRawToInstance(raw: any): GameInstance {
  return {
    id: raw.id,
    name: raw.name,
    path: raw.path,
    mcVersion: raw.mc_version,
    loaderType: raw.loader_type || 'vanilla',
    loaderVersion: raw.loader_version || '',
    icon: raw.icon || '',
    javaPath: raw.java_path || '',
    jvmArgs: raw.jvm_args || '',
    minMemory: raw.min_memory || 1024,
    maxMemory: raw.max_memory || 4096,
    width: raw.width || 854,
    height: raw.height || 480,
    fullscreen: raw.fullscreen || 0,
    isFavorited: raw.is_favorited || 0,
    lastPlayed: raw.last_played || null,
    playTime: raw.play_time || 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
