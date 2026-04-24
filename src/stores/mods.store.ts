/**
 * Mods Store - Mod 列表与搜索状态
 * 管理本地已安装 Mod 的列表和操作
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LocalMod, LocalModStatus } from '../types/mod'

export const useModsStore = defineStore('mods', () => {
  // ====== 状态 ======
  const mods = ref<LocalMod[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentInstanceId = ref<string | null>(null)
  const searchQuery = ref('')
  const filterStatus = ref<LocalModStatus | 'all'>('all')

  // ====== 计算属性 ======

  /** 过滤后的 Mod 列表 */
  const filteredMods = computed(() => {
    let result = mods.value

    // 状态筛选
    if (filterStatus.value !== 'all') {
      result = result.filter(m => m.status === filterStatus.value)
    }

    // 搜索关键词
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.fileName.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q)
      )
    }

    return result
  })

  /** 统计信息 */
  const stats = computed(() => ({
    total: mods.value.length,
    active: mods.value.filter(m => m.status === 'active').length,
    disabled: mods.value.filter(m => m.status === 'disabled').length,
    incompatible: mods.value.filter(m => m.status === 'incompatible').length,
  }))

  // ====== 操作 ======

  /** 加载指定实例的 Mod 列表 */
  async function fetchMods(instanceId: string) {
    currentInstanceId.value = instanceId
    loading.value = true
    error.value = null
    try {
      // TODO: 通过 IPC 获取实例的 Mod 列表
      // 目前先留空，等 mod.service.ts 完成后对接
      mods.value = []
    } catch (e: any) {
      error.value = e.message || '加载 Mod 列表失败'
    } finally {
      loading.value = false
    }
  }

  /** 启用/禁用 Mod（切换状态） */
  async function toggleMod(modId: string) {
    const mod = mods.value.find(m => m.id === modId)
    if (!mod) return
    const newStatus: LocalModStatus = mod.status === 'active' ? 'disabled' : 'active'
    // TODO: IPC 调用更新 Mod 状态
    mod.status = newStatus
  }

  /** 删除 Mod */
  async function removeMod(modId: string) {
    // TODO: IPC 调用删除文件 + 更新数据库
    mods.value = mods.value.filter(m => m.id !== modId)
  }

  function setFilter(status: LocalModStatus | 'all') {
    filterStatus.value = status
  }

  function setSearch(q: string) {
    searchQuery.value = q
  }

  return {
    mods,
    loading,
    error,
    currentInstanceId,
    searchQuery,
    filterStatus,
    filteredMods,
    stats,
    fetchMods,
    toggleMod,
    removeMod,
    setFilter,
    setSearch,
  }
})
