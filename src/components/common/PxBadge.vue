<template>
  <span :class="badgeClasses">
    <span v-if="dot && !pulse" class="px-badge__dot" />
    <span v-if="dot && pulse" :class="['px-badge__dot', 'px-badge__dot--pulse']" />
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface PxBadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gradient'
  size?: 'sm' | 'md'
  text?: string
  dot?: boolean       // 仅显示圆点
  pulse?: boolean     // 圆点呼吸动画
  outline?: boolean   // 边框风格
  gradient?: boolean  // 渐变背景
}

const props = withDefaults(defineProps<PxBadgeProps>(), {
  variant: 'primary',
  size: 'md',
  text: '',
  dot: false,
  pulse: false,
  outline: false,
  gradient: false,
})

const badgeClasses = computed(() => [
  'px-badge',
  `px-badge--${props.variant}`,
  `px-badge--${props.size}`,
  {
    'px-badge--dot-only': props.dot,
    'px-badge--outline': props.outline,
    'px-badge--gradient': props.gradient,
  },
])
</script>

<style scoped>
.px-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: var(--mcla-font-medium, 500);
  border-radius: 9999px;
  white-space: nowrap;
  line-height: 1.5;
}

/* Sizes */
.px-badge--sm {
  padding: 1px 7px;
  font-size: 10px;
}
.px-badge--md {
  padding: 2px 10px;
  font-size: 11px;
}

/* Dot */
.px-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: currentColor;
  flex-shrink: 0;
}
.px-badge__dot--pulse {
  animation: px-badge-pulse 1.5s ease-in-out infinite;
}
@keyframes px-badge-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* Dot-only (no text, compact) */
.px-badge--dot-only {
  padding: 0;
  width: 10px;
  height: 10px;
  justify-content: center;
  background: currentColor;
}
.px-badge--dot-only .px-badge__dot {
  width: 6px;
  height: 6px;
  background: #fff;
}

/* Variants */
.px-badge--primary {
  background: var(--mcla-primary-100, rgba(99, 102, 234, 0.12));
  color: var(--mcla-primary-700, #4338ca);
}
.px-badge--success {
  background: var(--mcla-success-bg, #dcfce7);
  color: #166534;
}
.px-badge--warning {
  background: var(--mcla-warning-bg, #fef3c7);
  color: #92400e;
}
.px-badge--error {
  background: var(--mcla-error-bg, #fee2e2);
  color: #991b1b;
}
.px-badge--info {
  background: var(--mcla-info-bg, #e0f2fe);
  color: #075985;
}
.px-badge--gradient {
  background: var(--mcla-gradient-primary);
  color: #fff;
}

/* Outline variant */
.px-badge--outline.px-badge--primary {
  background: transparent;
  color: var(--mcla-primary-600, #4f46e5);
  border: 1px solid var(--mcla-primary-300, #a5b4fc);
}
.px-badge--outline.px-badge--success {
  background: transparent;
  color: #16a34a;
  border: 1px solid #86efac;
}
.px-badge--outline.px-badge--warning {
  background: transparent;
  color: #d97706;
  border: 1px solid #fcd34d;
}
.px-badge--outline.px-badge--error {
  background: transparent;
  color: #dc2626;
  border: 1px solid #fca5a5;
}
.px-badge--outline.px-badge--info {
  background: transparent;
  color: #0284c7;
  border: 1px solid #7dd3fc;
}
</style>
