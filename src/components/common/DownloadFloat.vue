<template>
  <Teleport to="body">
    <transition name="dm-fade">
      <!-- 折叠状态：小按钮 -->
      <div
        v-if="!expanded"
        class="dm-collapsed"
        @click="expanded = true"
        title="下载管理"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span v-if="activeCount > 0" class="dm-badge">{{ activeCount }}</span>
      </div>

      <!-- 展开状态：下载列表 -->
      <div v-else class="dm-panel">
        <div class="dm-header">
          <span class="dm-title">下载管理</span>
          <span class="dm-count" v-if="items.length">{{ items.length }} 项</span>
          <button class="dm-close-btn" @click="expanded = false" title="收起">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div v-if="items.length === 0" class="dm-empty">
          暂无进行中的下载
        </div>

        <div v-else class="dm-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="dm-item"
            :class="'dm-status-' + item.status"
          >
            <div class="dm-item-icon">
              <svg v-if="item.status === 'downloading'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <svg v-else-if="item.status === 'completed'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>

            <div class="dm-item-body">
              <div class="dm-item-name">{{ item.name }}</div>
              <div class="dm-item-progress">
                <div class="dm-bar-track">
                  <div
                    class="dm-bar-fill"
                    :style="{ width: item.progress + '%' }"
                  ></div>
                </div>
                <span class="dm-item-pct">{{ Math.round(item.progress) }}%</span>
              </div>
              <div v-if="item.status === 'downloading'" class="dm-item-meta">
                <span>{{ formatSize(item.downloaded) }} / {{ formatSize(item.total) }}</span>
                <span v-if="item.speed > 0">{{ formatSpeed(item.speed) }}</span>
              </div>
              <div v-if="item.status === 'error'" class="dm-item-error">
                {{ item.error }}
              </div>
            </div>

            <button
              v-if="item.status === 'downloading'"
              class="dm-cancel-btn"
              @click="cancelDownload(item)"
              title="取消"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

// ── 类型 ────────────────────────────────────────────────────────────────────
interface DownloadItem {
  id: string
  name: string
  status: 'downloading' | 'completed' | 'error' | 'cancelled'
  progress: number        // 0-100
  downloaded: number     // bytes
  total: number         // bytes
  speed: number         // bytes/sec
  error?: string
}

// ── 状态 ────────────────────────────────────────────────────────────────────
const expanded = ref(false)
const items = ref<DownloadItem[]>([])

// 进行中的下载数量
const activeCount = computed(() =>
  items.value.filter(i => i.status === 'downloading').length
)

// ── 格式化 ──────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

function formatSpeed(bps: number): string {
  return formatSize(bps) + '/s'
}

// ── 查找或创建 item ─────────────────────────────────────────────────────────
function findOrCreate(id: string, name: string): DownloadItem {
  let item = items.value.find(i => i.id === id)
  if (!item) {
    item = { id, name, status: 'downloading', progress: 0, downloaded: 0, total: 0, speed: 0 }
    items.value.push(item)
    // 有下载开始时自动展开
    if (items.value.length === 1) expanded.value = true
  }
  return item
}

// ── 内容下载进度（download:progress）────────────────────────────────────
let contentCleanup: (() => void) | null = null

function onContentProgress(progress: any) {
  const id = progress.id || progress.fileName || 'unknown'
  const name = progress.fileName || progress.name || id
  const item = findOrCreate(id, name)

  item.status = 'downloading'
  item.progress = Math.min(100, Math.round(progress.progress * 100))
  item.downloaded = progress.downloaded || 0
  item.total = progress.total || 0
  item.speed = progress.speed || 0

  if (progress.done) {
    item.status = 'completed'
    item.progress = 100
    // 3秒后自动移除已完成项
    setTimeout(() => removeItem(id), 3000)
  }
  if (progress.error) {
    item.status = 'error'
    item.error = progress.error
  }
}

// ── 版本下载进度（version:download-progress）────────────────────────────
let versionCleanup: (() => void) | null = null

function onVersionProgress(data: any) {
  const id = data.taskId || data.versionId || 'version'
  const name = `版本 ${data.versionId || id}`
  const item = findOrCreate(id, name)

  item.status = 'downloading'
  item.progress = Math.min(100, Math.round(data.progress || 0))
  item.downloaded = data.downloaded || 0
  item.total = data.total || 0
  item.speed = data.speed || 0

  if (data.phase === 'completed') {
    item.status = 'completed'
    item.progress = 100
    setTimeout(() => removeItem(id), 3000)
  }
}

function onVersionComplete(_data: any) {
  // 已完成由 onVersionProgress 处理
}

function onVersionError(data: any) {
  const id = data.taskId || 'unknown'
  const item = items.value.find(i => i.id === id)
  if (item) {
    item.status = 'error'
    item.error = data.error || '下载失败'
  }
}

// ── ModLoader 安装进度（modloader:progress）─────────────────────────────
let modloaderCleanup: (() => void) | null = null

function onModLoaderProgress(data: any) {
  const id = 'ml_' + (data.instanceId || 'install')
  const name = `ModLoader ${data.message || ''}`
  const item = findOrCreate(id, name)

  item.status = data.stage === 'error' ? 'error' : 'downloading'
  item.progress = Math.min(100, Math.round(data.progress || 0))
  item.error = data.stage === 'error' ? data.message : undefined

  if (data.stage === 'complete') {
    item.status = 'completed'
    item.progress = 100
    setTimeout(() => removeItem(id), 3000)
  }
}

// ── 取消下载 ──────────────────────────────────────────────────────────────
async function cancelDownload(item: DownloadItem) {
  try {
    await window.electronAPI?.download?.cancelDownload?.(item.id)
  } catch {}
  item.status = 'cancelled'
  setTimeout(() => removeItem(item.id), 1000)
}

function removeItem(id: string) {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx !== -1) items.value.splice(idx, 1)
}

// ── 生命周期 ──────────────────────────────────────────────────────────────
onMounted(() => {
  // 监听内容下载进度
  if (window.electronAPI?.download?.onProgress) {
    contentCleanup = window.electronAPI.download.onProgress(onContentProgress)
  }

  // 监听版本下载进度
  if (window.electronAPI?.versions?.onDownloadProgress) {
    versionCleanup = window.electronAPI.versions.onDownloadProgress(onVersionProgress)
  }
  if (window.electronAPI?.versions?.onDownloadComplete) {
    const cl = window.electronAPI.versions.onDownloadComplete(onVersionComplete)
  }
  if (window.electronAPI?.versions?.onDownloadError) {
    const cl = window.electronAPI.versions.onDownloadError(onVersionError)
  }

  // 监听 ModLoader 安装进度
  if (window.electronAPI?.modloader?.onProgress) {
    modloaderCleanup = window.electronAPI.modloader.onProgress(onModLoaderProgress)
  }
})

onUnmounted(() => {
  contentCleanup?.()
  versionCleanup?.()
  modloaderCleanup?.()
})
</script>

<style scoped lang="scss">
/* ── 折叠按钮 ─────────────────────────────────────────────────────────── */
.dm-collapsed {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  color: var(--mcla-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 9999;
  transition: all var(--mcla-transition-fast);
  box-shadow: var(--mcla-shadow-md);

  &:hover {
    color: var(--mcla-primary);
    border-color: var(--mcla-primary-400);
    transform: scale(1.08);
  }
}

.dm-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* ── 展开面板 ─────────────────────────────────────────────────────────── */
.dm-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 340px;
  max-height: 420px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  box-shadow: var(--mcla-shadow-lg);
  overflow: hidden;
}

.dm-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--mcla-border-color);
  flex-shrink: 0;
}

.dm-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--mcla-text-primary);
}

.dm-count {
  font-size: 11px;
  color: var(--mcla-text-muted);
}

.dm-close-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--mcla-text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--mcla-radius-sm);
  transition: all var(--mcla-transition-fast);

  &:hover {
    color: var(--mcla-text-primary);
    background: var(--mcla-bg-input);
  }
}

.dm-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--mcla-text-muted);
  font-size: 13px;
}

.dm-list {
  overflow-y: auto;
  flex: 1;
  padding: 6px 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--mcla-border-color);
    border-radius: 2px;
  }
}

/* ── 单个下载项 ──────────────────────────────────────────────────────── */
.dm-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 14px;
  transition: background var(--mcla-transition-fast);

  &:hover {
    background: var(--mcla-bg-input);
  }
}

.dm-item-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--mcla-text-muted);
}

.dm-status-completed .dm-item-icon { color: #10b981; }
.dm-status-error .dm-item-icon { color: #ef4444; }

.dm-item-body {
  flex: 1;
  min-width: 0;
}

.dm-item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mcla-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dm-item-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.dm-bar-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--mcla-bg-input);
  overflow: hidden;
}

.dm-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--mcla-primary);
  transition: width 0.3s ease;
}

.dm-status-completed .dm-bar-fill { background: #10b981; }
.dm-status-error .dm-bar-fill { background: #ef4444; width: 100% !important; }

.dm-item-pct {
  font-size: 11px;
  color: var(--mcla-text-muted);
  font-family: var(--mcla-font-mono);
  min-width: 32px;
  text-align: right;
}

.dm-item-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
  font-size: 10.5px;
  color: var(--mcla-text-muted);
  font-family: var(--mcla-font-mono);
}

.dm-item-error {
  margin-top: 2px;
  font-size: 11px;
  color: #ef4444;
}

.dm-cancel-btn {
  flex-shrink: 0;
  margin-top: 2px;
  width: 20px;
  height: 20px;
  border-radius: var(--mcla-radius-sm);
  border: none;
  background: transparent;
  color: var(--mcla-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--mcla-transition-fast);

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
}

/* ── 过渡动画 ─────────────────────────────────────────────────────────── */
.dm-fade-enter-active,
.dm-fade-leave-active {
  transition: all 0.2s ease;
}
.dm-fade-enter-from,
.dm-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
