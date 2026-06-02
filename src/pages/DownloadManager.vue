<template>
  <div class="dm-page">
    <!-- 顶部导航 -->
    <div class="dm-header">
      <button class="back-btn" @click="goBack">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h1 class="dm-title">下载管理</h1>
      <div class="header-actions">
        <button v-if="completedCount > 0" class="btn-clear" @click="clearCompleted">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          清除已完成
        </button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="dm-toolbar">
      <div class="search-box">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="搜索任务..." class="search-input" />
      </div>

      <!-- 分类标签 -->
      <div class="filter-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span class="tab-count" v-if="getTabCount(tab.value) > 0">{{
            getTabCount(tab.value)
          }}</span>
        </button>
      </div>
    </div>

    <!-- 下载统计 -->
    <div class="dm-stats">
      <div class="stat-item">
        <span class="stat-value">{{ totalCount }}</span>
        <span class="stat-label">总任务</span>
      </div>
      <div class="stat-item downloading">
        <span class="stat-value">{{ downloadingCount }}</span>
        <span class="stat-label">下载中</span>
      </div>
      <div class="stat-item completed">
        <span class="stat-value">{{ completedCount }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-item failed">
        <span class="stat-value">{{ failedCount }}</span>
        <span class="stat-label">失败</span>
      </div>
    </div>

    <!-- 活跃下载列表 -->
    <div class="dm-content">
      <template v-if="filteredTasks.length > 0">
        <div class="task-list">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="task-item"
            :class="{
              completed: task.phase === 'completed',
              failed: task.phase === 'failed',
              downloading: task.phase === 'downloading'
            }"
          >
            <!-- 选择框 -->
            <label class="task-checkbox">
              <input type="checkbox" v-model="selectedTasks" :value="task.id" />
              <span class="checkmark"></span>
            </label>

            <!-- 图标 -->
            <div class="task-icon">
              <div v-if="task.phase === 'completed'" class="icon-circle success">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div v-else-if="task.phase === 'failed'" class="icon-circle error">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div v-else class="icon-circle downloading">
                <svg
                  class="download-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
            </div>

            <!-- 中间：信息 -->
            <div class="task-info">
              <div class="task-header">
                <h3 class="task-name">{{ task.name }}</h3>
                <span class="task-size">{{ formatSize(task.totalSize) }}</span>
              </div>
              <div class="task-meta">
                <span class="task-phase-tag" :class="task.phase">
                  {{ task.phaseLabel }}
                </span>
                <span class="task-time">{{ formatTime(task.startTime) }}</span>
              </div>
              <!-- 进度条 -->
              <div class="task-bar-wrap">
                <div class="task-bar" :style="{ width: task.progress + '%' }">
                  <div class="task-bar-glow" :style="{ width: task.progress + '%' }"></div>
                </div>
                <span class="task-progress-text">{{ task.progress }}%</span>
              </div>
            </div>

            <!-- 右侧：操作 -->
            <div class="task-actions">
              <div v-if="task.phase === 'downloading'" class="speed-info">
                <span class="speed-label">{{ formatSpeed(task.speed) }}</span>
                <span class="speed-status"
                  >剩余 {{ formatSize(task.totalSize - task.downloadedSize) }}</span
                >
              </div>
              <div v-else class="action-buttons">
                <button
                  v-if="task.phase === 'failed'"
                  class="btn-action retry"
                  @click="retryTask(task)"
                  title="重试下载"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M4 20v-6h6" />
                    <path d="M20.49 15a9 9 0 10-2.12 9.36L23 10" />
                  </svg>
                </button>
                <button
                  v-else-if="task.phase === 'completed'"
                  class="btn-action view"
                  @click="viewInstance(task)"
                  title="查看实例"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button class="btn-action delete" @click="removeTask(task)" title="删除任务">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 无下载任务 -->
      <div v-else class="dm-empty">
        <div class="empty-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="1.5"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h3>暂无下载任务</h3>
        <p>去下载页面选择游戏版本开始下载</p>
        <button class="btn-go-download" @click="goToDownloads">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          去下载
        </button>
      </div>
    </div>

    <!-- 底部操作栏（选中时显示） -->
    <div v-if="selectedTasks.length > 0" class="dm-selection-bar">
      <div class="selection-info">
        <span>已选择 {{ selectedTasks.length }} 个任务</span>
      </div>
      <div class="selection-actions">
        <button class="btn-selection" @click="cancelSelection">取消</button>
        <button class="btn-selection danger" @click="deleteSelected">删除选中</button>
      </div>
    </div>

    <!-- 底部提示 -->
    <div v-else class="dm-footer">
      <p>返回后下载将在后台继续</p>
      <button class="btn-back-bg" @click="goBackToHome">返回主页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDownloadStore } from '../stores/download.store'
import type { VersionDownloadTask } from '../types/download'

const router = useRouter()
const downloadStore = useDownloadStore()

const searchQuery = ref('')
const activeTab = ref('all')
const selectedTasks = ref<string[]>([])

const tabs = [
  { label: '全部', value: 'all' },
  { label: '下载中', value: 'downloading' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' }
]

const tasks = computed(() => Array.from(downloadStore.versionTasks.values()))

const filteredTasks = computed(() => {
  let result = tasks.value

  // 按标签筛选
  if (activeTab.value !== 'all') {
    result = result.filter((task) => task.phase === activeTab.value)
  }

  // 搜索筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((task) => task.name.toLowerCase().includes(query))
  }

  return result
})

const totalCount = computed(() => tasks.value.length)
const downloadingCount = computed(() => tasks.value.filter((t) => t.phase === 'downloading').length)
const completedCount = computed(() => tasks.value.filter((t) => t.phase === 'completed').length)
const failedCount = computed(() => tasks.value.filter((t) => t.phase === 'failed').length)

function getTabCount(tab: string): number {
  switch (tab) {
    case 'all':
      return totalCount.value
    case 'downloading':
      return downloadingCount.value
    case 'completed':
      return completedCount.value
    case 'failed':
      return failedCount.value
    default:
      return 0
  }
}

function goBack() {
  router.back()
}

function goBackToHome() {
  router.push('/')
}

function goToDownloads() {
  router.push('/downloads')
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec > 1024 * 1024) {
    return (bytesPerSec / 1024 / 1024).toFixed(1) + ' MB/s'
  }
  if (bytesPerSec > 1024) {
    return (bytesPerSec / 1024).toFixed(1) + ' KB/s'
  }
  return bytesPerSec + ' B/s'
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) {
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  }
  if (bytes > 1024 * 1024) {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }
  if (bytes > 1024) {
    return (bytes / 1024).toFixed(1) + ' KB'
  }
  return bytes + ' B'
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

async function retryTask(task: VersionDownloadTask) {
  downloadStore.removeVersionTask(task.id)
  await downloadStore.startVersionDownload(task.id, task.targetFolder)
}

async function viewInstance(task: VersionDownloadTask) {
  const api = window.electronAPI
  if (api?.instance) {
    await api.instance.create({
      name: task.id,
      mcVersion: task.id,
      loaderType: 'vanilla',
      loaderVersion: ''
    })
  }
  router.push('/versions')
}

function removeTask(task: VersionDownloadTask) {
  downloadStore.removeVersionTask(task.id)
}

function clearCompleted() {
  tasks.value.forEach((task) => {
    if (task.phase === 'completed') {
      downloadStore.removeVersionTask(task.id)
    }
  })
}

function cancelSelection() {
  selectedTasks.value = []
}

function deleteSelected() {
  selectedTasks.value.forEach((id) => {
    downloadStore.removeVersionTask(id)
  })
  selectedTasks.value = []
}
</script>

<style scoped>
.dm-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
}

/* 顶部导航 */
.dm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.back-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.25s ease;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  transform: translateX(-2px);
}

.dm-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f1f1;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear:hover {
  background: rgba(239, 68, 68, 0.25);
  transform: translateY(-1px);
}

/* 工具栏 */
.dm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  gap: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px 14px;
  flex: 1;
  max-width: 300px;
  color: #6b7280;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e5e7eb;
  font-size: 14px;
}
.search-input::placeholder {
  color: #6b7280;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #6b7280;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
}
.tab-btn.active {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.tab-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  min-width: 20px;
  text-align: center;
}
.tab-btn.active .tab-count {
  background: rgba(99, 102, 241, 0.3);
}

/* 统计卡片 */
.dm-stats {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  flex-shrink: 0;
}

.stat-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.stat-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #f1f1f1;
}
.stat-label {
  font-size: 11px;
  color: #6b7280;
}

.stat-item.downloading .stat-value {
  color: #f59e0b;
}
.stat-item.completed .stat-value {
  color: #22c55e;
}
.stat-item.failed .stat-value {
  color: #ef4444;
}

/* 内容区域 */
.dm-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}
.task-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
.task-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #6366f1, #8b5cf6);
}
.task-item.completed::before {
  background: linear-gradient(180deg, #22c55e, #16a34a);
}
.task-item.failed::before {
  background: linear-gradient(180deg, #ef4444, #dc2626);
}
.task-item.downloading::before {
  background: linear-gradient(180deg, #f59e0b, #d97706);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.task-checkbox {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.task-checkbox input {
  display: none;
}
.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: block;
  transition: all 0.2s;
}
.task-checkbox input:checked + .checkmark {
  background: #6366f1;
  border-color: #6366f1;
}
.task-checkbox input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.task-icon {
  flex-shrink: 0;
}

.icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}
.icon-circle.success {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.icon-circle.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.icon-circle.downloading {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}
.download-icon {
  animation: bounce 1.5s ease-in-out infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.task-name {
  font-size: 15px;
  font-weight: 600;
  color: #f1f1f1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-size {
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.task-phase-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.task-phase-tag.downloading {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}
.task-phase-tag.completed {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}
.task-phase-tag.failed {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.task-time {
  font-size: 11px;
  color: #6b7280;
}

.task-bar-wrap {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}
.task-bar {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.task-bar-glow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}
.task-item.completed .task-bar {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}
.task-item.failed .task-bar {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.task-progress-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.task-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.speed-info {
  text-align: right;
}
.speed-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #818cf8;
}
.speed-status {
  font-size: 11px;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 6px;
}

.btn-action {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-action.retry {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.btn-action.view {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.btn-action.delete {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.btn-action:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

/* 空状态 */
.dm-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 10px;
}

.dm-empty h3 {
  font-size: 18px;
  font-weight: 600;
  color: #9ca3af;
  margin: 0;
}

.dm-empty p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.btn-go-download {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
}
.btn-go-download:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: translateY(-2px);
}

/* 选择栏 */
.dm-selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(99, 102, 241, 0.1);
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  flex-shrink: 0;
}

.selection-info {
  font-size: 14px;
  color: #e5e7eb;
}

.selection-actions {
  display: flex;
  gap: 10px;
}

.btn-selection {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
}
.btn-selection:hover {
  background: rgba(255, 255, 255, 0.15);
}
.btn-selection.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.btn-selection.danger:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* 底部 */
.dm-footer {
  flex-shrink: 0;
  padding: 18px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dm-footer p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.btn-back-bg {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
  padding: 12px 32px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-back-bg:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
}
</style>
