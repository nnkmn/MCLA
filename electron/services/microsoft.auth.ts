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



// ======= 常量 =======
const CLIENT_ID = '00000000402b5328' // 官方 Minecraft 启动器 Client ID（公开）
const DEVICE_CODE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode'
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
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
      ...headers,
    },
    body: bodyStr,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
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
    scope: 'XboxLive.signin offline_access',
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
      const data = await httpPost(TOKEN_URL, {
        client_id: CLIENT_ID,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
      })

      if (data.access_token) {
        onProgress?.('token_received', '微软令牌获取成功')
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        }
      }
    } catch (e: any) {
      const msg = e.message || ''
      // authorization_pending = 用户还没操作，继续等
      if (msg.includes('authorization_pending')) continue
      // slow_down = 降低轮询频率
      if (msg.includes('slow_down')) {
        await sleep(5000)
        continue
      }
      // 其他错误直接抛出
      throw e
    }
  }

  throw new Error('LOGIN_TIMEOUT')
}

/**
 * Step 3: 用 MS Access Token 换 Xbox Live Token
 */
async function authenticateXboxLive(msAccessToken: string): Promise<{ token: string; userHash: string }> {
  const data = await httpPost(
    XBL_URL,
    {
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
      Properties: JSON.stringify({
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msAccessToken}`,
      }),
    } as any,
    { 'Content-Type': 'application/json' }
  )

  const token: string = data.Token
  const userHash: string = data.DisplayClaims?.xui?.[0]?.uhs ?? ''
  if (!token || !userHash) throw new Error('XBL_AUTH_FAILED')
  return { token, userHash }
}

/**
 * Step 4: 用 XBL Token 换 XSTS Token
 */
async function authenticateXSTS(xblToken: string): Promise<{ token: string; userHash: string }> {
  const data = await httpPost(
    XSTS_URL,
    {
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
      Properties: JSON.stringify({
        SandboxId: 'RETAIL',
        UserTokens: [xblToken],
      }),
    } as any,
    { 'Content-Type': 'application/json' }
  )

  if (data.XErr) {
    // XErr 错误码含义
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
  if (!token || !userHash) throw new Error('XSTS_AUTH_FAILED')
  return { token, userHash }
}

/**
 * Step 5: 用 XSTS Token 换 Minecraft Access Token
 */
async function authenticateMinecraft(xstsToken: string, userHash: string): Promise<string> {
  const data = await httpPost(
    MC_LOGIN_URL,
    { identityToken: `XBL3.0 x=${userHash};${xstsToken}` } as any,
    { 'Content-Type': 'application/json' }
  )

  if (!data.access_token) throw new Error('MC_AUTH_FAILED')
  return data.access_token
}

/**
 * Step 6: 获取 Minecraft 游戏档案（UUID + 用户名）
 */
async function fetchMinecraftProfile(mcAccessToken: string): Promise<{ name: string; uuid: string }> {
  const data = await httpGet(MC_PROFILE_URL, mcAccessToken)
  if (!data.id || !data.name) throw new Error('MC_PROFILE_FAILED: 未找到 Minecraft 档案，该账户可能未购买游戏')
  // id 格式为不带横杠的 UUID，转成标准格式
  const rawId: string = data.id
  const uuid = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`
  return { name: data.name as string, uuid }
}

// ======= 刷新 Token =======

/**
 * 用 Refresh Token 静默刷新 Access Token
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokens> {
  const data = await httpPost(TOKEN_URL, {
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'XboxLive.signin offline_access',
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

  onProgress?.('xsts', '正在获取 XSTS 令牌...')
  const xsts = await authenticateXSTS(xbl.token)

  onProgress?.('minecraft', '正在验证 Minecraft 账户...')
  const mcToken = await authenticateMinecraft(xsts.token, xsts.userHash)

  onProgress?.('profile', '正在获取游戏档案...')
  const profile = await fetchMinecraftProfile(mcToken)

  return {
    name: profile.name,
    uuid: profile.uuid,
    accessToken: mcToken,
    refreshToken: msTokens.refresh_token,
    expiresIn: msTokens.expires_in,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
