/**
 * 账户相关类型定义
 * 与 electron/services/accounts.ts 的 Account 接口对齐
 */

/** 账户类型 */
export type AccountType = 'microsoft' | 'offline'

/** 游戏账户 */
export interface Account {
  id: string
  type: AccountType
  name: string               // 显示名称 / 玩家名
  uuid: string              // Minecraft UUID
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null   // token 过期时间 (ISO)
  isActive: number           // 1 = 当前活跃, 0 = 非活跃
  createdAt: string
  updatedAt: string
}

/** 微软 OAuth 登录流程返回数据 */
export interface MicrosoftAuthResult {
  name: string
  uuid: string
  accessToken: string
  refreshToken: string
  expiresIn: number         // 过期秒数
}

/** 前端展示用的账户视图（脱敏） */
export interface AccountView {
  id: string
  type: AccountType
  name: string
  avatarUrl: string          // 皮肤/头像 URL
  isActive: boolean
}
