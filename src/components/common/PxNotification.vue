<template>
  <Teleport to="body">
    <!-- 铃铛按钮（固定在标题栏右侧） -->
    <button
      class="pxn-bell"
      :class="{ 'has-unread': unreadCount > 0 }"
      @click="showPanel = !showPanel"
      :title="`通知 (${unreadCount})`"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      <span v-if="unreadCount > 0" class="pxn-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- 通知面板 -->
    <transition name="pxn-panel">
      <div v-if="showPanel" class="pxn-panel">
        <div class="pxn-header">
          <span class="pxn-title">通知中心</span>
          <div class="pxn-header-actions">
            <button
              v-if="unreadCount > 0"
              class="pxn-action-btn"
              @click="markAllRead"
              title="全部标为已读"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button
              v-if="history.length > 0"
              class="pxn-action-btn"
              @click="clearAll"
              title="清除全部"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>

        <div class="pxn-list">
          <div v-if="history.length === 0" class="pxn-empty">暂无通知</div>
          <div
            v-for="item in sortedHistory"
            :key="item.id"
            class="pxn-item"
            :class="{ unread: !item.read, [`type-${item.type}`]: true }"
            @click="onClick(item)"
          >
            <div class="pxn-item-icon">
              <!-- success -->
              <svg v-if="item.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <!-- error -->
              <svg v-else-if="item.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <!-- warning -->
              <svg v-else-if="item.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <!-- info -->
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div class="pxn-item-content">
              <div class="pxn-item-title">{{ item.title }}</div>
              <div class="pxn-item-body">{{ item.body }}</div>
              <div class="pxn-item-time">{{ formatTime(item.timestamp) }}</div>
            </div>
            <button
              v-if="!item.read"
              class="pxn-read-dot"
              @click.stop="markRead(item.id)"
              title="标记已读"
            ></button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showPanel = ref(false)
const history = ref<any[]>([])
const unreadCount = ref(0)

const sortedHistory = computed(() =>
  [...history.value].sort((a, b) => b.timestamp - a.timestamp)
)

let removeOnNotify: (() => void) | null = null
let removeOnClicked: (() => void) | null = null

async function loadHistory() {
  if (!window.electronAPI) return
  const result = await window.electronAPI.notification.getHistory(50)
  if (result?.ok) {
    history.value = result.data || []
  }
  const countResult = await window.electronAPI.notification.getUnreadCount()
  if (countResult?.ok) {
    unreadCount.value = countResult.data || 0
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (isToday) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function markRead(id: string) {
  if (!window.electronAPI) return
  await window.electronAPI.notification.markRead(id)
  const item = history.value.find(h => h.id === id)
  if (item) item.read = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
}

async function markAllRead() {
  if (!window.electronAPI) return
  await window.electronAPI.notification.markAllRead()
  history.value.forEach(h => (h.read = true))
  unreadCount.value = 0
}

async function clearAll() {
  if (!window.electronAPI) return
  await window.electronAPI.notification.clear()
  history.value = []
  unreadCount.value = 0
}

async function onClick(item: any) {
  if (!item.read) await markRead(item.id)
  if (item.route) {
    router.push(item.route)
    showPanel.value = false
  }
}

onMounted(async () => {
  await loadHistory()

  if (window.electronAPI?.notification?.onNotify) {
    removeOnNotify = window.electronAPI.notification.onNotify((item: any) => {
      history.value.unshift(item)
      if (!item.read) unreadCount.value++
    })
  }

  if (window.electronAPI?.notification?.onClicked) {
    removeOnClicked = window.electronAPI.notification.onClicked((data: any) => {
      if (data?.route) router.push(data.route)
    })
  }
})

onUnmounted(() => {
  removeOnNotify?.()
  removeOnClicked?.()
})
</script>

<style scoped lang="scss">
.pxn-bell {
  position: fixed;
  top: 0;
  right: 88px;
  z-index: 10001;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.82);
  cursor: pointer;
  transition: all 0.12s;
  -webkit-app-region: no-drag;

  &:hover {
    background: rgba(255,255,255,0.12);
    color: #fff;
  }
  &.has-unread {
    color: #fff;
  }

  .pxn-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--mcla-error, #ef4444);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}

.pxn-panel {
  position: fixed;
  top: 48px;
  right: 12px;
  z-index: 10002;
  width: 340px;
  max-height: 420px;
  background: var(--mcla-bg-elevated, #fff);
  border: 1px solid var(--mcla-border-color, #e2e8f0);
  border-radius: var(--mcla-radius-lg, 12px);
  box-shadow: var(--mcla-shadow-lg, 0 8px 30px rgba(0,0,0,0.18));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pxn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--mcla-border-color, #e2e8f0);
  flex-shrink: 0;
}
.pxn-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--mcla-text-primary, #1e293b);
}
.pxn-header-actions {
  display: flex;
  gap: 4px;
}
.pxn-action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--mcla-border-color, #e2e8f0);
  border-radius: var(--mcla-radius-sm, 6px);
  background: transparent;
  color: var(--mcla-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    border-color: var(--mcla-primary-400, #818cf8);
    color: var(--mcla-primary-600, #4f46e5);
    background: var(--mcla-primary-light, rgba(99,102,234,0.08));
  }
}

.pxn-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
}

.pxn-empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--mcla-text-muted, #94a3b8);
}

.pxn-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.1s;
  position: relative;

  &:hover {
    background: var(--mcla-primary-light, rgba(99,102,234,0.06));
  }

  &.unread {
    background: rgba(99,102,234,0.04);
    .pxn-item-title { font-weight: 700; }
  }

  /* type colors */
  &.type-success .pxn-item-icon { color: var(--mcla-success, #22c55e); }
  &.type-error   .pxn-item-icon { color: var(--mcla-error, #ef4444); }
  &.type-warning .pxn-item-icon { color: var(--mcla-warning, #f59e0b); }
  &.type-info    .pxn-item-icon { color: var(--mcla-primary, #6366f1); }
}

.pxn-item-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--mcla-bg-secondary, #f1f5f9);
  margin-top: 1px;
}

.pxn-item-content {
  flex: 1;
  min-width: 0;
}
.pxn-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary, #1e293b);
  margin-bottom: 2px;
}
.pxn-item-body {
  font-size: 12px;
  color: var(--mcla-text-secondary, #475569);
  line-height: 1.4;
  /* 最多两行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pxn-item-time {
  font-size: 11px;
  color: var(--mcla-text-muted, #94a3b8);
  margin-top: 3px;
}

.pxn-read-dot {
  position: absolute;
  top: 14px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mcla-primary, #6366f1);
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: var(--mcla-primary-600, #4f46e5);
    transform: scale(1.2);
  }
}

/* 面板动画 */
.pxn-panel-enter-active { transition: all 0.15s ease-out; }
.pxn-panel-leave-active { transition: all 0.12s ease-in; }
.pxn-panel-enter-from   { opacity: 0; transform: translateY(-6px); }
.pxn-panel-leave-to    { opacity: 0; transform: translateY(-6px); }
</style>
