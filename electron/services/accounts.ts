/**
 * 账户管理服务
 * 提供微软正版/离线账户的增删改查操作
 */

import { getDatabase } from './database'
import { encryptToHex, decryptFromHex } from '../utils/crypto'

export interface Account {
  id: string
  type: 'microsoft' | 'offline'
  name: string
  uuid: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  is_active: number
  skin_url: string | null
  xuid: string | null
  created_at: string
  updated_at: string
}

/**
 * 尝试解密字段。如果是旧版明文（不以 hex 前缀标识），直接返回原文做兼容。
 * 加密后的 hex 字符串长度一定是偶数且足够长。
 */
function tryDecrypt(value: string | null): string | null {
  if (!value) return null
  // 简单判断：加密后的数据长度远大于 token 本身，且是纯 hex
  if (value.length > 64 && /^[0-9a-f]+$/.test(value)) {
    try { return decryptFromHex(value) } catch { /* 解密失败，可能是旧明文 */ }
  }
  return value
}

// 获取所有账户
export function listAccounts(): Account[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as Account[]
  return rows.map(row => ({
    ...row,
    access_token: tryDecrypt(row.access_token),
    refresh_token: tryDecrypt(row.refresh_token),
  }))
}

// 获取当前活跃账户
export function getActiveAccount(): Account | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM accounts WHERE is_active = 1 LIMIT 1').get() as Account | null
  if (!row) return null
  return {
    ...row,
    access_token: tryDecrypt(row.access_token),
    refresh_token: tryDecrypt(row.refresh_token),
  }
}

// 创建离线账户
export function createOfflineAccount(name: string, uuid?: string): Account {
  const db = getDatabase()
  const id = `acct_${Date.now()}`
  const now = new Date().toISOString()
  const generatedUuid = uuid || generateUUID()

  // 设为活跃（如果还没有活跃账户）
  const active = getActiveAccount() ? 0 : 1

  db.prepare(`
    INSERT INTO accounts (id, type, name, uuid, access_token, refresh_token, expires_at, is_active, created_at, updated_at)
    VALUES (?, 'offline', ?, ?, NULL, NULL, NULL, ?, ?, ?)
  `).run(id, name, generatedUuid, active, now, now)

  // 如果设为活跃，取消其他账户的活跃状态
  if (active) {
    db.prepare("UPDATE accounts SET is_active = 0 WHERE id != ?").run(id)
  }

  return getAccountById(id)!
}

// 创建微软账户
export function createMicrosoftAccount(name: string, uuid: string, accessToken: string, refreshToken: string, expiresIn: number, skinUrl?: string, xuid?: string): Account {
  const db = getDatabase()
  const id = `acct_${Date.now()}`
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  // 加密敏感 token
  const encAccess = encryptToHex(accessToken)
  const encRefresh = encryptToHex(refreshToken)

  // 先取消所有账户的活跃状态
  db.prepare('UPDATE accounts SET is_active = 0').run()

  db.prepare(`
    INSERT INTO accounts (id, type, name, uuid, access_token, refresh_token, expires_at, is_active, skin_url, xuid, created_at, updated_at)
    VALUES (?, 'microsoft', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).run(id, name, uuid, encAccess, encRefresh, expiresAt, skinUrl || null, xuid || null, now, now)

  return getAccountById(id)!
}

// 根据 ID 获取账户
export function getAccountById(id: string): Account | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | null
  if (!row) return null
  return {
    ...row,
    access_token: tryDecrypt(row.access_token),
    refresh_token: tryDecrypt(row.refresh_token),
  }
}

// 设置活跃账户
export function setActiveAccount(id: string): boolean {
  const db = getDatabase()
  db.prepare('UPDATE accounts SET is_active = 0').run()  // 先全部取消
  const result = db.prepare('UPDATE accounts SET is_active = 1 WHERE id = ?').run(id)
  return result.changes > 0
}

// 删除账户
export function deleteAccount(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  return result.changes > 0
}

// 更新微软令牌
export function updateMicrosoftTokens(id: string, accessToken: string, refreshToken: string, expiresIn: number): void {
  const db = getDatabase()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  const now = new Date().toISOString()

  const encAccess = encryptToHex(accessToken)
  const encRefresh = encryptToHex(refreshToken)

  db.prepare(`
    UPDATE accounts SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
    WHERE id = ?
  `).run(encAccess, encRefresh, expiresAt, now, id)
}

/** 回填 xuid（启动时调用，修复旧账户缺失的 xuid） */
export function backfillXuid(id: string, xuid: string): void {
  const db = getDatabase()
  db.prepare('UPDATE accounts SET xuid = ? WHERE id = ?').run(xuid, id)
}

// 生成 UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
