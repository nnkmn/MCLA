<template>
  <Teleport to="body">
    <transition name="modal-slide">
      <div v-if="visible" class="acc-overlay" @click.self="close">
        <div class="acc-window">
          <!-- 标题栏 -->
          <header class="acc-header">
            <button class="acc-back" @click="close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="acc-title">账户管理</span>
            <div class="acc-wc">
              <button class="acc-wc-btn" @click="minimize"><svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg></button>
              <button class="acc-wc-btn acc-close" @click="close"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg></button>
            </div>
          </header>

          <!-- 主体 -->
          <div class="acc-body">
            <!-- 微软账户 -->
            <section class="acc-section">
              <div class="acc-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#00a4ef" style="flex-shrink:0">
                  <rect width="24" height="24" rx="4"/>
                  <text x="5" y="17.5" font-size="14" font-weight="bold" fill="#fff">M</text>
                </svg>
                <span class="acc-section-title">微软账户</span>
                <span class="acc-badge" :class="msAccount ? 'success' : 'default'">
                  {{ msAccount ? '已登录' : '未登录' }}
                </span>
              </div>

              <!-- 已登录 -->
              <div class="acc-section-body" v-if="msAccount">
                <div class="acc-profile">
                  <div class="acc-avatar">{{ msAccount.name[0]?.toUpperCase() }}</div>
                  <div class="acc-profile-info">
                    <p class="acc-name">{{ msAccount.name }}</p>
                    <p class="acc-uuid">{{ msAccount.uuid }}</p>
                  </div>
                </div>
                <button class="acc-btn acc-btn-danger" @click="logoutMicrosoft">退出登录</button>
              </div>

              <!-- 未登录 -->
              <div class="acc-section-body acc-empty" v-else>
                <p class="acc-empty-hint">使用微软账户登录以访问多人游戏服务器</p>
                <button class="acc-btn-primary" @click="startMicrosoftLogin" :disabled="loginState !== 'idle'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#00a4ef"><rect width="24" height="24" rx="4"/><text x="5" y="17.5" font-size="14" font-weight="bold" fill="#fff">M</text></svg>
                  登录微软账户
                </button>
              </div>
            </section>

            <!-- 离线账户 -->
            <section class="acc-section">
              <div class="acc-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--mcla-text-muted)">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                <span class="acc-section-title">离线账户</span>
              </div>

              <div class="acc-section-body">
                <div class="acc-form-group">
                  <label class="acc-label">玩家名称</label>
                  <input
                    type="text"
                    class="acc-input"
                    v-model="offlineName"
                    placeholder="2-16 个字符"
                    maxlength="16"
                  />
                </div>
                <div class="acc-form-group">
                  <label class="acc-label">UUID（可选）</label>
                  <div class="acc-input-row">
                    <input
                      type="text"
                      class="acc-input"
                      v-model="offlineUuid"
                      placeholder="留空则自动生成"
                    />
                    <button class="acc-btn-ghost" @click="offlineUuid = generateUUID()">生成</button>
                  </div>
                </div>
                <div class="acc-form-actions">
                  <span v-if="offlineError" class="acc-error">{{ offlineError }}</span>
                  <button class="acc-btn-primary" @click="saveOffline" :disabled="savingOffline">
                    {{ savingOffline ? '保存中...' : '保存离线账户' }}
                  </button>
                </div>
              </div>
            </section>

            <!-- 提示 -->
            <aside class="acc-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>离线模式无法加入需要正版验证的服务器，但可以玩单人模式和部分服务器。</span>
            </aside>
          </div>
        </div>
      </div>
    </transition>

    <!-- OAuth 弹窗（独立于抽屉） -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="loginState !== 'idle'" @click.self="cancelLogin">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-title">登录微软账户</span>
            <button class="modal-close" @click="cancelLogin">✕</button>
          </div>
          <div class="modal-body">
            <!-- 等待用户访问链接 -->
            <template v-if="loginState === 'waiting_user'">
              <div class="device-flow">
                <p class="device-flow-hint">请在浏览器中打开以下链接并输入代码：</p>
                <a class="device-flow-link" :href="deviceCodeInfo.verificationUri" target="_blank">
                  {{ deviceCodeInfo.verificationUri }}
                </a>
                <div class="device-code-box">
                  <span class="device-code">{{ deviceCodeInfo.userCode }}</span>
                  <button class="btn-ghost btn-sm" @click="copyCode">{{ codeCopied ? '已复制' : '复制' }}</button>
                </div>
                <p class="device-flow-tip">输入代码后点「下一步」并完成微软登录，此窗口会自动更新。</p>
                <div class="loader-row">
                  <span class="loader"></span>
                  <span class="loader-text">等待授权...</span>
                </div>
              </div>
            </template>
            <!-- 处理中 -->
            <template v-else-if="loginState === 'processing'">
              <div class="processing">
                <span class="loader loader-lg"></span>
                <p class="processing-text">{{ loginProgressText }}</p>
              </div>
            </template>
            <!-- 成功 -->
            <template v-else-if="loginState === 'done'">
              <div class="result-box success">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                <p>登录成功，欢迎 {{ newAccountName }}！</p>
              </div>
            </template>
            <!-- 错误 -->
            <template v-else-if="loginState === 'error'">
              <div class="result-box error-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>{{ loginError }}</p>
                <button class="acc-btn-primary btn-sm" style="margin-top:12px" @click="startMicrosoftLogin">重试</button>
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button v-if="loginState === 'done'" class="acc-btn-outline" @click="closeOAuthModal">完成</button>
            <button v-else-if="loginState === 'error'" class="acc-btn-outline" @click="closeOAuthModal">关闭</button>
            <button v-else class="acc-btn-outline" @click="cancelLogin">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAccountsStore } from '../stores/accounts.store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [val: boolean] }>()

const accountsStore = useAccountsStore()

// ====== 微软账户状态 ======
const msAccount = ref<any>(null)

function syncMsAccount() {
  const active = accountsStore.accounts.find((a: any) => a.isActive === 1)
  msAccount.value = active?.type === 'microsoft' ? active : null
}

// ====== 登录流程状态 ======
type LoginState = 'idle' | 'waiting_user' | 'processing' | 'done' | 'error'
const loginState = ref<LoginState>('idle')
const loginProgressText = ref('')
const loginError = ref('')
const newAccountName = ref('')
const deviceCodeInfo = ref({ userCode: '', verificationUri: '', message: '' })
const codeCopied = ref(false)

// ====== 离线账户状态 ======
const offlineName = ref('Steve')
const offlineUuid = ref('')
const savingOffline = ref(false)
const offlineError = ref('')

// ====== 事件监听 ======
let progressUnlisten: (() => void) | null = null

onMounted(async () => {
  await accountsStore.fetchAccounts()
  syncMsAccount()

  progressUnlisten = window.electronAPI?.account.onLoginProgress((payload: any) => {
    handleLoginProgress(payload.stage, payload.detail)
  })
})

onUnmounted(() => {
  progressUnlisten?.()
})

watch(() => props.visible, async (val) => {
  if (val) {
    await accountsStore.fetchAccounts()
    syncMsAccount()
  }
})

function close() { emit('update:visible', false) }
function minimize() { window.electronAPI?.window?.minimize?.() }

function handleLoginProgress(stage: string, detail?: string) {
  switch (stage) {
    case 'device_code':
      loginState.value = 'processing'
      loginProgressText.value = '正在获取设备码...'
      break
    case 'waiting_user': {
      try {
        const info = JSON.parse(detail || '{}')
        deviceCodeInfo.value = {
          userCode: info.userCode || '',
          verificationUri: info.verificationUri || 'https://microsoft.com/link',
          message: info.message || '',
        }
        loginState.value = 'waiting_user'
      } catch {
        loginState.value = 'waiting_user'
      }
      break
    }
    case 'token_received':
      loginState.value = 'processing'
      loginProgressText.value = '微软令牌获取成功，验证 Xbox 账户...'
      break
    case 'xbox_live':
      loginProgressText.value = detail || '正在连接 Xbox Live...'
      break
    case 'xsts':
      loginProgressText.value = detail || '正在获取 XSTS 令牌...'
      break
    case 'minecraft':
      loginProgressText.value = detail || '正在验证 Minecraft 账户...'
      break
    case 'profile':
      loginProgressText.value = detail || '正在获取游戏档案...'
      break
    case 'saving':
      loginProgressText.value = '正在保存账户...'
      break
    case 'done':
      loginState.value = 'done'
      newAccountName.value = detail || ''
      break
    case 'error':
      loginState.value = 'error'
      loginError.value = detail || '登录失败，请重试'
      break
    case 'timeout':
      loginState.value = 'error'
      loginError.value = '设备码已过期，请重新点击登录'
      break
    case 'cancelled':
      loginState.value = 'idle'
      break
  }
}

async function startMicrosoftLogin() {
  loginState.value = 'processing'
  loginProgressText.value = '正在初始化...'
  loginError.value = ''
  newAccountName.value = ''
  codeCopied.value = false

  const result = await window.electronAPI?.account.loginMicrosoft()

  if (result?.ok && result.data) {
    newAccountName.value = result.data.name || '新账户'
    loginState.value = 'done'
    await accountsStore.fetchAccounts()
    syncMsAccount()
  } else if (result?.error === 'LOGIN_CANCELLED') {
    loginState.value = 'idle'
  } else if (loginState.value !== 'error') {
    loginState.value = 'error'
    loginError.value = result?.error || '登录失败，请重试'
  }
}

async function cancelLogin() {
  await window.electronAPI?.account.cancelLogin()
  loginState.value = 'idle'
}

function closeOAuthModal() {
  loginState.value = 'idle'
}

async function logoutMicrosoft() {
  if (!msAccount.value) return
  await accountsStore.deleteAccount(msAccount.value.id)
  msAccount.value = null
  await accountsStore.fetchAccounts()
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(deviceCodeInfo.value.userCode)
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  } catch { /* ignore */ }
}

async function saveOffline() {
  offlineError.value = ''
  const name = offlineName.value.trim()
  if (!name || name.length < 2) {
    offlineError.value = '玩家名至少 2 个字符'
    return
  }
  savingOffline.value = true
  try {
    const result = await window.electronAPI?.account.loginOffline(name)
    if (result?.ok) {
      await accountsStore.fetchAccounts()
      syncMsAccount()
    } else {
      offlineError.value = result?.error || '保存失败'
    }
  } catch (e: any) {
    offlineError.value = e.message || '保存失败'
  } finally {
    savingOffline.value = false
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
</script>

<style scoped lang="scss">
/* ===== 抽屉主体 ===== */
.acc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9000;
  backdrop-filter: blur(1px);
}

.acc-window {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 420px;
  background: var(--mcla-bg-elevated, #1a1a2e);
  border-left: 1px solid var(--mcla-border-color, rgba(255,255,255,0.08));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
}

/* ===== 标题栏 ===== */
.acc-header {
  height: 44px;
  background: var(--mcla-gradient-primary);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
  gap: 10px;
}

.acc-back {
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.12); color: #fff; }
}

.acc-title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.acc-wc {
  display: flex;
  gap: 4px;
}

.acc-wc-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.18); color: #fff; }
  &.acc-close:hover { background: #e81123; }
}

/* ===== 主体 ===== */
.acc-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== 区块 ===== */
.acc-section {
  background: var(--mcla-bg-primary, rgba(255,255,255,0.03));
  border: 1px solid var(--mcla-border-color, rgba(255,255,255,0.06));
  border-radius: 10px;
  overflow: hidden;
}

.acc-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--mcla-border-color, rgba(255,255,255,0.06));
}

.acc-section-title {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
}

.acc-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  &.success { background: #e6f4ea; color: #137333; }
  &.default { background: rgba(255,255,255,0.06); color: var(--mcla-text-muted); }
}

.acc-section-body {
  padding: 14px;

  &.acc-empty {
    text-align: center;
    .acc-empty-hint {
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--mcla-text-secondary);
    }
  }
}

/* ===== 资料行 ===== */
.acc-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.acc-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00a4ef, #0078d4);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.acc-profile-info {
  .acc-name { margin: 0; font-size: 14px; font-weight: 600; }
  .acc-uuid { margin: 2px 0 0; font-size: 11px; color: var(--mcla-text-muted); font-family: monospace; }
}

/* ===== 表单 ===== */
.acc-form-group {
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
}

.acc-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--mcla-text-secondary);
  margin-bottom: 5px;
}

.acc-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--mcla-border-color, rgba(255,255,255,0.1));
  border-radius: 7px;
  font-size: 13px;
  color: var(--mcla-text-primary);
  background: rgba(0,0,0,0.2);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
  &:focus { border-color: var(--mcla-primary-400, #818cf8); }
  &::placeholder { color: var(--mcla-text-muted); }
}

.acc-input-row {
  display: flex;
  gap: 6px;
  .acc-input { flex: 1; }
}

.acc-form-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.acc-error {
  font-size: 11px;
  color: var(--mcla-error, #f87171);
}

/* ===== 按钮 ===== */
.acc-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid var(--mcla-border-color, rgba(255,255,255,0.1));
  background: rgba(255,255,255,0.05);
  color: var(--mcla-text-secondary);
  &:hover { border-color: var(--mcla-primary-400); color: var(--mcla-primary-400); }
  &.acc-btn-danger { color: var(--mcla-error, #f87171); &:hover { background: rgba(248,113,113,0.1); border-color: #f87171; } }
}

.acc-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 18px;
  background: var(--mcla-primary, #6366f1);
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: var(--mcla-primary-hover, #4f46e5); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.acc-btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  border: 1px solid var(--mcla-border-color, rgba(255,255,255,0.12));
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  cursor: pointer;
  color: var(--mcla-text-secondary);
  transition: all 0.15s;
  &:hover { border-color: currentColor; }
}

.acc-btn-ghost {
  padding: 7px 12px;
  border: 1px solid var(--mcla-border-color, rgba(255,255,255,0.1));
  background: rgba(255,255,255,0.04);
  color: var(--mcla-text-secondary);
  border-radius: 7px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { border-color: var(--mcla-primary-400); color: var(--mcla-primary-400); }
}

.btn-sm { padding: 6px 12px; font-size: 12px; }

/* ===== 提示框 ===== */
.acc-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #fef7e0;
  border-left: 3px solid #f9ab00;
  border-radius: 0 6px 6px 0;
  font-size: 11px;
  color: #776000;
  svg { flex-shrink: 0; margin-top: 1px; }
}

/* ===== 动画 ===== */
.modal-slide-enter-active, .modal-slide-leave-active {
  transition: opacity 0.2s ease;
  .acc-window { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
}
.modal-slide-enter-from, .modal-slide-leave-to {
  opacity: 0;
  .acc-window { transform: translateX(100%); }
}

/* ===== OAuth 弹窗（复用 AccountPage 样式） ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal-card {
  background: var(--mcla-bg-elevated, #1a1a2e);
  border: 1px solid var(--mcla-border-color, rgba(255,255,255,0.08));
  border-radius: 14px;
  width: 420px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  .modal-title { font-size: 14px; font-weight: 700; }
  .modal-close {
    background: none; border: none; font-size: 16px;
    cursor: pointer; color: var(--mcla-text-muted);
    padding: 2px 6px; border-radius: 4px;
    &:hover { background: rgba(255,255,255,0.08); }
  }
}

.modal-body { padding: 20px 18px; min-height: 120px; }

.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Device Flow */
.device-flow { text-align: center; }
.device-flow-hint { font-size: 13px; color: var(--mcla-text-secondary); margin: 0 0 10px; }
.device-flow-link {
  display: inline-block; font-size: 14px; font-weight: 700;
  color: var(--mcla-primary, #6366f1); text-decoration: none; margin-bottom: 14px;
  &:hover { text-decoration: underline; }
}
.device-code-box {
  display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;
}
.device-code {
  font-size: 26px; font-weight: 900; letter-spacing: 4px;
  color: var(--mcla-text-primary);
  background: rgba(0,0,0,0.2); border: 1px solid var(--mcla-border-color);
  border-radius: 8px; padding: 6px 18px; font-family: 'Courier New', monospace;
}
.device-flow-tip { font-size: 12px; color: var(--mcla-text-muted); margin: 0 0 14px; }
.loader-row {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--mcla-text-secondary); font-size: 12px;
}

/* Processing */
.processing {
  display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 10px 0;
  .processing-text { font-size: 13px; color: var(--mcla-text-secondary); margin: 0; }
}

/* Result */
.result-box {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 10px 0; text-align: center;
  p { margin: 0; font-size: 14px; font-weight: 600; }
  &.success p { color: #34a853; }
  &.error-box p { color: var(--mcla-error, #ea4335); font-size: 13px; font-weight: 400; }
}

/* Loader */
.loader {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid var(--mcla-border-color, rgba(255,255,255,0.1));
  border-top-color: var(--mcla-primary, #6366f1);
  border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
  &.loader-lg { width: 32px; height: 32px; border-width: 3px; }
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
