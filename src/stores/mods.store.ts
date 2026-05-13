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
      // 处理 fileName 可选性，确保搜索时包含 fileName 也包含 displayName
      result = result.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        (m.fileName?.toLowerCase() || '').includes(q) ||
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
  async function fetchMods(gameDir: string) {
    loading.value = true
    error.value = null
    try {
      const res = await window.electronAPI?.mod?.list(gameDir)
      if (res?.ok && Array.isArray(res.data)) {
        mods.value = res.data.map((m: any, idx: number) => ({
          id: m.filePath || `mod_${idx}`,
          fileName: m.fileName || m.name || '',
          displayName: m.name || m.fileName || 'Unknown',
          version: m.version || '',
          description: m.description || '',
          author: m.author || '',
          instanceId: currentInstanceId.value || '',
          status: m.disabled ? 'disabled' as LocalModStatus : 'active' as LocalModStatus,
          filePath: m.filePath || '',
          fileSize: m.fileSize || 0,
          dependencies: m.dependencies || [],
          dependsOn: m.dependsOn || [],
          installedAt: m.installedAt || '',
        }))
      } else {
        mods.value = []
      }
    } catch (e: any) {
      error.value = e.message || '加载 Mod 列表失败'
    } finally {
      loading.value = false
    }
  }

  /** 启用/禁用 Mod（切换状态） */
  async function toggleMod(modId: string) {
    const mod = mods.value.find(m => m.id === modId)
    if (!mod || !mod.filePath) return
    const newStatus: LocalModStatus = mod.status === 'active' ? 'disabled' : 'active'
    try {
      if (newStatus === 'disabled') {
        await window.electronAPI?.mod?.disable(mod.filePath)
      } else {
        await window.electronAPI?.mod?.enable(mod.filePath)
      }
      mod.status = newStatus
    } catch (e: any) {
      error.value = e.message || '操作失败'
    }
  }

  /** 删除 Mod */
  async function removeMod(modId: string) {
    const mod = mods.value.find(m => m.id === modId)
    if (!mod || !mod.filePath) return
    try {
      await window.electronAPI?.mod?.uninstall(mod.filePath)
      mods.value = mods.value.filter(m => m.id !== modId)
    } catch (e: any) {
      error.value = e.message || '删除失败'
    }
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
