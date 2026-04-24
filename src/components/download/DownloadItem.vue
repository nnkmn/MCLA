<template>
  <div class="download-item" :class="[task.status, { compact }]">
    <!-- 文件图标/名称 -->
    <div class="item-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
    </div>

    <!-- 名称 + 进度 -->
    <div class="item-info">
      <span class="item-name">{{ task.fileName }}</span>
      <div v-if="!compact || task.status === 'downloading'" class="item-progress">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${task.progress}%` }"></div>
        </div>
        <span v-if="task.status === 'downloading' && task.speed > 0" class="speed">
          {{ formatSpeed(task.speed) }}
        </span>
        <span v-else class="size-info">
          {{ formatSize(task.downloadedSize) }} / {{ formatSize(task.totalSize) }}
        </span>
      </div>
      <!-- 错误信息 -->
      <p v-if="task.error" class="error-text">{{ task.error }}</p>
    </div>

    <!-- 操作 -->
    <button
      v-if="canCancel"
      class="cancel-btn"
      @click="$emit('cancel', task.id)"
      title="取消"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>

    <!-- 状态图标 -->
    <span v-else-if="isCompleted" class="status-icon done">✓</span>
    <span v-else-if="isFailed" class="status-icon failed">!</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DownloadTask } from '../../types/download'
import { formatFileSize, formatSpeed } from '../../utils/format'

const props = withDefaults(defineProps<{
  task: DownloadTask
  compact?: boolean
}>(), {
  compact: false,
})

defineEmits<{
  (e: 'cancel', id: string): void
}>()

const canCancel = computed(() =>
  ['pending', 'downloading', 'paused'].includes(props.task.status)
)

const isCompleted = computed(() => props.task.status === 'completed')
const isFailed = computed(() => props.task.status === 'failed')

function formatSize(b: number): string {
  return formatFileSize(b)
}
</script>

<style scoped lang="scss">
.download-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  transition: all 0.12s;

  &.pending { opacity: 0.75; }
  &.downloading {
    border-color: rgba(99,102,234,0.25);
    .item-icon svg { stroke: var(--mcla-primary-500); color: var(--mcla-primary-500); }
  }
  &.completed {
    border-color: rgba(34,197,94,0.25);
    background: linear-gradient(to right, rgba(34,197,94,0.03), transparent);
  }
  &.failed {
    border-color: rgba(239,68,68,0.3);
    .item-icon svg { stroke: #ef4444; color: #ef4444; }
  }

  &.compact {
    padding: 6px 10px;

    .item-name { font-size: 12px; }
    .progress-track { height: 3px !important; border-radius: 2px; }
  }

  &:hover:not(.compact) { box-shadow: var(--mcla-shadow-sm); }
}

.item-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  color: var(--mcla-text-muted);

  svg { flex-shrink: 0; }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--mcla-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;

  .progress-track {
    flex: 1;
    height: 5px;
    background: var(--mcla-bg-hover);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--mcla-gradient-primary);
    border-radius: 3px;
    transition: width 0.25s ease;
  }

  .speed, .size-info {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--mcla-text-muted);
    white-space: nowrap;
  }
}

.error-text {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: #ef4444;
}

.cancel-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--mcla-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.1s;

  &:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
}

.status-icon {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;

  &.done {
    background: var(--mcla-success-light);
    color: var(--mcla-success);
  }
  &.failed {
    background: rgba(239,68,68,0.1);
    color: #ef4444;
  }
}
</style>
