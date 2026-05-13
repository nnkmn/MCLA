<template>
  <div class="mod-card" @click="$emit('click', mod)">
    <!-- 封面图 -->
    <div class="mod-cover">
      <img
        v-if="mod.iconUrl"
        :src="mod.iconUrl"
        :alt="mod.name"
        loading="lazy"
      />
      <div v-else class="cover-placeholder">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
      </div>
    </div>

    <!-- 信息区 -->
    <div class="mod-info">
      <h3 class="mod-name">{{ mod.name }}</h3>
      <p class="mod-author">{{ mod.author }}</p>
      <p class="mod-desc">{{ mod.description || '暂无描述' }}</p>

      <!-- 底部元数据 -->
      <div class="mod-meta">
        <span class="meta-tag downloads">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          {{ formatNum(mod.downloads) }}
        </span>
        <span v-if="mod.follows" class="meta-tag follows">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          {{ formatNum(mod.follows) }}
        </span>
        <span class="meta-tag source-badge" :class="mod.source">
          {{ mod.source === 'curseforge' ? 'CF' : 'MR' }}
        </span>
      </div>

      <!-- 加载器兼容标签 -->
      <div v-if="mod.loaders?.length" class="loader-tags">
        <span
          v-for="loader in mod.loaders.slice(0, 4)"
          :key="loader"
          class="loader-chip"
        >{{ loader }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <button class="download-btn" @click.stop="$emit('download', mod)" title="下载">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ModSearchResult } from '../../types/download'
import { formatNumber } from '../../utils/format'

defineProps<{
  mod: ModSearchResult
}>()

const emit = defineEmits<{
  (e: 'click', mod: ModSearchResult): void
  (e: 'download', mod: ModSearchResult): void
}>()

function formatNum(n: number): string {
  return formatNumber(n)
}
</script>

<style scoped lang="scss">
.mod-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--mcla-shadow-md);
    border-color: var(--mcla-primary-200);
  }
}

.mod-cover {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: var(--mcla-radius-md);
  overflow: hidden;
  background: var(--mcla-bg-hover);

  img { width: 100%; height: 100%; object-fit: cover; }

  .cover-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--mcla-text-muted);
  }
}

.mod-info {
  flex: 1;
  min-width: 0;
}

.mod-name {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--mcla-text-primary);
  margin: 0 0 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mod-author {
  font-size: 12px;
  color: var(--mcla-text-muted);
  margin: 0 0 5px;
}

.mod-desc {
  font-size: 12.5px;
  color: var(--mcla-text-secondary);
  margin: 0 0 10px;
  display: -webkit-box;
  display: box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
}

.mod-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  .meta-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11.5px;
    color: var(--mcla-text-muted);

    &.downloads svg { stroke: var(--mcla-success); }
    &.follows svg { fill: #f472b6; }
  }

  .source-badge {
    padding: 1px 6px;
    font-size: 10.5px;
    font-weight: 700;
    border-radius: 3px;
    text-transform: uppercase;

    &.curseforge {
      background: rgba(240,73,48,0.1);
      color: #F04930;
    }
    &.modrinth {
      background: rgba(33,150,83,0.1);
      color: #1DB954;
    }
  }
}

.loader-tags {
  display: flex;
  gap: 4px;
  margin-top: 8px;

  .loader-chip {
    padding: 1px 8px;
    font-size: 11px;
    background: var(--mcla-primary-light);
    color: var(--mcla-primary-600);
    border-radius: 3px;
    font-weight: 600;
  }
}

.download-btn {
  flex-shrink: 0;
  align-self: center;
  padding: 9px;
  background: var(--mcla-gradient-primary);
  border: none;
  border-radius: var(--mcla-radius-md);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { filter: brightness(1.08); transform: scale(1.05); }
}
</style>
