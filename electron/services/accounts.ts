/**
 * 账户管理服务
 * 提供微软正版/离线账户的增删改查操作
 */

import { getDatabase } from './database'

export interface Account {
  id: string
  type: 'microsoft' | 'offline'
  name: string
  uuid: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  is_active: number
  created_at: string
  updated_at: string
}

// 获取所有账户
export function listAccounts(): Account[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as Account[]
}

// 获取当前活跃账户
export function getActiveAccount(): Account | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM accounts WHERE is_active = 1 LIMIT 1').get() as Account | null
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
export function createMicrosoftAccount(name: string, uuid: string, accessToken: string, refreshToken: string, expiresIn: number): Account {
  const db = getDatabase()
  const id = `acct_${Date.now()}`
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  // 先取消所有账户的活跃状态
  db.prepare('UPDATE accounts SET is_active = 0').run()

  db.prepare(`
    INSERT INTO accounts (id, type, name, uuid, access_token, refresh_token, expires_at, is_active, created_at, updated_at)
    VALUES (?, 'microsoft', ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, name, uuid, accessToken, refreshToken, expiresAt, now, now)

  return getAccountById(id)!
}

// 根据 ID 获取账户
export function getAccountById(id: string): Account | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | null
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
  db.prepare(`
    UPDATE accounts SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
    WHERE id = ?
  `).run(accessToken, refreshToken, expiresAt, now, id)
}

// 生成 UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
