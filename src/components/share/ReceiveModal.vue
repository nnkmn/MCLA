<template>
  <PxModal
    :model-value="modelValue"
    title="接收实例分享"
    size="md"
    :closable="status !== 'transferring'"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="onClose"
  >
    <div class="receive-modal">
      <!-- 输入分享码 -->
      <div v-if="stage === 'input'" class="receive-stage">
        <div class="receive-stage-title">输入分享码</div>
        <div class="receive-stage-subtitle">向分享者获取 6 位分享码</div>

        <div class="receive-code-input">
          <div class="receive-code-digits">
            <input
              v-for="i in 6"
              :key="i"
              ref="codeInputRefs"
              type="text"
              maxlength="1"
              class="receive-code-digit"
              :class="{ 'receive-code-digit--filled': shareCodeDigits[i - 1] }"
              v-model="shareCodeDigits[i - 1]"
              @input="onCodeInput(i - 1)"
              @keydown="onCodeKeydown($event, i - 1)"
              @paste="onCodePaste"
            />
          </div>
        </div>
      </div>

      <!-- 连接中 -->
      <div v-else-if="stage === 'connecting'" class="receive-stage">
        <div class="receive-stage-title">正在连接...</div>
        <div class="receive-stage-subtitle">正在建立 P2P 连接</div>
      </div>

      <!-- 传输中 -->
      <div v-else-if="stage === 'transferring'" class="receive-stage">
        <div class="receive-stage-title">正在接收...</div>
        <div class="receive-stage-subtitle">
          {{ instanceName || '实例' }}
          <br />
          {{ transferredChunks }} / {{ totalChunks }} 分片 ({{ formatSpeed(bytesPerSecond) }} - 剩余
          {{ formatTime(estimatedRemaining) }})
        </div>
        <PxProgress
          :value="transferProgress"
          class="receive-progress"
          :indeterminate="totalChunks === 0"
        />
      </div>

      <!-- 完成 -->
      <div v-else-if="stage === 'completed'" class="receive-stage">
        <div class="receive-stage-title">接收完成！</div>
        <div class="receive-stage-subtitle">{{ instanceName || '实例' }} 已成功接收</div>
        <div class="receive-info">
          <div class="receive-info-item">
            <span class="receive-info-label">MC 版本</span>
            <span class="receive-info-value">{{ mcVersion || '-' }}</span>
          </div>
          <div class="receive-info-item">
            <span class="receive-info-label">加载器</span>
            <span class="receive-info-value">{{ loaderTypeText }}</span>
          </div>
        </div>
      </div>

      <!-- 错误 -->
      <div v-else-if="stage === 'error'" class="receive-stage">
        <div class="receive-stage-title">接收失败</div>
        <div class="receive-stage-subtitle receive-error">
          {{ errorMessage || '未知错误' }}
        </div>
      </div>
    </div>

    <template #footer>
      <button v-if="stage === 'input'" class="px-btn px-btn--secondary" @click="close">取消</button>
      <button
        v-if="stage === 'input'"
        class="px-btn px-btn--primary"
        :disabled="!canStartReceive"
        @click="startReceive"
      >
        开始接收
      </button>

      <button v-if="stage === 'connecting'" class="px-btn px-btn--secondary" @click="cancelReceive">
        取消
      </button>

      <button v-if="stage === 'completed'" class="px-btn px-btn--secondary" @click="close">
        稍后导入
      </button>
      <button
        v-if="stage === 'completed'"
        class="px-btn px-btn--primary"
        @click="importInstance"
        :disabled="importing"
      >
        {{ importing ? '导入中...' : '立即导入' }}
      </button>

      <button v-if="stage === 'error'" class="px-btn px-btn--secondary" @click="resetToInput">
        重试
      </button>
      <button v-if="stage === 'error'" class="px-btn px-btn--primary" @click="close">关闭</button>
    </template>
  </PxModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import PxModal from '../common/PxModal.vue'
import PxProgress from '../common/PxProgress.vue'
import type { ShareSession } from '../../types/ipc'

const props = defineProps<{
  modelValue: boolean
  initialShareCode?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: [instanceId: string]
}>()

type Stage = 'idle' | 'input' | 'connecting' | 'transferring' | 'completed' | 'error'

const stage = ref<Stage>('idle')
const sessionId = ref('')
const shareCodeDigits = ref<string[]>(['', '', '', '', '', ''])
const codeInputRefs = ref<HTMLInputElement[]>([])
const transferredChunks = ref(0)
const totalChunks = ref(0)
const bytesPerSecond = ref(0)
const estimatedRemaining = ref(0)
const instanceName = ref('')
const mcVersion = ref('')
const loaderType = ref('')
const errorMessage = ref('')
const importing = ref(false)

const canStartReceive = computed(() => {
  return shareCodeDigits.value.every((d) => d.length > 0)
})

const transferProgress = computed(() => {
  if (totalChunks.value === 0) return 0
  return (transferredChunks.value / totalChunks.value) * 100
})

const loaderTypeText = computed(() => {
  const map: Record<string, string> = {
    vanilla: 'Vanilla',
    forge: 'Forge',
    fabric: 'Fabric',
    neoforge: 'NeoForge',
    quilt: 'Quilt'
  }
  return map[loaderType.value] || loaderType.value || '-'
})

function formatSpeed(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  return `${Math.round(seconds / 60)} 分钟`
}

function onCodeInput(index: number) {
  const digit = shareCodeDigits.value[index]
  if (digit.length > 0 && index < 5) {
    nextTick(() => {
      codeInputRefs.value[index + 1]?.focus()
    })
  }
}

function onCodeKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !shareCodeDigits.value[index] && index > 0) {
    shareCodeDigits.value[index - 1] = ''
    nextTick(() => {
      codeInputRefs.value[index - 1]?.focus()
    })
  } else if (event.key === 'Enter' && canStartReceive.value) {
    startReceive()
  }
}

function onCodePaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') || ''
  const digits = text.replace(/\D/g, '').slice(0, 6).split('')
  for (let i = 0; i < 6; i++) {
    shareCodeDigits.value[i] = digits[i] || ''
  }
}

function close() {
  emit('update:modelValue', false)
}

function onClose() {
  if (stage.value === 'transferring') {
    return
  }
  cancelReceive()
}

function cancelReceive() {
  if (sessionId.value) {
    window.electronAPI.share.closeSession(sessionId.value)
  }
  stage.value = 'input'
  sessionId.value = ''
}

function resetToInput() {
  stage.value = 'input'
  sessionId.value = ''
  errorMessage.value = ''
  shareCodeDigits.value = ['', '', '', '', '', '']
  nextTick(() => {
    codeInputRefs.value[0]?.focus()
  })
}

async function startReceive() {
  const code = shareCodeDigits.value.join('')
  if (code.length !== 6) return

  stage.value = 'connecting'
  errorMessage.value = ''

  try {
    const result = await window.electronAPI.share.receiveInstance(code)
    sessionId.value = result.sessionId
  } catch (e: any) {
    stage.value = 'error'
    errorMessage.value = e.message || '连接失败'
  }
}

async function importInstance() {
  if (!sessionId.value) return

  importing.value = true
  try {
    const result = await window.electronAPI.share.importReceived(sessionId.value)
    if (result.ok && result.instanceId) {
      emit('imported', result.instanceId)
      close()
    } else {
      errorMessage.value = result.error || '导入失败'
    }
  } catch (e: any) {
    errorMessage.value = e.message || '导入失败'
  } finally {
    importing.value = false
  }
}

function handleSessionUpdate(_event: Event, data: { sessionId: string; session: ShareSession }) {
  if (data.sessionId !== sessionId.value) return

  const s = data.session
  transferredChunks.value = s.transferredChunks
  totalChunks.value = s.totalChunks
  instanceName.value = s.instanceName || ''
  mcVersion.value = s.mcVersion || ''
  loaderType.value = s.loaderType || ''

  if (s.status === 'connecting') {
    stage.value = 'connecting'
  } else if (s.status === 'transferring') {
    stage.value = 'transferring'
  } else if (s.status === 'completed') {
    stage.value = 'completed'
  } else if (s.status === 'error') {
    stage.value = 'error'
    errorMessage.value = s.error || '接收失败'
  }
}

function handleProgressUpdate(
  _event: Event,
  data: {
    sessionId: string
    progress: {
      transferredChunks: number
      totalChunks: number
      bytesPerSecond: number
      estimatedRemaining: number
    }
  }
) {
  if (data.sessionId !== sessionId.value) return
  transferredChunks.value = data.progress.transferredChunks
  totalChunks.value = data.progress.totalChunks
  bytesPerSecond.value = data.progress.bytesPerSecond
  estimatedRemaining.value = data.progress.estimatedRemaining
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.initialShareCode) {
        const digits = props.initialShareCode.slice(0, 6).split('')
        for (let i = 0; i < 6; i++) {
          shareCodeDigits.value[i] = digits[i] || ''
        }
        if (canStartReceive.value) {
          startReceive()
        } else {
          stage.value = 'input'
        }
      } else {
        stage.value = 'input'
        nextTick(() => {
          codeInputRefs.value[0]?.focus()
        })
      }
    } else {
      stage.value = 'idle'
      sessionId.value = ''
      shareCodeDigits.value = ['', '', '', '', '', '']
      transferredChunks.value = 0
      totalChunks.value = 0
      instanceName.value = ''
      mcVersion.value = ''
      loaderType.value = ''
      errorMessage.value = ''
    }
  }
)

onMounted(() => {
  window.electronAPI.share.onSessionUpdate(handleSessionUpdate)
  window.electronAPI.share.onProgressUpdate(handleProgressUpdate)
})

onUnmounted(() => {
  window.electronAPI.share.removeSessionUpdateListener(handleSessionUpdate)
  window.electronAPI.share.removeProgressUpdateListener(handleProgressUpdate)
})
</script>

<style scoped>
.receive-modal {
  text-align: center;
}

.receive-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
}

.receive-stage-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--mcla-text-primary);
}

.receive-stage-subtitle {
  font-size: 13px;
  color: var(--mcla-text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.receive-error {
  color: #ef4444;
}

.receive-progress {
  width: 100%;
  max-width: 320px;
  margin-top: 8px;
}

.receive-code-input {
  width: 100%;
  max-width: 320px;
}

.receive-code-digits {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.receive-code-digit {
  width: 44px;
  height: 56px;
  background: var(--mcla-bg-tertiary);
  border: 2px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--mcla-text-primary);
  font-family: 'Press Start 2P', monospace;
  outline: none;
  transition: all var(--mcla-transition-fast);
}
.receive-code-digit:focus {
  border-color: var(--mcla-primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.receive-code-digit--filled {
  border-color: var(--mcla-primary-color);
  background: rgba(59, 130, 246, 0.08);
}

.receive-info {
  background: var(--mcla-bg-tertiary);
  border-radius: var(--mcla-radius-md);
  padding: 12px 16px;
  width: 100%;
  max-width: 320px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.receive-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.receive-info-label {
  font-size: 12px;
  color: var(--mcla-text-tertiary);
}

.receive-info-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--mcla-text-primary);
}
</style>
