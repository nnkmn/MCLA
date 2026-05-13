<template>
  <Teleport to="body">
    <Transition name="float">
      <div v-if="store.showFloatPanel && hasAny" class="float-panel">
        <!-- 头部 -->
        <div class="fp-header">
          <span class="fp-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            下载管理
            <span v-if="activeCount > 0" class="fp-badge">{{ activeCount }}</span>
          </span>
          <div class="fp-actions">
            <button class="fp-btn" @click="clearCompleted" title="清除已完成" v-if="completedCount > 0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
            <button class="fp-btn" @click="openManager" title="查看详情">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
            </button>
            <button class="fp-btn fp-close" @click="close" title="关闭">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="fp-tasks">
          <!-- 无任务时 -->
          <div v-if="allTasks.length === 0" class="fp-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <p>暂无下载任务</p>
          </div>

          <!-- 进行中的任务 -->
          <div
            v-for="task in activeTasks"
            :key="task.id"
            class="fp-task fp-task-active"
          >
            <div class="fp-task-info">
              <div class="fp-task-name">{{ task.name }}</div>
              <div class="fp-task-meta">
                <span class="fp-phase">{{ task.phaseLabel }}</span>
                <span v-if="task.speed > 0" class="fp-speed">{{ formatSpeed(task.speed) }}</span>
              </div>
            </div>
            <div class="fp-bar-wrap">
              <div class="fp-bar" :style="{ width: task.progress + '%' }"></div>
            </div>
            <div class="fp-task-footer">
              <span class="fp-pct">{{ task.progress }}%</span>
              <button class="fp-cancel-btn" @click="cancelDownload(task.id)" title="取消">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 已完成的任务 -->
          <div
            v-for="task in completedTasks"
            :key="task.id + '-done'"
            class="fp-task fp-task-done fp-task-ok"
          >
            <div class="fp-task-name">{{ task.name }}</div>
            <div class="fp-task-phase">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              已完成
            </div>
            <button class="fp-task-dismiss" @click="dismiss(task.id)">移除</button>
          </div>

          <!-- 失败的任务 -->
          <div
            v-for="task in failedTasks"
            :key="task.id + '-err'"
            class="fp-task fp-task-done fp-task-err"
          >
            <div class="fp-task-name">{{ task.name }}</div>
            <div class="fp-task-phase">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              失败
            </div>
            <button class="fp-task-dismiss" @click="dismiss(task.id)">移除</button>
          </div>
        </div>

        <!-- 底部：查看详情 -->
        <button class="fp-view-all" @click="openManager">查看详情 →</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDownloadStore } from '../stores/download.store'

const router = useRouter()
const store = useDownloadStore()

const allTasks = computed(() => Array.from(store.versionTasks.values()))

const hasAny = computed(() => allTasks.value.length > 0)
const activeCount = computed(() => allTasks.value.filter(t => t.phase !== 'completed' && t.phase !== 'failed').length)
const completedCount = computed(() => allTasks.value.filter(t => t.phase === 'completed' || t.phase === 'failed').length)

const activeTasks = computed(() => allTasks.value.filter(t =>
  t.phase !== 'completed' && t.phase !== 'failed'
))

const completedTasks = computed(() => allTasks.value.filter(t => t.phase === 'completed'))
const failedTasks = computed(() => allTasks.value.filter(t => t.phase === 'failed'))

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec > 1024 * 1024) return (bytesPerSec / 1024 / 1024).toFixed(1) + ' MB/s'
  if (bytesPerSec > 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s'
  return bytesPerSec + ' B/s'
}

function openManager() {
  router.push('/download/manage')
}

function close() {
  store.showFloatPanel = false
}

function dismiss(versionId: string) {
  store.removeVersionTask(versionId)
}

function clearCompleted() {
  completedTasks.value.forEach(t => store.removeVersionTask(t.id))
  failedTasks.value.forEach(t => store.removeVersionTask(t.id))
}

async function cancelDownload(id: string) {
  await window.electronAPI?.download?.cancelDownload?.(id)
  store.removeVersionTask(id)
}
</script>

<style scoped>
.float-panel {
  position: fixed;
  top: 54px;
  right: 12px;
  width: 300px;
  background: rgba(18, 18, 24, 0.97);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 9999;
  backdrop-filter: blur(12px);
}

.fp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.fp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
}

.fp-actions {
  display: flex;
  gap: 4px;
}

.fp-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.fp-btn:hover { background: rgba(255,255,255,0.12); color: #ccc; }
.fp-close:hover { background: rgba(239,68,68,0.2); color: #ef4444; }

.fp-tasks {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.fp-task {
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
}

.fp-task-done {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fp-task-ok { border-left: 2px solid #22c55e; }
.fp-task-err { border-left: 2px solid #ef4444; }

.fp-task-name {
  font-size: 12px;
  font-weight: 600;
  color: #ddd;
  margin-bottom: 2px;
}

.fp-task-phase {
  font-size: 11px;
  color: #777;
  margin-bottom: 6px;
}

.fp-bar-wrap {
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}
.fp-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.fp-task-ok .fp-bar { background: #22c55e; }
.fp-task-err .fp-bar { background: #ef4444; width: 100% !important; }

.fp-task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fp-pct {
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
}
.fp-speed {
  font-size: 10px;
  color: #666;
}

.fp-task-dismiss {
  font-size: 10px;
  background: rgba(255,255,255,0.05);
  border: none;
  color: #666;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}
.fp-task-dismiss:hover { color: #aaa; }

.fp-view-all {
  display: block;
  width: 100%;
  padding: 10px;
  background: rgba(99,102,241,0.08);
  border: none;
  border-top: 1px solid rgba(255,255,255,0.05);
  color: #6366f1;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s;
}
.fp-view-all:hover { background: rgba(99,102,241,0.14); }

/* ====== 增强样式 ====== */
.fp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  background: #6366f1;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  margin-left: 4px;
}

.fp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  color: #555;
  font-size: 12px;

  p { margin: 0; }
  svg { opacity: 0.5; }
}

.fp-task-info {
  margin-bottom: 6px;
}

.fp-task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.fp-phase {
  font-size: 11px;
  color: #777;
}

.fp-cancel-btn {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.fp-cancel-btn:hover {
  background: rgba(239,68,68,0.2);
  color: #ef4444;
}

.fp-task-done {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fp-task-done .fp-task-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
}

.fp-task-done .fp-task-phase {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  flex-shrink: 0;
}

.fp-task-ok .fp-task-phase { color: #22c55e; }
.fp-task-err .fp-task-phase { color: #ef4444; }

/* 动画 */
.float-enter-active, .float-leave-active {
  transition: all 0.25s ease;
}
.float-enter-from, .float-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>
