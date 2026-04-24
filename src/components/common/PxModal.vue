<template>
  <Teleport :to="teleportTo">
    <Transition :name="transitionName">
      <div
        v-if="modelValue"
        :class="['px-modal-overlay', { 'px-modal--blur': blur }]"
        @click.self="onBackdropClick"
      >
        <div
          ref="dialogRef"
          :class="['px-modal', `px-modal--${size}`]"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown.esc="onEsc"
        >
          <!-- Header -->
          <div v-if="$slots.header || title" class="px-modal__header">
            <slot name="header">
              <h3 :id="titleId" class="px-modal__title">{{ title }}</h3>
            </slot>
            <button
              v-if="closable"
              class="px-modal__close"
              @click="close"
              aria-label="关闭"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-modal__body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

export interface PxModalProps {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  blur?: boolean
  teleportTo?: string
  transitionName?: string
}

const props = withDefaults(defineProps<PxModalProps>(), {
  title: '',
  size: 'md',
  closable: true,
  closeOnBackdrop: true,
  closeOnEsc: true,
  blur: false,
  teleportTo: 'body',
  transitionName: 'px-modal',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const titleId = computed(() => `px-modal-title-${Math.random().toString(36).slice(2, 8)}`)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnBackdrop) close()
}

function onEsc(e: KeyboardEvent) {
  if (props.closeOnEsc && props.closable) {
    e.preventDefault()
    close()
  }
}

// 弹开时聚焦到对话框
watch(() => props.modelValue, async (val) => {
  if (val) {
    await nextTick()
    dialogRef.value?.focus()
  }
  // 滚动锁定
  document.body.style.overflow = val ? 'hidden' : ''
})

// 清理
watch(() => props.modelValue, (val) => {
  if (!val) document.body.style.overflow = ''
})
</script>

<style scoped>
/* ===== Overlay ===== */
.px-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 16px;
}
.px-modal--blur { backdrop-filter: blur(3px); }

/* ===== Dialog ===== */
.px-modal {
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  width: 100%;
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  box-shadow: var(--mcla-shadow-xl);
  outline: none;
}
.px-modal--sm { max-width: 360px; }
.px-modal--md { max-width: 480px; }
.px-modal--lg { max-width: 640px; }
.px-modal--xl { max-width: 800px; }

/* ===== Header ===== */
.px-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
  flex-shrink: 0;
}
.px-modal__title {
  font-size: var(--mcla-text-lg);
  font-weight: var(--mcla-font-semibold);
  color: var(--mcla-text-primary);
  margin: 0;
}
.px-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border: none; background: none;
  color: var(--mcla-text-tertiary);
  border-radius: var(--mcla-radius-sm);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);
  padding: 0;
}
.px-modal__close:hover {
  background: var(--mcla-bg-tertiary);
  color: var(--mcla-text-primary);
}

/* ===== Body ===== */
.px-modal__body {
  padding: 16px 20px;
  color: var(--mcla-text-secondary);
  font-size: var(--mcla-text-sm);
  overflow-y: auto;
  flex: 1;
}

/* ===== Footer ===== */
.px-modal__footer {
  padding: 0 20px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== Transitions ===== */
.px-modal-enter-active,
.px-modal-leave-active {
  transition: opacity 0.2s ease;
}
.px-modal-enter-active .px-modal,
.px-modal-leave-active .px-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.px-modal-enter-from,
.px-modal-leave-to {
  opacity: 0;
}
.px-modal-enter-from .px-modal {
  transform: scale(0.94) translateY(8px);
  opacity: 0;
}
.px-modal-leave-to .px-modal {
  transform: scale(0.94) translateY(8px);
  opacity: 0;
}
</style>
