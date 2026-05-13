<template>
  <Teleport to="body">
    <Transition name="px-modal">
      <div v-if="visible" class="px-launch-progress-overlay" @click.self="handleOverlayClick">
        <div class="px-launch-progress-panel">
          <!-- 标题栏 -->
          <div class="panel-header">
            <span class="panel-icon">▶</span>
            <span class="panel-title">正在启动</span>
            <span class="panel-version">{{ versionId }}</span>
            <button class="panel-close" @click="handleClose" v-if="phase === 'error' || phase === 'idle'">✕</button>
          </div>

          <!-- 进度阶段列表 -->
          <div class="phase-list">
            <div
              v-for="(step, idx) in phases"
              :key="step.id"
              class="phase-item"
              :class="{
                active: step.id === phase,
                done: step.done,
                error: step.id === phase && phase === 'error',
              }"
            >
              <span class="phase-icon">
                <template v-if="step.done">✓</template>
                <template v-else-if="step.id === phase && phase !== 'error'">⟳</template>
                <template v-else-if="step.id === phase && phase === 'error'">✕</template>
                <template v-else>{{ idx + 1 }}</template>
              </span>
              <span class="phase-label">{{ step.label }}</span>
              <span class="phase-detail" v-if="step.id === phase">{{ detail || step.detail }}</span>
            </div>
          </div>

          <!-- 实时日志 -->
          <div class="log-area" v-if="showLog || phase === 'running'">
            <div class="log-header" @click="showLog = !showLog">
              <span>{{ showLog ? '收起日志' : '展开日志' }}</span>
            </div>
            <pre v-if="showLog" class="log-content">{{ logBuffer }}</pre>
          </div>

          <!-- 底部按钮 -->
          <div class="panel-footer" v-if="phase === 'running'">
            <button class="px-btn px-btn-sm" @click="$emit('openLog')">查看完整日志</button>
          </div>
          <div class="panel-footer" v-if="phase === 'error'">
            <button class="px-btn px-btn-sm px-btn-danger" @click="$emit('showError', errorMessage)">查看错误详情</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  versionId?: string
}>()

const emit = defineEmits<{
  openLog: []
  showError: [msg: string]
}>()

const visible = ref(false)
const phase = ref<LaunchPhase>('idle')
const message = ref('')
const detail = ref('')
const logBuffer = ref('')
const showLog = ref(false)
const errorMessage = ref('')

type LaunchPhase = 'idle' | 'building-config' | 'validating-java' | 'checking-files' | 'launching-process' | 'running' | 'error'

interface PhaseDef {
  id: LaunchPhase
  label: string
  detail: string
  done: boolean
}

const phases = ref<PhaseDef[]>([
  { id: 'building-config',    label: '构建启动参数',   detail: '正在构建启动参数...', done: false },
  { id: 'checking-files',    label: '检查游戏文件',   detail: '正在检查游戏文件...', done: false },
  { id: 'validating-java',   label: '检测 Java',      detail: '正在检测 Java 环境...', done: false },
  { id: 'launching-process',  label: '启动游戏进程',   detail: '正在启动游戏进程...', done: false },
  { id: 'running',           label: '游戏运行中',     detail: '游戏已启动',          done: false },
])

// 清理函数引用
let cleanupProgress: (() => void) | null = null
let cleanupLog: (() => void) | null = null
let cleanupExit: (() => void) | null = null

function resetPhases() {
  phases.value.forEach(p => { p.done = false })
}

onMounted(() => {
  const api = window.electronAPI
  if (!api?.game) return

  // 监听进度
  if (api.game.onProgress) {
    cleanupProgress = api.game.onProgress((data: { phase: LaunchPhase; message: string; detail?: string }) => {
      const { phase: newPhase, message: msg, detail: det } = data

      if (newPhase === 'idle') {
        visible.value = false
        resetPhases()
        return
      }

      if (newPhase === 'error') {
        phase.value = 'error'
        errorMessage.value = msg || '启动失败'
        message.value = msg
        detail.value = det || ''
        visible.value = true
        return
      }

      // 标记已完成阶段
      const phaseOrder: LaunchPhase[] = ['building-config', 'checking-files', 'validating-java', 'launching-process', 'running']
      const currentIdx = phaseOrder.indexOf(newPhase)
      phases.value.forEach((p, idx) => {
        const pIdx = phaseOrder.indexOf(p.id)
        p.done = pIdx < currentIdx
      })

      // 如果回到前面阶段（如 checking-files 被调用多次），重置后面的
      if (newPhase === 'checking-files') {
        phases.value.forEach(p => {
          if (p.id !== 'checking-files') p.done = false
        })
      }

      phase.value = newPhase
      message.value = msg
      detail.value = det || ''
      visible.value = true
    })
  }

  // 监听日志
  if (api.game.onLog) {
    cleanupLog = api.game.onLog((data: { text: string; level: string }) => {
      logBuffer.value += data.text
      if (logBuffer.value.length > 50000) {
        logBuffer.value = logBuffer.value.slice(-30000)
      }
    })
  }

  // 监听退出
  if (api.game.onExit) {
    cleanupExit = api.game.onExit((data: { code: number; signal: string | null; instanceId?: string }) => {
      if (data.code === 0 || data.code === null) {
        visible.value = false
        resetPhases()
      }
    })
  }
})

onUnmounted(() => {
  cleanupProgress?.()
  cleanupLog?.()
  cleanupExit?.()
})

function handleOverlayClick() {
  if (phase.value === 'error') visible.value = false
}

function handleClose() {
  if (phase.value === 'error' || phase.value === 'idle') {
    visible.value = false
  }
}

defineExpose({ open: () => { visible.value = true; resetPhases(); phase.value = 'building-config' } })
</script>

<style scoped>
.px-launch-progress-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.px-launch-progress-panel {
  width: 420px;
  background: var(--mcla-bg-secondary, #1a1a2e);
  border: 2px solid var(--mcla-primary, #6366f1);
  border-radius: 4px;
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.25);
  overflow: hidden;
  font-family: 'Courier New', monospace;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--mcla-bg-tertiary, #16213e);
  border-bottom: 1px solid var(--mcla-border, #2a2a4a);
  color: var(--mcla-text-primary, #e0e0ff);
  font-size: 14px;
}

.panel-icon {
  color: var(--mcla-primary, #6366f1);
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.panel-version {
  margin-left: auto;
  font-size: 12px;
  color: var(--mcla-text-muted, #8888aa);
}

.panel-close {
  background: none;
  border: 1px solid var(--mcla-border, #2a2a4a);
  color: var(--mcla-text-muted, #8888aa);
  font-size: 14px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}
.panel-close:hover {
  border-color: var(--mcla-danger, #ef4444);
  color: var(--mcla-danger, #ef4444);
}

.phase-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 3px;
  font-size: 13px;
  color: var(--mcla-text-muted, #8888aa);
  background: var(--mcla-bg-primary, #0f0f23);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.phase-item.active {
  border-color: var(--mcla-primary, #6366f1);
  color: var(--mcla-text-primary, #e0e0ff);
  background: rgba(99, 102, 241, 0.08);
}

.phase-item.active .phase-icon {
  animation: spin 1s linear infinite;
  color: var(--mcla-primary, #6366f1);
}

.phase-item.done {
  color: var(--mcla-success, #22c55e);
}

.phase-item.done .phase-icon {
  color: var(--mcla-success, #22c55e);
}

.phase-item.error {
  border-color: var(--mcla-danger, #ef4444);
  color: var(--mcla-danger, #ef4444);
  background: rgba(239, 68, 68, 0.08);
}

.phase-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.phase-label {
  flex-shrink: 0;
}

.phase-detail {
  margin-left: auto;
  font-size: 11px;
  color: var(--mcla-text-muted, #8888aa);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.log-area {
  border-top: 1px solid var(--mcla-border, #2a2a4a);
}

.log-header {
  padding: 6px 16px;
  font-size: 11px;
  color: var(--mcla-primary, #6366f1);
  cursor: pointer;
  text-align: right;
}
.log-header:hover { text-decoration: underline; }

.log-content {
  max-height: 150px;
  overflow-y: auto;
  padding: 8px 12px;
  font-size: 10px;
  color: var(--mcla-text-muted, #8888aa);
  background: #0a0a18;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.panel-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--mcla-border, #2a2a4a);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.px-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid var(--mcla-primary, #6366f1);
  background: transparent;
  color: var(--mcla-primary, #6366f1);
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s;
}
.px-btn:hover {
  background: var(--mcla-primary, #6366f1);
  color: #fff;
}
.px-btn-sm { padding: 4px 10px; font-size: 11px; }
.px-btn-danger {
  border-color: var(--mcla-danger, #ef4444);
  color: var(--mcla-danger, #ef4444);
}
.px-btn-danger:hover {
  background: var(--mcla-danger, #ef4444);
  color: #fff;
}

/* Transition */
.px-modal-enter-active,
.px-modal-leave-active {
  transition: opacity 0.2s;
}
.px-modal-enter-from,
.px-modal-leave-to {
  opacity: 0;
}
</style>
