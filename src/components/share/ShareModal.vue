<template>
  <PxModal
    :model-value="modelValue"
    title="分享实例"
    size="md"
    :closable="status !== 'transferring'"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="onClose"
  >
    <div class="share-modal">
      <!-- 打包中 -->
      <div v-if="stage === 'packing'" class="share-stage">
        <div class="share-icon share-icon--packing">
          <Icon icon="mdi:package-variant-closed" :size="48" />
        </div>
        <div class="share-stage-title">正在打包实例...</div>
        <div class="share-stage-subtitle">
          {{ packStageText }}
        </div>
        <PxProgress :value="packProgress" class="share-progress" />
      </div>

      <!-- 等待连接 -->
      <div v-else-if="stage === 'waiting'" class="share-stage">
        <div class="share-icon share-icon--waiting">
          <Icon icon="mdi:wifi" :size="48" />
        </div>
        <div class="share-stage-title">等待对方连接</div>
        <div class="share-stage-subtitle">将分享码发送给好友，或分享链接</div>

        <div class="share-code">
          <div class="share-code-label">分享码</div>
          <div class="share-code-value">
            <span v-for="(digit, i) in shareCodeDigits" :key="i" class="share-code-digit">
              {{ digit }}
            </span>
          </div>
          <button class="share-code-copy" @click="copyShareCode">
            <Icon icon="mdi:content-copy" :size="18" />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
        </div>

        <div class="share-link">
          <div class="share-link-input">
            <input type="text" :value="shareLink" readonly />
          </div>
          <button class="share-link-copy" @click="copyShareLink">
            <Icon icon="mdi:link-variant" :size="16" />
          </button>
        </div>
      </div>

      <!-- 传输中 -->
      <div v-else-if="stage === 'transferring'" class="share-stage">
        <div class="share-icon share-icon--transferring">
          <Icon icon="mdi:upload" :size="48" />
        </div>
        <div class="share-stage-title">正在传输...</div>
        <div class="share-stage-subtitle">
          {{ transferredChunks }} / {{ totalChunks }} 分片 ({{ formatSpeed(bytesPerSecond) }} - 剩余
          {{ formatTime(estimatedRemaining) }})
        </div>
        <PxProgress
          :value="transferProgress"
          class="share-progress"
          :indeterminate="totalChunks === 0"
        />
      </div>

      <!-- 完成 -->
      <div v-else-if="stage === 'completed'" class="share-stage">
        <div class="share-icon share-icon--success">
          <Icon icon="mdi:check-circle" :size="48" />
        </div>
        <div class="share-stage-title">分享完成！</div>
        <div class="share-stage-subtitle">实例已成功发送给对方</div>
      </div>

      <!-- 错误 -->
      <div v-else-if="stage === 'error'" class="share-stage">
        <div class="share-icon share-icon--error">
          <Icon icon="mdi:alert-circle" :size="48" />
        </div>
        <div class="share-stage-title">分享失败</div>
        <div class="share-stage-subtitle share-error">
          {{ errorMessage || '未知错误' }}
        </div>
      </div>
    </div>

    <template #footer>
      <button v-if="stage === 'waiting'" class="px-btn px-btn--secondary" @click="stopShare">
        取消分享
      </button>
      <button
        v-if="stage === 'completed' || stage === 'error'"
        class="px-btn px-btn--primary"
        @click="close"
      >
        {{ stage === 'completed' ? '完成' : '关闭' }}
      </button>
    </template>
  </PxModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import PxModal from '../common/PxModal.vue'
import PxProgress from '../common/PxProgress.vue'
import type { ShareSession } from '../../types/ipc'

const props = defineProps<{
  modelValue: boolean
  instanceId: string
  instanceName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  complete: []
}>()

type Stage = 'idle' | 'packing' | 'waiting' | 'transferring' | 'completed' | 'error'

const stage = ref<Stage>('idle')
const sessionId = ref('')
const shareCode = ref('')
const packProgress = ref(0)
const packStage = ref<'scanning' | 'packing' | 'hashing'>('scanning')
const transferredChunks = ref(0)
const totalChunks = ref(0)
const bytesPerSecond = ref(0)
const estimatedRemaining = ref(0)
const errorMessage = ref('')
const copied = ref(false)

const shareCodeDigits = computed(() => shareCode.value.split(''))

const shareLink = computed(() => `mcla://share:${shareCode.value}`)

const packStageText = computed(() => {
  switch (packStage.value) {
    case 'scanning':
      return '扫描文件...'
    case 'packing':
      return '压缩打包...'
    case 'hashing':
      return '计算校验...'
    default:
      return '准备中...'
  }
})

const transferProgress = computed(() => {
  if (totalChunks.value === 0) return 0
  return (transferredChunks.value / totalChunks.value) * 100
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

async function copyShareCode() {
  try {
    await navigator.clipboard.writeText(shareCode.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // ignore
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value)
  } catch {
    // ignore
  }
}

function close() {
  emit('update:modelValue', false)
}

function onClose() {
  if (stage.value === 'transferring') {
    return
  }
  stopShare()
}

function stopShare() {
  if (sessionId.value) {
    window.electronAPI.share.stopShare(sessionId.value)
  }
  close()
}

function handlePackProgress(
  _event: Event,
  data: { instanceId: string; stage: string; progress: number }
) {
  if (data.instanceId !== props.instanceId) return
  packProgress.value = data.progress
  if (data.stage === 'scanning') packStage.value = 'scanning'
  else if (data.stage === 'packing') packStage.value = 'packing'
  else if (data.stage === 'hashing') packStage.value = 'hashing'
}

function handleSessionUpdate(_event: Event, data: { sessionId: string; session: ShareSession }) {
  if (data.sessionId !== sessionId.value) return

  const s = data.session
  transferredChunks.value = s.transferredChunks
  totalChunks.value = s.totalChunks

  if (s.status === 'waiting') {
    stage.value = 'waiting'
  } else if (s.status === 'connecting' || s.status === 'transferring') {
    stage.value = 'transferring'
  } else if (s.status === 'completed') {
    stage.value = 'completed'
    emit('complete')
  } else if (s.status === 'error') {
    stage.value = 'error'
    errorMessage.value = s.error || '分享失败'
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

async function startShare() {
  stage.value = 'packing'
  packProgress.value = 0
  errorMessage.value = ''

  try {
    const result = await window.electronAPI.share.startInstance(props.instanceId)
    sessionId.value = result.sessionId
    shareCode.value = result.shareCode
    stage.value = 'waiting'
  } catch (e: any) {
    stage.value = 'error'
    errorMessage.value = e.message || '启动分享失败'
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      startShare()
    } else {
      stage.value = 'idle'
      sessionId.value = ''
      shareCode.value = ''
    }
  }
)

onMounted(() => {
  window.electronAPI.share.onPackProgress(handlePackProgress)
  window.electronAPI.share.onSessionUpdate(handleSessionUpdate)
  window.electronAPI.share.onProgressUpdate(handleProgressUpdate)
})

onUnmounted(() => {
  window.electronAPI.share.removePackProgressListener(handlePackProgress)
  window.electronAPI.share.removeSessionUpdateListener(handleSessionUpdate)
  window.electronAPI.share.removeProgressUpdateListener(handleProgressUpdate)
})
</script>

<style scoped>
.share-modal {
  text-align: center;
}

.share-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
}

.share-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.share-icon--packing {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  animation: pulse 2s infinite;
}
.share-icon--waiting {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
  animation: pulse 2s infinite;
}
.share-icon--transferring {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  animation: bounce 1s infinite;
}
.share-icon--success {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.share-icon--error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.share-stage-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--mcla-text-primary);
}

.share-stage-subtitle {
  font-size: 13px;
  color: var(--mcla-text-secondary);
  margin-bottom: 8px;
}

.share-error {
  color: #ef4444;
}

.share-progress {
  width: 100%;
  max-width: 320px;
  margin-top: 8px;
}

.share-code {
  background: var(--mcla-bg-tertiary);
  border-radius: var(--mcla-radius-md);
  padding: 16px 20px;
  margin-top: 8px;
  width: 100%;
  max-width: 320px;
}

.share-code-label {
  font-size: 12px;
  color: var(--mcla-text-tertiary);
  margin-bottom: 8px;
}

.share-code-value {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 12px;
}

.share-code-digit {
  width: 36px;
  height: 44px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--mcla-text-primary);
  font-family: 'Press Start 2P', monospace;
}

.share-code-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  color: var(--mcla-text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all var(--mcla-transition-fast);
}
.share-code-copy:hover {
  background: var(--mcla-bg-hover);
  color: var(--mcla-text-primary);
}

.share-link {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  margin-top: 12px;
}

.share-link-input {
  flex: 1;
}
.share-link-input input {
  width: 100%;
  padding: 8px 12px;
  background: var(--mcla-bg-tertiary);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  color: var(--mcla-text-secondary);
  font-size: 12px;
  font-family: monospace;
}

.share-link-copy {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mcla-bg-tertiary);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  color: var(--mcla-text-secondary);
  cursor: pointer;
  transition: all var(--mcla-transition-fast);
}
.share-link-copy:hover {
  background: var(--mcla-bg-hover);
  color: var(--mcla-text-primary);
}
</style>
