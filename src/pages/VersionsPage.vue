<template>
  <div class="versions-page">
    <div class="page-header">
      <h2>版本管理</h2>
    </div>

    <!-- 版本列表 -->
    <section class="versions-section">
      <div class="section-header">
        <h3>Minecraft 版本</h3>
        <div class="section-actions">
          <!-- 搜索框 -->
          <input
            class="search-input"
            v-model="searchKeyword"
            placeholder="搜索版本号..."
            :disabled="loading"
          />
          <button class="btn-primary" @click="refreshVersions" :disabled="loading">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              :class="{ spinning: loading }"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            {{ loading ? '加载中...' : '刷新' }}
          </button>
        </div>
      </div>

      <!-- 分类 Tabs -->
      <div class="filter-tabs" v-if="!loading && versions.length">
        <button
          class="filter-tab"
          :class="{ active: activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          全部 ({{ filteredVersions('all').length }})
        </button>
        <button
          class="filter-tab"
          :class="{ active: activeFilter === 'release' }"
          @click="activeFilter = 'release'"
        >
          正式版 ({{ filteredVersions('release').length }})
        </button>
        <button
          class="filter-tab"
          :class="{ active: activeFilter === 'snapshot' }"
          @click="activeFilter = 'snapshot'"
        >
          快照版 ({{ filteredVersions('snapshot').length }})
        </button>
        <button
          class="filter-tab"
          :class="{ active: activeFilter === 'old' }"
          @click="activeFilter = 'old'"
        >
          旧版 ({{ filteredVersions('old').length }})
        </button>
      </div>

      <!-- 加载中状态：骨架屏 -->
      <div class="skeleton-state" v-if="loading">
        <div class="skeleton-item" v-for="n in 8" :key="n">
          <div class="skeleton-id"></div>
          <div class="skeleton-type"></div>
          <div class="skeleton-date"></div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div class="error-state" v-else-if="error">
        <p class="error-text">{{ error }}</p>
        <button class="btn-primary" @click="refreshVersions">重试</button>
      </div>

      <!-- 版本列表（按需渲染：首次 100 条 + 滚动加载更多） -->
      <div class="versions-list" v-else-if="displayedVersions.length">
        <div
          class="version-item"
          v-for="version in displayedVersions"
          :key="version.id"
          :class="{ selected: selectedVersion === version.id }"
          @click="selectVersion(version.id)"
        >
          <div class="version-info">
            <div class="version-id">{{ version.id }}</div>
            <div class="version-type" :class="version.type">{{ version.type }}</div>
            <div class="version-date">{{ formatDate(version.releaseTime) }}</div>
          </div>
          <div class="version-actions">
            <button class="btn-sm btn-ghost" @click.stop="selectVersion(version.id)">
              {{ selectedVersion === version.id ? '已选中' : '选择' }}
            </button>
          </div>
        </div>

        <!-- "加载更多"：如果还有剩余数据 -->
        <div class="load-more" v-if="hasMoreData" @click="loadMore">
          <button class="btn-ghost" :disabled="loading">
            加载更多（剩余 {{ totalFiltered - displayedVersions.length }} 条）
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <p>
          {{ searchKeyword || activeFilter !== 'all' ? '没有匹配的版本，请调整搜索条件。' : '暂无版本数据' }}
        </p>
      </div>
    </section>

    <!-- ModLoader 安装 -->
    <section class="modloader-section">
      <div class="section-header">
        <h3>安装 ModLoader</h3>
      </div>

      <div class="modloader-form">
        <div class="form-group">
          <label>选择 Minecraft 版本</label>
          <select class="input-field" v-model="selectedVersion">
            <option value="">请选择版本</option>
            <option v-for="version in versions" :key="version.id" :value="version.id">
              {{ version.id }} ({{ version.type }})
            </option>
          </select>
        </div>

        <div class="form-group" v-if="selectedVersion">
          <label>选择 ModLoader</label>
          <div class="loader-options">
            <!-- Fabric -->
            <template v-if="fabricVersions.length">
              <label class="loader-option" v-for="v in fabricVersions.slice(0, 3)" :key="v.id">
                <input type="radio" :value="`fabric:${v.version}`" v-model="selectedLoader" />
                <span>{{ v.name }}</span>
              </label>
            </template>
            <!-- Forge -->
            <template v-if="forgeVersions.length">
              <label class="loader-option" v-for="v in forgeVersions.slice(0, 3)" :key="v.id">
                <input type="radio" :value="`forge:${v.version}`" v-model="selectedLoader" />
                <span>{{ v.name }}</span>
              </label>
            </template>

            <div class="loader-empty" v-if="!fabricVersions.length && !forgeVersions.length">
              <span class="muted">
                {{ modLoaderLoading ? '正在加载 Mod Loader 版本...' : '该版本暂无可用 Mod Loader' }}
              </span>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button
            class="btn-primary"
            @click="installModLoader"
            :disabled="!selectedVersion || !selectedLoader || modLoaderLoading"
          >
            {{ modLoaderLoading ? '正在安装...' : '安装 ModLoader' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useVersionsStore } from '../stores/versions.store'
import { useInstancesStore } from '../stores/instances.store'

// ===== Pinia Store（代替本地状态） =====
const versionsStore = useVersionsStore()
const instancesStore = useInstancesStore()

// 从 store 派生的响应式数据
const versions = computed(() => versionsStore.versions)
const fabricVersions = computed(() => versionsStore.fabricVersions)
const forgeVersions = computed(() => versionsStore.forgeVersions)
const loading = computed(() => versionsStore.loading)
const error = computed(() => versionsStore.error)

// ===== 页面级 UI 状态 =====
const searchKeyword = ref('')
const activeFilter = ref<'all' | 'release' | 'snapshot' | 'old'>('all')
const pageSize = 100
const displayedCount = ref(pageSize)
const selectedVersion = ref('')
const selectedLoader = ref('')
const modLoaderLoading = ref(false)

// ===== 计算属性：过滤后的版本列表 =====
function filteredVersions(filter: 'all' | 'release' | 'snapshot' | 'old') {
  let list = versions.value

  // 1. 按类型过滤
  if (filter === 'release') list = list.filter((v) => v.type === 'release')
  else if (filter === 'snapshot') list = list.filter((v) => v.type === 'snapshot')
  else if (filter === 'old')
    list = list.filter((v) => v.type === 'old_alpha' || v.type === 'old_beta')

  // 2. 按搜索关键词过滤
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) list = list.filter((v) => v.id.toLowerCase().includes(kw))

  return list
}

/** 当前 Tab + 搜索后的完整数据 */
const totalFiltered = computed(() => filteredVersions(activeFilter.value).length)

/** 实际渲染的数据（分页） */
const displayedVersions = computed(() => filteredVersions(activeFilter.value).slice(0, displayedCount.value))

/** 是否还有更多数据可加载 */
const hasMoreData = computed(() => displayedVersions.value.length < totalFiltered.value)

// ===== 事件处理 =====

/** 从 store 请求版本列表（store 内部处理缓存） */
async function fetchVersions() {
  await versionsStore.fetchVersions(false)
}

/** 强制刷新（跳过前端缓存） */
async function refreshVersions() {
  displayedCount.value = pageSize
  await versionsStore.fetchVersions(true)
}

/** 选择一个版本：同步选中状态 + 按需加载 Mod Loader 列表 */
async function selectVersion(versionId: string) {
  selectedVersion.value = versionId
  selectedLoader.value = ''

  if (versionId) {
    modLoaderLoading.value = true
    try {
      await versionsStore.fetchModLoaderVersions(versionId)
    } finally {
      modLoaderLoading.value = false
    }
  }
}

/** 安装 ModLoader（保持原有逻辑不变，仅增加错误提示） */
async function installModLoader() {
  if (!selectedVersion.value || !selectedLoader.value) return

  const currentInstance = instancesStore.currentInstance
  if (!currentInstance) {
    window.electronAPI?.notification?.send({
      title: '提示',
      body: '请先在实例管理选择一个实例',
      type: 'warning'
    })
    return
  }

  // 解析用户选择的 "loaderType:version"（简单约定）
  const [loaderType, loaderVersion] = selectedLoader.value.split(':')

  try {
    await window.electronAPI.modloader.install(
      currentInstance.id,
      loaderType,
      loaderVersion,
      currentInstance.path
    )
    window.electronAPI?.notification?.send({
      title: '提示',
      body: 'ModLoader 安装开始，请查看日志',
      type: 'info'
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    window.electronAPI?.notification?.send({
      title: '错误',
      body: `安装失败: ${message}`,
      type: 'error'
    })
  }
}

/** 加载更多（分页） */
function loadMore() {
  displayedCount.value += pageSize
}

/** 日期格式化 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// ===== 监听：搜索关键词变化时重置分页计数 =====
watch([searchKeyword, activeFilter], () => {
  displayedCount.value = pageSize
})

// ===== 初始化：进入页面从 store 加载版本列表（store 管理缓存）=====
onMounted(() => {
  fetchVersions()
})
</script>

<style scoped lang="scss">
.versions-page {
  padding: 16px 28px;
  max-width: 720px;
}

.page-header {
  margin-bottom: 20px;
  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
  }
}

.versions-section,
.modloader-section {
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--mcla-border);

  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
  }
}

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  padding: 6px 10px;
  border: 1px solid var(--mcla-border-color);
  border-radius: 6px;
  background: var(--mcla-bg-primary);
  color: var(--mcla-text-primary);
  font-size: 12px;
  width: 180px;

  &:focus {
    outline: none;
    border-color: var(--mcla-primary);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ===== 分类 Tabs ===== */
.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--mcla-border);
  background: var(--mcla-bg-primary);
}

.filter-tab {
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--mcla-text-secondary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--mcla-bg-secondary);
  }
  &.active {
    background: var(--mcla-primary);
    color: white;
    font-weight: 600;
  }
}

/* ===== 骨架屏 ===== */
.skeleton-state {
  padding: 16px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--mcla-bg-primary);

  > div {
    background: linear-gradient(
      90deg,
      var(--mcla-border-color) 25%,
      var(--mcla-bg-secondary) 50%,
      var(--mcla-border-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    height: 14px;
  }

  .skeleton-id {
    width: 120px;
    height: 16px;
  }
  .skeleton-type {
    width: 60px;
  }
  .skeleton-date {
    width: 80px;
    margin-left: auto;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ===== Loading spinner 动画 ===== */
.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 错误状态 ===== */
.error-state {
  padding: 32px 16px;
  text-align: center;
}

.error-text {
  color: var(--mcla-danger, #dc2626);
  font-size: 13px;
  margin: 0 0 16px;
}

/* ===== 版本列表 ===== */
.versions-list {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--mcla-bg-primary);
  transition: all 0.15s;
  cursor: pointer;
  border: 1px solid transparent;

  &:hover {
    background: var(--mcla-bg-secondary);
    border-color: var(--mcla-border-color);
  }

  &.selected {
    border-color: var(--mcla-primary);
    background: color-mix(in srgb, var(--mcla-primary) 8%, var(--mcla-bg-primary));
  }
}

.version-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.version-id {
  font-weight: 600;
  font-size: 14px;
}

.version-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;

  &.release {
    background: #e6f4ea;
    color: #137333;
  }
  &.snapshot {
    background: #e7f1ff;
    color: #1e40af;
  }
  &.old_alpha,
  &.old_beta {
    background: #fef3c7;
    color: #92400e;
  }
}

.version-date {
  font-size: 12px;
  color: var(--mcla-text-muted);
}

.version-actions {
  display: flex;
  gap: 4px;
}

/* ===== "加载更多" ===== */
.load-more {
  padding: 12px 0 4px;
  text-align: center;

  button {
    padding: 6px 16px;
    font-size: 12px;
    background: transparent;
    border: 1px solid var(--mcla-border-color);
    border-radius: 6px;
    color: var(--mcla-text-secondary);
    cursor: pointer;
    transition: all 0.15s;

    &:hover:not(:disabled) {
      border-color: var(--mcla-primary);
      color: var(--mcla-primary);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

/* ===== ModLoader 表单 ===== */
.modloader-form {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--mcla-text-secondary);
    margin-bottom: 5px;
  }
}

.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--mcla-border-color);
  border-radius: 6px;
  background: var(--mcla-bg-primary);
  color: var(--mcla-text-primary);
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--mcla-primary);
  }
}

.loader-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.loader-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.loader-empty {
  font-size: 12px;
  color: var(--mcla-text-muted);
  padding: 8px 0;
}

.muted {
  color: var(--mcla-text-muted);
}

/* ===== 按钮 ===== */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--mcla-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: var(--mcla-primary-hover);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--mcla-border-color);
  color: var(--mcla-text-secondary);
  border-radius: var(--mcla-radius-xs);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--mcla-primary-400);
    color: var(--mcla-primary-600);
  }
}

/* ===== 空状态 ===== */
.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--mcla-text-secondary);
  font-size: 13px;
}
</style>
