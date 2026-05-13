<template>
  <div class="instance-detail">
    <!-- 顶部导航栏 -->
    <div class="detail-header">
      <button class="back-btn" @click="$router.push('/instances')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        返回实例列表
      </button>

      <h2 v-if="instance" class="instance-name">{{ instance.name }}</h2>
      <span v-else class="loading-placeholder">加载中...</span>

      <div v-if="instance" class="header-actions">
        <button
          class="action-btn"
          :class="{ active: instance.isFavorited === 1 }"
          @click="toggleFavorite"
          title="收藏"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" :fill="instance.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </button>
        <button class="action-btn" @click="openFolder" title="打开游戏目录">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="!instance && !error" class="detail-loading">
      <div class="spinner"></div>
      <p>正在加载实例信息...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="detail-error">
      <p>{{ error }}</p>
      <button @click="fetchDetail">重试</button>
    </div>

    <!-- 实例详情内容 -->
    <div v-if="instance" class="detail-content">
      <!-- 基本信息卡片 -->
      <section class="info-section">
        <h3 class="section-title">基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>MC 版本</label>
            <span class="value version-badge">{{ instance.mcVersion }}</span>
          </div>
          <div class="info-item">
            <label>加载器</label>
            <span class="value loader-badge">{{ loaderLabel }}</span>
          </div>
          <div class="info-item">
            <label>游戏目录</label>
            <span class="value path-value" :title="instance.path">{{ instance.path || '未设置' }}</span>
          </div>
          <div class="info-item">
            <label>最后游玩</label>
            <span class="value">{{ formatLastPlayed }}</span>
          </div>
          <div class="info-item">
            <label>总游玩时长</label>
            <span class="value">{{ playTimeStr }}</span>
          </div>
          <div class="info-item">
            <label>窗口尺寸</label>
            <span class="value">{{ instance.width }} x {{ instance.height }}</span>
          </div>
        </div>
      </section>

      <!-- Java / 内存设置 -->
      <section class="info-section">
        <h3 class="section-title">Java & 内存</h3>
        <div class="info-grid">
          <div class="info-item full-width">
            <label>Java 路径</label>
            <input
              type="text"
              v-model="editForm.javaPath"
              placeholder="留空使用默认 Java"
              class="edit-input"
            />
          </div>
          <div class="info-item">
            <label>最小内存 (MB)</label>
            <input
              type="number"
              v-model.number="editForm.minMemory"
              min="256"
              step="256"
              class="edit-input number-input"
            />
          </div>
          <div class="info-item">
            <label>最大内存 (MB)</label>
            <input
              type="number"
              v-model.number="editForm.maxMemory"
              min="512"
              step="512"
              class="edit-input number-input"
            />
          </div>
          <div class="info-item full-width">
            <label>JVM 参数</label>
            <input
              type="text"
              v-model="editForm.jvmArgs"
              placeholder="-Xmn128m ..."
              class="edit-input"
            />
          </div>
        </div>
        <button class="save-btn" @click="saveSettings" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
      </section>

      <!-- Mod 列表 -->
      <section class="info-section">
        <div class="section-header">
          <h3 class="section-title">
            已安装 Mod
            <span class="mod-count" v-if="localMods.length > 0">({{ activeModCount }}/{{ localMods.length }})</span>
          </h3>
          <div class="section-actions">
            <button class="icon-btn" @click="refreshMods" title="刷新">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </button>
            <button class="icon-btn" @click="openModsFolder" title="打开 mods 目录">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            </button>
            <button class="icon-btn" @click="openConfigDir" title="打开 config 目录">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="modsLoading" class="mod-loading">
          <div class="spinner-sm"></div>
          <span>加载 Mod 列表...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="localMods.length === 0" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-text-muted)" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
          <p>暂无已安装的 Mod</p>
          <router-link to="/downloads" class="link-btn">去下载 Mod →</router-link>
        </div>

        <!-- Mod 列表 -->
        <div v-else class="mod-list">
          <div
            v-for="mod in localMods"
            :key="mod.filePath"
            class="mod-item"
            :class="{ 'mod-disabled': mod.status === 'disabled' }"
          >
            <div class="mod-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2"/></svg>
            </div>
            <div class="mod-info">
              <span class="mod-name">{{ mod.displayName || mod.fileName }}</span>
              <span class="mod-meta">
                <span v-if="mod.version" class="mod-version">v{{ mod.version }}</span>
                <span v-if="mod.author" class="mod-author">{{ mod.author }}</span>
                <span class="mod-size">{{ formatFileSize(mod.fileSize) }}</span>
              </span>
            </div>
            <div class="mod-actions">
              <span class="status-badge" :class="'status-' + mod.status">
                {{ statusLabel(mod.status) }}
              </span>
              <button
                class="toggle-btn"
                @click="toggleMod(mod)"
                :title="mod.status === 'active' ? '禁用' : '启用'"
              >
                <svg v-if="mod.status === 'active'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 配置文件列表 -->
      <section class="info-section">
        <div class="section-header">
          <h3 class="section-title">配置文件</h3>
          <div class="section-actions">
            <button class="icon-btn" @click="loadConfigFiles" title="刷新">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </button>
            <button class="icon-btn" @click="openConfigDir" title="打开 config 目录">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            </button>
          </div>
        </div>

        <div v-if="configFilesLoading" class="mod-loading">
          <div class="spinner-sm"></div>
          <span>加载配置文件...</span>
        </div>
        <div v-else-if="configFiles.length === 0" class="empty-state small">
          <p>暂无配置文件</p>
        </div>
        <div v-else class="config-list">
          <div
            v-for="cfg in configFiles"
            :key="cfg.path"
            class="config-item"
            @click="openConfigEditor(cfg)"
          >
            <div class="config-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="config-info">
              <span class="config-name">{{ cfg.name }}</span>
              <span class="config-meta">{{ formatFileSize(cfg.size) }} · {{ formatDate(cfg.modified) }}</span>
            </div>
            <button class="edit-icon-btn" @click.stop="openConfigEditor(cfg)" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Config 编辑弹窗 -->
    <PxModal v-if="editingConfig" @close="closeConfigEditor" :title="'编辑: ' + editingConfig.name" width="720px">
      <div class="config-editor">
        <div class="editor-toolbar">
          <span class="editor-hint">支持 .toml / .json / .cfg 格式，保存后立即生效</span>
          <div class="toolbar-actions">
            <button v-if="configDirty" class="reset-btn" @click="resetConfig">重置</button>
            <button class="save-config-btn" @click="saveConfig" :disabled="savingConfig">
              {{ savingConfig ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
        <textarea
          ref="configTextarea"
          v-model="configContent"
          class="config-textarea"
          spellcheck="false"
          @input="onConfigInput"
        ></textarea>
        <div v-if="configError" class="editor-error">{{ configError }}</div>
      </div>
    </PxModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInstancesStore } from '../stores/instances.store'
import { useModsStore } from '../stores/mods.store'
import { formatRelativeTime, formatDuration } from '../utils/format'
import type { GameInstance } from '../types/instance'
import PxModal from '../components/common/PxModal.vue'
import type { LocalModStatus } from '../types/mod'

const route = useRoute()
const router = useRouter()
const instancesStore = useInstancesStore()
const modsStore = useModsStore()

// ====== 状态 ======
const instance = ref<GameInstance | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)

// 编辑表单
const editForm = ref({
  javaPath: '',
  minMemory: 1024,
  maxMemory: 4096,
  jvmArgs: '',
})

// 本地 Mod 列表（直接从 IPC 获取，不用 store）
const localMods = ref<Array<{
  filePath: string
  fileName: string
  displayName: string
  version: string
  author: string
  fileSize: number
  status: LocalModStatus
}>>([])
const modsLoading = ref(false)

// 配置文件列表
interface ConfigFile {
  name: string
  path: string
  size: number
  modified: string
}
const configFiles = ref<ConfigFile[]>([])
const configFilesLoading = ref(false)

// Config 编辑器状态
const editingConfig = ref<ConfigFile | null>(null)
const configContent = ref('')
const configOriginal = ref('')
const configDirty = ref(false)
const savingConfig = ref(false)
const configError = ref('')
const configTextarea = ref<HTMLTextAreaElement | null>(null)

// ====== 计算属性 ======
const instanceId = computed(() => route.params.id as string)
const activeModCount = computed(() => localMods.value.filter(m => m.status === 'active').length)

const loaderLabel = computed(() => {
  if (!instance.value) return '-'
  const { getLoaderName } = require('../utils/format')
  if (instance.value.loaderType === 'vanilla') return '原版'
  return `${getLoaderName(instance.value.loaderType)} ${instance.value.loaderVersion}`.trim()
})

const formatLastPlayed = computed(() => {
  if (!instance.value?.lastPlayed) return '从未游玩'
  return formatRelativeTime(instance.value.lastPlayed)
})

const playTimeStr = computed(() => {
  if (!instance.value) return '0分钟'
  return formatDuration(instance.value.playTime)
})

const modsStats = computed(() => modsStore.stats)

// ====== 方法 ======
async function fetchDetail() {
  error.value = null
  try {
    // 优先直接从 IPC 拿最新数据（不走 store，避免路径字段不一致）
    const raw = await window.electronAPI?.instance.getById(instanceId.value)
    if (raw) {
      instance.value = {
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
      editForm.value.javaPath = instance.value.javaPath
      editForm.value.minMemory = instance.value.minMemory
      editForm.value.maxMemory = instance.value.maxMemory
      editForm.value.jvmArgs = instance.value.jvmArgs
    }

    // 并行加载 Mod 列表和配置列表
    await Promise.all([loadMods(), loadConfigFiles()])
  } catch (e: any) {
    error.value = e.message || '加载实例详情失败'
  }
}

async function loadMods() {
  if (!instance.value?.path) return
  modsLoading.value = true
  try {
    const res = await window.electronAPI?.mod.list(instance.value.path)
    if (res?.ok) {
      localMods.value = (res.data || []).map((m: any) => ({
        filePath: m.filePath,
        fileName: m.fileName,
        displayName: m.name || m.fileName.replace('.jar', ''),
        version: m.version || '',
        author: (Array.isArray(m.authors) ? m.authors.join(', ') : m.authors) || '',
        fileSize: m.size || 0,
        status: m.enabled ? 'active' : 'disabled',
      }))
    }
  } catch (e) {
    // ignore
  } finally {
    modsLoading.value = false
  }
}

async function loadConfigFiles() {
  if (!instance.value?.path) return
  configFilesLoading.value = true
  try {
    const res = await window.electronAPI?.mod.listConfigs(instance.value.path)
    if (res?.ok) {
      configFiles.value = res.data || []
    }
  } catch (e) {
    // ignore
  } finally {
    configFilesLoading.value = false
  }
}

async function refreshMods() {
  await loadMods()
}

async function openModsFolder() {
  if (!instance.value?.path) return
  const modsDir = instance.value.path + '/mods'
  window.electronAPI?.shell.openPath(modsDir)
}

async function openConfigDir() {
  if (!instance.value?.path) return
  const res = await window.electronAPI?.mod.openConfigDir(instance.value.path)
  if (res?.ok) {
    window.electronAPI?.shell.openPath(res.data)
  }
}

async function toggleMod(mod: typeof localMods.value[0]) {
  const action = mod.status === 'active' ? 'disable' : 'enable'
  const res = await window.electronAPI?.mod[action](mod.filePath)
  if (res?.ok) {
    mod.status = mod.status === 'active' ? 'disabled' : 'active'
  }
}

async function openConfigEditor(cfg: ConfigFile) {
  configError.value = ''
  editingConfig.value = cfg
  const res = await window.electronAPI?.mod.getConfigContent(cfg.path)
  if (res?.ok) {
    configContent.value = res.data
    configOriginal.value = res.data
    configDirty.value = false
    await nextTick()
    configTextarea.value?.focus()
  } else {
    configError.value = res?.error || '读取失败'
  }
}

function onConfigInput() {
  configDirty.value = configContent.value !== configOriginal.value
}

function resetConfig() {
  configContent.value = configOriginal.value
  configDirty.value = false
}

async function saveConfig() {
  if (!editingConfig.value) return
  savingConfig.value = true
  configError.value = ''
  try {
    const res = await window.electronAPI?.mod.saveConfigContent(
      editingConfig.value.path,
      configContent.value
    )
    if (res?.ok) {
      configOriginal.value = configContent.value
      configDirty.value = false
      editingConfig.value = null
    } else {
      configError.value = res?.error || '保存失败'
    }
  } finally {
    savingConfig.value = false
  }
}

function closeConfigEditor() {
  if (configDirty.value) {
    if (!confirm('有未保存的更改，确定关闭？')) return
  }
  editingConfig.value = null
  configDirty.value = false
}

async function toggleFavorite() {
  if (instance.value) {
    await instancesStore.toggleFavorite(instance.value.id)
    fetchDetail()
  }
}

function openFolder() {
  if (instance.value?.path) {
    window.electronAPI?.shell.openPath(instance.value.path)
  }
}

async function saveSettings() {
  if (!instance.value) return
  saving.value = true
  try {
    await instancesStore.updateInstance(instance.value.id, {
      javaPath: editForm.value.javaPath,
      minMemory: editForm.value.minMemory,
      maxMemory: editForm.value.maxMemory,
      jvmArgs: editForm.value.jvmArgs,
    })
  } finally {
    saving.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN')
}

function statusLabel(status: LocalModStatus): string {
  const map: Record<LocalModStatus, string> = {
    active: '已启用',
    disabled: '已禁用',
    incompatible: '不兼容',
    error: '错误',
  }
  return map[status] || status
}

// ====== 生命周期 ======
onMounted(fetchDetail)
watch(instanceId, () => {
  fetchDetail()
})
</script>

<style scoped lang="scss">
.instance-detail {
  padding: 20px 28px;
  max-width: 860px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  .back-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-md);
    color: var(--mcla-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all var(--mcla-transition-fast);

    &:hover {
      color: var(--mcla-primary);
      border-color: var(--mcla-primary-400);
      background: var(--mcla-primary-light);
    }
  }

  .instance-name {
    font-size: 22px;
    font-weight: 700;
    color: var(--mcla-text-primary);
    flex: 1;
  }

  .header-actions {
    display: flex;
    gap: 6px;

    .action-btn {
      padding: 7px 10px;
      border: 1px solid var(--mcla-border-color);
      border-radius: var(--mcla-radius-md);
      background: transparent;
      color: var(--mcla-text-muted);
      cursor: pointer;
      transition: all var(--mcla-transition-fast);

      &:hover { color: var(--mcla-primary); border-color: var(--mcla-primary-300); }
      &.active { color: #f59e0b; border-color: #f59e0b; background: rgba(245,158,11,0.08); }
    }
  }
}

.detail-loading,
.detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--mcla-text-muted);

  button {
    padding: 8px 20px;
    background: var(--mcla-gradient-primary);
    color: #fff;
    border: none;
    border-radius: var(--mcla-radius-md);
    cursor: pointer;
  }
}

.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--mcla-border-color);
  border-top-color: var(--mcla-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.info-section {
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  padding: 20px 24px;
  margin-bottom: 16px;

  .section-title {
    font-size: 15px;
    font-weight: 650;
    color: var(--mcla-text-primary);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    .mod-count {
      font-size: 12px;
      color: var(--mcla-text-muted);
      font-weight: 400;
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--mcla-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .value {
      font-size: 14px;
      color: var(--mcla-text-primary);
      font-weight: 500;
    }

    .version-badge {
      display: inline-block;
      padding: 2px 10px;
      background: var(--mcla-info-light);
      color: var(--mcla-info);
      border-radius: var(--mcla-radius-sm);
      font-weight: 600;
      font-size: 13px;
    }

    .loader-badge {
      display: inline-block;
      padding: 2px 10px;
      background: var(--mcla-success-light);
      color: var(--mcla-success);
      border-radius: var(--mcla-radius-sm);
      font-weight: 600;
      font-size: 13px;
    }

    .path-value {
      font-family: var(--mcla-font-mono);
      font-size: 13px;
      word-break: break-all;
      color: var(--mcla-text-secondary);
    }

    .edit-input {
      padding: 8px 12px;
      background: var(--mcla-bg-input);
      border: 1px solid var(--mcla-border-color);
      border-radius: var(--mcla-radius-md);
      color: var(--mcla-text-primary);
      font-size: 14px;
      outline: none;
      transition: all var(--mcla-transition-fast);

      &:focus {
        border-color: var(--mcla-border-color-focus);
        box-shadow: var(--mcla-input-focus-shadow);
      }

      &.number-input {
        width: 120px;
      }
    }
  }
}

.save-btn {
  margin-top: 14px;
  padding: 8px 24px;
  background: var(--mcla-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-md);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover:not(:disabled) { filter: brightness(1.06); box-shadow: var(--mcla-shadow-glow-primary); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--mcla-text-muted);

  p { margin: 12px 0 16px; }

  .link-btn {
    display: inline-block;
    padding: 8px 20px;
    color: var(--mcla-primary-500);
    font-size: 13.5px;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid var(--mcla-primary-300);
    border-radius: var(--mcla-radius-md);
    transition: all var(--mcla-transition-fast);

    &:hover { background: var(--mcla-primary-light); }
  }
}

.hint-text {
  color: var(--mcla-text-muted);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

/* ====== Mod 列表 ====== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .section-title {
    margin-bottom: 0;
  }
}

.section-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  color: var(--mcla-text-muted);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    color: var(--mcla-primary);
    border-color: var(--mcla-primary-300);
    background: var(--mcla-primary-light);
  }
}

.mod-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: var(--mcla-text-muted);
  font-size: 13px;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--mcla-border-color);
  border-top-color: var(--mcla-primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.mod-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--mcla-border-color);
    border-radius: 2px;
  }
}

.mod-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--mcla-bg-input);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  transition: all var(--mcla-transition-fast);

  &:hover {
    border-color: var(--mcla-border-color-focus);
    background: var(--mcla-bg-elevated);
  }

  &.mod-disabled {
    opacity: 0.6;
  }
}

.mod-icon {
  color: var(--mcla-text-muted);
  flex-shrink: 0;
}

.mod-info {
  flex: 1;
  min-width: 0;

  .mod-name {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--mcla-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mod-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    font-size: 11px;
    color: var(--mcla-text-muted);

    .mod-version {
      color: var(--mcla-info);
    }
  }
}

.mod-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-badge {
  padding: 2px 8px;
  border-radius: var(--mcla-radius-sm);
  font-size: 11px;
  font-weight: 600;

  &.status-active {
    background: var(--mcla-success-light);
    color: var(--mcla-success);
  }

  &.status-disabled {
    background: var(--mcla-bg-input);
    color: var(--mcla-text-muted);
    border: 1px solid var(--mcla-border-color);
  }

  &.status-incompatible {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  &.status-error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  color: var(--mcla-text-muted);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    color: var(--mcla-primary);
    border-color: var(--mcla-primary-300);
  }
}

/* ====== 配置文件列表 ====== */
.config-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--mcla-radius-md);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    background: var(--mcla-bg-input);
  }
}

.config-icon {
  color: var(--mcla-text-muted);
  flex-shrink: 0;
}

.config-info {
  flex: 1;
  min-width: 0;

  .config-name {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--mcla-text-primary);
    font-family: var(--mcla-font-mono);
  }

  .config-meta {
    font-size: 11px;
    color: var(--mcla-text-muted);
  }
}

.edit-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--mcla-radius-sm);
  color: var(--mcla-text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all var(--mcla-transition-fast);

  .config-item:hover & {
    opacity: 1;
    border-color: var(--mcla-border-color);
  }

  &:hover {
    color: var(--mcla-primary);
    border-color: var(--mcla-primary-300);
  }
}

/* ====== Config 编辑器弹窗 ====== */
.config-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.editor-hint {
  font-size: 12px;
  color: var(--mcla-text-muted);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.reset-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  color: var(--mcla-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    color: var(--mcla-text-primary);
    border-color: var(--mcla-text-muted);
  }
}

.save-config-btn {
  padding: 6px 20px;
  background: var(--mcla-gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.config-textarea {
  width: 100%;
  height: 400px;
  padding: 14px 16px;
  background: var(--mcla-bg-input);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  color: var(--mcla-text-primary);
  font-family: var(--mcla-font-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color var(--mcla-transition-fast);

  &:focus {
    border-color: var(--mcla-border-color-focus);
  }
}

.editor-error {
  color: #ef4444;
  font-size: 12px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--mcla-radius-md);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.empty-state.small {
  padding: 24px 0;
}
</style>
