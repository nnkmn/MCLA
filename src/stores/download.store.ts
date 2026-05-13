/**
 * Download Store - 下载管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ModSearchParams,
  ModSearchResult,
  DownloadTask,
  ContentPlatform,
  VersionDownloadTask,
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

  // ====== MC 版本下载任务 ======
  const versionTasks = ref<Map<string, VersionDownloadTask>>(new Map())
  /** 是否显示后台悬浮窗 */
  const showFloatPanel = ref(false)
  /** 下载管理器页面是否打开 */
  const showDownloadManager = ref(false)

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

  /** 是否有任何活跃版本下载 */
  const hasActiveVersionDownload = computed(() =>
    Array.from(versionTasks.value.values()).some(t =>
      t.phase !== 'completed' && t.phase !== 'failed' && t.phase !== 'idle'
    )
  )

  // ====== 操作 ======

  /** 开始下载 MC 版本（后台流式） */
  async function startVersionDownload(versionId: string, targetFolder: string) {
    const api = window.electronAPI
    if (!api?.versions) return

    const task: VersionDownloadTask = {
      id: versionId, name: versionId,
      phase: 'resolving', progress: 5,
      phaseLabel: '解析版本清单...', speed: 0,
      downloadedSize: 0, totalSize: 0, targetFolder,
    }
    versionTasks.value.set(versionId, task)
    showFloatPanel.value = true

    const res = await api.versions.downloadStart(versionId, targetFolder)
    if (!res?.ok) {
      task.phase = 'failed'
      task.error = res?.error ?? '未知错误'
      task.phaseLabel = `失败: ${task.error}`
    }
  }

  /** 更新版本下载进度（由事件监听器调用） */
  function updateVersionProgress(data: {
    taskId: string; versionId: string; phase: string; phaseLabel: string
    progress: number; downloaded: number; total: number; speed: number; gameDir: string
  }) {
    const task = versionTasks.value.get(data.versionId)
    if (!task) return
    ;(task as any).phase = data.phase
    task.phaseLabel = data.phaseLabel
    task.progress = data.progress
    task.downloadedSize = data.downloaded
    task.totalSize = data.total
    task.speed = data.speed
  }

  /** 版本下载完成 */
  function onVersionComplete(data: { taskId: string; versionId: string; gameDir: string }) {
    const task = versionTasks.value.get(data.versionId)
    if (task) {
      task.phase = 'completed'
      task.progress = 100
      task.phaseLabel = '下载完成'
    }
  }

  /** 版本下载失败 */
  function onVersionError(data: { taskId: string; versionId: string; error: string }) {
    const task = versionTasks.value.get(data.versionId)
    if (task) {
      task.phase = 'failed'
      task.error = data.error
      task.phaseLabel = `失败: ${data.error}`
    }
  }

  /** 移除版本下载任务 */
  function removeVersionTask(versionId: string) {
    versionTasks.value.delete(versionId)
    if (versionTasks.value.size === 0) showFloatPanel.value = false
  }

  /** 搜索 Mod */
  async function searchMods(params?: Partial<ModSearchParams>) {
    searching.value = true
    try {
      const queryParams = {
        query: params?.query ?? searchQuery.value,
        source: params?.source ?? searchSource.value,
        offset: params?.offset ?? 0,
        limit: params?.limit ?? 20,
        gameVersion: params?.gameVersion,
        loader: params?.loaderType,
        category: params?.category,
        projectType: params?.category,
      }
      const response = await window.electronAPI?.download.searchMods(queryParams)
      const data = (response as any)?.data || []
      searchResults.value = data.map(mapRawToModResult)
      searchOffset.value = (params?.offset ?? 0) + (data.length || 0)
    } catch (e: any) {
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
    versionTasks,
    showFloatPanel,
    showDownloadManager,

    // 计算属性
    isDownloading,
    totalSpeed,
    overallProgress,
    hasActiveVersionDownload,

    // 操作
    startVersionDownload,
    updateVersionProgress,
    onVersionComplete,
    onVersionError,
    removeVersionTask,
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
    name: raw.name || raw.title || '',
    author: raw.author || '',
    description: raw.description || '',
    iconUrl: raw.iconUrl || raw.icon_url || raw.logo?.url || '',
    downloads: raw.downloads ?? 0,
    follows: raw.follows ?? raw.likes ?? 0,
    source: raw.platform === 'curseforge' ? 'curseforge' : 'modrinth',
    categories: raw.categories || [],
    gameVersions: raw.gameVersions || raw.game_versions || [],
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
