<template>
  <div class="dm-page">
    <!-- 顶部导航 -->
    <div class="dm-header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1 class="dm-title">下载管理</h1>
    </div>

    <!-- 活跃下载列表 -->
    <div class="dm-content">
      <template v-if="tasks.length > 0">
        <div class="task-list">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="task-item"
            :class="{ completed: task.phase === 'completed', failed: task.phase === 'failed' }"
          >
            <!-- 左侧：图标 -->
            <div class="task-icon">
              <!-- 下载中 -->
              <template v-if="task.phase === 'completed'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </template>
              <template v-else-if="task.phase === 'failed'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </template>
              <template v-else>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </template>
            </div>

            <!-- 中间：进度信息 -->
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-phase">{{ task.phaseLabel }}</div>
              <!-- 进度条 -->
              <div class="task-bar-wrap">
                <div class="task-bar" :style="{ width: task.progress + '%' }"></div>
              </div>
            </div>

            <!-- 右侧：数值 + 操作 -->
            <div class="task-right">
              <div class="task-pct">{{ task.progress }}%</div>
              <div v-if="task.speed > 0" class="task-speed">{{ formatSpeed(task.speed) }}</div>
              <button
                v-if="task.phase === 'failed'"
                class="btn-retry"
                @click="retryTask(task)"
              >重试</button>
              <button
                v-else-if="task.phase === 'completed'"
                class="btn-view"
                @click="viewInstance(task)"
              >查看实例</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 无下载任务 -->
      <div v-else class="dm-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <p>暂无下载任务</p>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="dm-footer">
      <p>返回后下载将在后台继续</p>
      <button class="btn-back-bg" @click="goBackToHome">返回主页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDownloadStore } from '../stores/download.store'
import type { VersionDownloadTask } from '../types/download'

const router = useRouter()
const downloadStore = useDownloadStore()

const tasks = computed(() => Array.from(downloadStore.versionTasks.values()))

function goBack() {
  router.back()
}

function goBackToHome() {
  router.push('/')
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

async function retryTask(task: VersionDownloadTask) {
  downloadStore.removeVersionTask(task.id)
  await downloadStore.startVersionDownload(task.id, task.targetFolder)
}

async function viewInstance(task: VersionDownloadTask) {
  // 下载完成后创建实例并跳转到版本管理
  const api = window.electronAPI
  if (api?.instance) {
    await api.instance.create({
      name: task.id,
      mcVersion: task.id,
      loaderType: 'vanilla',
      loaderVersion: '',
    })
  }
  router.push('/versions')
}
</script>

<style scoped>
.dm-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.dm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.back-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #c4c4c4;
  transition: all 0.2s;
}
.back-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

.dm-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.dm-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 14px;
  transition: border-color 0.2s;
}
.task-item.completed { border-color: rgba(34,197,94,0.25); }
.task-item.failed { border-color: rgba(239,68,68,0.25); }

.task-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(99,102,241,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.task-item.completed .task-icon { background: rgba(34,197,94,0.1); }
.task-item.failed .task-icon { background: rgba(239,68,68,0.1); }

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 3px;
}

.task-phase {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
}

.task-bar-wrap {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
}
.task-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.task-item.completed .task-bar { background: #22c55e; }
.task-item.failed .task-bar { background: #ef4444; }

.task-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.task-pct {
  font-size: 14px;
  font-weight: 700;
  color: #e0e0e0;
}
.task-item.completed .task-pct { color: #22c55e; }
.task-item.failed .task-pct { color: #ef4444; }

.task-speed {
  font-size: 11px;
  color: #888;
}

.btn-retry, .btn-view {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}
.btn-retry {
  background: rgba(239,68,68,0.2);
  color: #ef4444;
}
.btn-view {
  background: rgba(34,197,94,0.2);
  color: #22c55e;
}
.btn-retry:hover, .btn-view:hover { opacity: 0.8; }

.dm-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #555;
  font-size: 14px;
}

.dm-footer {
  flex-shrink: 0;
  padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.dm-footer p {
  font-size: 12px;
  color: #555;
}

.btn-back-bg {
  background: rgba(99,102,241,0.15);
  border: 1px solid rgba(99,102,241,0.3);
  color: #6366f1;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-back-bg:hover { opacity: 0.8; }
</style>
