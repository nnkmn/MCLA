<template>
  <div class="account-page">
    <div class="page-header">
      <h2>账户管理</h2>
    </div>

    <!-- 微软正版账户 -->
    <section class="account-section">
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#00a4ef" style="flex-shrink:0">
          <rect width="24" height="24" rx="4"/>
          <text x="5" y="17.5" font-size="14" font-weight="bold" fill="#fff">M</text>
        </svg>
        <span class="section-title">微软账户</span>
        <span class="status-badge" :class="msAccount ? 'success' : 'default'">
          {{ msAccount ? '已登录' : '未登录' }}
        </span>
      </div>

      <!-- 已登录状态 -->
      <div class="section-body" v-if="msAccount">
        <div class="profile-row">
          <img v-if="skinDataUrl" :src="skinDataUrl" class="profile-avatar" alt="皮肤" />
          <div v-else-if="skinError" class="profile-avatar placeholder skin-error" :title="skinError">{{ msAccount.name[0]?.toUpperCase() }}</div>
          <div v-else class="profile-avatar placeholder loading-skin">
            <span>{{ msAccount.name[0]?.toUpperCase() }}</span>
          </div>
          <div class="profile-info">
            <p class="profile-name">{{ msAccount.name }}</p>
            <p class="profile-uuid">{{ msAccount.uuid }}</p>
            <p v-if="skinError" class="skin-error-text">皮肤: {{ skinError }}</p>
          </div>
        </div>
        <button class="btn-outline btn-sm btn-danger" @click="logoutMicrosoft">退出登录</button>
      </div>

      <!-- 未登录状态 -->
      <div class="section-body empty-body" v-else>
        <p>使用微软账户登录以访问多人游戏服务器</p>
        <button class="btn-primary" @click="startMicrosoftLogin" :disabled="loginState !== 'idle'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#00a4ef"><rect width="24" height="24" rx="4"/><text x="5" y="17.5" font-size="14" font-weight="bold" fill="#fff">M</text></svg>
          登录微软账户
        </button>
      </div>
    </section>

    <!-- 离线账户 -->
    <section class="account-section offline">
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:var(--mcla-text-muted)">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        <span class="section-title">离线账户</span>
      </div>

      <div class="section-body">
        <div class="form-group">
          <label>玩家名称</label>
          <input
            type="text"
            class="input-field"
            v-model="offlineName"
            placeholder="输入玩家名（2-16 个字符）"
            maxlength="16"
          />
        </div>

        <div class="form-group">
          <label>UUID（可选）</label>
          <div class="input-row">
            <input
              type="text"
              class="input-field"
              v-model="offlineUuid"
              placeholder="留空则自动生成"
            />
            <button class="btn-sm btn-ghost" @click="offlineUuid = generateUUID()">生成</button>
          </div>
        </div>

        <div class="form-actions">
          <span v-if="offlineError" class="form-error">{{ offlineError }}</span>
          <button class="btn-primary" @click="saveOffline" :disabled="savingOffline">
            {{ savingOffline ? '保存中...' : '保存离线账户' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 提示 -->
    <aside class="hint-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>离线模式无法加入需要正版验证的服务器，但可以玩单人模式和部分服务器。</span>
    </aside>

    <!-- 外链入口 -->
    <div class="external-links">
      <a class="ext-link-btn" href="https://www.xbox.com/zh-cn/games/store/minecraft-java-bedrock-edition-for-pc/9nxp44l49shj" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        购买正版
      </a>
      <a class="ext-link-btn" href="https://www.minecraft.net/zh-hans" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
        前往官网
      </a>
    </div>

    <!-- ===== Microsoft OAuth Device Flow 弹窗 ===== -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="loginState !== 'idle'" @click.self="cancelLogin">
        <div class="modal-card">
          <!-- 标题栏 -->
          <div class="modal-header">
            <span class="modal-title">登录微软账户</span>
            <button class="modal-close" @click="cancelLogin">✕</button>
          </div>

          <!-- 内容区 -->
          <div class="modal-body">

            <!-- 等待用户访问链接阶段 -->
            <template v-if="loginState === 'waiting_user'">
              <div class="device-flow">
                <p class="device-flow-hint">浏览器已自动打开验证页面，请在页面中输入下方代码：</p>
                <div class="device-code-box">
                  <span class="device-code">{{ deviceCodeInfo.userCode }}</span>
                  <button class="btn-ghost btn-sm" @click="copyCode">{{ codeCopied ? '已复制' : '复制并打开浏览器' }}</button>
                </div>
                <p class="device-flow-tip">输入代码后完成微软登录，此窗口会自动更新。</p>
                <div class="loader-row">
                  <span class="loader"></span>
                  <span class="loader-text">等待授权...</span>
                </div>
              </div>
            </template>

            <!-- 处理中阶段 -->
            <template v-else-if="loginState === 'processing'">
              <div class="processing">
                <span class="loader loader-lg"></span>
                <p class="processing-text">{{ loginProgressText }}</p>
              </div>
            </template>

            <!-- 成功阶段 -->
            <template v-else-if="loginState === 'done'">
              <div class="result-box success">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                <p>登录成功，欢迎 {{ newAccountName }}！</p>
              </div>
            </template>

            <!-- 错误阶段 -->
            <template v-else-if="loginState === 'error'">
              <div class="result-box error-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>{{ loginError }}</p>
                <button class="btn-primary btn-sm" style="margin-top:12px" @click="startMicrosoftLogin">重试</button>
              </div>
            </template>

          </div>

          <!-- 底部按钮 -->
          <div class="modal-footer">
            <button
              v-if="loginState === 'done'"
              class="btn-primary"
              @click="closeModal"
            >完成</button>
            <button
              v-else-if="loginState === 'error'"
              class="btn-outline"
              @click="closeModal"
            >关闭</button>
            <button
              v-else
              class="btn-outline"
              @click="cancelLogin"
            >取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAccountsStore } from '../stores/accounts.store'

const accountsStore = useAccountsStore()

// ====== 微软账户状态 ======
const msAccount = ref(accountsStore.activeAccount?.type === 'microsoft' ? accountsStore.activeAccount : null)
const skinDataUrl = ref<string | null>(null)
const skinError = ref<string | null>(null)

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

// ====== 监听登录进度推送 ======
let progressUnlisten: (() => void) | null = null

onMounted(async () => {
  await accountsStore.fetchAccounts()
  await syncMsAccount()

  // 监听来自主进程的登录进度
  progressUnlisten = window.electronAPI?.account.onLoginProgress((payload) => {
    handleLoginProgress(payload.stage, payload.detail)
  }) as any
})

onUnmounted(() => {
  progressUnlisten?.()
})

async function syncMsAccount() {
  const active = accountsStore.accounts.find(a => a.isActive === 1)
  msAccount.value = active?.type === 'microsoft' ? (active as any) : null
  skinDataUrl.value = null
  skinError.value = null
  if (msAccount.value?.uuid) {
    const result = await window.electronAPI?.account.getSkinDataUrl(msAccount.value.uuid)
    if (result?.ok) {
      // 裁剪出皮肤头部，放大显示
      skinDataUrl.value = await cropSkinHead(result.data)
    } else if (result?.error) {
      skinError.value = result.error
    }
  }
}

/** 从完整皮肤图中裁剪头像区域（8x8 头部像素） */
async function cropSkinHead(skinDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const SIZE = 8
      const canvasSize = 48
      canvas.width = canvasSize
      canvas.height = canvasSize
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      // Minecraft 皮肤脸部在 (8, 8) 位置，8x8 像素
      ctx.drawImage(img, 8, 8, SIZE, SIZE, 0, 0, canvasSize, canvasSize)
      const result = canvas.toDataURL('image/png')
      resolve(result)
    }
    img.onerror = (e) => {
      resolve(skinDataUrl)
    }
    img.src = skinDataUrl
  })
}

// ====== 处理进度事件 ======
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

// ====== 开始 Microsoft 登录 ======
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
    await syncMsAccount()
  } else if (result?.error === 'LOGIN_CANCELLED') {
    loginState.value = 'idle'
  } else if (loginState.value !== 'error') {
    loginState.value = 'error'
    loginError.value = result?.error || '登录失败，请重试'
  }
}

// ====== 取消登录 ======
async function cancelLogin() {
  await window.electronAPI?.account.cancelLogin()
  loginState.value = 'idle'
}

function closeModal() {
  loginState.value = 'idle'
}

// ====== 退出微软账户 ======
async function logoutMicrosoft() {
  if (!msAccount.value) return
  await accountsStore.deleteAccount(msAccount.value.id)
  msAccount.value = null
}

// ====== 复制设备码并打开浏览器 ======
async function copyCode() {
  try {
    await navigator.clipboard.writeText(deviceCodeInfo.value.userCode)
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  } catch {
    // 不支持 clipboard，继续打开浏览器
  }
  // 直接用 window.open 打开浏览器，不依赖主进程
  window.open(deviceCodeInfo.value.verificationUri, '_blank')
}

// ====== 保存离线账户 ======
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

// ====== 生成 UUID ======
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
</script>

<style scoped lang="scss">
.account-page {
  padding: 16px 28px;
  max-width: 520px;
}

.page-header { margin-bottom: 20px; h2 { margin: 0; font-size: 17px; font-weight: 700; } }

/* ====== 账户区块 ====== */
.account-section {
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;

  &.offline .section-header svg { color: var(--mcla-text-secondary); }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--mcla-border);

  .section-title {
    flex: 1;
    font-size: 13px;
    font-weight: 700;
  }
}

.status-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;

  &.success { background: #e6f4ea; color: #137333; }
  &.default { background: var(--mcla-bg-primary); color: var(--mcla-text-muted); }
}

.section-body {
  padding: 16px;

  &.empty-body {
    text-align: center;

    p { margin: 0 0 12px; font-size: 13px; color: var(--mcla-text-secondary); }
  }
}

/* ====== 资料行 ====== */
.profile-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;

  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #00a4ef, #0078d4);
    color: #fff;
    font-size: 20px;
    font-weight: 700;
  }
}

.loading-skin span {
  animation: pulse 1s ease-in-out infinite;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.skin-error {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  cursor: help;
}

.skin-error-text {
  margin: 2px 0 0 !important;
  font-size: 10px !important;
  color: #ef4444 !important;
}

img.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid var(--mcla-border-color);
  image-rendering: pixelated; /* 像素风皮肤不要模糊 */
  background: #8B5E3C; /* 默认 Steve 棕色底 */
}

.profile-info {
  .profile-name { margin: 0; font-size: 14px; font-weight: 600; }
  .profile-uuid { margin: 2px 0 0; font-size: 11px; color: var(--mcla-text-muted); font-family: monospace; }
}

/* ====== 表单 ====== */
.form-group {
  margin-bottom: 14px;

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--mcla-text-secondary);
    margin-bottom: 5px;
  }
}

.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  font-size: 13px;
  color: var(--mcla-text-primary);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  background: var(--mcla-bg-primary);

  &:focus { border-color: var(--mcla-primary-400); }
  &::placeholder { color: var(--mcla-text-muted); }
}

.input-row {
  display: flex;
  gap: 6px;

  .input-field { flex: 1; }
}

.form-actions {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.form-error {
  font-size: 12px;
  color: var(--mcla-error);
}

/* ====== 按钮 ====== */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--mcla-primary);
  color: #fff;
  border: none;
  border-radius: var(--mcla-radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) { background: var(--mcla-primary-hover); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &.btn-sm { padding: 6px 14px; font-size: 12px; }
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border: 1px solid var(--mcla-border-color);
  background: transparent;
  border-radius: var(--mcla-radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: currentColor; }
  &.btn-danger { color: var(--mcla-error); &:hover { background: var(--mcla-error-bg); } }
}

.btn-sm { font-size: 12px; }
.btn-ghost {
  background: var(--mcla-bg-primary);
  border: 1px solid var(--mcla-border-color);
  color: var(--mcla-text-secondary);
  border-radius: var(--mcla-radius-xs);
  font-size: 12px;
  cursor: pointer;
  padding: 6px 12px;

  &:hover { border-color: var(--mcla-primary-400); color: var(--mcla-primary-600); }
}

/* ====== 提示框 ====== */
.hint-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: #fef7e0;
  border-left: 3px solid #f9ab00;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  color: #776000;

  svg { flex-shrink: 0; margin-top: 1px; }
}

/* ====== OAuth 弹窗 ====== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal-card {
  background: var(--mcla-bg-elevated, #fff);
  border: 1px solid var(--mcla-border-color, #e0e0e0);
  border-radius: 14px;
  width: 420px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--mcla-border-color, #e0e0e0);

  .modal-title { font-size: 14px; font-weight: 700; }
  .modal-close {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--mcla-text-muted);
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;

    &:hover { background: var(--mcla-bg-primary); }
  }
}

.modal-body {
  padding: 20px 18px;
  min-height: 120px;
}

.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--mcla-border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ====== Device Flow 内容 ====== */
.device-flow {
  text-align: center;

  .device-flow-hint {
    font-size: 13px;
    color: var(--mcla-text-secondary);
    margin: 0 0 10px;
  }

  .device-flow-link {
    display: inline-block;
    font-size: 14px;
    font-weight: 700;
    color: var(--mcla-primary, #0078d4);
    text-decoration: none;
    margin-bottom: 14px;

    &:hover { text-decoration: underline; }
  }

  .device-code-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .device-code {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 4px;
    color: var(--mcla-text-primary);
    font-family: 'Courier New', monospace;
    background: var(--mcla-bg-primary);
    border: 1px solid var(--mcla-border-color);
    border-radius: 8px;
    padding: 6px 18px;
  }

  .device-flow-tip {
    font-size: 12px;
    color: var(--mcla-text-muted);
    margin: 0 0 14px;
  }

  .loader-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--mcla-text-secondary);
    font-size: 12px;
  }
}

/* ====== 处理中 ====== */
.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 10px 0;

  .processing-text {
    font-size: 13px;
    color: var(--mcla-text-secondary);
    margin: 0;
  }
}

/* ====== 结果 ====== */
.result-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  text-align: center;

  p { margin: 0; font-size: 14px; font-weight: 600; }

  &.success p { color: #137333; }
  &.error-box p { color: var(--mcla-error, #ea4335); font-size: 13px; font-weight: 400; }
}

/* ====== 外链入口 ====== */
.external-links {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.ext-link-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  background: var(--mcla-bg-elevated);
  border: 1px solid var(--mcla-border-color);
  border-radius: var(--mcla-radius-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--mcla-text-secondary);
  text-decoration: none;
  transition: all 0.15s;

  svg { flex-shrink: 0; opacity: 0.7; }

  &:hover {
    border-color: var(--mcla-primary-400);
    color: var(--mcla-primary);
    background: var(--mcla-primary-bg);
    svg { opacity: 1; }
  }
}

/* ====== Loading Spinner ====== */
.loader {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--mcla-border-color, #e0e0e0);
  border-top-color: var(--mcla-primary, #0078d4);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;

  &.loader-lg {
    width: 32px;
    height: 32px;
    border-width: 3px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
