<template>
  <div class="mod-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="page-loading">
      <div class="spin-lg"></div>
      <span>正在加载...</span>
    </div>

    <!-- 错误 -->
    <div v-else-if="loadError" class="page-error">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        opacity="0.3"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>加载失败</p>
      <button class="btn-retry" @click="loadAll">重试</button>
    </div>

    <!-- 内容 -->
    <div v-else-if="detail" class="page-content">
      <!-- 左：基本信息 -->
      <aside class="info-sidebar">
        <!-- 封面 + 名字 -->
        <div class="mod-hero">
          <div class="mod-icon">
            <img v-if="detail.iconUrl" :src="detail.iconUrl" :alt="detail.name" />
            <div v-else class="icon-placeholder" :style="{ background: platformColor }">
              {{ detail.name[0] }}
            </div>
          </div>
          <div class="mod-title-area">
            <h1 class="mod-name">{{ detail.name }}</h1>
            <span class="source-badge" :class="detail.source">
              {{ detail.source === 'curseforge' ? 'CurseForge' : 'Modrinth' }}
            </span>
          </div>
        </div>

        <!-- 描述 -->
        <p class="mod-desc">{{ detail.description || '暂无描述' }}</p>

        <!-- 统计信息 -->
        <div class="mod-stats">
          <div class="stat-item">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>{{ formatNum(detail.downloads) }} 下载</span>
          </div>
          <div class="stat-item" v-if="detail.follows">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
              />
            </svg>
            <span>{{ formatNum(detail.follows) }} 关注</span>
          </div>
          <div class="stat-item" v-if="lastUpdateTime">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{{ lastUpdateTime }}</span>
          </div>
        </div>

        <!-- 分类标签 -->
        <div class="mod-tags" v-if="detail.categories?.length">
          <span v-for="tag in detail.categories.slice(0, 8)" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <!-- 加载器 -->
        <div class="loader-row" v-if="detail.loaders?.length">
          <span class="loader-label">加载器</span>
          <span v-for="l in detail.loaders" :key="l" class="loader-chip">{{ l }}</span>
        </div>

        <!-- 目标实例 -->
        <div class="target-instance" :class="{ 'no-target': !currentInstance }">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span v-if="currentInstance">安装到：{{ currentInstance.name }}</span>
          <span v-else>未选择实例</span>
        </div>

        <!-- 操作按钮 -->
        <div class="sidebar-actions">
          <button
            class="btn-ext"
            :class="{ primary: detail.source === 'modrinth' }"
            @click="openInBrowser('modrinth')"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            转到 Modrinth
          </button>
          <button
            class="btn-ext"
            :class="{ primary: detail.source === 'curseforge' }"
            @click="openInBrowser('curseforge')"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            转到 CurseForge
          </button>
          <button class="btn-ext primary" @click="openMcWiki">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            转到 MC 百科
          </button>
        </div>
      </aside>

      <!-- 右：文件列表 -->
      <main class="files-main">
        <!-- MC版本标签过滤 -->
        <div class="version-filter" v-if="mcVersions.length">
          <button
            class="vf-tab"
            :class="{ active: !selectedMcVersion }"
            @click="selectedMcVersion = ''"
          >
            全部
          </button>
          <button
            v-for="v in mcVersions"
            :key="v"
            class="vf-tab"
            :class="{ active: selectedMcVersion === v }"
            @click="selectedMcVersion = v"
          >
            {{ v }}
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="filesLoading" class="files-loading">
          <div class="spin-sm"></div>
          <span>加载文件列表...</span>
        </div>

        <!-- 空 -->
        <div v-else-if="!Object.keys(groupedFiles).length" class="files-empty">暂无可用文件</div>

        <!-- 分组版本列表 -->
        <div v-else class="versions-list">
          <div v-for="(group, mcVersion) in groupedFiles" :key="mcVersion" class="version-group">
            <button
              class="group-header"
              :class="{ expanded: expandedVersions.includes(String(mcVersion)) }"
              @click="toggleVersion(String(mcVersion))"
            >
              <span class="group-version">{{ mcVersion }}</span>
              <span class="group-count">{{ group.length }} 个文件</span>
              <svg
                class="group-arrow"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div v-if="expandedVersions.includes(String(mcVersion))" class="group-files">
              <div v-for="file in group" :key="file.id" class="file-row">
                <div class="file-info">
                  <span class="file-name">{{ file.displayName || file.filename }}</span>
                  <span class="file-meta">
                    <span>{{ formatSize(file.size) }}</span>
                    <span>{{ formatDate(file.datePublished) }}</span>
                    <span>{{ formatNum(file.downloads) }} 下载</span>
                  </span>
                </div>
                <div class="file-loaders">
                  <span v-for="loader in file.loaders" :key="loader" class="loader-tag">{{
                    loader
                  }}</span>
                </div>
                <button
                  class="btn-download"
                  :disabled="downloadingId === file.id"
                  @click="downloadFile(file)"
                >
                  <svg
                    v-if="downloadingId === file.id"
                    class="spin-sm"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  <svg
                    v-else
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  {{ downloadingId === file.id ? '下载中' : '下载' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 安装确认弹窗 -->
    <Teleport to="body">
      <div
        v-if="showInstallConfirm && pendingFile"
        class="confirm-overlay"
        @click.self="showInstallConfirm = false"
      >
        <div class="confirm-panel">
          <div class="confirm-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mcla-blue)"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>{{ currentInstance ? '确认安装' : '确认下载' }}</span>
          </div>
          <div class="confirm-body">
            <p class="confirm-mod-name">{{ pendingFile.displayName || pendingFile.filename }}</p>
            <p class="confirm-target">
              <template v-if="currentInstance">
                安装到实例 <strong>{{ currentInstance.name }}</strong>
              </template>
              <template v-else>
                下载到 <strong>{{ customDest }}</strong>
              </template>
            </p>
          </div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="cancelInstallConfirm">
              取消
            </button>
            <button class="btn-confirm" @click="confirmDownload">
              {{ currentInstance ? '确认安装' : '确认下载' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useInstancesStore } from '../stores/instances.store'
import { useDownloadStore } from '../stores/download.store'
import type { ModSearchResult, ProjectFile } from '../types/download'
import { formatNumber } from '../utils/format'

const route = useRoute()
const instancesStore = useInstancesStore()
const dlStore = useDownloadStore()

// ====== 页面状态 ======
const loading = ref(false)
const loadError = ref(false)
const filesLoading = ref(false)
const detail = ref<ModSearchResult | null>(null)
const files = ref<ProjectFile[]>([])
const selectedMcVersion = ref('')
const expandedVersions = ref<string[]>([])
const downloadingId = ref<string | null>(null)
const showInstallConfirm = ref(false)
const pendingFile = ref<ProjectFile | null>(null)
const customDest = ref<string | null>(null)

function cancelInstallConfirm() {
  showInstallConfirm.value = false
  pendingFile.value = null
  customDest.value = null
}

// ====== 路由参数 ======
const modId = computed(() => route.params.id as string)
const modSource = computed(() => (route.query.source as string) || 'modrinth')

// ====== 来源色 ======
const platformColor = computed(() => (modSource.value === 'curseforge' ? '#f16436' : '#1bd96a'))

// ====== 当前实例 ======
const currentInstance = computed(() => instancesStore.currentInstance)

const selectedTarget = computed(() => {
  if (!currentInstance.value) return null
  return `${currentInstance.value.path}/mods/`
})

// ====== 版本处理 ======
function isSnapshotVersion(v: string): boolean {
  return (
    v.includes('w') || v.toLowerCase().includes('snapshot') || v.includes('pre') || v.includes('rc')
  )
}

const mcVersions = computed(() => {
  const versions = new Set<string>()
  let hasSnapshot = false
  files.value.forEach((file) => {
    file.gameVersions.forEach((v) => {
      const base = v.split('-')[0]
      if (isSnapshotVersion(base)) {
        hasSnapshot = true
      } else {
        versions.add(base.split('.').slice(0, 2).join('.'))
      }
    })
  })
  const sorted = Array.from(versions).sort((a, b) => {
    const ap = a.split('.').map(Number)
    const bp = b.split('.').map(Number)
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      if ((ap[i] || 0) !== (bp[i] || 0)) return (bp[i] || 0) - (ap[i] || 0)
    }
    return 0
  })
  if (hasSnapshot) sorted.push('快照版')
  return sorted
})

const filteredFiles = computed(() =>
  [...files.value].sort(
    (a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime()
  )
)

const versionFilteredFiles = computed(() => {
  if (!selectedMcVersion.value) return filteredFiles.value
  if (selectedMcVersion.value === '快照版') {
    return filteredFiles.value.filter((f) =>
      f.gameVersions.some((v) => isSnapshotVersion(v.split('-')[0]))
    )
  }
  return filteredFiles.value.filter((f) =>
    f.gameVersions.some((v) => v.startsWith(selectedMcVersion.value))
  )
})

const groupedFiles = computed(() => {
  const groups: Record<string, ProjectFile[]> = {}
  versionFilteredFiles.value.forEach((file) => {
    file.gameVersions.forEach((mcVersion) => {
      if (!groups[mcVersion]) groups[mcVersion] = []
      if (!groups[mcVersion].find((f) => f.id === file.id)) groups[mcVersion].push(file)
    })
  })
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ap = a.split('.').map(Number)
    const bp = b.split('.').map(Number)
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      if ((ap[i] || 0) !== (bp[i] || 0)) return (bp[i] || 0) - (ap[i] || 0)
    }
    return 0
  })
  const result: Record<string, ProjectFile[]> = {}
  sortedKeys.forEach((k) => {
    result[k] = groups[k]
  })
  return result
})

const lastUpdateTime = computed(() => {
  if (!files.value.length) return ''
  const latest = files.value.reduce((prev, curr) =>
    new Date(curr.datePublished).getTime() > new Date(prev.datePublished).getTime() ? curr : prev
  )
  const diff = Date.now() - new Date(latest.datePublished).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天更新'
  if (days === 1) return '1 天前'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
})

// ====== 加载 ======
async function loadAll() {
  loading.value = true
  loadError.value = false
  detail.value = null
  files.value = []

  try {
    // 先从 store 的搜索结果里找
    const cached = dlStore.searchResults.find((m) => m.id === modId.value)
    if (cached) {
      detail.value = { ...cached }
    } else {
      // 没缓存则构建最简 detail，等文件加载完
      detail.value = {
        id: modId.value,
        name: modId.value,
        author: '',
        description: '',
        iconUrl: '',
        downloads: 0,
        follows: 0,
        source: modSource.value as any,
        categories: [],
        gameVersions: [],
        loaders: []
      }
    }
    loading.value = false
    await loadFiles()
  } catch (e) {
    loadError.value = true
    loading.value = false
  }
}

async function loadFiles() {
  if (!modId.value) return
  filesLoading.value = true
  try {
    const res = await window.electronAPI?.download.getFiles(modId.value, modSource.value as any, {})
    const data = (res as any)?.data || []
    files.value = data.map((f: any) => ({
      id: String(f.id),
      filename: f.fileName || f.filename || '',
      displayName: f.displayName || f.fileName || f.filename || '',
      size: f.size ?? 0,
      downloadUrl: f.downloadUrl || f.url || '',
      gameVersions: f.gameVersions || f.gameVersion || [],
      loaders: f.loaders || [],
      releaseType: (f.releaseType || f.release_type || 'release') as 'release' | 'beta' | 'alpha',
      datePublished: f.datePublished || f.date_published || f.date || '',
      downloads: f.downloads ?? 0
    })) as ProjectFile[]

    // 自动展开最新的 MC 版本分组
    const keys = Object.keys(groupedFiles.value)
    if (keys.length > 0) {
      expandedVersions.value = [keys[0]]
    }
  } catch (e) {
    files.value = []
  } finally {
    filesLoading.value = false
  }
}

function toggleVersion(v: string) {
  const idx = expandedVersions.value.indexOf(v)
  if (idx > -1) expandedVersions.value.splice(idx, 1)
  else expandedVersions.value.push(v)
}

// ====== 下载 ======
async function downloadFile(file: ProjectFile) {
  pendingFile.value = file

  if (!selectedTarget.value) {
    // 未选实例，让用户自选下载路径
    const folder = await window.electronAPI?.dialog.selectFolder()
    if (!folder) {
      pendingFile.value = null
      return
    }
    customDest.value = folder
  } else {
    customDest.value = null
  }

  showInstallConfirm.value = true
}

async function confirmDownload() {
  const file = pendingFile.value
  if (!file) return
  showInstallConfirm.value = false

  const dest = customDest.value
    ? `${customDest.value}\\${file.filename || file.displayName}`
    : `${selectedTarget.value}${file.filename || file.displayName}`

  downloadingId.value = file.id
  try {
    // Vue 响应式 Proxy 无法被 IPC structured clone，先解包成纯对象
    const payload = JSON.parse(
      JSON.stringify({
        id: file.id,
        fileName: file.filename || file.displayName,
        url: file.downloadUrl,
        gameVersions: file.gameVersions,
        loaders: file.loaders,
        releaseType: file.releaseType,
        datePublished: file.datePublished,
        size: file.size,
        downloads: file.downloads,
        platform: modSource.value
      })
    )
    const res = await window.electronAPI?.download.downloadFile(payload, dest)
    if ((res as any)?.success) {
      await dlStore.refreshQueue()
    } else {
      window.electronAPI?.notification?.send({
        title: '错误',
        body: '下载失败：' + ((res as any)?.error || '未知错误'),
        type: 'error'
      })
    }
  } catch (e: any) {
    window.electronAPI?.notification?.send({
      title: '错误',
      body: '下载出错：' + (e.message || '未知错误'),
      type: 'error'
    })
  } finally {
    downloadingId.value = null
    pendingFile.value = null
    customDest.value = null
  }
}

// ====== 工具 ======
function openInBrowser(platform: string) {
  if (!detail.value) return
  const url =
    platform === 'curseforge'
      ? `https://www.curseforge.com/minecraft/mc-mods/${detail.value.id}`
      : `https://modrinth.com/mod/${detail.value.id}`
  window.electronAPI?.shell?.openExternal(url)
}

function openMcWiki() {
  if (!detail.value) return
  const name = encodeURIComponent(detail.value.name)
  window.electronAPI?.shell?.openExternal(`https://www.mcmod.cn/class/search.html?key=${name}`)
}

function formatNum(n: number | undefined): string {
  return formatNumber(n ?? 0)
}

function formatSize(bytes: number): string {
  if (!bytes) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(2) + ' GB'
}

function formatDate(d: string): string {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  } catch {
    return d
  }
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped lang="scss">
.mod-detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--mcla-bg, #0f0f17);
}

/* ====== 加载 / 错误 ====== */
.page-loading,
.page-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--mcla-text-muted, #6c7086);
  font-size: 13px;
}

.btn-retry {
  padding: 6px 20px;
  border: 1px solid var(--mcla-border-color, #45475a);
  border-radius: 6px;
  background: transparent;
  color: var(--mcla-text-secondary, #a6adc8);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.12s;
  &:hover {
    border-color: var(--mcla-blue, #6366f1);
    color: var(--mcla-blue, #6366f1);
  }
}

/* ====== 主体布局 ====== */
.page-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  gap: 0;
}

/* ====== 左侧信息栏 ====== */
.info-sidebar {
  width: 260px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 20px 16px;
  border-right: 1px solid var(--mcla-border-color, #313244);
  display: flex;
  flex-direction: column;
  gap: 14px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.07);
    border-radius: 2px;
  }
}

.mod-hero {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.mod-icon {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--mcla-bg-secondary, #181825);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .icon-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
  }
}

.mod-title-area {
  flex: 1;
  min-width: 0;
}

.mod-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--mcla-text-primary, #cdd6f4);
  word-break: break-word;
  line-height: 1.3;
}

.source-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;

  &.modrinth {
    background: rgba(27, 217, 106, 0.12);
    color: #1bd96a;
    border: 1px solid rgba(27, 217, 106, 0.25);
  }
  &.curseforge {
    background: rgba(241, 100, 54, 0.12);
    color: #f16436;
    border: 1px solid rgba(241, 100, 54, 0.25);
  }
}

.mod-desc {
  margin: 0;
  font-size: 12px;
  color: var(--mcla-text-secondary, #a6adc8);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-stats {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mcla-text-secondary, #a6adc8);

  svg {
    color: var(--mcla-text-muted, #6c7086);
    flex-shrink: 0;
  }
}

.mod-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 500;
  background: var(--mcla-bg-secondary, #181825);
  color: var(--mcla-text-secondary, #a6adc8);
  border-radius: 4px;
  border: 1px solid var(--mcla-border-color, #313244);
}

.loader-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.loader-label {
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);
  flex-shrink: 0;
}

.loader-chip {
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.1);
  color: var(--mcla-blue, #6366f1);
  border-radius: 4px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.target-instance {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--mcla-text-secondary, #a6adc8);
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);

  svg {
    color: var(--mcla-blue, #6366f1);
    flex-shrink: 0;
  }

  &.no-target {
    background: rgba(255, 193, 7, 0.06);
    border-color: rgba(255, 193, 7, 0.2);
    color: #ffc107;

    svg {
      color: #ffc107;
    }
  }
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--mcla-border-color, #313244);
}

.btn-ext {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 7px;
  background: var(--mcla-bg-secondary, #181825);
  color: var(--mcla-text-secondary, #a6adc8);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.13s;

  &:hover {
    border-color: var(--mcla-blue, #6366f1);
    color: var(--mcla-blue, #6366f1);
  }

  &.primary {
    background: var(--mcla-blue, #6366f1);
    border-color: var(--mcla-blue, #6366f1);
    color: #fff;
    &:hover {
      filter: brightness(1.1);
    }
  }
}

/* ====== 右侧文件区 ====== */
.files-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.07);
    border-radius: 3px;
  }
}

.version-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--mcla-border-color, #313244);
}

.vf-tab {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mcla-text-secondary, #a6adc8);
  background: var(--mcla-bg-secondary, #181825);
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    border-color: var(--mcla-blue, #6366f1);
    color: var(--mcla-blue, #6366f1);
  }
  &.active {
    background: rgba(99, 102, 241, 0.1);
    border-color: var(--mcla-blue, #6366f1);
    color: var(--mcla-blue, #6366f1);
  }
}

.files-loading,
.files-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  font-size: 13px;
  color: var(--mcla-text-muted, #6c7086);
}

/* 分组列表 */
.versions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-group {
  background: var(--mcla-bg-elevated, #1e1e2e);
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 9px;
  overflow: hidden;
  transition: border-color 0.13s;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }
}

.group-header {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 11px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  &.expanded {
    background: rgba(99, 102, 241, 0.05);
  }
}

.group-version {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary, #cdd6f4);
  flex: 1;
  text-align: left;
}

.group-count {
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);
  margin-right: 10px;
}

.group-arrow {
  color: var(--mcla-text-muted, #6c7086);
  transition: transform 0.2s;
  flex-shrink: 0;

  .expanded & {
    transform: rotate(180deg);
  }
}

.expanded .group-arrow {
  transform: rotate(180deg);
}

.group-files {
  border-top: 1px solid var(--mcla-border-color, #313244);
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--mcla-border-color, #313244);
  transition: background 0.12s;

  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.025);
  }
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mcla-text-primary, #cdd6f4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);

  span:not(:last-child)::after {
    content: '·';
    margin-left: 8px;
  }
}

.file-loaders {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.loader-tag {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 500;
  background: var(--mcla-bg-secondary, #181825);
  color: var(--mcla-text-secondary, #a6adc8);
  border-radius: 3px;
  border: 1px solid var(--mcla-border-color, #313244);
}

.btn-download {
  height: 30px;
  padding: 0 14px;
  background: var(--mcla-gradient-primary, linear-gradient(135deg, #6366f1, #8b5cf6));
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.13s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

/* ====== spinner ====== */
.spin-lg {
  width: 32px;
  height: 32px;
  border: 2.5px solid var(--mcla-border-color, #45475a);
  border-top-color: var(--mcla-blue, #6366f1);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spin-sm {
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ====== 安装确认弹窗 ====== */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-panel {
  width: 380px;
  max-width: 90vw;
  background: var(--mcla-bg-elevated, #1e1e2e);
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--mcla-border-color, #313244);
  font-size: 14px;
  font-weight: 700;
  color: var(--mcla-text-primary, #cdd6f4);
}

.confirm-body {
  padding: 16px 18px;
}

.confirm-mod-name {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary, #cdd6f4);
  word-break: break-all;
}

.confirm-target {
  margin: 0;
  font-size: 13px;
  color: var(--mcla-text-secondary, #a6adc8);

  strong {
    color: var(--mcla-blue, #6366f1);
  }
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--mcla-border-color, #313244);
}

.btn-cancel {
  padding: 7px 18px;
  border: 1px solid var(--mcla-border-color, #45475a);
  border-radius: 6px;
  background: transparent;
  color: var(--mcla-text-secondary, #a6adc8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    border-color: var(--mcla-text-muted, #6c7086);
    color: var(--mcla-text-primary, #cdd6f4);
  }
}

.btn-confirm {
  padding: 7px 18px;
  border: none;
  border-radius: 6px;
  background: var(--mcla-gradient-primary, linear-gradient(135deg, #6366f1, #8b5cf6));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.13s;

  &:hover {
    filter: brightness(1.1);
  }
}
</style>
