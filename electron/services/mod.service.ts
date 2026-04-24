/**
 * 本地 Mod 文件管理服务
 * 负责实例目录下 mods 文件夹的扫描、安装、启用/禁用操作
 */
import { getDatabase } from './database'
import { readdirSync, statSync, unlinkSync, renameSync } from 'fs'
import { join, basename, extname } from 'path'

export interface LocalMod {
  id: string
  fileName: string
  displayName: string
  version: string
  author: string
  instanceId: string
  status: 'active' | 'disabled' | 'incompatible'
  filePath: string
  fileSize: number
  installedAt: string
}

/** 扫描指定实例的 mods 目录，返回已安装的 Mod 列表 */
export function scanInstanceMods(instanceId: string, gameDir: string): LocalMod[] {
  const modsDir = join(gameDir, 'mods')
  const disabledModsDir = join(gameDir, 'disabled_mods')
  const mods: LocalMod[] = []
  const now = new Date().toISOString()

  // 扫描活跃 mods
  const activeFiles = safeReadDir(modsDir).filter(f => isJarOrZip(f))
  for (const file of activeFiles) {
    const filePath = join(modsDir, file)
    const stat = safeStat(filePath)
    if (!stat) continue

    mods.push({
      id: `${instanceId}_${file}`,
      fileName: file,
      displayName: extractDisplayName(file),
      version: '',
      author: '',
      instanceId,
      status: 'active',
      filePath,
      fileSize: stat.size,
      installedAt: now,
    })
  }

  // 扫描已禁用 mods（在 disabled_mods 目录下）
  const disabledFiles = safeReadDir(disabledModsDir).filter(f => isJarOrZip(f))
  for (const file of disabledFiles) {
    const filePath = join(disabledModsDir, file)
    const stat = safeStat(filePath)
    if (!stat) continue

    mods.push({
      id: `${instanceId}_${file}`,
      fileName: file,
      displayName: extractDisplayName(file),
      version: '',
      author: '',
      instanceId,
      status: 'disabled',
      filePath,
      fileSize: stat.size,
      installedAt: now,
    })
  }

  return mods
}

/** 禁用指定 Mod（移到 disabled_mods 目录） */
export function disableMod(instanceId: string, gameDir: string, modId: string): boolean {
  // 查找 mod 信息
  const mod = findModById(instanceId, gameDir, modId)
  if (!mod || mod.status !== 'active') return false

  const disabledDir = join(gameDir, 'disabled_mods')
  const destPath = join(disabledDir, mod.fileName)

  try {
    renameSync(mod.filePath, destPath)
    return true
  } catch (e) {
    console.error(`[ModService] Failed to disable mod ${mod.fileName}:`, e)
    return false
  }
}

/** 启用指定 Mod（移回 mods 目录） */
export function enableMod(instanceId: string, gameDir: string, modId: string): boolean {
  const mod = findModById(instanceId, gameDir, modId)
  if (!mod || mod.status !== 'disabled') return false

  const modsDir = join(gameDir, 'mods')
  const destPath = join(modsDir, mod.fileName)

  try {
    renameSync(mod.filePath, destPath)
    return true
  } catch (e) {
    console.error(`[ModService] Failed to enable mod ${mod.fileName}:`, e)
    return false
  }
}

/** 删除指定 Mod 文件 */
export function removeMod(instanceId: string, gameDir: string, modId: string): boolean {
  const mod = findModById(instanceId, gameDir, modId)
  if (!mod) return false

  try {
    unlinkSync(mod.filePath)
    return true
  } catch (e) {
    console.error(`[ModService] Failed to remove mod ${mod.fileName}:`, e)
    return false
  }
}

// ====== 内部工具函数 ======

function safeReadDir(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

function safeStat(path: string): { size: number } | null {
  try {
    const s = statSync(path)
    return { size: s.size }
  } catch {
    return null
  }
}

function isJarOrZip(filename: string): boolean {
  const ext = extname(filename).toLowerCase()
  return ext === '.jar' || ext === '.zip'
}

function extractDisplayName(filename: string): string {
  // 从文件名去除 .jar/.zip 后缀作为显示名
  return basename(filename, extname(filename))
    .replace(/[-_]/g, ' ')
}

function findModById(instanceId: string, gameDir: string, modId: string): LocalMod | null {
  const allMods = scanInstanceMods(instanceId, gameDir)
  return allMods.find(m => m.id === modId) ?? null
}
