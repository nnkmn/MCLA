/**
 * MCLA Database Service
 * 基于 better-sqlite3 的本地数据库
 * 提供实例、账户、配置的持久化存储
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

// 获取数据库路径（userData 目录）
function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'mcla.db')
}

// 初始化数据库连接
export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  db = new Database(dbPath)

  // 启用 WAL 模式提升并发性能
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // 创建表结构
  createTables()

  console.log(`[DB] 数据库已初始化: ${dbPath}`)
  return db
}

// 获取数据库实例
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase()
  }
  return db
}

// 关闭数据库连接
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] 数据库已关闭')
  }
}

// ====== 表结构定义 ======
function createTables(): void {
  if (!db) throw new Error('[DB] 数据库未初始化')

  // 实例表
  db.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      mc_version TEXT NOT NULL DEFAULT '1.20.1',
      loader_type TEXT DEFAULT 'vanilla',
      loader_version TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      java_path TEXT DEFAULT '',
      jvm_args TEXT DEFAULT '',
      min_memory INTEGER DEFAULT 512,
      max_memory INTEGER DEFAULT 2048,
      width INTEGER DEFAULT 854,
      height INTEGER DEFAULT 480,
      fullscreen INTEGER DEFAULT 0,
      is_favorited INTEGER DEFAULT 0,
      last_played TEXT,
      play_time INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 账户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('microsoft', 'offline')),
      name TEXT NOT NULL,
      uuid TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      is_active INTEGER DEFAULT 0,
      skin_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 迁移：给已有账户添加 skin_url 列
  try { db.exec("ALTER TABLE accounts ADD COLUMN skin_url TEXT") } catch { /* 列已存在 */ }

  // 配置表（键值对）
  db.exec(`
    CREATE TABLE IF NOT EXISTS configs (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 版本清单缓存表
  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      mc_version TEXT NOT NULL,
      loader_type TEXT DEFAULT 'vanilla',
      loader_version TEXT DEFAULT '',
      manifest_json TEXT,
      installed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 下载任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      dest_path TEXT NOT NULL,
      total_size INTEGER DEFAULT 0,
      downloaded_size INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','downloading','paused','completed','failed','cancelled')),
      progress REAL DEFAULT 0,
      error_msg TEXT,
      instance_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `)

  console.log('[DB] 表结构检查完成')
}

// 导出工具函数
export { getDbPath }
