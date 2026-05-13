<template>
  <div class="account-card" :class="{ active: account.isActive === 1, [account.type]: true }">
    <!-- 头像区域 -->
    <div class="card-avatar">
      <!-- 微软账户：头像占位 -->
      <template v-if="account.type === 'microsoft'">
        <div class="avatar-ms">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </template>
      <!-- 离线账户：像素 Steve -->
      <template v-else>
        <div class="avatar-steve">
          <svg width="36" height="36" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="16" height="16" rx="2" fill="#C69C6D"/>
            <rect x="2" y="1" width="12" height="5" fill="#E07A28"/><rect x="3" y="0" width="10" height="2" fill="#E07A28"/>
            <rect x="2" y="5" width="12" height="9" fill="#D4A574"/>
            <rect x="4" y="7" width="2" height="2" fill="#3A8B47"/><rect x="10" y="7" width="2" height="2" fill="#3A8B47"/>
            <rect x="7" y="9" width="2" height="2" fill="#C69C6D"/>
            <rect x="5" y="12" width="6" height="1" fill="#8B5A3C"/>
          </svg>
        </div>
      </template>

      <!-- 类型标签 -->
      <span class="type-tag" :class="account.type">
        {{ account.type === 'microsoft' ? '正版' : '离线' }}
      </span>
    </div>

    <!-- 信息区 -->
    <div class="card-body">
      <h4 class="card-name">{{ account.name }}</h4>
      <p class="card-uuid">{{ shortUuid }}</p>

      <!-- 状态指示 -->
      <span class="status-dot" :class="{ online: account.isActive === 1 }"></span>
    </div>

    <!-- 操作按钮 -->
    <div class="card-actions" v-if="showActions">
      <button
        v-if="!(account.isActive === 1)"
        class="action-btn primary"
        @click="$emit('set-active', account.id)"
        title="设为当前"
      >切换</button>
      <button
        class="action-btn danger"
        @click="$emit('delete', account.id)"
        title="删除"
      >删除</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Account } from '../../types/account'

const props = defineProps<{
  account: Account
  showActions?: boolean
}>()

defineEmits<{
  (e: 'set-active', id: string): void
  (e: 'delete', id: string): void
}>()

const shortUuid = computed(() => {
  const uuid = props.account.uuid
  return uuid ? `${uuid.slice(0, 8)}...` : ''
})
</script>

<style scoped lang="scss">
.account-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--mcla-bg-elevated);
  border: 1.5px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  transition: all var(--mcla-transition-fast);

  &:hover {
    border-color: var(--mcla-primary-200);
    box-shadow: var(--mcla-shadow-sm);
  }

  &.active {
    border-color: var(--mcla-primary-400);
    background: linear-gradient(to right, rgba(99,102,234,0.04), transparent);
  }
}

.card-avatar {
  position: relative;

  .avatar-ms,
  .avatar-steve {
    width: 48px; height: 48px;
    border-radius: var(--mcla-radius-md);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar-ms {
    background: var(--mcla-gradient-primary);
    svg { color: #fff !important; }
  }

  .avatar-steve {
    border-radius: 6px;
    image-rendering: pixelated;
    svg { width: 100%; height: 100%; }
  }

  .type-tag {
    position: absolute;
    bottom: -4px;
    left: -2px;
    padding: 1px 6px;
    font-size: 9px;
    font-weight: 700;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.3px;

    &.microsoft {
      background: var(--mcla-primary-light);
      color: var(--mcla-primary-700);
    }

    &.offline {
      background: var(--mcla-warning-light);
      color: #b45309;
    }
  }
}

.card-body {
  flex: 1;
  min-width: 0;
  position: relative;

  .card-name {
    font-size: 15px;
    font-weight: 650;
    color: var(--mcla-text-primary);
    margin: 0 0 2px;
  }

  .card-uuid {
    font-family: var(--mcla-font-mono);
    font-size: 11px;
    color: var(--mcla-text-muted);
    margin: 0;
  }

  .status-dot {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--mcla-text-muted);

    &.online {
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34,197,94,0.5);
    }
  }
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;

  .action-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-sm);
    background: transparent;
    color: var(--mcla-text-secondary);
    cursor: pointer;
    transition: all 0.12s;

    &:hover {
      border-color: currentColor;
    }

    &.primary {
      color: var(--mcla-primary-600);
      &:hover { background: var(--mcla-primary-light); }
    }

    &.danger {
      color: #ef4444;
      &:hover { background: rgba(239,68,68,0.08); }
    }
  }
}
</style>
