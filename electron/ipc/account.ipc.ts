/**
 * 账户管理 IPC
 * 支持：微软 OAuth Device Flow / 离线账户 / 令牌刷新
 */
import { ipcMain, BrowserWindow } from 'electron'
import * as accountService from '../services/accounts'
import {
  requestDeviceCode,
  pollForToken,
  authenticateWithMicrosoftToken,
  refreshMicrosoftToken,
} from '../services/microsoft.auth'

// 当前登录流程的取消控制器（每次登录只允许一个）
let loginAbortController: AbortController | null = null

export function registerAccountHandlers(): void {
  // ===== 列出账户 =====
  ipcMain.handle('account:list', () => accountService.listAccounts())

  // ===== 请求 Device Code（第一步，返回 user_code 供前端展示） =====
  ipcMain.handle('account:get-device-code', async () => {
    try {
      const deviceCode = await requestDeviceCode()
      return { ok: true, data: deviceCode }
    } catch (e: any) {
      return { ok: false, error: e.message || '请求 Device Code 失败' }
    }
  })

  // ===== 执行 Device Flow 登录（轮询直到用户授权） =====
  ipcMain.handle('account:login-microsoft', async (event) => {
    // 取消上一个正在进行的登录
    loginAbortController?.abort()
    loginAbortController = new AbortController()
    const signal = loginAbortController.signal

    const win = BrowserWindow.fromWebContents(event.sender)

    const sendProgress = (stage: string, detail?: string) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('account:login-progress', { stage, detail })
      }
    }

    try {
      // 1. 请求 device code
      sendProgress('device_code', '正在获取设备码...')
      const deviceCodeResp = await requestDeviceCode()

      // 把 user_code 和链接推送给前端显示
      sendProgress('waiting_user', JSON.stringify({
        userCode: deviceCodeResp.user_code,
        verificationUri: deviceCodeResp.verification_uri,
        message: deviceCodeResp.message,
      }))

      // 2. 轮询等待用户授权
      const msTokens = await pollForToken(
        deviceCodeResp.device_code,
        deviceCodeResp.interval,
        deviceCodeResp.expires_in,
        sendProgress,
        signal
      )

      // 3. 走完整认证链
      const profile = await authenticateWithMicrosoftToken(msTokens, sendProgress)

      // 4. 存入数据库
      sendProgress('saving', '正在保存账户...')
      const account = accountService.createMicrosoftAccount(
        profile.name,
        profile.uuid,
        profile.accessToken,
        profile.refreshToken,
        profile.expiresIn
      )

      sendProgress('done', '登录成功')
      loginAbortController = null
      return { ok: true, data: account }
    } catch (e: any) {
      const msg = e.message || '登录失败'
      if (msg === 'LOGIN_CANCELLED') {
        sendProgress('cancelled', '登录已取消')
        return { ok: false, error: 'LOGIN_CANCELLED' }
      }
      if (msg === 'LOGIN_TIMEOUT') {
        sendProgress('timeout', '设备码已过期，请重试')
        return { ok: false, error: 'LOGIN_TIMEOUT' }
      }
      sendProgress('error', msg)
      return { ok: false, error: msg }
    }
  })

  // ===== 取消正在进行的微软登录 =====
  ipcMain.handle('account:cancel-login', () => {
    loginAbortController?.abort()
    loginAbortController = null
    return { ok: true }
  })

  // ===== 离线登录 =====
  ipcMain.handle('account:login-offline', (_event, username: string) => {
    try {
      const account = accountService.createOfflineAccount(username)
      return { ok: true, data: account }
    } catch (e: any) {
      return { ok: false, error: e.message || '创建离线账户失败' }
    }
  })

  // ===== 删除账户 =====
  ipcMain.handle('account:delete', (_event, id: string) => accountService.deleteAccount(id))

  // ===== 设置活跃账户 =====
  ipcMain.handle('account:set-active', (_event, id: string) => accountService.setActiveAccount(id))

  // ===== 静默刷新 Token（令牌过期时由前端或启动流程调用） =====
  ipcMain.handle('account:refresh-token', async (_event, id: string) => {
    try {
      const account = accountService.getAccountById(id)
      if (!account || account.type !== 'microsoft') {
        return { ok: false, error: '账户不存在或不是微软账户' }
      }
      if (!account.refresh_token) {
        return { ok: false, error: '缺少 refresh_token，需要重新登录' }
      }

      const newTokens = await refreshMicrosoftToken(account.refresh_token)
      // 用新 token 重新走 Xbox/XSTS/MC 认证链
      const profile = await authenticateWithMicrosoftToken(newTokens)

      accountService.updateMicrosoftTokens(id, profile.accessToken, profile.refreshToken, profile.expiresIn)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || '刷新令牌失败' }
    }
  })
}
