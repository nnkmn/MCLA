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
  VersionDownloadTask
} from '../types/download'

export const useDownloadStore = defineStore('download', () => {
  // ====== 搜索状态 ======
  const searchQuery = ref('')
  const searchSource = ref<ContentPlatform>('modrinth')
  const searchResults = ref<ModSearchResult[]>([])
  const searching = ref(false)
  const searchOffset = ref(0)
  const hasMore = ref(true)

  // ====== 搜索软缓存 ======
  /** 缓存结构: key -> { results, offset, hasMore, timestamp } */
  const searchCache = ref<
    Map<string, { results: ModSearchResult[]; offset: number; hasMore: boolean; timestamp: number }>
  >(new Map())
  const CACHE_TTL = 5 * 60 * 1000 // 5分钟过期

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
    activeDownloads.value.some((d) => d.status === 'downloading')
  )

  /** 总下载速度 */
  const totalSpeed = computed(() =>
    activeDownloads.value
      .filter((d) => d.status === 'downloading')
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
    Array.from(versionTasks.value.values()).some(
      (t) => t.phase !== 'completed' && t.phase !== 'failed' && t.phase !== 'idle'
    )
  )

  // ====== 操作 ======

  /** 开始下载 MC 版本（后台流式） */
  async function startVersionDownload(
    versionId: string,
    targetFolder: string,
    loader?: string,
    loaderVersion?: string
  ) {
    const api = window.electronAPI
    if (!api?.versions) return

    const task: VersionDownloadTask = {
      id: versionId,
      name: versionId,
      phase: 'resolving',
      progress: 5,
      phaseLabel: '解析版本清单...',
      speed: 0,
      downloadedSize: 0,
      totalSize: 0,
      targetFolder
    }
    versionTasks.value.set(versionId, task)
    showFloatPanel.value = true

    const res = await api.versions.downloadStart(versionId, targetFolder, loader, loaderVersion)
    if (!res?.ok) {
      task.phase = 'failed'
      task.error = res?.error ?? '未知错误'
      task.phaseLabel = `失败: ${task.error}`
    }
  }

  /** 更新版本下载进度（由事件监听器调用） */
  function updateVersionProgress(data: {
    taskId: string
    versionId: string
    phase: string
    phaseLabel: string
    progress: number
    downloaded: number
    total: number
    speed: number
    gameDir: string
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

  /** 下载服务端 Jar */
  async function downloadServerJar(versionId: string, savePath: string) {
    const api = window.electronAPI
    if (!api?.versions) return

    const task: VersionDownloadTask = {
      id: versionId + '-server',
      name: `服务端 ${versionId}`,
      phase: 'downloading',
      progress: 0,
      phaseLabel: '下载服务端...',
      speed: 0,
      downloadedSize: 0,
      totalSize: 0,
      targetFolder: savePath
    }
    versionTasks.value.set(task.id, task)
    showFloatPanel.value = true

    try {
      await api.versions.downloadServer(versionId, savePath)
      task.phase = 'completed'
      task.progress = 100
      task.phaseLabel = '下载完成'
    } catch (error: any) {
      task.phase = 'failed'
      task.error = error.message || '下载失败'
      task.phaseLabel = `失败: ${task.error}`
    }
  }

  /** 搜索 Mod */
  async function searchMods(params?: Partial<ModSearchParams>) {
    searching.value = true
    try {
      const srcVal = params?.source ?? searchSource.value
      const offset = params?.offset ?? 0
      const limit = params?.limit ?? 100
      const queryParams = {
        query: params?.query ?? searchQuery.value,
        platform:
          srcVal === 'curseforge' ? 'curseforge' : srcVal === 'modrinth' ? 'modrinth' : undefined,
        offset,
        limit,
        gameVersion: params?.gameVersion,
        loader: params?.loaderType,
        category: params?.category,
        projectType: params?.category
      }
      const response = await window.electronAPI?.download.searchMods(queryParams)
      const data = (response as any)?.data || []
      const mapped = data.map(mapRawToModResult)

      if (offset === 0) {
        searchResults.value = mapped
      } else {
        // 追加，跳过已存在的（双源可能有重复 id+source）
        const existingKeys = new Set(searchResults.value.map((m) => m.id + '|' + m.source))
        for (const item of mapped) {
          const key = item.id + '|' + item.source
          if (!existingKeys.has(key)) {
            searchResults.value.push(item)
            existingKeys.add(key)
          }
        }
      }

      // 判断是否还有更多：本次有返回数据就假设还有，返回为空才确定耗尽
      hasMore.value = data.length > 0

      // 重新按下载量排序
      searchResults.value.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))

      searchOffset.value = offset + data.length
    } catch (e: any) {
    } finally {
      searching.value = false
    }
  }

  /** 加载更多 */
  async function loadMore() {
    await searchMods({
      offset: searchOffset.value,
      source: searchSource.value
    })
  }

  /** 刷新下载队列 */
  async function refreshQueue() {
    try {
      const activeRes = await window.electronAPI?.download.getActive()
      const queueRes = await window.electronAPI?.download.getQueue()
      activeDownloads.value = ((activeRes as any)?.data || []).map(mapRawToTask)
      queuedDownloads.value = ((queueRes as any)?.data || []).map(mapRawToTask)
    } catch (e) {}
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
    hasMore,
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
    downloadServerJar,
    searchMods,
    loadMore,
    refreshQueue,
    cancelDownload,
    setSource,
    setSearchQuery
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
    loaders: raw.loaders || []
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
    createdAt: raw.created_at || new Date().toISOString()
  }
}
