/**
 * 实例增强服务
 * 在基础 CRUD 之上提供：目录创建、文件系统操作、Mod 列表、打开文件夹等
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { shell } from 'electron'
import { getDatabase } from './database'
import { getInstanceById, createInstance, updateInstance, deleteInstance, Instance } from './instances'
import { logger } from '../utils/logger'
const log = logger.child('InstanceEnhanced')

export interface CreateInstanceInput {
  name: string
  mcVersion: string
  loaderType?: 'vanilla' | 'forge' | 'fabric' | 'neoforge' | 'quilt'
  loaderVersion?: string
  /** 自定义游戏目录，不填则自动在 mcDir 下建 */
  customPath?: string
  javaPath?: string
  jvmArgs?: string
  minMemory?: number
  maxMemory?: number
  width?: number
  height?: number
  icon?: string
}

// ===== 创建 =====

/**
 * 创建实例，同时初始化目录结构
 */
export function createInstanceWithDir(input: CreateInstanceInput): Instance {
  const id = `inst_${Date.now()}`
  const mcDir = defaultMcDir()
  const instanceDir = input.customPath || path.join(mcDir, 'instances', id)

  // 创建目录结构
  ensureDir(instanceDir)
  ensureDir(path.join(instanceDir, 'mods'))
  ensureDir(path.join(instanceDir, 'resourcepacks'))
  ensureDir(path.join(instanceDir, 'saves'))
  ensureDir(path.join(instanceDir, 'screenshots'))
  ensureDir(path.join(instanceDir, 'logs'))

  return createInstance({
    id,
    name: input.name,
    path: instanceDir,
    mc_version: input.mcVersion,
    loader_type: input.loaderType || 'vanilla',
    loader_version: input.loaderVersion || '',
    icon: input.icon || '',
    java_path: input.javaPath || '',
    jvm_args: '',
    min_memory: input.minMemory || 512,
    max_memory: input.maxMemory || 2048,
    width: 854,
    height: 480,
    fullscreen: 0,
    is_favorited: 0,
    last_played: null,
  })
}

// ===== 删除 =====

/**
 * 删除实例（可选是否同时删除文件系统目录）
 */
export function deleteInstanceWithDir(id: string, deleteFiles = false): boolean {
  const instance = getInstanceById(id)
  if (!instance) return false

  if (deleteFiles && instance.path && fs.existsSync(instance.path)) {
    try {
      fs.rmSync(instance.path, { recursive: true, force: true })
    } catch (e) {
      log.error(`[InstanceEnhanced] 删除目录失败: ${e}`)
    }
  }

  return deleteInstance(id)
}

// ===== 文件系统操作 =====

/** 打开实例目录（系统资源管理器） */
export async function openInstanceFolder(id: string): Promise<boolean> {
  const instance = getInstanceById(id)
  if (!instance || !instance.path) return false
  if (!fs.existsSync(instance.path)) {
    fs.mkdirSync(instance.path, { recursive: true })
  }
  await shell.openPath(instance.path)
  return true
}

/** 打开实例 mods 目录 */
export async function openModsFolder(id: string): Promise<boolean> {
  const instance = getInstanceById(id)
  if (!instance || !instance.path) return false
  const modsDir = path.join(instance.path, 'mods')
  ensureDir(modsDir)
  await shell.openPath(modsDir)
  return true
}

// ===== Mod 文件扫描 =====

export interface ModFileInfo {
  filename: string
  size: number
  enabled: boolean  // .jar = enabled, .jar.disabled = disabled
  modifiedAt: string
}

/** 扫描实例 mods 目录，返回文件列表 */
export function listModFiles(id: string): ModFileInfo[] {
  const instance = getInstanceById(id)
  if (!instance || !instance.path) return []

  const modsDir = path.join(instance.path, 'mods')
  if (!fs.existsSync(modsDir)) return []

  try {
    return fs.readdirSync(modsDir)
      .filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
      .map(filename => {
        const fullPath = path.join(modsDir, filename)
        const stat = fs.statSync(fullPath)
        return {
          filename,
          size: stat.size,
          enabled: filename.endsWith('.jar'),
          modifiedAt: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => a.filename.localeCompare(b.filename))
  } catch {
    return []
  }
}

/** 启用/禁用 Mod（重命名文件） */
export function toggleMod(id: string, filename: string, enabled: boolean): boolean {
  const instance = getInstanceById(id)
  if (!instance || !instance.path) return false

  const modsDir = path.join(instance.path, 'mods')
  const oldPath = path.join(modsDir, filename)
  if (!fs.existsSync(oldPath)) return false

  let newFilename: string
  if (enabled) {
    // 启用：去掉 .disabled 后缀
    newFilename = filename.replace(/\.disabled$/, '')
  } else {
    // 禁用：加 .disabled 后缀
    newFilename = filename.endsWith('.disabled') ? filename : filename + '.disabled'
  }

  if (newFilename === filename) return true

  const newPath = path.join(modsDir, newFilename)
  try {
    fs.renameSync(oldPath, newPath)
    return true
  } catch {
    return false
  }
}

/** 删除 Mod 文件 */
export function deleteMod(id: string, filename: string): boolean {
  const instance = getInstanceById(id)
  if (!instance || !instance.path) return false

  const modPath = path.join(instance.path, 'mods', filename)
  if (!fs.existsSync(modPath)) return false

  try {
    fs.unlinkSync(modPath)
    return true
  } catch {
    return false
  }
}

// ===== 实例统计 =====

/** 获取实例磁盘占用大小（字节） */
export function getInstanceDiskUsage(id: string): number {
  const instance = getInstanceById(id)
  if (!instance || !instance.path || !fs.existsSync(instance.path)) return 0
  return getDirSize(instance.path)
}

function getDirSize(dirPath: string): number {
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        total += getDirSize(full)
      } else if (entry.isFile()) {
        total += fs.statSync(full).size
      }
    }
  } catch {}
  return total
}

// ===== 工具 =====

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function defaultMcDir(): string {
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming')
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support')
  } else {
    return os.homedir()
  }
}
