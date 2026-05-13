/**
 * 账户管理 IPC
 * 支持：微软 OAuth Device Flow / 离线账户 / 令牌刷新
 */
import { ipcMain, BrowserWindow, shell } from 'electron'
import * as accountService from '../services/accounts'
import { getDatabase } from '../services/database'
import { downloadSkin, getSkinPath } from '../services/skin.service'
import {
  requestDeviceCode,
  pollForToken,
  authenticateWithMicrosoftToken,
  refreshMicrosoftToken,
} from '../services/microsoft.auth'
import type { DeviceCodeResponse } from '../services/microsoft.auth'
import { logger } from '../utils/logger'
const log = logger.child('Account-IPC')

// 暂存当前 Device Code 响应，等前端复制时打开浏览器
let pendingDeviceCode: DeviceCodeResponse | null = null

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

      // 把 user_code 和链接推送给前端显示（此时不自动打开，等用户点击复制后再打开）
      pendingDeviceCode = deviceCodeResp
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

      // 4. 存入数据库（skin_url 存原始 URL，xuid 存 Xbox 用户 ID）
      sendProgress('saving', '正在保存账户...')
      const account = accountService.createMicrosoftAccount(
        profile.name,
        profile.uuid,
        profile.accessToken,
        profile.refreshToken,
        profile.expiresIn,
        profile.skinUrl || undefined,  // 存原始皮肤 URL
        profile.xuid  // Xbox 用户 ID（Minecraft 启动参数需要）
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
    pendingDeviceCode = null
    return { ok: true }
  })

  // ===== 获取玩家皮肤（返回 data URL，自动下载） =====
  ipcMain.handle('account:get-skin-data-url', async (_event, uuid: string) => {
    // 1. 先检查本地缓存
    let skinPath = getSkinPath(uuid)
    if (skinPath) {
      log.info(`[getSkinDataUrl] using cache: ${skinPath}`)
    }

    // 2. 无缓存，尝试从数据库取 skin_url
    if (!skinPath) {
      const accounts = accountService.listAccounts()
      const account = accounts.find(a => a.uuid === uuid && a.skin_url)
      log.info(`[getSkinDataUrl] uuid=${uuid}, skin_url=${account?.skin_url}`)

      let skinUrl = account?.skin_url

      // DB 里存的是本地路径（老数据），当 URL 无效
      if (skinUrl && !skinUrl.startsWith('http')) {
        skinUrl = undefined
      }

      // 3. DB 里没有 URL，尝试从 MC API 用 UUID 查询（无需认证）
      if (!skinUrl) {
        try {
          const res = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/by uuid/${uuid}`)
          if (res.ok) {
            const data = await res.json()
            skinUrl = data.skins?.[0]?.url
            log.info(`[getSkinDataUrl] fetched skinUrl from API: ${skinUrl}`)
          }
        } catch (e: any) {
          log.info(`[getSkinDataUrl] API fetch failed: ${e.message}`)
        }
      }

      if (!skinUrl) {
        return { ok: false, error: '未找到皮肤 URL' }
      }

      try {
        const localPath = await downloadSkin(skinUrl, uuid)
        log.info(`[getSkinDataUrl] download result: ${localPath}`)
        if (!localPath) return { ok: false, error: '皮肤下载失败' }
        skinPath = `file://${localPath.replace(/\\/g, '/')}`
      } catch (e: any) {
        log.info(`[getSkinDataUrl] download error: ${e.message}`)
        return { ok: false, error: e.message }
      }
    }

    try {
      const fs = await import('fs/promises')
      const filePath = skinPath.replace('file://', '')
      const data = await fs.readFile(filePath)
      log.info(`[getSkinDataUrl] read ${data.length} bytes from ${filePath}`)
      const base64 = data.toString('base64')
      const dataUrl = `data:image/png;base64,${base64}`
      return { ok: true, data: dataUrl }
    } catch (e: any) {
      log.info(`[getSkinDataUrl] read error: ${e.message}`)
      return { ok: false, error: e.message }
    }
  })

  // ===== 用户点击复制后，用浏览器打开验证页面 =====
  ipcMain.handle('account:open-verification-url', () => {
    if (!pendingDeviceCode) return { ok: false }
    try {
      shell.openExternal(pendingDeviceCode.verification_uri)
      return { ok: true }
    } catch (e: any) {
      log.error('[OAuth] openExternal failed:', e)
      return { ok: false, error: e.message }
    }
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

  // ===== 启动时回填旧账户缺失的 xuid =====
  ipcMain.handle('account:backfill-xuid', async () => {
    const db = getDatabase()
    const accounts = db.prepare("SELECT id, refresh_token FROM accounts WHERE type = 'microsoft' AND (xuid IS NULL OR xuid = '')").all() as { id: string; refresh_token: string | null }[]
    if (accounts.length === 0) {
      return { ok: true, count: 0 }
    }
    log.info(`[account:backfill-xuid] 发现 ${accounts.length} 个账户需要回填 xuid`)
    let success = 0
    for (const acc of accounts) {
      if (!acc.refresh_token) continue
      try {
        const newTokens = await refreshMicrosoftToken(acc.refresh_token)
        const profile = await authenticateWithMicrosoftToken(newTokens)
        if (profile.xuid) {
          accountService.backfillXuid(acc.id, profile.xuid)
          success++
          log.info(`[account:backfill-xuid] ${acc.id} 回填 xuid=${profile.xuid}`)
        }
      } catch (e: any) {
        log.warn(`[account:backfill-xuid] ${acc.id} 失败: ${e.message}`)
      }
    }
    return { ok: true, count: success }
  })

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

      // 更新 token 时同步回填 xuid（修复旧账户缺失的 xuid）
      if (profile.xuid) {
        accountService.backfillXuid(id, profile.xuid)
        log.info(`[account:refresh-token] xuid 回填成功: ${profile.xuid}`)
      }
      accountService.updateMicrosoftTokens(id, profile.accessToken, profile.refreshToken, profile.expiresIn)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || '刷新令牌失败' }
    }
  })
}
