/**
 * 实例管理服务
 * 提供游戏实例的增删改查操作
 */

import { getDatabase } from './database'

export interface Instance {
  id: string
  name: string
  path: string
  mc_version: string
  loader_type: 'vanilla' | 'forge' | 'fabric' | 'neoforge' | 'quilt'
  loader_version: string
  icon: string
  java_path: string
  jvm_args: string
  min_memory: number
  max_memory: number
  width: number
  height: number
  fullscreen: number
  is_favorited: number
  last_played: string | null
  play_time: number
  created_at: string
  updated_at: string
}

// 获取所有实例
export function listInstances(): Instance[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM instances ORDER BY updated_at DESC').all() as Instance[]
}

// 根据 ID 获取单个实例
export function getInstanceById(id: string): Instance | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM instances WHERE id = ?').get(id) as Instance | null
}

// 创建实例
export function createInstance(data: Omit<Instance, 'created_at' | 'updated_at' | 'play_time'>): Instance {
  const db = getDatabase()
  const id = data.id || `inst_${Date.now()}`
  const now = new Date().toISOString()

  const result = db.prepare(`
    INSERT INTO instances (id, name, path, mc_version, loader_type, loader_version, icon,
      java_path, jvm_args, min_memory, max_memory, width, height, fullscreen,
      is_favorited, last_played, play_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.path, data.mc_version, data.loader_type, data.loader_version,
    data.icon, data.java_path, data.jvm_args, data.min_memory, data.max_memory,
    data.width, data.height, data.fullscreen, data.is_favorited, data.last_played,
    0, now, now
  )

  return getInstanceById(id)!
}

// 更新实例
export function updateInstance(id: string, data: Partial<Instance>): Instance | null {
  const db = getDatabase()
  const now = new Date().toISOString()

  // 动态构建更新字段
  const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at')
  if (fields.length === 0) return getInstanceById(id)

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => (data as any)[f])
  values.push(now, id)

  db.prepare(`UPDATE instances SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values)
  return getInstanceById(id)
}

// 删除实例
export function deleteInstance(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM instances WHERE id = ?').run(id)
  return result.changes > 0
}

// 更新最后游玩时间
export function updateLastPlayed(id: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare('UPDATE instances SET last_played = ?, updated_at = ? WHERE id = ?').run(now, now, id)
}
