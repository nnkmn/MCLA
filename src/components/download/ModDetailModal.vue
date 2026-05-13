<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal-panel" ref="panelRef">
        <!-- 安装确认弹窗 -->
        <Teleport to="body">
          <div v-if="showInstallConfirm && pendingFile && currentInstance" class="confirm-overlay" @click.self="showInstallConfirm = false">
            <div class="confirm-panel">
              <div class="confirm-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-blue)" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                <span>确认安装</span>
              </div>
              <div class="confirm-body">
                <p class="confirm-mod-name">{{ pendingFile.displayName || pendingFile.filename }}</p>
                <p class="confirm-target">
                  安装到实例 <strong>{{ currentInstance.name }}</strong>
                </p>
                <p class="confirm-path">{{ selectedTarget }}</p>
              </div>
              <div class="confirm-actions">
                <button class="btn-cancel" @click="showInstallConfirm = false; pendingFile = null">取消</button>
                <button class="btn-confirm" @click="confirmDownload">确认安装</button>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- 头部 -->
        <div class="modal-header">
          <div class="modal-title">Mod 详情</div>
          <button class="btn-close" @click="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="modal-loading">
          <div class="spin"></div>
          <span>正在加载...</span>
        </div>

        <!-- 内容 -->
        <div v-else-if="detail" class="modal-content">
          <!-- 基本信息 -->
          <div class="info-section">
            <div class="info-left">
              <div class="mod-icon-wrap">
                <img v-if="detail.iconUrl" :src="detail.iconUrl" :alt="detail.name" />
                <div v-else class="icon-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                </div>
              </div>
            </div>
            <div class="info-right">
              <h2 class="mod-name">{{ detail.name }}</h2>
              <p class="mod-author">
                <span class="by">by</span> {{ detail.author }}
              </p>
              <p class="mod-desc">{{ detail.description || '暂无描述' }}</p>
              <div class="mod-stats">
                <span class="stat">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  {{ formatNum(detail.downloads) }} 次下载
                </span>
                <span v-if="detail.categories?.length" class="stat tags">
                  <span v-for="cat in detail.categories.slice(0, 5)" :key="cat" class="cat-chip">{{ cat }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- 安装目标（无实例上下文时显示） -->
          <div v-if="!autoInstance" class="target-section">
            <div class="target-label">安装到</div>
            <div class="target-selector">
              <select class="target-select" v-model="selectedInstanceId">
                <option value="">-- 选择实例 --</option>
                <option v-for="inst in instancesStore.instances" :key="inst.id" :value="inst.id">
                  {{ inst.name }} ({{ inst.mcVersion }}{{ inst.loaderType !== 'vanilla' ? `-${inst.loaderType}` : '' }})
                </option>
              </select>
              <span v-if="selectedInstanceId" class="target-path">
                {{ getInstanceModsPath(selectedInstanceId) }}
              </span>
            </div>
            <p v-if="!instancesStore.instances.length" class="target-hint">当前没有实例，请先创建一个</p>
          </div>

          <!-- 文件版本列表 -->
          <div class="files-section">
            <div class="files-header">
              <span class="files-title">版本文件</span>
              <span class="files-count">{{ filteredFiles.length }} 个</span>
            </div>

            <div v-if="filesLoading" class="files-loading">
              <div class="spin-sm"></div>
              <span>加载文件列表...</span>
            </div>

            <div v-else-if="!files.length" class="files-empty">
              暂无可用文件
            </div>

            <div v-else class="files-list">
              <div
                v-for="file in filteredFiles"
                :key="file.id"
                class="file-item"
                :class="{
                  'incompatible': !isCompatible(file),
                  'recommended': isRecommended(file),
                }"
              >
                <div class="file-main">
                  <div class="file-info">
                    <div class="file-top">
                      <span class="file-name">{{ file.displayName || file.fileName }}</span>
                      <span class="release-tag" :class="file.releaseType">{{ file.releaseType === 'release' ? '正式' : file.releaseType === 'beta' ? 'Beta' : 'Alpha' }}</span>
                      <span v-if="isRecommended(file)" class="rec-badge">推荐</span>
                    </div>
                    <div class="file-meta">
                      <span class="file-size">{{ formatSize(file.size) }}</span>
                      <span class="file-date">{{ formatDate(file.datePublished) }}</span>
                      <span class="file-dls">{{ formatNum(file.downloads) }} 下载</span>
                    </div>
                  </div>

                  <!-- 兼容性状态 -->
                  <div class="compat-info">
                    <div class="compat-row">
                      <span class="compat-label">MC</span>
                      <span
                        v-for="gv in file.gameVersions.slice(0, 4)"
                        :key="gv"
                        class="compat-tag"
                        :class="{ 'current': currentInstance && gv === currentInstance.mcVersion }"
                      >{{ gv }}</span>
                      <span v-if="file.gameVersions.length > 4" class="compat-more">+{{ file.gameVersions.length - 4 }}</span>
                    </div>
                    <div v-if="file.loaders?.length" class="compat-row">
                      <span class="compat-label">加载器</span>
                      <span
                        v-for="loader in file.loaders.slice(0, 4)"
                        :key="loader"
                        class="compat-tag"
                        :class="{ 'current': currentInstance && loader.toLowerCase() === currentInstance.loaderType?.toLowerCase() }"
                      >{{ loader }}</span>
                    </div>
                  </div>

                  <!-- 不兼容提示 -->
                  <div v-if="!isCompatible(file)" class="incompat-tip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    与当前实例不兼容
                  </div>
                </div>

                <div class="file-action">
                  <button
                    class="btn-download"
                    :disabled="!selectedTarget || downloadingId === file.id"
                    @click="downloadFile(file)"
                  >
                    <svg v-if="downloadingId === file.id" class="spin-sm" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    {{ downloadingId === file.id ? '下载中' : '下载' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else class="modal-error">
          <p>加载 Mod 详情失败</p>
          <button class="btn-retry" @click="loadDetail">重试</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useInstancesStore } from '../../stores/instances.store'
import { useDownloadStore } from '../../stores/download.store'
import type { ModSearchResult, ProjectFile } from '../../types/download'
import type { GameInstance } from '../../types/instance'
import { formatNumber } from '../../utils/format'

// ====== Props & Emits ======

interface Props {
  modelValue: boolean
  mod: ModSearchResult | null
  /** 从版本设置页跳转时传入当前实例，下载目标自动填入 */
  instance?: GameInstance | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

// ====== Stores ======

const instancesStore = useInstancesStore()
const dlStore = useDownloadStore()

// ====== 状态 ======

const panelRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const filesLoading = ref(false)
const detail = ref<ModSearchResult | null>(null)
const files = ref<ProjectFile[]>([])
const downloadingId = ref<string | null>(null)
const selectedInstanceId = ref('')
const showInstallConfirm = ref(false)
const pendingFile = ref<ProjectFile | null>(null)

// ====== 计算属性 ======

/** 当前选中的实例（props 传入优先，否则用下拉选择） */
const currentInstance = computed(() => {
  if (props.instance) return props.instance
  if (selectedInstanceId.value) {
    return instancesStore.instances.find(i => i.id === selectedInstanceId.value) ?? null
  }
  return instancesStore.currentInstance
})

/** 是否有自动实例上下文（从版本设置页跳转） */
const autoInstance = computed(() => !!props.instance)

/** 下载目标路径 */
const selectedTarget = computed(() => {
  if (!currentInstance.value) return null
  return getInstanceModsPath(currentInstance.value.id)
})

/** 过滤后的文件列表（按发布日期倒序） */
const filteredFiles = computed(() => {
  return [...files.value].sort((a, b) =>
    new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime()
  )
})

// ====== 生命周期 ======

watch(() => props.modelValue, async (val) => {
  if (val && props.mod) {
    await loadAll()
  }
})

// 当切换选择实例时刷新目标路径提示
watch(selectedInstanceId, async () => {
  await instancesStore.fetchInstances()
})

// ====== 加载数据 ======

async function loadAll() {
  loading.value = true
  detail.value = null
  files.value = []
  selectedInstanceId.value = ''

  try {
    // 获取项目详情
    const detailRes = await window.electronAPI?.download.getProject(
      props.mod!.id,
      props.mod!.source
    )
    const d = (detailRes as any)?.data
    if (d) {
      detail.value = {
        id: d.id || props.mod!.id,
        name: d.name || d.title || props.mod!.name,
        author: d.author || props.mod!.author,
        description: d.description || props.mod!.description,
        iconUrl: d.iconUrl || props.mod!.iconUrl,
        downloads: d.downloads ?? props.mod!.downloads,
        follows: d.follows ?? props.mod!.follows,
        source: d.source || props.mod!.source,
        categories: d.categories || props.mod!.categories,
        gameVersions: d.gameVersions || props.mod!.gameVersions,
        loaders: d.loaders || props.mod!.loaders,
      }
    } else {
      detail.value = props.mod
    }

    // 获取文件列表
    await loadFiles()
  } catch (e) {
    // 降级到 props 数据
    detail.value = props.mod
  } finally {
    loading.value = false
  }
}

async function loadFiles() {
  if (!props.mod) return
  filesLoading.value = true
  try {
    const res = await window.electronAPI?.download.getFiles(
      props.mod.id,
      props.mod.source,
      {}
    )
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
      downloads: f.downloads ?? 0,
    })) as ProjectFile[]
  } catch (e) {
    files.value = []
  } finally {
    filesLoading.value = false
  }
}

async function loadDetail() {
  await loadAll()
}

// ====== 兼容性判断 ======

/**
 * 判断文件是否与当前实例兼容
 * 同时检查 MC 版本和加载器
 */
function isCompatible(file: ProjectFile): boolean {
  if (!currentInstance.value) return true
  const inst = currentInstance.value

  // MC 版本兼容
  const mcCompat = file.gameVersions.some(gv =>
    gv === inst.mcVersion || gv.startsWith(inst.mcVersion + '.')
  )

  // 加载器兼容（vanilla 不检查）
  const loaderCompat = !inst.loaderType || inst.loaderType === 'vanilla'
    || file.loaders.some(l => l.toLowerCase() === inst.loaderType!.toLowerCase())

  return mcCompat && loaderCompat
}

/**
 * 是否为推荐版本（与当前实例最匹配的版本）
 */
function isRecommended(file: ProjectFile): boolean {
  if (!currentInstance.value) return false
  return file.gameVersions.includes(currentInstance.value.mcVersion)
}

// ====== 下载 ======

async function downloadFile(file: ProjectFile) {
  if (!selectedTarget.value) {
    alert('请先选择一个目标实例')
    return
  }

  // 先弹出安装确认
  pendingFile.value = file
  showInstallConfirm.value = true
}

async function confirmDownload() {
  const file = pendingFile.value
  if (!file) return

  showInstallConfirm.value = false
  pendingFile.value = null

  // 完整目标路径 = 实例mods目录 / 文件名
  const target = `${selectedTarget.value}${file.filename || file.displayName}`
  downloadingId.value = file.id
  try {
    const res = await window.electronAPI?.download.file(
      {
        id: file.id,
        fileName: file.filename || file.displayName,
        url: file.downloadUrl,
        gameVersions: file.gameVersions,
        loaders: file.loaders,
        releaseType: file.releaseType,
        datePublished: file.datePublished,
        size: file.size,
        downloads: file.downloads,
        destination: target,
      }
    )

    const result = res as any
    if (result?.success) {
      await dlStore.refreshQueue()
    } else {
      alert('下载失败：' + (result?.error || '未知错误'))
    }
  } catch (e: any) {
    alert('下载出错：' + (e.message || '未知错误'))
  } finally {
    downloadingId.value = null
  }
}

// ====== 工具 ======

function getInstanceModsPath(instanceId: string): string {
  const inst = instancesStore.instances.find(i => i.id === instanceId)
  if (!inst) return ''
  return `${inst.path}/mods/`
}

function close() {
  emit('update:modelValue', false)
}

function formatNum(n: number | undefined): string {
  return formatNumber(n ?? 0)
}

function formatSize(bytes: number): string {
  if (!bytes) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}
</script>

<style scoped lang="scss">
/* ====== 遮罩 + 面板 ====== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-panel {
  width: 640px;
  max-width: 95vw;
  max-height: 85vh;
  background: var(--mcla-bg-elevated, #1e1e2e);
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

/* ====== 头部 ====== */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--mcla-border-color, #313244);
  flex-shrink: 0;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--mcla-text-primary, #cdd6f4);
}

.btn-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--mcla-text-muted, #6c7086);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;

  &:hover {
    background: var(--mcla-bg-hover, rgba(255,255,255,0.06));
    color: var(--mcla-text-primary, #cdd6f4);
  }
}

/* ====== 加载/空/错误 ====== */
.modal-loading,
.modal-error,
.files-loading,
.files-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--mcla-text-muted, #6c7086);
  font-size: 13px;
}

.modal-error {
  .btn-retry {
    padding: 6px 20px;
    border: 1px solid var(--mcla-border-color, #45475a);
    border-radius: 6px;
    background: transparent;
    color: var(--mcla-text-secondary, #a6adc8);
    cursor: pointer;
    font-size: 13px;
    margin-top: 8px;
    transition: all 0.12s;
    &:hover { border-color: var(--mcla-primary-400, #748ffc); color: var(--mcla-primary-400, #748ffc); }
  }
}

/* ====== 滚动内容 ====== */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
}

/* ====== 基本信息区 ====== */
.info-section {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--mcla-border-color, #313244);
}

.info-left {
  flex-shrink: 0;
}

.mod-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
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
    color: var(--mcla-text-muted, #6c7086);
  }
}

.info-right {
  flex: 1;
  min-width: 0;
}

.mod-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--mcla-text-primary, #cdd6f4);
  margin: 0 0 4px;
  word-break: break-word;
}

.mod-author {
  font-size: 13px;
  color: var(--mcla-text-muted, #6c7086);
  margin: 0 0 8px;

  .by { opacity: 0.6; margin-right: 2px; }
}

.mod-desc {
  font-size: 13px;
  color: var(--mcla-text-secondary, #a6adc8);
  margin: 0 0 10px;
  line-height: 1.5;
  display: -webkit-box;
  display: box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--mcla-text-muted, #6c7086);

    svg { stroke: var(--mcla-success, #a6e3a1); }
  }

  .tags { gap: 4px; }

  .cat-chip {
    padding: 1px 7px;
    font-size: 10.5px;
    background: var(--mcla-primary-light, rgba(99,102,241,0.12));
    color: var(--mcla-primary-400, #89b4fa);
    border-radius: 3px;
    font-weight: 600;
  }
}

/* ====== 安装目标区 ====== */
.target-section {
  background: var(--mcla-bg-secondary, #181825);
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 20px;
}

.target-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mcla-text-muted, #6c7086);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.target-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.target-select {
  flex: 1;
  min-width: 200px;
  padding: 7px 10px;
  border: 1px solid var(--mcla-border-color, #45475a);
  border-radius: 6px;
  background: var(--mcla-bg-elevated, #1e1e2e);
  color: var(--mcla-text-primary, #cdd6f4);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.12s;

  &:focus { border-color: var(--mcla-primary-400, #748ffc); }
}

.target-path {
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);
  font-family: var(--mcla-font-mono, monospace);
  word-break: break-all;
}

.target-hint {
  font-size: 12px;
  color: var(--mcla-text-error, #f38ba8);
  margin: 4px 0 0;
}

/* ====== 文件列表区 ====== */
.files-section {
  margin-bottom: 8px;
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.files-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--mcla-text-primary, #cdd6f4);
}

.files-count {
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.files-loading {
  flex-direction: row;
  padding: 16px;
  font-size: 12px;
}

.files-empty {
  padding: 20px;
  font-size: 13px;
}

/* ====== 文件项 ====== */
.file-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: var(--mcla-bg-secondary, #181825);
  border: 1px solid var(--mcla-border-color, #313244);
  border-radius: 8px;
  transition: all 0.12s;

  &:hover {
    border-color: var(--mcla-primary-300, #89b4fa);
  }

  &.incompatible {
    border-color: rgba(243, 139, 168, 0.4);
    &:hover { border-color: rgba(243, 139, 168, 0.6); }
  }

  &.recommended {
    border-color: rgba(166, 227, 161, 0.3);
    background: rgba(166, 227, 161, 0.03);
    &:hover { border-color: rgba(166, 227, 161, 0.5); }
  }
}

.file-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.file-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary, #cdd6f4);
  word-break: break-all;
}

.release-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;

  &.release {
    background: rgba(166, 227, 161, 0.1);
    color: var(--mcla-success, #a6e3a1);
  }
  &.beta {
    background: rgba(249, 200, 70, 0.1);
    color: #f9c200;
  }
  &.alpha {
    background: rgba(243, 139, 168, 0.1);
    color: var(--mcla-text-error, #f38ba8);
  }
}

.rec-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(166, 227, 161, 0.15);
  color: var(--mcla-success, #a6e3a1);
  border: 1px solid rgba(166, 227, 161, 0.2);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);
}

/* ====== 兼容性标签 ====== */
.compat-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.compat-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.compat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--mcla-text-muted, #6c7086);
  min-width: 36px;
}

.compat-tag {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--mcla-bg-elevated, #1e1e2e);
  color: var(--mcla-text-secondary, #a6adc8);
  border-radius: 3px;
  border: 1px solid var(--mcla-border-color, #45475a);
  transition: all 0.1s;

  &.current {
    background: rgba(166, 227, 161, 0.1);
    color: var(--mcla-success, #a6e3a1);
    border-color: rgba(166, 227, 161, 0.3);
    font-weight: 600;
  }
}

.compat-more {
  font-size: 10px;
  color: var(--mcla-text-muted, #6c7086);
}

.incompat-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--mcla-text-error, #f38ba8);
  margin-top: 2px;

  svg { flex-shrink: 0; }
}

/* ====== 下载按钮 ====== */
.file-action {
  flex-shrink: 0;
  padding-top: 2px;
}

.btn-download {
  height: 32px;
  padding: 0 16px;
  background: var(--mcla-gradient-primary, linear-gradient(135deg, #6366f1, #8b5cf6));
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.14s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
}

/* ====== Spinner ====== */
.spin {
  width: 28px;
  height: 28px;
  border: 2px solid var(--mcla-border-color, #45475a);
  border-top-color: var(--mcla-primary-400, #748ffc);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spin-sm {
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ====== 安装确认弹窗 ====== */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.confirm-panel {
  width: 400px;
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
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary, #cdd6f4);
  word-break: break-all;
}

.confirm-target {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--mcla-text-secondary, #a6adc8);

  strong {
    color: var(--mcla-primary-400, #89b4fa);
  }
}

.confirm-path {
  margin: 0;
  font-size: 11px;
  color: var(--mcla-text-muted, #6c7086);
  font-family: var(--mcla-font-mono, monospace);
  word-break: break-all;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--mcla-border-color, #313244);
}

.btn-cancel {
  padding: 7px 20px;
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
  padding: 7px 20px;
  border: none;
  border-radius: 6px;
  background: var(--mcla-gradient-primary, linear-gradient(135deg, #6366f1, #8b5cf6));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s;

  &:hover {
    filter: brightness(1.1);
  }
}
</style>
