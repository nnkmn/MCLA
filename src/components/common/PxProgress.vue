<template>
  <div :class="['px-progress', { 'px-progress--labeled': showLabel || showPercent }]">
    <div v-if="showLabel || showPercent" class="px-progress__meta">
      <span v-if="showLabel" class="px-progress__label">{{ label }}</span>
      <span v-if="showPercent" class="px-progress__percent">{{ displayPercent }}%</span>
    </div>
    <div :class="['px-progress__track', `px-progress__track--${size}`]">
      <div
        :class="['px-progress__bar', { 'px-progress__bar--animated': animated }]"
        :style="{ width: displayPercent + '%', background: gradient || undefined }"
        :role=" indeterminate ? undefined : 'progressbar'"
        :aria-valuenow="indeterminate ? undefined : displayPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface PxProgressProps {
  value: number       // 0-100
  label?: string
  showLabel?: boolean
  showPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  gradient?: string    // 自定义渐变，如 'var(--mcla-gradient-success)'
  indeterminate?: boolean
}

const props = withDefaults(defineProps<PxProgressProps>(), {
  value: 0,
  label: '',
  showLabel: false,
  showPercent: true,
  size: 'md',
  animated: false,
  gradient: '',
  indeterminate: false,
})

const displayPercent = computed(() => {
  if (props.indeterminate) return 0
  return Math.min(100, Math.max(0, Math.round(props.value)))
})
</script>

<style scoped>
.px-progress {}

.px-progress__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.px-progress__label {
  font-size: var(--mcla-text-xs);
  color: var(--mcla-text-secondary);
}
.px-progress__percent {
  font-size: var(--mcla-text-xs);
  font-weight: var(--mcla-font-semibold);
  color: var(--mcla-text-secondary);
  min-width: 40px;
  text-align: right;
}

.px-progress__track {
  width: 100%;
  background: var(--mcla-bg-tertiary);
  border-radius: var(--mcla-radius-full);
  overflow: hidden;
}
.px-progress__track--sm { height: 4px; }
.px-progress__track--md { height: 8px; }
.px-progress__track--lg { height: 12px; }

.px-progress__bar {
  height: 100%;
  background: var(--mcla-gradient-primary);
  border-radius: var(--mcla-radius-full);
  transition: width 0.4s ease;
}

.px-progress__bar--animated {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: px-progress-stripes 1s linear infinite;
}

@keyframes px-progress-stripes {
  from { background-position: 1rem 0; }
  to { background-position: 0 0; }
}
</style>
