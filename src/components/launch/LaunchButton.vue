<template>
  <button
    class="launch-btn"
    :class="btnClass"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <span class="btn-icon">
      <!-- 就绪态：播放 -->
      <svg v-if="!isLaunching && !isRunning" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <!-- 启动中：旋转 -->
      <svg v-else-if="isLaunching" class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke-linecap="round"/>
      </svg>
      <!-- 运行中：停止方块 -->
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
    </span>

    <span class="btn-label">{{ label }}</span>
    <span v-if="showVersion && versionName" class="btn-version">{{ versionName }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  isLaunching?: boolean
  isRunning?: boolean
  disabled?: boolean
  label?: string
  versionName?: string
  showVersion?: boolean
  size?: 'normal' | 'large' | 'small'
}>(), {
  isLaunching: false,
  isRunning: false,
  disabled: false,
  label: '启动游戏',
  showVersion: true,
  size: 'normal',
})

defineEmits<{
  (e: 'click'): void
}>()

const btnClass = computed(() => ({
  launching: props.isLaunching,
  running: props.isRunning,
  [props.size]: true,
}))
</script>

<style scoped lang="scss">
.launch-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  border-radius: var(--mcla-radius-lg);
  cursor: pointer;
  color: #fff;
  position: relative;
  overflow: hidden;
  transition: all var(--mcla-transition-normal);

  /* 光泽 */
  &::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.12), transparent);
    pointer-events: none;
  }

  /* 尺寸变体 */
  &.small { padding: 10px 20px; min-width: 120px; }
  &.normal { padding: 14px 28px; min-width: 180px; }
  &.large { padding: 18px 36px; min-width: 240px; }

  /* 默认渐变 */
  background: var(--mcla-gradient-primary);
  box-shadow: var(--mcla-shadow-glow-primary);

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-label {
    font-weight: 700;
    letter-spacing: 0.4px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  /* 字号按尺寸 */
  &.small { .btn-label { font-size: 13px; } .btn-version { font-size: 10px; } }
  &.normal { .btn-label { font-size: 16px; } .btn-version { font-size: 11.5px; } }
  &.large { .btn-label { font-size: 19px; } .btn-version { font-size: 12.5px; } }

  /* 就绪态悬停 */
  &:hover:not(:disabled):not(.launching):not(.running) {
    filter: brightness(1.06);
    transform: translateY(-1px);
    box-shadow: 0 6px 26px rgba(99,102,234,0.45);
  }
  &:active:not(:disabled) { transform: scale(0.98); }

  /* 启动中 */
  &.launching {
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    cursor: not-allowed;

    .spin { animation: spin 1s linear infinite; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* 运行中 */
  &.running {
    background: linear-gradient(135deg, #059669, #34d399);
    box-shadow: 0 4px 20px rgba(16,185,129,0.35);

    .btn-icon { animation: pulse-green 2s ease-in-out infinite; }

    &:hover:not(:disabled) { filter: brightness(1.08); }
  }

  @keyframes pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
    50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
  }

  /* 禁用 */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    animation: none !important;
  }

  .btn-version {
    color: rgba(255,255,255,0.72);
  }
}
</style>
