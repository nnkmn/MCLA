<template>
  <div class="mod-manager">
    <!-- 搜索栏 -->
    <div class="mod-search-card">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input type="text" class="mod-search-input" placeholder="搜索 Mod 名称 / 描述 / 标签" v-model="modSearchText" />
    </div>

    <!-- 操作按钮栏 -->
    <div class="mod-toolbar">
      <button class="form-action-btn primary-outline" @click="openModFolder">打开文件夹</button>
      <button class="form-action-btn" @click="installModFromFile">从文件安装</button>
      <button class="form-action-btn" @click="$router.push('/downloads')">下载新 Mod</button>
      <button class="form-action-btn" :class="{ checking: checkingUpdates }" @click="checkAllUpdates" :disabled="checkingUpdates">
        <svg v-if="checkingUpdates" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon-sm"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        {{ checkingUpdates ? '检查中...' : hasUpdateCount > 0 ? `检查更新 (${hasUpdateCount}↑)` : '检查更新' }}
      </button>
    </div>

    <!-- 分类筛选 -->
    <div class="mod-tabs">
      <button
        v-for="tab in modFilterTabs"
        :key="tab.key"
        class="mod-tab"
        :class="{ active: modFilter === tab.key }"
        @click="modFilter = tab.key"
      >{{ tab.label }} <span class="mod-tab-count">({{ tab.count }})</span></button>
    </div>

    <!-- Mod 列表 -->
    <div class="mod-list-section">
      <div v-if="modsLoading" class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-text-muted)" stroke-width="2" class="spin-icon"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <p>正在加载 Mod...</p>
      </div>
      <div v-else-if="filteredMods.length" class="mod-list">
        <div
          v-for="mod in filteredMods"
          :key="mod.filePath"
          class="mod-item"
          :class="{ selected: selectedMod === mod.filePath, 'has-update': updateInfoMap[mod.filePath]?.hasUpdate }"
          @click="selectMod(mod.filePath)"
          @mouseenter="mod.hovered = true"
          @mouseleave="mod.hovered = false"
        >
          <!-- 更新中进度条 -->
          <div v-if="updatingMod === mod.filePath" class="mod-update-progress-bar">
            <div class="mod-update-progress-fill" :style="{ width: ((updateProgressMap[mod.filePath] ?? 0) * 100) + '%' }"></div>
          </div>

          <img v-if="mod.logoUrl" :src="mod.logoUrl" class="mod-icon" alt=""
               @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'" />
          <div v-else class="mod-icon-default">{{ mod.name.slice(0, 1).toUpperCase() }}</div>

          <div class="mod-info">
            <div class="mod-name-row">
              <span class="mod-name">{{ mod.name }}</span>
              <span class="mod-version">{{ mod.version }}</span>
              <span v-if="!mod.enabled" class="mod-disabled-badge">已禁用</span>
              <!-- 有更新角标 -->
              <span v-if="updateInfoMap[mod.filePath]?.hasUpdate" class="mod-update-badge">
                ↑ {{ updateInfoMap[mod.filePath].latestVersionName }}
              </span>
            </div>
            <p class="mod-desc">{{ mod.description || '暂无描述' }}</p>
          </div>

          <div class="mod-actions" :class="{ visible: mod.hovered || selectedMod === mod.filePath }">
            <button class="mod-action-btn" @click.stop="showModDetails(mod)">详情</button>
            <button class="mod-action-btn" @click.stop="openModFile(mod)">文件位置</button>
            <button class="mod-action-btn" @click.stop="toggleModEnable(mod)">{{ mod.enabled ? '禁用' : '启用' }}</button>
            <button class="mod-action-btn danger" @click.stop="removeMod(mod)">删除</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-text-muted)" stroke-width="1.5"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 17v-5l-2 2-2-2v5"/></svg>
        <p>暂无符合条件的 Mod</p>
      </div>
    </div>

    <!-- 底部操作栏（单点选中时出现） -->
    <div v-if="selectedMod" class="mod-bottom-bar">
      <span class="mod-bottom-label">已选中：{{ selectedModName }}</span>
      <div class="mod-bottom-actions">
        <button
          class="mod-bottom-btn"
          :class="{ 'has-update': selectedModHasUpdate }"
          :disabled="updatingMod === selectedMod"
          @click="updateSelectedMod"
        >
          <template v-if="updatingMod === selectedMod">
            更新中 {{ Math.round((updateProgressMap[selectedMod] ?? 0) * 100) }}%
          </template>
          <template v-else-if="selectedModHasUpdate">↑ 更新可用</template>
          <template v-else>检查更新</template>
        </button>
        <button class="mod-bottom-btn" @click="toggleSelectedModEnable">{{ selectedModEnabled ? '禁用' : '启用' }}</button>
        <button class="mod-bottom-btn danger" @click="removeSelectedMod">删除</button>
        <button class="mod-bottom-btn" @click="selectedMod = null">取消选择</button>
      </div>
    </div>

    <!-- Mod 详情弹窗 -->
    <transition name="modal-fade">
      <div v-if="showDetailModal" class="mod-detail-overlay" @click.self="showDetailModal = false">
        <div class="mod-detail-window">
          <header class="mod-detail-header">
            <span class="mod-detail-title">Mod 详情</span>
            <button class="mod-detail-close" @click="showDetailModal = false">
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg>
            </button>
          </header>
          <div class="mod-detail-body" v-if="selectedDetailMod">
            <img v-if="selectedDetailMod.logoUrl" :src="selectedDetailMod.logoUrl" class="mod-detail-icon" />
            <div v-else class="mod-detail-icon-default">{{ selectedDetailMod.name[0] }}</div>

            <h3 class="mod-detail-name">{{ selectedDetailMod.name }}</h3>
            <p class="mod-detail-version">版本：{{ selectedDetailMod.version }}</p>
            <p v-if="selectedDetailMod.authors?.length" class="mod-detail-authors">
              作者：{{ selectedDetailMod.authors.join('，') }}
            </p>
            <p v-if="selectedDetailMod.description" class="mod-detail-desc">
              {{ selectedDetailMod.description }}
            </p>
            <p v-if="selectedDetailMod.dependencies?.length" class="mod-detail-deps">
              依赖：{{ selectedDetailMod.dependencies.join('，') }}
            </p>
            <p v-if="selectedDetailMod.url" class="mod-detail-url">
              链接：<a :href="selectedDetailMod.url" target="_blank">{{ selectedDetailMod.url }}</a>
            </p>
            <p class="mod-detail-path">路径：{{ selectedDetailMod.filePath }}</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  gameDir: string
  mcVersion?: string
  loader?: string
}>()

const router = useRouter()

interface ModItem {
  name: string
  version: string
  description: string
  logoUrl: string
  enabled: boolean
  filePath: string
  fileName: string
  url: string
  authors: string[]
  dependencies: string[]
  hovered?: boolean
}

interface ModUpdateInfo {
  filePath: string
  hasUpdate: boolean
  currentVersionName?: string
  latestVersionName?: string
  latestDownloadUrl?: string
}

// 数据
const modSearchText = ref('')
const modFilter = ref('all')
const modsLoading = ref(false)
const installedMods = ref<ModItem[]>([])

// 更新检测状态
const checkingUpdates = ref(false)
// filePath → ModUpdateInfo
const updateInfoMap = ref<Record<string, ModUpdateInfo>>({})
const updatingMod = ref<string | null>(null)  // 正在更新的 filePath
const updateProgressMap = ref<Record<string, number>>({})  // filePath → 0~1

// 可更新的 mod 数量（用于 tab 提示）
const hasUpdateCount = computed(() =>
  Object.values(updateInfoMap.value).filter((u: ModUpdateInfo) => u.hasUpdate).length
)

// 单点选中
const selectedMod = ref<string | null>(null)
const selectedModName = computed(() => {
  if (!selectedMod.value) return ''
  const m = installedMods.value.find(m => m.filePath === selectedMod.value)
  return m?.name || ''
})
const selectedModEnabled = computed(() => {
  if (!selectedMod.value) return false
  const m = installedMods.value.find(m => m.filePath === selectedMod.value)
  return m?.enabled !== false
})
const selectedModHasUpdate = computed(() => {
  if (!selectedMod.value) return false
  return updateInfoMap.value[selectedMod.value]?.hasUpdate === true
})

// 点击选中 / 再点击取消
function selectMod(filePath: string) {
  selectedMod.value = selectedMod.value === filePath ? null : filePath
}

// 详情弹窗
const showDetailModal = ref(false)
const selectedDetailMod = ref<ModItem | null>(null)

// 筛选 Tabs
const modFilterTabs = computed(() => {
  const all = installedMods.value.length
  const enabled = installedMods.value.filter(m => m.enabled).length
  const disabled = installedMods.value.filter(m => !m.enabled).length
  return [
    { key: 'all', label: '全部', count: all },
    { key: 'enabled', label: '启用', count: enabled },
    { key: 'disabled', label: '禁用', count: disabled },
  ]
})

// 过滤后的列表
const filteredMods = computed(() => {
  let list = installedMods.value
  if (modFilter.value === 'enabled') {
    list = list.filter(m => m.enabled)
  } else if (modFilter.value === 'disabled') {
    list = list.filter(m => !m.enabled)
  }
  if (modSearchText.value.trim()) {
    const kw = modSearchText.value.toLowerCase()
    list = list.filter(m =>
      m.name.toLowerCase().includes(kw) ||
      (m.description || '').toLowerCase().includes(kw)
    )
  }
  return list
})

// 加载 Mod 列表
async function loadMods() {
  if (!props.gameDir) return
  modsLoading.value = true
  try {
    const result = await window.electronAPI?.mod.list(props.gameDir)
    const mods = Array.isArray(result) ? result : (result?.data || [])
    installedMods.value = mods.map((m: any) => ({
      name: m.name,
      version: m.version || '未知',
      description: m.description || m.fileName || '',
      logoUrl: m.logoUrl || '',
      hovered: false,
      enabled: m.enabled !== false,
      filePath: m.filePath,
      fileName: m.fileName || '',
      url: m.url || '',
      authors: m.authors || [],
      dependencies: m.dependencies || [],
    }))
  } catch (e) {
    installedMods.value = []
  } finally {
    modsLoading.value = false
  }
}

// 检查所有 mod 更新
async function checkAllUpdates() {
  if (checkingUpdates.value || installedMods.value.length === 0) return
  checkingUpdates.value = true
  updateInfoMap.value = {}
  try {
    const api = window.electronAPI
    if (!api?.mod?.checkUpdate) return
    const result = await api.mod.checkUpdate(
      installedMods.value,
      props.mcVersion,
      props.loader
    )
    if (result?.ok && Array.isArray(result.data)) {
      const map: Record<string, ModUpdateInfo> = {}
      for (const info of result.data) {
        map[info.filePath] = info
      }
      updateInfoMap.value = map
    }
  } catch (e) {
  } finally {
    checkingUpdates.value = false
  }
}

// 底部栏操作（单选）
async function updateSelectedMod() {
  if (!selectedMod.value) return
  const mod = installedMods.value.find(m => m.filePath === selectedMod.value)
  const info = updateInfoMap.value[selectedMod.value]
  if (!mod || !info?.hasUpdate) {
    // 还没检查或没有更新，先检查一次
    await checkAllUpdates()
    const newInfo = updateInfoMap.value[selectedMod.value]
    if (!newInfo?.hasUpdate) {
      alert(`「${mod?.name || ''}」已是最新版本（${mod?.version || ''}）`)
      return
    }
    await doUpdateMod(mod, updateInfoMap.value[selectedMod.value])
    return
  }
  await doUpdateMod(mod, info)
}

async function doUpdateMod(mod: ModItem, info: ModUpdateInfo) {
  if (!info?.latestDownloadUrl) {
    alert('未找到可下载的更新文件')
    return
  }
  if (!confirm(`更新「${mod.name}」\n${info.currentVersionName} → ${info.latestVersionName}？`)) return

  updatingMod.value = mod.filePath
  updateProgressMap.value[mod.filePath] = 0

  try {
    const api = window.electronAPI

    // 监听更新进度
    const unsubProgress = api.mod?.onUpdateProgress?.((data: { filePath: string; progress: number }) => {
      if (data.filePath === mod.filePath) {
        updateProgressMap.value[data.filePath] = data.progress
      }
    })

    const result = await api.mod.update(mod, info)
    unsubProgress?.()

    if (result?.ok) {
      // 从 updateInfoMap 清除已更新的记录
      const newMap = { ...updateInfoMap.value }
      delete newMap[mod.filePath]
      updateInfoMap.value = newMap
      await loadMods()
    } else {
      alert(`更新失败：${result?.error || '未知错误'}`)
    }
  } catch (e: any) {
    alert(`更新出错：${e.message}`)
  } finally {
    updatingMod.value = null
    delete updateProgressMap.value[mod.filePath]
  }
}

async function toggleSelectedModEnable() {
  if (!selectedMod.value) return
  const mod = installedMods.value.find(m => m.filePath === selectedMod.value)
  if (!mod) return
  try {
    if (mod.enabled) {
      await window.electronAPI?.mod.disable(mod.filePath)
    } else {
      await window.electronAPI?.mod.enable(mod.filePath)
    }
    await loadMods()
  } catch (e) {
  }
}

async function removeSelectedMod() {
  if (!selectedMod.value) return
  const mod = installedMods.value.find(m => m.filePath === selectedMod.value)
  if (!mod) return
  if (!confirm(`确定要删除 Mod「${mod.name}」吗？`)) return
  try {
    await window.electronAPI?.mod.uninstall(mod.filePath)
    await loadMods()
    selectedMod.value = null
  } catch (e) {
  }
}

async function openModFolder() {
  const api = window.electronAPI
  if (!api?.shell) return
  // 优先版本隔离目录
  const isolated = `${props.gameDir}/mods`
  const exists = await api.path?.exists(isolated)
  if (exists) {
    await api.shell.openPath(isolated)
  } else {
    // 回退全局 .minecraft/mods
    const parts = props.gameDir.split(/[\\/]/)
    const idx = parts.indexOf('.minecraft')
    const mcRoot = idx >= 0 ? parts.slice(0, idx + 1).join('/') : props.gameDir
    await api.shell.openPath(`${mcRoot}/mods`)
  }
}

// 从文件安装 Mod
async function installModFromFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = '.jar'
  input.onchange = async () => {
    const files = Array.from(input.files || [])
    if (!files.length) return
    const isolatedMods = `${props.gameDir}/mods`
    const isolatedExists = await window.electronAPI?.path?.exists(isolatedMods)
    let dest: string
    if (isolatedExists) {
      dest = isolatedMods
    } else {
      const parts = props.gameDir.split(/[\\/]/)
      const idx = parts.indexOf('.minecraft')
      const mcRoot = idx >= 0 ? parts.slice(0, idx + 1).join('/') : props.gameDir
      dest = `${mcRoot}/mods`
    }
    await window.electronAPI?.mod.installBatch(
      files.map(f => f.path),
      dest
    )
    await loadMods()
  }
  input.click()
}

// 显示详情
function showModDetails(mod: ModItem) {
  selectedDetailMod.value = mod
  showDetailModal.value = true
}

// 打开文件位置
async function openModFile(mod: ModItem) {
  const dir = mod.filePath.replace(/[\\/][^\\/]+$/, '')
  await window.electronAPI?.shell.openPath(dir)
}

// 切换启用/禁用
async function toggleModEnable(mod: ModItem) {
  try {
    if (mod.enabled) {
      await window.electronAPI?.mod.disable(mod.filePath)
    } else {
      await window.electronAPI?.mod.enable(mod.filePath)
    }
    await loadMods()
  } catch (e) {
  }
}

// 删除单个 Mod
async function removeMod(mod: ModItem) {
  if (!confirm(`确定要删除 Mod「${mod.name}」吗？`)) return
  try {
    await window.electronAPI?.mod.uninstall(mod.filePath)
    await loadMods()
  } catch (e) {
  }
}

onMounted(() => {
  loadMods()
})
</script>

<style scoped lang="scss">
.mod-manager {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  overflow: hidden;
}

/* 搜索栏 */
.mod-search-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--mcla-bg-secondary);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  padding: 0 12px;
  height: 36px;
  svg { flex-shrink: 0; }
}
.mod-search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--mcla-text-primary);
  font-size: 13px;
  outline: none;
  &::placeholder { color: var(--mcla-text-muted); }
}

/* 操作按钮栏 */
.mod-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.form-action-btn {
  padding: 6px 14px;
  border-radius: var(--mcla-radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  border: 1px solid var(--mcla-border-color);
  background: var(--mcla-bg-elevated);
  color: var(--mcla-text-primary);
  &:hover { background: var(--mcla-bg-hover); }
  &.primary-outline {
    border-color: var(--mcla-primary);
    color: var(--mcla-primary);
    &:hover { background: rgba(99,102,234,0.08); }
  }
}

/* 筛选 Tabs */
.mod-tabs {
  display: flex;
  gap: 4px;
}
.mod-tab {
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: var(--mcla-text-secondary);
  font-size: 12.5px;
  cursor: pointer;
  border-radius: var(--mcla-radius-sm);
  transition: all 0.12s;
  &.active {
    background: var(--mcla-primary);
    color: #fff;
  }
  &:hover:not(.active) { background: var(--mcla-bg-hover); }
}
.mod-tab-count { opacity: 0.7; font-size: 11px; }

/* Mod 列表 */
.mod-list-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.mod-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mod-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--mcla-radius-md);
  background: var(--mcla-bg-secondary);
  border: 1px solid transparent;
  transition: all 0.12s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  &:hover { border-color: var(--mcla-border-color); background: var(--mcla-bg-hover); }
  &.selected {
    border-color: var(--mcla-primary);
    background: rgba(99,102,234,0.06);
    border-left: 3px solid var(--mcla-primary);
    padding-left: 9px;
  }
}
.mod-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--mcla-primary);
  cursor: pointer;
  flex-shrink: 0;
}
.mod-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--mcla-radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--mcla-bg-elevated);
}
.mod-icon-default {
  width: 36px;
  height: 36px;
  border-radius: var(--mcla-radius-sm);
  background: var(--mcla-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}
.mod-info {
  flex: 1;
  min-width: 0;
}
.mod-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mod-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mod-version {
  font-size: 11px;
  color: var(--mcla-text-muted);
  flex-shrink: 0;
}
.mod-disabled-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--mcla-warning, #f59e0b);
  color: #fff;
  flex-shrink: 0;
}
.mod-desc {
  font-size: 11.5px;
  color: var(--mcla-text-secondary);
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 悬浮操作按钮 */
.mod-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;
  flex-shrink: 0;
  &.visible { opacity: 1; }
}
.mod-action-btn {
  padding: 4px 10px;
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  background: var(--mcla-bg-elevated);
  color: var(--mcla-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  &:hover { background: var(--mcla-bg-hover); }
  &.danger { color: var(--mcla-error, #ef4444); border-color: var(--mcla-error, #ef4444); }
  &.danger:hover { background: rgba(239,68,68,0.1); }
}

/* 底部操作栏 */
.mod-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--mcla-bg-secondary);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  flex-shrink: 0;
}
.mod-bottom-count {
  font-size: 12.5px;
  color: var(--mcla-text-secondary);
  white-space: nowrap;
}
.mod-bottom-actions {
  display: flex;
  gap: 6px;
}
.mod-bottom-btn {
  padding: 5px 12px;
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  background: var(--mcla-bg-elevated);
  color: var(--mcla-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  &:hover:not(:disabled) { background: var(--mcla-bg-hover); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &.danger { color: var(--mcla-error, #ef4444); }
  &.danger:hover:not(:disabled) { background: rgba(239,68,68,0.1); }
}

/* 详情弹窗 */
.mod-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.mod-detail-window {
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-xl);
  border: 1px solid var(--mcla-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--mcla-shadow-xl);
}
.mod-detail-header {
  height: 42px;
  background: var(--mcla-bg-secondary);
  border-bottom: 1px solid var(--mcla-border-color);
  display: flex;
  align-items: center;
  padding: 0 12px;
  justify-content: space-between;
}
.mod-detail-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary);
}
.mod-detail-close {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: var(--mcla-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--mcla-radius-sm);
  transition: all 0.12s;
  &:hover { background: var(--mcla-bg-hover); color: var(--mcla-text-primary); }
}
.mod-detail-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.mod-detail-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--mcla-radius-md);
  object-fit: cover;
  background: var(--mcla-bg-elevated);
}
.mod-detail-icon-default {
  width: 64px;
  height: 64px;
  border-radius: var(--mcla-radius-md);
  background: var(--mcla-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 28px;
}
.mod-detail-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--mcla-text-primary);
  text-align: center;
}
.mod-detail-version,
.mod-detail-authors,
.mod-detail-deps,
.mod-detail-url,
.mod-detail-path {
  font-size: 13px;
  color: var(--mcla-text-secondary);
  text-align: center;
  word-break: break-all;
}
.mod-detail-desc {
  font-size: 13px;
  color: var(--mcla-text-primary);
  text-align: center;
  line-height: 1.5;
}
.mod-detail-url a {
  color: var(--mcla-primary);
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--mcla-text-muted);
  font-size: 13px;
  gap: 10px;
  .spin-icon { animation: spin 1s linear infinite; }
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 弹窗过渡 */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* ── Mod 更新相关 ── */
.spin-icon-sm {
  animation: spin 1s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

/* mod 卡片有更新时的右侧橙色细边 */
.mod-item.has-update {
  border-right: 3px solid #f59e0b;
}

/* 有更新角标 */
.mod-update-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.35);
  margin-left: 4px;
}

/* 更新中进度条（覆盖在卡片顶部） */
.mod-update-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 2px 2px 0 0;
  overflow: hidden;

  .mod-update-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--mcla-primary), #818cf8);
    transition: width 0.2s ease;
  }
}

/* 底部操作栏「更新」按钮有更新时变橙色高亮 */
.mod-bottom-btn.has-update {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);

  &:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.22);
  }
}

/* 工具栏检查更新按钮检查中状态 */
.form-action-btn.checking {
  opacity: 0.7;
  cursor: wait;
}
</style>
