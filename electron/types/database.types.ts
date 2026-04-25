/**
 * 数据库表结构类型定义
 *
 * 基于 better-sqlite3，所有字段与 CREATE TABLE 语句对齐。
 * 用于主进程 service 层的类型约束和 IDE 提示。
 */

// ==================== 通用基础类型 ====================

/** 所有表的公共时间戳字段 */
export interface BaseEntity {
  id: string           // UUID 主键
  created_at: number   // 创建时间 (Unix ms)
  updated_at: number   // 更新时间 (Unix ms)
}

// ==================== instances 表 ====================

/**
 * 游戏实例
 * 对应 adapter.types.ts 中的 GameInstance（数据库层增加内部字段）
 */
export interface DbInstance extends BaseEntity {
  name: string
  /** Minecraft 版本号，如 "1.20.1" */
  mc_version: string
  /** Mod 加载器信息 JSON 字符串：{type, version} */
  mod_loader: string       // '{"type":"fabric","version":"0.15.11"}' 或空字符串 ''
  /** 游戏运行目录绝对路径 */
  game_dir: string
  /** 自定义 Java 路径（null=使用全局默认） */
  java_path: string | null
  /** JVM 额外参数 */
  jvm_args: string | null
  /** 最小内存分配 (MB) */
  min_memory: number | null     // 默认 512
  /** 最大内存分配 (MB) */
  max_memory: number | null     // 默认 2048
  /** 最后游玩时间 */
  last_played_at: number | null
  /** 封面图相对路径（在实例目录内） */
  cover_image: string | null
  /** 实例备注/描述 */
  description: string | null
  /** 是否已归档（不显示在主页） */
  is_archived: number            // 0 or 1
}

// ==================== accounts 表 ====================

/**
 * 账户信息
 * 敏感字段（access_token / refresh_token）使用 safeStorage 加密后存为 hex 字符串
 */
export interface DbAccount extends BaseEntity {
  /** 账户类型：microsoft / offline */
  account_type: 'microsoft' | 'offline'
  /** 显示名称（微软登录=Gamertag，离线=用户输入名） */
  username: string
  /** Minecraft UUID */
  uuid: string | null
  /** 访问令牌（加密 hex） */
  access_token_encrypted: string | null
  /** 刷新令牌（加密 hex）*/
  refresh_token_encrypted: string | null
  /** 令牌过期时间 (Unix ms) */
  token_expires_at: number | null
  /** 皮肤方案：random(default)/steve/alex/custom/official */
  skin_type: string              // 默认 'default'
  /** 自定义皮肤文件路径 */
  custom_skin_path: string | null
  /** 正版皮肤玩家名 */
  official_skin_name: string | null
  /** 是否当前活跃账户 */
  is_active: number               // 0 or 1
  /** 最后使用时间 */
  last_used_at: number | null
}

// ==================== downloads 表 ====================

/**
 * 下载任务记录
 */
export interface DbDownload extends BaseEntity {
  /** 下载源 URL */
  url: string
  /** 目标保存路径 */
  destination: string
  /** 文件名 */
  file_name: string
  /** 文件总大小 (bytes) */
  total_size: number
  /** 已下载大小 (bytes) */
  downloaded_size: number
  /** 当前状态 */
  status:
    | 'pending'
    | 'downloading'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled'
  /** 当前速度 (bytes/s) */
  speed: number
  /** 进度百分比 0-100 */
  progress: number
  /** 错误信息 */
  error_msg: string | null
  /** 关联实例 ID */
  instance_id: string | null
  /** 下载类型分类 */
  download_type:
    | 'mod'
    | 'resourcepack'
    | 'shader'
    | 'version'
    | 'modloader'
    | 'asset'
    | 'other'
  /** 来源平台 */
  source: 'curseforge' | 'modrinth' | 'official' | 'other'
  /** 项目 ID（Modrinth project ID / CurseForge mod ID） */
  project_id: string | null
  /** 文件 ID（对应平台的 file ID） */
  file_id: string | null
  /** SHA1 校验和（用于完整性验证） */
  expected_hash: string | null
  /** 重试次数 */
  retry_count: number
}

// ==================== mods 表 ====================

/**
 * 已安装 Mod 本地记录
 */
export interface DbMod extends BaseEntity {
  /** 所属实例 ID */
  instance_id: string
  /** Mod 显示名称 */
  display_name: string
  /** Mod 标识符（Modrinth slug / CurseForge slug） */
  mod_slug: string
  /** 来源平台 */
  source: 'curseforge' | 'modrinth' | 'local'
  /** 平台项目 ID */
  project_id: string | null
  /** 平台项目版本/文件 ID */
  file_id: string | null
  /** Mod 文件名 */
  file_name: string
  /** 文件绝对路径 */
  file_path: string
  /** 文件大小 (bytes) */
  file_size: number
  /** MC 版本范围 */
  mc_version: string
  /** 兼容的加载器 */
  loaders: string                 // JSON 数组字符串 '["fabric","forge"]'
  /** 是否启用（false=禁用但未删除，改名为 .disabled） */
  is_enabled: number             // 0 or 1
  /** 作者列表 */
  authors: string | null         // JSON 数组字符串
  /** 描述 */
  description: string | null
}

// ==================== settings 表 ====================

/**
 * 全局设置（key-value 存储）
 */
export interface DbSetting {
  key: string                    // 主键
  value: string                  // JSON 字符串或纯文本
  updated_at: number             // 更新时间
}

// ==================== java_versions 表 ====================

/**
 * 已检测到的本地 Java 安装
 */
export interface DbJavaVersion extends BaseEntity {
  /** java 可执行文件完整路径 */
  java_path: string
  /** 完整版本字符串 */
  version_string: string
  /** 主版本号（如 8, 11, 17, 21） */
  major_version: number
  /** 供应商：Oracle / Eclipse Adoptium / Microsoft / BellSoft / Azul / Other */
  vendor: string
  /** 架构：x64 / x86 / arm64 */
  architecture: string
  /** 是否有效（Java >= 8） */
  is_valid: number              // 0 or 1
  /** 最后检测到的时间 */
  detected_at: number
}

// ==================== SQL DDL 参考 ====================

/**
 * 建表语句参考（实际建表逻辑在 database.service.ts 中执行）
 * 这里只做类型文档用途，不直接执行。
 */
export const SCHEMA_DDL = {
  instances: `
    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mc_version TEXT NOT NULL,
      mod_loader TEXT DEFAULT '',
      game_dir TEXT NOT NULL UNIQUE,
      java_path TEXT,
      jvm_args TEXT,
      min_memory INTEGER,
      max_memory INTEGER,
      last_played_at INTEGER,
      cover_image TEXT,
      description TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  accounts: `
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      account_type TEXT NOT NULL CHECK(account_type IN ('microsoft', 'offline')),
      username TEXT NOT NULL,
      uuid TEXT,
      access_token_encrypted TEXT,
      refresh_token_encrypted TEXT,
      token_expires_at INTEGER,
      skin_type TEXT DEFAULT 'default',
      custom_skin_path TEXT,
      official_skin_name TEXT,
      is_active INTEGER DEFAULT 0,
      last_useded_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  downloads: `
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      destination TEXT NOT NULL,
      file_name TEXT NOT NULL,
      total_size INTEGER DEFAULT 0,
      downloaded_size INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','downloading','paused','completed','failed','cancelled')),
      speed REAL DEFAULT 0,
      progress REAL DEFAULT 0,
      error_msg TEXT,
      instance_id TEXT,
      download_type TEXT DEFAULT 'other',
      source TEXT DEFAULT 'other',
      project_id TEXT,
      file_id TEXT,
      expected_hash TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  mods: `
    CREATE TABLE IF NOT EXISTS mods (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      mod_slug TEXT NOT NULL,
      source TEXT DEFAULT 'local',
      project_id TEXT,
      file_id TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mc_version TEXT NOT NULL,
      loaders TEXT DEFAULT '[]',
      is_enabled INTEGER DEFAULT 1,
      authors TEXT,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  java_versions: `
    CREATE TABLE IF NOT EXISTS java_versions (
      id TEXT PRIMARY KEY,
      java_path TEXT NOT NULL UNIQUE,
      version_string TEXT NOT NULL,
      major_version INTEGER NOT NULL,
      vendor TEXT DEFAULT 'Other',
      architecture TEXT DEFAULT 'unknown',
      is_valid INTEGER DEFAULT 1,
      detected_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
} as const

export type TableName = keyof typeof SCHEMA_DDL
