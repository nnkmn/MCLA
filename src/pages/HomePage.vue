<template>
  <div class="home-page">
    <!-- 空状态 / 欢迎区（PCL2 风格：右侧留白） -->
    <div class="welcome-area">
      <div class="welcome-card">
        <div class="wc-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mcla-primary-400)" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
        </div>
        <h2 class="wc-title">准备开始游戏</h2>
        <p class="wc-desc">在左侧选择版本后点击「启动游戏」按钮</p>

        <div class="wc-actions">
          <button class="wc-btn" @click="$router.push('/instances')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            实例管理
          </button>
          <button class="wc-btn" @click="$router.push('/downloads')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            下载资源
          </button>
          <button class="wc-btn" @click="$router.push('/settings')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            启动设置
          </button>
        </div>
      </div>

      <!-- 最近实例 -->
      <div v-if="recentInstances.length" class="recent-section">
        <h3 class="sec-title">最近使用</h3>
        <div class="recent-list">
          <div
            v-for="inst in recentInstances"
            :key="inst.id"
            class="recent-item"
            @click="$router.push('/instances')"
          >
            <span class="ri-icon">{{ inst.name[0] }}</span>
            <div class="ri-info">
              <p class="ri-name">{{ inst.name }}</p>
              <p class="ri-meta">{{ inst.mcVersion }} · {{ getLoaderLabel(inst) }}</p>
            </div>
            <span class="ri-time">{{ formatTime(inst.lastPlayed) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInstancesStore } from '../stores'

interface Instance { id: string; name: string; mcVersion: string; loaderType?: string; lastPlayed?: string }

const instancesStore = useInstancesStore()

// 最近实例（从 Store 获取）
const recentInstances = computed(() => {
  return instancesStore.recentInstances.map((inst: any) => ({
    id: inst.id,
    name: inst.name,
    mcVersion: inst.mcVersion || inst.mc_version || '未知',
    loaderType: inst.loaderType || inst.loader_type || '',
    lastPlayed: inst.lastPlayed || inst.last_played,
  }))
})

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '从未启动'
  const ts = new Date(dateStr).getTime()
  if (isNaN(ts)) return '未知'
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

function getLoaderLabel(inst: Instance): string {
  if (!inst.loaderType || inst.loaderType === 'vanilla') return '原版'
  return inst.loaderType.charAt(0).toUpperCase() + inst.loaderType.slice(1)
}

onMounted(() => {
  instancesStore.fetchInstances()
})
</script>

<style scoped lang="scss">
.home-page {
  padding: 24px 28px;
  min-height: 100%;
  /* 自适应：内容区随窗口撑开 */
  display: flex;
  flex-direction: column;
}

.welcome-area {
  /* 去掉 max-width 限制，让卡片自适应 */
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 欢迎卡片 — 紧凑自适应 */
.welcome-card {
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-lg);
  padding: 28px 24px;
  text-align: center;
  border: 1px solid var(--mcla-border-color);
  box-shadow: var(--mcla-shadow-sm);
}

.wc-icon {
  margin-bottom: 10px;

  svg {
    opacity: 0.4;
    transition: opacity 0.2s;
  }

  &:hover svg { opacity: 0.7; }
}

.wc-title {
  margin: 0 0 4px;
  font-size: var(--mcla-text-xl);
  font-weight: var(--mcla-font-bold);
  color: var(--mcla-text-primary);
}

.wc-desc {
  margin: 0 0 18px;
  font-size: var(--mcla-text-sm);
  color: var(--mcla-text-secondary);
}

.wc-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.wc-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  background: var(--mcla-bg-elevated);
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  font-size: var(--mcla-text-sm);
  font-weight: var(--mcla-font-medium);
  color: var(--mcla-text-secondary);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);

  &:hover {
    border-color: var(--mcla-primary-400);
    color: var(--mcla-primary-600);
    box-shadow: var(--mcla-shadow-glow-primary);
  }
}

/* 最近实例 */
.recent-section {
  .sec-title {
    margin: 0 0 8px;
    font-size: var(--mcla-text-base);
    font-weight: var(--mcla-font-bold);
    color: var(--mcla-text-primary);
  }
}

.recent-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 6px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--mcla-bg-elevated);
  border-radius: var(--mcla-radius-md);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);
  border: 1px solid transparent;

  &:hover {
    border-color: var(--mcla-border-color);
    box-shadow: var(--mcla-shadow-sm);
  }

  .ri-icon {
    width: 34px; height: 34px;
    border-radius: var(--mcla-radius-md);
    background: var(--mcla-gradient-primary);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: var(--mcla-shadow-glow-primary);
  }

  .ri-info {
    flex: 1;
    min-width: 0;
    .ri-name { margin: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ri-meta { margin: 2px 0 0; font-size: 11px; color: var(--mcla-text-muted); }
  }

  .ri-time { font-size: 11px; color: var(--mcla-text-muted); white-space: nowrap; flex-shrink: 0; }
}
</style>
