<template>
  <div class="versions-page">
    <div class="page-header">
      <h2>版本管理</h2>
    </div>

    <!-- 版本列表 -->
    <section class="versions-section">
      <div class="section-header">
        <h3> Minecraft 版本</h3>
        <div class="section-actions">
          <button class="btn-primary" @click="refreshVersions">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            刷新
          </button>
        </div>
      </div>

      <div class="versions-list" v-if="versions.length">
        <div class="version-item" v-for="version in versions" :key="version.id">
          <div class="version-info">
            <div class="version-id">{{ version.id }}</div>
            <div class="version-type">{{ version.type }}</div>
            <div class="version-date">{{ formatDate(version.releaseTime) }}</div>
          </div>
          <div class="version-actions">
            <button class="btn-sm btn-ghost" @click="selectVersion(version.id)">
              选择
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <p>暂无版本数据，请点击"刷新"按钮获取最新版本</p>
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

        <div class="form-group">
          <label>选择 ModLoader</label>
          <div class="loader-options">
            <label v-for="loader in loaders" :key="loader.id" class="loader-option">
              <input type="radio" :value="loader.id" v-model="selectedLoader">
              <span>{{ loader.name }}</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-primary" @click="installModLoader" :disabled="!selectedVersion || !selectedLoader">
            安装 ModLoader
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useInstancesStore } from '../stores/instances.store'
import type { VersionInfo, ModLoader } from '../types/versions'

const versions = ref<VersionInfo[]>([])
const loaders = ref<ModLoader[]>([])
const selectedVersion = ref('')
const selectedLoader = ref('')
const instancesStore = useInstancesStore()

// 获取版本列表
async function fetchVersions() {
  try {
    const result = await window.electronAPI.versions.list()
    versions.value = result
  } catch (error) {
  }
}

// 获取 ModLoader 列表
async function fetchLoaders() {
  try {
    const result = await window.electronAPI.modloader.list()
    loaders.value = result
  } catch (error) {
  }
}

// 刷新版本
function refreshVersions() {
  fetchVersions()
}

// 选择版本
function selectVersion(versionId: string) {
  selectedVersion.value = versionId
}

// 安装 ModLoader
async function installModLoader() {
  if (!selectedVersion || !selectedLoader) return

  const currentInstance = instancesStore.currentInstance
  if (!currentInstance) {
    alert('请先在实例管理选择一个实例')
    return
  }

  try {
    await window.electronAPI.modloader.install(
      currentInstance.id,
      selectedLoader.value,
      selectedVersion.value,
      currentInstance.path
    )
    alert('ModLoader 安装开始，请查看日志')
  } catch (error) {
    alert(`安装失败: ${error}`)
  }
}

// 格式化日期
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchVersions()
  fetchLoaders()
})
</script>

<style scoped lang="scss">
.versions-page {
  padding: 16px 28px;
  max-width: 720px;
}

.page-header { margin-bottom: 20px; h2 { margin: 0; font-size: 17px; font-weight: 700; } }

.versions-section, .modloader-section {
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
}

.versions-list {
  padding: 16px;
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

  &:hover {
    background: var(--mcla-bg-secondary);
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

  &.release { background: #e6f4ea; color: #137333; }
  &.snapshot { background: #e7f1ff; color: #1e40af; }
  &.old_alpha, &.old_beta { background: #fef3c7; color: #92400e; }
}

.version-date {
  font-size: 12px;
  color: var(--mcla-text-muted);
}

.version-actions {
  display: flex;
  gap: 4px;
}

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
}

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

  &:hover { background: var(--mcla-primary-hover); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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

  &:hover { border-color: var(--mcla-primary-400); color: var(--mcla-primary-600); }
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--mcla-text-secondary);
  font-size: 13px;
}
</style>