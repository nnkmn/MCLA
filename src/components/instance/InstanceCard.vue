<template>
  <div class="instance-card" :class="{ selected: isSelected }" @click="$emit('select', instance.id)">
    <!-- 封面/图标 -->
    <div class="card-cover" :style="coverStyle">
      <span v-if="!instance.icon" class="cover-icon">{{ firstChar }}</span>
      <img v-else :src="instance.icon" :alt="instance.name" class="cover-img" />
    </div>

    <!-- 信息区 -->
    <div class="card-body">
      <h3 class="card-name">{{ instance.name }}</h3>
      <p class="card-version">
        {{ instance.mcVersion }}
        <span v-if="instance.loaderType !== 'vanilla'" class="loader-tag">
          {{ loaderName }} {{ instance.loaderVersion }}
        </span>
      </p>
      <div class="card-meta">
        <span v-if="instance.lastPlayed" class="meta-item time">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {{ relativeTime }}
        </span>
        <span class="meta-item memory">{{ instance.maxMemory }}MB</span>
      </div>
    </div>

    <!-- 收藏标记 -->
    <button
      v-if="showFavorite"
      class="fav-btn"
      :class="{ active: instance.isFavorited === 1 }"
      @click.stop="$emit('toggle-favorite', instance.id)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" :fill="instance.isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    </button>

    <!-- 操作菜单（悬停显示） -->
    <div class="card-actions" v-if="showActions">
      <button class="action-btn" @click.stop="$emit('launch', instance.id)" title="启动">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="action-btn" @click.stop="$emit('open-detail', instance.id)" title="详情">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </button>
      <button class="action-btn danger" @click.stop="$emit('delete', instance.id)" title="删除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GameInstance, LoaderType } from '../../types/instance'
import { formatRelativeTime, getLoaderName } from '../../utils/format'

const props = withDefaults(defineProps<{
  instance: GameInstance
  isSelected?: boolean
  showActions?: boolean
  showFavorite?: boolean
}>(), {
  isSelected: false,
  showActions: true,
  showFavorite: true,
})

defineEmits<{
  (e: 'select', id: string): void
  (e: 'launch', id: string): void
  (e: 'open-detail', id: string): void
  (e: 'delete', id: string): void
  (e: 'toggle-favorite', id: string): void
}>()

// 根据实例名生成封面渐变色（确定性）
function coverGradient(name: string): string {
  const colors = [
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f472b6'],
    ['#10b981', '#34d399'],
    ['#f59e0b', '#fbbf24'],
    ['#3b82f6', '#60a5fa'],
    ['#ef4444', '#f87171'],
    ['#14b8a6', '#2dd4bf'],
    ['#8b5cf6', '#a78bfa'],
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  const idx = Math.abs(hash) % colors.length
  return `linear-gradient(135deg, ${colors[idx][0]}, ${colors[idx][1]})`
}

const coverStyle = computed(() => ({
  background: props.instance.icon ? undefined : coverGradient(props.instance.name),
}))

const firstChar = computed(() => (props.instance.name || '?')[0].toUpperCase())

const loaderName = computed(() => getLoaderName(props.instance.loaderType))

const relativeTime = computed(() => {
  if (!props.instance.lastPlayed) return ''
  return formatRelativeTime(props.instance.lastPlayed)
})
</script>

<style scoped lang="scss">
.instance-card {
  position: relative;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--mcla-shadow-lg);
    .card-actions { opacity: 1; }
  }

  &.selected {
    border-color: var(--mcla-primary-400);
    box-shadow: var(--mcla-shadow-glow-primary);
  }
}

.card-cover {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;

  .cover-icon {
    font-size: 36px;
    font-weight: 800;
    color: rgba(255,255,255,0.7);
    text-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  .cover-img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
}

.card-body {
  padding: 12px 14px;
}

.card-name {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--mcla-text-primary);
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-version {
  font-size: 12px;
  color: var(--mcla-text-muted);
  margin: 0 0 8px;

  .loader-tag {
    margin-left: 6px;
    padding: 1px 6px;
    font-size: 11px;
    background: var(--mcla-success-light);
    color: var(--mcla-success);
    border-radius: 3px;
    font-weight: 600;
  }
}

.card-meta {
  display: flex;
  gap: 12px;

  .meta-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11.5px;
    color: var(--mcla-text-muted);
  }
}

.fav-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 5px;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;

  .instance-card:hover & { opacity: 1; }
  &:hover { transform: scale(1.15); }
  &.active { opacity: 1; color: #fbbf24; }
}

.card-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  padding: 5px;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(6px);
  border-radius: var(--mcla-radius-md);
  opacity: 0;
  transition: opacity 0.15s;

  .action-btn {
    padding: 5px 7px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.85);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.1s;

    &:hover { background: rgba(255,255,255,0.15); color: #fff; }
    &.danger:hover { background: rgba(239,68,68,0.5); color: #fff; }
  }
}
</style>
