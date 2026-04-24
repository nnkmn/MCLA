<template>
  <div class="instances-page">
    <!-- 顶部操作栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">实例管理</h2>
        <span class="instance-count">{{ instances.length }} 个实例</span>
      </div>
      <div class="toolbar-right">
        <!-- 视图切换 -->
        <div class="view-toggle">
          <button
            class="toggle-btn" :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'" title="网格视图"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button
            class="toggle-btn" :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'" title="列表视图"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <button class="btn-primary" @click="showNewInstance = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          新建实例
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input type="text" v-model="searchQuery" placeholder="搜索实例名称或版本..." />
    </div>

    <!-- ===== 网格视图 ====== -->
    <div v-if="viewMode === 'grid' && filteredInstances.length" class="instance-grid">
      <div
        v-for="inst in filteredInstances"
        :key="inst.id"
        class="instance-card"
        @click="selectInstance(inst)"
        :class="{ selected: selectedId === inst.id }"
      >
        <!-- 封面图区域 -->
        <div class="card-cover" :style="{ background: getCoverGradient(inst) }">
          <div class="cover-loader-tag" v-if="getLoaderLabel(inst)">
            {{ getLoaderLabel(inst) }}
          </div>
          <div class="cover-version-tag">
            {{ inst.mc_version }}
          </div>
        </div>

        <!-- 信息区域 -->
        <div class="card-body">
          <h3 class="card-name">{{ inst.name }}</h3>
          <p class="card-meta">
            <span class="meta-item" v-if="getLoaderLabel(inst)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
              {{ getLoaderLabel(inst) }}
            </span>
            <span class="meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {{ inst.last_played ? formatTime(inst.last_played) : '从未启动' }}
            </span>
          </p>
        </div>

        <!-- 操作按钮区 -->
        <div class="card-actions">
          <button class="action-btn launch" @click.stop="launchInstance(inst)" title="启动">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="action-btn" @click.stop="openFolder(inst)" title="打开文件夹">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </button>
          <button class="action-btn" @click.stop="editInstance(inst)" title="设置">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2.83 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
          <button class="action-btn danger" @click.stop="confirmDeleteInstance(inst)" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 列表视图 ====== -->
    <div v-if="viewMode === 'list' && filteredInstances.length" class="instance-list">
      <div
        v-for="inst in filteredInstances"
        :key="inst.id"
        class="list-item"
        @click="selectInstance(inst)"
        :class="{ selected: selectedId === inst.id }"
      >
        <div class="list-icon" :style="{ background: getCoverGradient(inst) }">
          <span class="list-icon-ver">{{ inst.mc_version }}</span>
        </div>
        <div class="list-info">
          <p class="list-name">{{ inst.name }}</p>
          <p class="list-meta">{{ inst.mc_version }} · {{ getLoaderLabel(inst) || '原版' }} · {{ inst.last_played ? formatTime(inst.last_played) : '从未启动' }}</p>
        </div>
        <div class="list-actions">
          <button class="action-btn launch" @click.stop="launchInstance(inst)" title="启动">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="action-btn danger" @click.stop="confirmDeleteInstance(inst)" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!filteredInstances.length" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="color:var(--mcla-text-muted);margin-bottom:12px">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
      </svg>
      <p>{{ searchQuery ? '没有匹配的实例' : '暂无游戏实例' }}</p>
      <span class="hint" v-if="!searchQuery">点击右上角按钮创建你的第一个实例</span>
    </div>

    <!-- 新建实例弹窗 -->
    <div class="modal-overlay" v-if="showNewInstance" @click.self="showNewInstance = false">
      <div class="modal-content">
        <h3>新建游戏实例</h3>
        <form @submit.prevent="handleCreateInstance">
          <div class="form-group">
            <label>实例名称</label>
            <input v-model="newInst.name" placeholder="例如：生存冒险" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>游戏版本</label>
              <select v-model="newInst.mc_version">
                <option value="1.20.4">1.20.4</option>
                <option value="1.20.1">1.20.1</option>
                <option value="1.21.3">1.21.3</option>
                <option value="1.19.2">1.19.2</option>
                <option value="1.18.2">1.18.2</option>
              </select>
            </div>
            <div class="form-group">
              <label>加载器</label>
              <select v-model="newInst.loader_type">
                <option value="vanilla">原版</option>
                <option value="fabric">Fabric</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showNewInstance = false">取消</button>
            <button type="submit" class="btn-primary">创建实例</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 实例类型（与数据库一致）
interface Instance {
  id: string
  name: string
  path: string
  mc_version: string
  loader_type: 'vanilla' | 'forge' | 'fabric' | 'neoforge' | 'quilt'
  loader_version: string
  icon: string
  java_path: string
  jvm_args: string
  min_memory: number
  max_memory: number
  width: number
  height: number
  fullscreen: number
  is_favorited: number
  last_played: string | null
  play_time: number
  created_at: string
  updated_at: string
}

const searchQuery = ref('')
const showNewInstance = ref(false)
const selectedId = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const instances = ref<Instance[]>([])

// 新建表单
const newInst = ref({
  name: '',
  mc_version: '1.20.4',
  loader_type: 'vanilla'
})

// 封面渐变色池（基于 ID 哈希分配，保持稳定）
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
]

function getCoverGradient(inst: Instance): string {
  let hash = 0
  for (let i = 0; i < inst.id.length; i++) {
    hash = ((hash << 5) - hash) + inst.id.charCodeAt(i)
    hash |= 0
  }
  return gradients[Math.abs(hash) % gradients.length]
}

function getLoaderLabel(inst: Instance): string {
  if (!inst.loader_type || inst.loader_type === 'vanilla') return ''
  if (inst.loader_version) return `${capitalizeFirst(inst.loader_type)} ${inst.loader_version}`
  return capitalizeFirst(inst.loader_type)
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// 从数据库加载实例列表
async function loadInstances() {
  try {
    const result = await window.electronAPI?.instance?.list()
    instances.value = (result || []) as Instance[]
  } catch (e) {
    console.error('[Instances] 加载失败:', e)
    instances.value = []
  }
}

const filteredInstances = computed(() => {
  if (!searchQuery.value) return instances.value
  const q = searchQuery.value.toLowerCase()
  return instances.value.filter(i =>
    i.name.toLowerCase().includes(q) || i.mc_version.includes(q)
  )
})

function selectInstance(inst: Instance) { selectedId.value = inst.id }

// 创建实例（写入数据库）
async function handleCreateInstance() {
  if (!newInst.value.name.trim()) return

  try {
    await window.electronAPI?.instance?.create({
      name: newInst.value.name.trim(),
      path: '', // 后续由后端生成路径
      mc_version: newInst.value.mc_version,
      loader_type: newInst.value.loader_type,
      loader_version: '',
      icon: '',
      java_path: '',
      jvm_args: '',
      min_memory: 512,
      max_memory: 2048,
      width: 854,
      height: 480,
      fullscreen: 0,
      is_favorited: 0,
      last_played: null,
      play_time: 0,
    })

    // 重新加载列表
    await loadInstances()

    // 重置表单
    newInst.value = { name: '', mc_version: '1.20.4', loader_type: 'vanilla' }
    showNewInstance.value = false
  } catch (e) {
    console.error('[Instances] 创建失败:', e)
  }
}

function launchInstance(inst: Instance) {
  console.log('Launch:', inst.name)
  // TODO: 调用 game:launch IPC
}

async function openFolder(inst: Instance) {
  const path = inst.path || ''
  if (path && window.electronAPI?.path?.exists) {
    const exists = await window.electronAPI.path.exists(path)
    if (exists) {
      window.electronAPI.shell?.openPath?.(path)
    }
  }
}

function editInstance(inst: Instance) {
  console.log('Edit:', inst.name)
  // TODO: 打开设置弹窗
}

// 确认删除（写入数据库）
async function confirmDeleteInstance(inst: Instance) {
  if (!confirm(`确认删除实例「${inst.name}」？此操作不可撤销。`)) return
  try {
    await window.electronAPI?.instance?.delete(inst.id)
    await loadInstances()
    if (selectedId.value === inst.id) selectedId.value = ''
  } catch (e) {
    console.error('[Instances] 删除失败:', e)
  }
}

function formatTime(dateStr: string): string {
  const ts = new Date(dateStr).getTime()
  if (isNaN(ts)) return '未知'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

onMounted(() => {
  loadInstances()
})
</script>

<style scoped lang="scss">
.instances-page {
  padding: 20px 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ====== 工具栏 ====== */
.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.page-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: var(--mcla-text-primary);
}

.instance-count {
  font-size: 12px;
  color: var(--mcla-text-muted);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 视图切换 */
.view-toggle {
  display: flex;
  background: var(--mcla-bg-primary);
  border-radius: var(--mcla-radius-sm);
  border: 1px solid var(--mcla-border-color);

  .toggle-btn {
    width: 32px;
    height: 30px;
    border: none;
    background: transparent;
    color: var(--mcla-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    transition: all 0.12s;

    &:hover { color: var(--mcla-text-secondary); }
    &.active {
      background: var(--mcla-bg-elevated);
      color: var(--mcla-primary-600);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
  }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  background: var(--mcla-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: var(--mcla-primary-hover); transform: translateY(-1px); box-shadow: var(--mcla-shadow-md); }
  &:active { transform: scale(0.97); }
}

.btn-cancel {
  padding: 7px 20px;
  background: transparent;
  color: var(--mcla-text-secondary);
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: var(--mcla-bg-tertiary); }
}

/* ====== 搜索 ====== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  margin-bottom: 16px;
  flex-shrink: 0;

  svg { color: var(--mcla-text-muted); flex-shrink: 0; }
  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--mcla-text-primary);
    background: transparent;

    &::placeholder { color: var(--mcla-text-muted); }
  }
}

/* ====== 网格视图 ====== */
.instance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
}

.instance-card {
  background: var(--mcla-bg-elevated);
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--mcla-transition-normal);
  display: flex;
  flex-direction: column;
  box-shadow: var(--mcla-shadow-sm);
  height: 160px; /* 调整高度更紧凑 */

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--mcla-shadow-glow-primary);
    border-color: var(--mcla-primary-400);
  }

  &.selected {
    border-color: var(--mcla-primary-500);
    box-shadow: 0 0 0 3px rgba(99,102,234,0.15);
  }
}

/* 封面 */
.card-cover {
  height: 80px; /* 减小封面高度 */
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3));
  }
}

.cover-loader-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 1;
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.cover-version-tag {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 1;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  border-radius: 4px;
}

/* 信息区 */
.card-body {
  padding: 8px 12px 6px;
  flex: 1;

  .card-name {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--mcla-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    margin: 3px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: var(--mcla-text-muted);

    svg { flex-shrink: 0; opacity: 0.7; }
  }
}

/* 操作按钮 */
.card-actions {
  display: flex;
  border-top: 1.5px solid var(--mcla-border-color);
  padding: 2px;

  .action-btn {
    flex: 1;
    height: 34px;
    border: none;
    background: transparent;
    color: var(--mcla-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--mcla-radius-sm);
    transition: all 0.12s;

    &:hover {
      background: var(--mcla-bg-tertiary);
      color: var(--mcla-primary-600);
    }

    &.launch {
      &:hover {
        background: var(--mcla-primary);
        color: #fff;
      }
    }

    &.danger {
      &:hover {
        background: var(--mcla-error-bg);
        color: var(--mcla-error);
      }
    }
  }
}

/* ====== 列表视图 ====== */
.instance-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  flex: 1;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--mcla-bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--mcla-radius-md);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--mcla-border-color);
    box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  }

  &.selected {
    border-color: var(--mcla-primary-500);
    background: var(--mcla-primary-50);
  }
}

.list-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--mcla-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .list-icon-ver {
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  }
}

.list-info {
  flex: 1;
  min-width: 0;

  .list-name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--mcla-text-primary);
  }

  .list-meta {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--mcla-text-muted);
  }
}

.list-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;

  .list-item:hover & { opacity: 1; }

  .action-btn {
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: var(--mcla-primary-500);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--mcla-radius-sm);
    transition: all 0.12s;

    &:hover { background: var(--mcla-primary); color: #fff; }
    &.danger { color: var(--mcla-error); &:hover { background: var(--mcla-error); color: #fff; } }
  }
}

/* ====== 空状态 ====== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--mcla-text-secondary);

  p { margin: 0 0 6px; font-size: 14px; }
  .hint { font-size: 12px; color: var(--mcla-text-muted); }
}

/* ====== 弹窗 ====== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-xl);
  padding: 28px 24px;
  width: 420px;
  max-width: 90vw;
  box-shadow: var(--mcla-shadow-xl);
  border: 1px solid var(--mcla-border-color);

  h3 { margin: 0 0 20px; font-size: 17px; font-weight: 700; color: var(--mcla-text-primary); }

  form { display: flex; flex-direction: column; gap: 14px; }
}

.form-row { display: flex; gap: 12px; }

.form-group {
  flex: 1;
  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--mcla-text-secondary);
    margin-bottom: 5px;
  }

  input, select {
    width: 100%;
    padding: 8px 12px;
    border: 1.5px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-sm);
    font-size: 13px;
    color: var(--mcla-text-primary);
    background: var(--mcla-bg-primary);
    outline: none;
    transition: all 0.15s;

    &:focus { border-color: var(--mcla-primary-400); box-shadow: 0 0 0 3px rgba(99,102,234,0.1); }
    &::placeholder { color: var(--mcla-text-muted); }
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
