/**
 * 配置管理服务
 * 提供键值对的持久化存储，用于应用设置
 */

import { getDatabase } from './database'
import { encryptToHex, decryptFromHex } from '../utils/crypto'
import { logger } from '../utils/logger'
const log = logger.child('Config')

export interface ConfigEntry {
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json'
  updated_at: string
}

// 获取配置项
export function getConfig<T = string>(key: string): T | null {
  const db = getDatabase()
  log.info('[config.getConfig] key:', key, '| db is null?', !db)
  const row = db.prepare('SELECT * FROM configs WHERE key = ?').get(key) as ConfigEntry | null
  log.info('[config.getConfig] result row:', row)
  if (!row) return null

  switch (row.type) {
    case 'number':
      return Number(row.value) as unknown as T
    case 'boolean':
      return (row.value === '1' || row.value === 'true') as unknown as T
    case 'json':
      try {
        return JSON.parse(row.value) as T
      } catch {
        return row.value as unknown as T
      }
    default:
      return row.value as unknown as T
  }
}

// 设置配置项
export function setConfig(key: string, value: any, type?: ConfigEntry['type']): void {
  const db = getDatabase()
  log.info('[config.setConfig] key:', key, 'value:', value, 'db is null?', !db)
  const now = new Date().toISOString()

  // 自动推断类型
  let detectedType = type || 'string'
  if (!type) {
    if (typeof value === 'number') detectedType = 'number'
    else if (typeof value === 'boolean') detectedType = 'boolean'
    else if (typeof value === 'object' && value !== null) {
      detectedType = 'json'
      value = JSON.stringify(value)
    }
  }

  // 转换存储值
  const storedValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

  db.prepare(`
    INSERT INTO configs (key, value, type, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, type = excluded.type, updated_at = excluded.updated_at
  `).run(key, storedValue, detectedType, now)
}

// 删除配置项
export function deleteConfig(key: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM configs WHERE key = ?').run(key)
  return result.changes > 0
}

// 获取所有配置
export function getAllConfigs(): Record<string, any> {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM configs').all() as ConfigEntry[]
  const result: Record<string, any> = {}

  for (const row of rows) {
    result[row.key] = getConfig(row.key)
  }

  return result
}

// ====== 敏感配置存取（自动加解密） ======

/** 需要加密存储的配置 key 列表 */
const SENSITIVE_KEYS = new Set([
  'curseforge_api_key',
])

/** 获取敏感配置值（自动解密） */
export function getSecureConfig(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM configs WHERE key = ?').get(key) as { value: string } | undefined
  if (!row?.value) return null
  // 兼容旧明文数据
  if (row.value.length > 64 && /^[0-9a-f]+$/.test(row.value)) {
    try { return decryptFromHex(row.value) } catch { /* 旧明文 */ }
  }
  return row.value
}

/** 设置敏感配置值（自动加密） */
export function setSecureConfig(key: string, value: string): void {
  const db = getDatabase()
  const encValue = encryptToHex(value)
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO configs (key, value, type, updated_at)
    VALUES (?, ?, 'secure', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, type = excluded.type, updated_at = excluded.updated_at
  `).run(key, encValue, now)
}
