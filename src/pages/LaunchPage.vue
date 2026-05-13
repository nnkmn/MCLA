<template>
  <div class="launch-page">
    <!-- 中央启动区 -->
    <div class="launch-center">
      <!-- 启动按钮 -->
      <button
        class="launch-btn"
        :class="{ launching: isLaunching, running: isRunning }"
        @click="handleLaunch"
        :disabled="isLaunching"
      >
        <span class="btn-icon">
          <!-- 就绪：播放图标 -->
          <svg v-if="!isLaunching && !isRunning" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <!-- 启动中：旋转加载 -->
          <svg v-else-if="isLaunching && !isRunning" class="spin-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" opacity="0.3"/>
            <path d="M12 2a10 10 0 0110 10" stroke-linecap="round"/>
          </svg>
          <!-- 运行中：停止方块 -->
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </span>

        <span class="btn-text">{{ launchLabel }}</span>
      </button>

      <!-- .minecraft 路径显示 -->
      <div class="mc-path-bar" :title="mcPath">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        <span class="mc-path-text" :class="{ 'not-found': !mcPathExists }">{{ mcPathDisplay }}</span>
        <div class="mc-path-actions">
          <button
            v-if="isCustomPath"
            class="mc-path-btn"
            title="恢复默认路径"
            @click.stop="restoreDefaultPath"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button
            class="mc-path-btn"
            title="修改路径"
            @click.stop="changePath"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
      </div>

      <!-- 状态信息 -->
      <p v-if="statusMessage" class="status-msg" :class="{ error: hasError }">
        {{ statusMessage }}
      </p>
    </div>

    <!-- 游戏日志控制台 -->
    <section class="console-section">
      <div class="console-header">
        <h3>游戏日志</h3>
        <div class="console-actions">
          <button class="console-btn" @click="clearLog" title="清空日志">清空</button>
          <button class="console-btn" @click="copyLog" title="复制日志">复制</button>
          <button
            v-if="isRunning"
            class="console-btn danger"
            @click="terminateGame"
            title="强制结束"
          >终止</button>
        </div>
      </div>
      <div ref="logContainerRef" class="console-output" @scroll="onScrollLog">
        <div
          v-for="(line, idx) in logLines"
          :key="idx"
          class="log-line"
          :class="getLineClass(line)"
        >{{ line }}</div>
        <div v-if="logLines.length === 0" class="log-empty">暂无日志输出，启动游戏后将显示...</div>
      </div>
    </section>

    <!-- 崩溃分析面板 -->
    <section v-if="crashReport" class="crash-panel">
      <div class="crash-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3>游戏崩溃</h3>
      </div>
      <div class="crash-body">
        <p class="crash-cause"><strong>原因：</strong>{{ crashReport.cause }}</p>
        <div v-if="crashReport.recommendedActions?.length" class="crash-actions">
          <strong>建议操作：</strong>
          <ul>
            <li v-for="(action, i) in crashReport.recommendedActions" :key="i">{{ action }}</li>
          </ul>
        </div>
        <details class="crash-stack">
          <summary>查看崩溃堆栈</summary>
          <pre>{{ crashReport.stackTrace?.join('\n') || '无' }}</pre>
        </details>
      </div>
    </section>
  </div>

  <PxLaunchProgress ref="pxProgressRef" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useVersionsStore, useAccountsStore, useInstancesStore } from '../stores'
import PxLaunchProgress from '../components/common/PxLaunchProgress.vue'

const pxProgressRef = ref<InstanceType<typeof PxLaunchProgress> | null>(null)

// ====== 状态 ======
const isLaunching = ref(false)
const isRunning = ref(false)
const statusMessage = ref('')
const hasError = ref(false)
const logLines = ref<string[]>([])
const logContainerRef = ref<HTMLElement | null>(null)
const autoScroll = ref(true)
const mcPath = ref('')
const mcPathExists = ref(true)
const isCustomPath = ref(false)
let logListener: ((...args: any[]) => void) | null = null
let exitListener: ((code: number) => void) | null = null
let progressListener: ((...args: any[]) => void) | null = null

// 崩溃报告（简化版）
interface CrashInfo {
  cause: string
  recommendedActions: string[]
  stackTrace?: string[]
}
const crashReport = ref<CrashInfo | null>(null)

// ====== 计算属性 ======
const mcPathDisplay = computed(() => {
  if (!mcPath.value) return '正在检测...'
  if (!mcPathExists.value) return mcPath.value + '（未找到）'
  return mcPath.value
})
const launchLabel = computed(() => {
  if (isRunning.value) return '运行中'
  if (isLaunching.value) return '启动中...'
  return '启动游戏'
})

// ====== 方法 ======
async function handleLaunch() {
  if (isLaunching.value || isRunning.value) {
    await terminateGame()
    return
  }

  isLaunching.value = true
  hasError.value = false
  statusMessage.value = '正在构建启动参数...'
  crashReport.value = null
  pxProgressRef.value?.open()
  addLog('[MCLA] 开始启动流程...')

  try {
    // 从 versionsStore 获取当前选中的版本
    const versionsStore = useVersionsStore()
    const accountsStore = useAccountsStore()
    const instancesStore = useInstancesStore()

    // 优先用 instancesStore 的当前实例
    let instanceId = instancesStore.currentInstanceId || ''
    let accountId = accountsStore.activeAccount?.id || ''

    // 如果没有实例 id，用 versionsStore 当前版本
    const versionId = versionsStore.currentVersionId || ''
    if (!instanceId && versionId) {
      instanceId = versionId
    }

    // 如果没有版本，提示用户
    if (!versionId && !instanceId) {
      hasError.value = true
      statusMessage.value = '请先选择一个游戏版本'
      addLog('[MCLA] 未选择版本，无法启动')
      isLaunching.value = false
      return
    }

    addLog(`[MCLA] 启动参数: instanceId="${instanceId}", accountId="${accountId}", versionId="${versionId}"`)

    const result = await window.electronAPI?.game.launch(instanceId || 'default', accountId || 'default', versionId)
    addLog(`[MCLA] launch IPC 返回: ${JSON.stringify(result)}`)
  } catch (e: any) {
    hasError.value = true
    statusMessage.value = e.message || '启动失败'
    addLog(`[MCLA] 启动失败: ${e.message || e}`)
  } finally {
    // 保持 isLaunching，progress 事件会在成功时设为 false
  }
}

async function terminateGame() {
  try {
    await window.electronAPI?.game.terminate()
    isRunning.value = false
    statusMessage.value = '游戏已终止'
    addLog('[MCLA] 游戏进程已手动终止')
  } catch (e) {
  }
}

/** 检查游戏是否在运行 */
async function checkRunning() {
  try {
    const running = await window.electronAPI?.game.isRunning()
    isRunning.value = !!running
    if (running) {
      statusMessage.value = '游戏正在运行中'
    }
  } catch (e) {
    // 忽略
  }
}

/** 添加日志行 */
function addLog(line: string) {
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logLines.value.push(`[${now}] ${line}`)
  // 自动滚动到底部
  if (autoScroll.value && logContainerRef.value) {
    requestAnimationFrame(() => {
      if (logContainerRef.value) {
        logContainerRef.scrollTop = logContainerRef.scrollHeight
      }
    })
  }
}

function clearLog() {
  logLines.value = []
}

function copyLog() {
  navigator.clipboard.writeText(logLines.value.join('\n')).then(() => {
    statusMessage.value = '日志已复制到剪贴板'
    setTimeout(() => { statusMessage.value = '' }, 2000)
  }).catch(() => {
    statusMessage.value = '复制失败'
  })
}

function getLineClass(line: string): string {
  const lower = line.toLowerCase()
  if (lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) return 'error'
  if (lower.includes('warn')) return 'warn'
  if (lower.includes('[mcla]')) return 'system'
  return ''
}

function onScrollLog() {
  if (!logContainerRef.value) return
  const el = logContainerRef.value
  const atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 40
  autoScroll.value = atBottom
}

/** 修改 .minecraft 路径 */
async function changePath() {
  const api = window.electronAPI
  if (!api?.dialog) return

  const selected = await api.dialog.selectFolder()
  if (!selected) return

  // 保存到配置
  await api.path.setCustom(selected)
  // 更新显示
  mcPath.value = selected
  isCustomPath.value = true
  mcPathExists.value = await api.path.exists(selected)
  statusMessage.value = `已切换到: ${selected}`
  setTimeout(() => { statusMessage.value = '' }, 3000)
}

/** 恢复默认路径 */
async function restoreDefaultPath() {
  const api = window.electronAPI
  if (!api?.path) return

  await api.path.clearCustom()
  const defaultPath = await api.path.getDefault()
  mcPath.value = defaultPath
  isCustomPath.value = false
  mcPathExists.value = await api.path.exists(defaultPath)
  statusMessage.value = `已恢复默认: ${defaultPath}`
  setTimeout(() => { statusMessage.value = '' }, 3000)
}

// ====== 生命周期 ======
onMounted(async () => {
  // 加载上次选中的版本（从 localStorage，App.vue onVersionSelect 会写这里）
  try {
    const lastVersionId = localStorage.getItem('mcla_last_version') || ''
    const lastVersionName = localStorage.getItem('mcla_last_version_name') || ''
    if (lastVersionId) {
      const versionsStore = useVersionsStore()
      versionsStore.setCurrentVersion(lastVersionId)
    }
  } catch (e) { /* ignore */ }

  // 加载 .minecraft 路径
  try {
    const api = window.electronAPI
    if (api?.path) {
      // 检查是否有自定义路径
      const customPath = await api.path.getCustom()
      if (customPath) {
        mcPath.value = customPath
        isCustomPath.value = true
      } else {
        mcPath.value = await api.path.getMinecraft()
      }
      mcPathExists.value = await api.path.exists(mcPath.value)
    }
  } catch (e) {
    mcPathExists.value = false
  }

  // 注册日志监听
  if (window.electronAPI?.game.onLog) {
    logListener = (line: string) => addLog(line)
    window.electronAPI.game.onLog(logListener)
  }

  // 注册退出监听
  if (window.electronAPI?.game.onExit) {
    exitListener = (code: number) => {
      isRunning.value = false
      isLaunching.value = false
      addLog(`[MCLA] 游戏进程退出，退出码: ${code}`)
      if (code !== 0) {
        hasError.value = true
        statusMessage.value = `游戏异常退出 (exit code ${code})`
      } else {
        statusMessage.value = '游戏正常退出'
      }
    }
    window.electronAPI.game.onExit(exitListener)
  }

  // 注册进度监听
  if (window.electronAPI?.game.onProgress) {
    progressListener = (progress: { phase: string; message: string; detail?: string }) => {
      statusMessage.value = progress.message
      if (progress.detail) addLog(`[进度] ${progress.message} → ${progress.detail}`)
      else addLog(`[进度] ${progress.message}`)
      if (progress.phase === 'running') {
        isLaunching.value = false
        isRunning.value = true
      }
      if (progress.phase === 'error') hasError.value = true
    }
    window.electronAPI.game.onProgress(progressListener)
  }

  // 检查是否已有运行中的游戏
  await checkRunning()
})

onUnmounted(() => {
  // 清理监听器
  // electron 的 ipcRenderer.off 需要 channel 名和具体回调引用
  // 这里简化处理——如果需要完整清理可以扩展 preload API
})
</script>

<style scoped lang="scss">
.launch-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 32px 24px;
  min-height: calc(100vh - 44px);
}

/* ====== 启动按钮区域 ====== */
.launch-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

/* .minecraft 路径显示条 */
.mc-path-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-md);
  font-size: 12px;
  color: var(--mcla-text-muted);
  max-width: 560px;
  width: 100%;

  svg { flex-shrink: 0; opacity: 0.6; }

  .mc-path-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--mcla-text-secondary);

    &.not-found { color: var(--mcla-text-error); }
  }

  .mc-path-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .mc-path-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--mcla-radius-sm);
    color: var(--mcla-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      color: var(--mcla-primary);
      border-color: var(--mcla-primary);
      background: rgba(99, 102, 241, 0.1);
    }
  }
}

.launch-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 220px;
  height: 80px;
  border: none;
  border-radius: var(--mcla-radius-xl);
  background: var(--mcla-gradient-primary);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--mcla-shadow-glow-primary);

  /* 光泽效果 */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.15), transparent);
    border-radius: var(--mcla-radius-xl) var(--mcla-radius-xl) 0 0;
    pointer-events: none;
  }

  /* 呼吸动画 - 就绪态 */
  &:not(.launching):not(.running):hover {
    transform: translateY(-2px) scale(1.02);
    filter: brightness(1.06);
    box-shadow: 0 8px 32px rgba(99,102,234,0.5);
  }

  &.launching .btn-icon {
    animation: pulse 1.6s ease-in-out infinite;
  }

  &.running {
    background: linear-gradient(135deg, #059669, #10b981, #34d399);
    box-shadow: 0 4px 20px rgba(16,185,129,0.35);

    .btn-icon {
      animation: pulse-green 2s ease-in-out infinite;
    }

    &:hover {
      filter: brightness(1.08);
    }
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    animation: none !important;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .spin-icon {
    animation: spin 1s linear infinite;
  }

  .btn-text {
    letter-spacing: 0.8px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}
@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
  50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
}

.status-msg {
  font-size: 13.5px;
  color: var(--mcla-text-secondary);
  min-height: 20px;

  &.error { color: var(--mcla-text-error); }
}

/* ====== 日志控制台 ====== */
.console-section {
  width: 100%;
  max-width: 900px;
  background: var(--mcla-bg-primary);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-lg);
  overflow: hidden;
  flex: 1;
  min-height: 280px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--mcla-bg-elevated);
  border-bottom: 1px solid var(--mcla-border-color);

  h3 {
    font-size: 13.5px;
    font-weight: 650;
    color: var(--mcla-text-secondary);
  }

  .console-actions {
    display: flex;
    gap: 6px;
  }

  .console-btn {
    padding: 4px 12px;
    font-size: 12px;
    background: transparent;
    border: 1px solid var(--mcla-border-color);
    border-radius: var(--mcla-radius-sm);
    color: var(--mcla-text-muted);
    cursor: pointer;
    transition: all 0.12s;

    &:hover {
      color: var(--mcla-primary);
      border-color: var(--mcla-primary-300);
    }

    &.danger:hover {
      color: #ef4444;
      border-color: #ef4444;
      background: rgba(239,68,68,0.08);
    }
  }
}

.console-output {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  font-family: var(--mcla-font-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--mcla-text-secondary);

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--mcla-scrollbar-thumb); border-radius: 3px; }
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;

  &.error { color: #fca5a5; }
  &.warn { color: #fcd34d; }
  &.system { color: #93c5fd; opacity: 0.85; }
}

.log-empty {
  text-align: center;
  color: var(--mcla-text-muted);
  padding: 60px 0;
  font-style: italic;
}

/* ====== 崩溃面板 ====== */
.crash-panel {
  width: 100%;
  max-width: 900px;
  background: var(--mcla-bg-elevated);
  border: 1px solid #fca5a5;
  border-left: 4px solid #ef4444;
  border-radius: var(--mcla-radius-lg);
  overflow: hidden;
}

.crash-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: rgba(239,68,68,0.06);

  h3 {
    font-size: 15px;
    font-weight: 700;
    color: var(--mcla-text-error);
  }
}

.crash-body {
  padding: 14px 18px;
  color: var(--mcla-text-secondary);
  font-size: 13.5px;

  .crash-cause {
    color: var(--mcla-text-error);
    margin-bottom: 10px;
  }

  .crash-actions {
    ul {
      margin: 8px 0;
      padding-left: 20px;
      li { margin: 4px 0; }
    }
  }

  .crash-stack {
    margin-top: 10px;

    summary {
      cursor: pointer;
      color: var(--mcla-text-muted);
      font-size: 12px;
      outline: none;

      &:hover { color: var(--mcla-text-secondary); }
    }

    pre {
      margin-top: 8px;
      padding: 10px 12px;
      background: var(--mcla-bg-primary);
      border-radius: var(--mcla-radius-md);
      font-size: 11px;
      line-height: 1.5;
      max-height: 180px;
      overflow-y: auto;
      color: var(--mcla-text-muted);
    }
  }
}
</style>
