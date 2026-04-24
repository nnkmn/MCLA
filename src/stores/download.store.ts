/**
 * Download Store - 下载管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ModSearchParams,
  ModSearchResult,
  DownloadTask,
  DownloadQueueState,
  ContentPlatform,
} from '../types/download'

export const useDownloadStore = defineStore('download', () => {
  // ====== 搜索状态 ======
  const searchQuery = ref('')
  const searchSource = ref<ContentPlatform>('modrinth')
  const searchResults = ref<ModSearchResult[]>([])
  const searching = ref(false)
  const searchOffset = ref(0)

  // ====== 下载队列状态 ======
  const activeDownloads = ref<DownloadTask[]>([])
  const queuedDownloads = ref<DownloadTask[]>([])
  const completedDownloads = ref<DownloadTask[]>([])

  // ====== 分类筛选 ======
  const activeCategory = ref<string>('vanilla')

  // ====== 计算属性 ======

  /** 是否有正在进行的下载 */
  const isDownloading = computed(() =>
    activeDownloads.value.some(d => d.status === 'downloading')
  )

  /** 总下载速度 */
  const totalSpeed = computed(() =>
    activeDownloads.value
      .filter(d => d.status === 'downloading')
      .reduce((sum, d) => sum + d.speed, 0)
  )

  /** 总进度 */
  const overallProgress = computed(() => {
    if (activeDownloads.value.length === 0) return 100
    const totalSize = activeDownloads.value.reduce((s, d) => s + d.totalSize, 0)
    const doneSize = activeDownloads.value.reduce((s, d) => s + d.downloadedSize, 0)
    return totalSize > 0 ? Math.round((doneSize / totalSize) * 100) : 0
  })

  // ====== 操作 ======

  /** 搜索 Mod */
  async function searchMods(params?: Partial<ModSearchParams>) {
    searching.value = true
    try {
      const queryParams: any = {
        query: params?.query ?? searchQuery.value,
        source: params?.source ?? searchSource.value,
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 20,
      }
      const response = await window.electronAPI?.download.searchMods(
        queryParams.query,
        queryParams.source,
        queryParams.offset
      )
      // API 返回 { success, data } 格式
      const data = (response as any)?.data || []
      searchResults.value = data.map(mapRawToModResult)
      searchOffset.value = queryParams.offset + (data.length || 0)
    } catch (e: any) {
      console.error('[DownloadStore] Search error:', e)
    } finally {
      searching.value = false
    }
  }

  /** 加载更多 */
  async function loadMore() {
    await searchMods({
      offset: searchOffset.value,
      source: searchSource.value,
    })
  }

  /** 刷新下载队列 */
  async function refreshQueue() {
    try {
      const activeRes = await window.electronAPI?.download.getActive()
      const queueRes = await window.electronAPI?.download.getQueue()
      activeDownloads.value = ((activeRes as any)?.data || []).map(mapRawToTask)
      queuedDownloads.value = ((queueRes as any)?.data || []).map(mapRawToTask)
    } catch (e) {
      console.error('[DownloadStore] Queue refresh error:', e)
    }
  }

  /** 取消下载 */
  async function cancelDownload(taskId: string) {
    await window.electronAPI?.download.cancelDownload(taskId)
    await refreshQueue()
  }

  /** 设置搜索源 */
  function setSource(source: ContentPlatform) {
    searchSource.value = source
    searchResults.value = []
    searchOffset.value = 0
  }

  function setSearchQuery(q: string) {
    searchQuery.value = q
  }

  return {
    // 状态
    searchQuery,
    searchSource,
    searchResults,
    searching,
    activeCategory,
    activeDownloads,
    queuedDownloads,
    completedDownloads,

    // 计算属性
    isDownloading,
    totalSpeed,
    overallProgress,

    // 操作
    searchMods,
    loadMore,
    refreshQueue,
    cancelDownload,
    setSource,
    setSearchQuery,
  }
})

// ====== 映射函数 ======

function mapRawToModResult(raw: any): ModSearchResult {
  return {
    id: String(raw.id),
    name: raw.title || raw.name || '',
    author: raw.author || '',
    description: raw.description || '',
    iconUrl: raw.icon_url || raw.logo?.url || '',
    downloads: raw.downloads ?? 0,
    follows: raw.follows ?? raw.likes ?? 0,
    source: raw.source || 'modrinth',
    categories: raw.categories || [],
    gameVersions: raw.game_versions || [],
    loaders: raw.loaders || [],
  }
}

function mapRawToTask(raw: any): DownloadTask {
  return {
    id: raw.id || '',
    fileName: raw.file_name || raw.fileName || '',
    url: raw.url || '',
    destination: raw.destination || '',
    status: raw.status || 'pending',
    progress: raw.progress ?? 0,
    speed: raw.speed ?? 0,
    downloadedSize: raw.downloaded_size ?? raw.downloadedSize ?? 0,
    totalSize: raw.total_size ?? raw.totalSize ?? 0,
    error: raw.error,
    createdAt: raw.created_at || new Date().toISOString(),
  }
}
