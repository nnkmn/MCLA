import { logger } from '../utils/logger'
const log = logger.child('OAuth')
/**
 * 微软 OAuth Device Flow 认证服务
 *
 * 认证链：
 *   1. MS Device Code  →  MS Access Token + Refresh Token
 *   2. MS Access Token →  Xbox Live Token (XBL)
 *   3. XBL Token       →  XSTS Token
 *   4. XSTS Token      →  Minecraft Access Token
 *   5. MC Access Token →  MC Profile (UUID + name)
 */



// ======= JWT 解码工具（不验证签名，只取 payload） =======
function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return {}
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '=='.slice((payload.length + 4) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return {}
  }
}

// ======= 常量 =======
const CLIENT_ID = 'e1e383f9-59d9-4aa2-bf5e-73fe83b15ba0' // StarLight.Core 提供的公用微软验证 ClientId
const DEVICE_CODE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode'
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const LIVE_TOKEN_URL = 'https://login.live.com/oauth20_token.srf' // 刷新 token 专用
const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const MC_LOGIN_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox'
const MC_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'

// ======= 类型 =======
export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
}

export interface MicrosoftTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface MinecraftProfile {
  name: string
  uuid: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  skinUrl?: string
  xuid?: string
}

// 进度回调类型（供 IPC 使用）
export type AuthProgressCallback = (stage: string, detail?: string) => void

// ======= 工具函数 =======

/** 用 Electron net 模块发送 HTTP 请求（避免 Node.js http 模块在 Electron 中的限制） */
async function httpPost(url: string, body: Record<string, string>, headers?: Record<string, string>): Promise<any> {
  const isFormEncoded = !headers?.['Content-Type'] || headers['Content-Type'].includes('x-www-form-urlencoded')
  const bodyStr = isFormEncoded
    ? Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : JSON.stringify(body)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': isFormEncoded ? 'application/x-www-form-urlencoded' : 'application/json',
      Accept: 'application/json',
      // 微软 OAuth 必需 headers，防止 AADSTS900023 错误
      'x-client-SKU': 'MCLA',
      'x-client-Ver': '0.3.0',
      'x-client-CPU': 'x64',
      'x-client-OS': 'Win32',
      ...headers,
    },
    body: bodyStr,
  })

  if (!res.ok) {
    const text = await res.text()
    // 解析 OAuth 错误（device_code 轮询的正常响应）
    const oauthErrorMatch = text.match(/"error"\s*:\s*"([^"]+)"/)
    const oauthError = oauthErrorMatch ? oauthErrorMatch[1] : null
    if (oauthError) {
      // authorization_pending / slow_down 是轮询的正常状态，不抛出异常
      if (oauthError === 'authorization_pending' || oauthError === 'slow_down') {
        return { error: oauthError }
      }
      // 其他 OAuth 错误（authorization_declined, expired_token 等）
      const descMatch = text.match(/"error_description"\s*:\s*"([^"]+)"/)
      throw new Error(`${oauthError}: ${descMatch ? descMatch[1].replace(/\\u0027/g, "'") : text}`)
    }
    // 解析 AADSTS 错误（Azure 层面的错误）
    const errorMatch = text.match(/AADSTS\d+/)
    const descMatch = text.match(/"error_description"\s*:\s*"([^"]+)"/)
    if (errorMatch) {
      const code = errorMatch[0]
      const desc = descMatch ? descMatch[1].replace(/\\u0027/g, "'") : text
      throw new Error(`${code}: ${desc}`)
    }
    // Xbox/XSTS/Minecraft 错误
    const xerrMatch = text.match(/"XErr"\s*:\s*(\d+)/)
    const errMsgMatch = text.match(/"message"\s*:\s*"([^"]+)"/)
    const detail = xerrMatch || errMsgMatch ? ` (${xerrMatch ? 'XErr=' + xerrMatch[1] : ''}${errMsgMatch ? ' ' + errMsgMatch[1] : ''})` : ''
    throw new Error(`HTTP ${res.status}: ${text}${detail}`)
  }

  return res.json()
}

async function httpGet(url: string, accessToken: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  return res.json()
}

// ======= Device Flow 步骤 =======

/**
 * Step 1: 请求 Device Code
 * 返回给用户展示的 user_code 和 verification_uri
 */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const data = await httpPost(DEVICE_CODE_URL, {
    client_id: CLIENT_ID,
    scope: 'XboxLive.signin offline_access openid profile email',
  })
  return data as DeviceCodeResponse
}

/**
 * Step 2: 轮询 token endpoint，直到用户完成授权或超时
 * 返回 MS Access Token + Refresh Token
 */
export async function pollForToken(
  deviceCode: string,
  intervalSec: number,
  expiresSec: number,
  onProgress?: AuthProgressCallback,
  signal?: AbortSignal
): Promise<MicrosoftTokens> {
  const deadline = Date.now() + expiresSec * 1000
  const pollInterval = Math.max(intervalSec, 5) * 1000

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new Error('LOGIN_CANCELLED')
    }

    await sleep(pollInterval)

    if (signal?.aborted) {
      throw new Error('LOGIN_CANCELLED')
    }

    try {
      const data: any = await httpPost(TOKEN_URL, {
        client_id: CLIENT_ID,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
      })

      if (data.error) {
        // authorization_pending / slow_down = 用户还没操作，继续等
        if (data.error === 'authorization_pending') continue
        if (data.error === 'slow_down') {
          await sleep(5000)
          continue
        }
        // authorization_declined 等其他错误直接抛出
        throw new Error(`${data.error}: ${data.error_description || ''}`)
      }

      if (data.access_token) {
        onProgress?.('token_received', '微软令牌获取成功')
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        }
      }
    } catch (e: any) {
      throw e
    }
  }

  throw new Error('LOGIN_TIMEOUT')
}

/**
 * Step 3: 用 MS Access Token 换 Xbox Live Token
 */
async function authenticateXboxLive(msAccessToken: string): Promise<{ token: string; userHash: string; xuid: string }> {
  log.info('[OAuth] Step 3: Xbox Live authentication...')
  const body = {
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${msAccessToken}`,
    },
  }
  const res = await fetch(XBL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-xbl-contract-version': '1',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()

  const token: string = data.Token
  const userHash: string = data.DisplayClaims?.xui?.[0]?.uhs ?? ''
  // uhs 就是 XUID（十进制字符串表示）
  const xuid: string = userHash

  log.info('[OAuth] Step 3: XBL response received, uhs:', userHash, 'xuid:', xuid)
  if (!token || !userHash) throw new Error('XBL_AUTH_FAILED')
  return { token, userHash, xuid }
}

/**
 * Step 4: 用 XBL Token 换 XSTS Token
 */
async function authenticateXSTS(xblToken: string): Promise<{ token: string; userHash: string; xuid: string }> {
  log.info('[OAuth] Step 4: XSTS authentication...')
  const body = {
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
    Properties: {
      SandboxId: 'RETAIL',
      UserTokens: [xblToken],
    },
  }
  const res = await fetch(XSTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  log.info('[OAuth] Step 4: XSTS response (FULL):', JSON.stringify(data))
  if (!res.ok) {
    throw new Error(`XSTS_FAILED: HTTP ${res.status} ${JSON.stringify(data)}`)
  }

  if (data.XErr) {
    const xerrMap: Record<number, string> = {
      2148916233: '该微软账户未绑定 Xbox 账号，请先在 Xbox 官网创建',
      2148916235: '您所在的地区不支持 Xbox Live',
      2148916236: '需要验证大人身份',
      2148916237: '需要验证大人身份',
      2148916238: '未成年账户需要家长添加到家庭组',
    }
    throw new Error(xerrMap[data.XErr] || `XSTS 错误: ${data.XErr}`)
  }

  const token: string = data.Token
  const userHash: string = data.DisplayClaims?.xui?.[0]?.uhs ?? ''
  // uhs 就是 XUID（十进制字符串），XSTS 响应里没有单独的 xid 字段
  const xuid: string = userHash

  if (!token || !userHash) throw new Error('XSTS_AUTH_FAILED')

  // ✅ 返回 xuid 给后面用
  return { token, userHash, xuid }
}

/**
 * Step 5: 用 XSTS Token 换 Minecraft Access Token
 */
async function authenticateMinecraft(xstsToken: string, userHash: string, xuid: string): Promise<string> {
  log.info('[OAuth] Step 5: Minecraft authentication...')
  const res = await fetch(MC_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${userHash};${xstsToken}` }),
  })
  const data = await res.json()
  log.info('[OAuth] Step 5: MC response keys:', Object.keys(data), 'status:', res.status)
  if (!res.ok) {
    throw new Error(`MC_AUTH_FAILED: HTTP ${res.status} ${JSON.stringify(data)}`)
  }
  if (!data.access_token) throw new Error('MC_AUTH_FAILED')
  return data.access_token
}

/**
 * Step 6: 获取 Minecraft 游戏档案（UUID + 用户名）
 */
async function fetchMinecraftProfile(mcAccessToken: string): Promise<{ name: string; uuid: string; skinUrl?: string }> {
  const data = await httpGet(MC_PROFILE_URL, mcAccessToken)
  if (!data.id || !data.name) throw new Error('MC_PROFILE_FAILED: 未找到 Minecraft 档案，该账户可能未购买游戏')
  // id 格式为不带横杠的 UUID，转成标准格式
  const rawId: string = data.id
  const uuid = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`
  // 取第一个皮肤（如果有）
  const skinUrl = data.skins?.[0]?.url as string | undefined
  return { name: data.name as string, uuid, skinUrl }
}

// ======= 刷新 Token =======

/**
 * 用 Refresh Token 静默刷新 Access Token（参考 StarLight.Core，使用 live.com 端点）
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokens> {
  const data = await httpPost(LIVE_TOKEN_URL, {
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: 'https://login.live.com/oauth20_desktop.srf',
  })

  if (!data.access_token) throw new Error('TOKEN_REFRESH_FAILED')
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_in: data.expires_in,
  }
}

// ======= 完整登录流程（第 3-6 步） =======

/**
 * 拿到 MS Access Token 后，走完整个认证链到 MC 档案
 */
export async function authenticateWithMicrosoftToken(
  msTokens: MicrosoftTokens,
  onProgress?: AuthProgressCallback
): Promise<MinecraftProfile> {
  onProgress?.('xbox_live', '正在连接 Xbox Live...')
  const xbl = await authenticateXboxLive(msTokens.access_token)
  log.info('[OAuth] xbl result:', JSON.stringify({ uhs: xbl.userHash, xuid: xbl.xuid }))

  onProgress?.('xsts', '正在获取 XSTS 令牌...')
  const xsts = await authenticateXSTS(xbl.token)
  log.info('[OAuth] xsts result:', JSON.stringify({ uhs: xsts.userHash, xuid: xsts.xuid }))

  onProgress?.('minecraft', '正在验证 Minecraft 账户...')
  const mcToken = await authenticateMinecraft(xsts.token, xsts.userHash, xbl.xuid)

  onProgress?.('profile', '正在获取游戏档案...')
  const profile = await fetchMinecraftProfile(mcToken)

  return {
    name: profile.name,
    uuid: profile.uuid,
    accessToken: mcToken,
    refreshToken: msTokens.refresh_token,
    expiresIn: msTokens.expires_in,
    skinUrl: profile.skinUrl,
    xuid: xbl.xuid,  // ← 从 XBL 取，XSTS 响应里没有 xid
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
