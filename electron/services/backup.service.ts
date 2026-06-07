/**
 * 数据备份与迁移服务
 *
 * 备份内容：
 *  - 配置（configs 表）
 *  - 实例列表（instances 表 & 目录清单）
 *  - 账户（accounts 表）
 *  - 版本历史（versions 表）
 *
 * 备份格式：
 *  - ZIP 压缩包，内含：
 *    - manifest.json：备份元信息
 *    - data.json：所有数据库表数据 JSON 导出
 *    - notes.txt：备注信息
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { getDatabase } from './database'
import { logger } from '../utils/logger'

const log = logger.child('Backup')

// ========== 类型 ==========

export interface BackupManifest {
  version: 1
  appVersion: string
  createdAt: string
  description?: string
  tables: string[]
  note?: string
}

export interface BackupOptions {
  description?: string
  includeConfigs?: boolean
  includeAccounts?: boolean
  includeInstances?: boolean
  includeVersions?: boolean
}

export interface BackupProgress {
  stage: 'reading' | 'packing' | 'finalizing'
  currentItem: string
  progress: number // 0-100
}

export interface RestoreProgress {
  stage: 'reading' | 'restoring' | 'finalizing'
  currentItem: string
  progress: number
}

export interface RestoreResult {
  ok: boolean
  error?: string
  restoredTables?: string[]
}

// ========== 默认选项 ==========

export const DEFAULT_BACKUP_OPTIONS: BackupOptions = {
  includeConfigs: true,
  includeAccounts: true,
  includeInstances: true,
  includeVersions: true
}

// ========== 工具 ==========

function getBackupDir(): string {
  const dir = path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function tableExists(db: any, table: string): boolean {
  try {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(table)
    return !!row
  } catch {
    return false
  }
}

// ========== 创建备份 ==========

export async function createBackup(
  options: BackupOptions = DEFAULT_BACKUP_OPTIONS,
  onProgress?: (p: BackupProgress) => void
): Promise<{ ok: boolean; filePath?: string; error?: string }> {
  try {
    const db = getDatabase()
    if (!db) return { ok: false, error: '数据库未初始化' }

    const tables: { name: string; rows: any[] }[] = []

    if (onProgress) onProgress({ stage: 'reading', currentItem: '读取配置...', progress: 10 })

    if (options.includeConfigs && tableExists(db, 'configs')) {
      const rows = db.prepare('SELECT * FROM configs').all()
      tables.push({ name: 'configs', rows })
    }

    if (options.includeAccounts && tableExists(db, 'accounts')) {
      const rows = db.prepare('SELECT * FROM accounts').all()
      tables.push({ name: 'accounts', rows })
    }

    if (options.includeInstances && tableExists(db, 'instances')) {
      const rows = db.prepare('SELECT * FROM instances').all()
      tables.push({ name: 'instances', rows })
    }

    if (options.includeVersions && tableExists(db, 'versions')) {
      const rows = db.prepare('SELECT * FROM versions').all()
      tables.push({ name: 'versions', rows })
    }

    // 额外的配置表
    for (const extra of ['downloads', 'mods', 'history']) {
      if (tableExists(db, extra)) {
        const rows = db.prepare(`SELECT * FROM "${extra}"`).all()
        tables.push({ name: extra, rows })
      }
    }

    if (onProgress) onProgress({ stage: 'reading', currentItem: '读取完成', progress: 40 })

    // manifest
    const manifest: BackupManifest = {
      version: 1,
      appVersion: app.getVersion() || '0.0.0',
      createdAt: new Date().toISOString(),
      description: options.description || '',
      tables: tables.map((t) => t.name)
    }

    // 文件名：MCLA-backup-YYYYMMDD-HHMMSS.mclabackup
    const fileName = `MCLA-backup-${new Date()
      .toISOString()
      .replace(/[:T]/g, '-')
      .slice(0, 19)}.mclabackup`
    const filePath = path.join(getBackupDir(), fileName)

    const archiver = (await import('archiver')).default
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(filePath)
      const archive = archiver('zip', { zlib: { level: 6 } })

      output.on('close', () => resolve())
      archive.on('error', (err: Error) => reject(err))

      archive.pipe(output)

      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
      archive.append(JSON.stringify({ tables }, null, 2), { name: 'data.json' })

      const note =
        `MCLA 备份文件\n` +
        `生成时间: ${manifest.createdAt}\n` +
        `包含表: ${manifest.tables.join(', ')}\n` +
        `警告: 修改或重命名此文件可能导致恢复失败。\n`
      archive.append(note, { name: 'README.txt' })

      if (onProgress) {
        onProgress({ stage: 'packing', currentItem: '压缩数据...', progress: 75 })
      }

      archive.finalize()
    })

    if (onProgress) onProgress({ stage: 'finalizing', currentItem: '完成', progress: 100 })

    log.info(`备份完成: ${filePath}`)
    return { ok: true, filePath }
  } catch (e: any) {
    log.error('备份失败', e)
    return { ok: false, error: e.message || '备份失败' }
  }
}

// ========== 恢复备份 ==========

export async function restoreBackup(
  backupPath: string,
  onProgress?: (p: RestoreProgress) => void
): Promise<RestoreResult> {
  try {
    if (!fs.existsSync(backupPath)) {
      return { ok: false, error: '备份文件不存在' }
    }

    if (onProgress) onProgress({ stage: 'reading', currentItem: '读取备份文件...', progress: 10 })

    const JSZip = require('jszip')
    const buf = await fs.promises.readFile(backupPath)
    const zip = await JSZip.loadAsync(buf)

    const manifestEntry = zip.file('manifest.json')
    if (!manifestEntry) return { ok: false, error: '不是有效的 MCLA 备份文件（缺少 manifest.json）' }

    const manifest: BackupManifest = JSON.parse(await manifestEntry.async('string'))

    const dataEntry = zip.file('data.json')
    if (!dataEntry) return { ok: false, error: '备份文件损坏（缺少 data.json）' }

    const data: { tables: { name: string; rows: any[] }[] } = JSON.parse(await dataEntry.async('string'))

    if (onProgress) onProgress({ stage: 'restoring', currentItem: '写入数据库...', progress: 50 })

    const db = getDatabase()
    const restored: string[] = []

    // 使用事务，批量插入
    const transaction = db.transaction((tablesData: typeof data.tables) => {
      for (const tbl of tablesData) {
        try {
          // 清空旧数据再插入
          if (tableExists(db, tbl.name)) {
            db.prepare(`DELETE FROM "${tbl.name}"`).run()
          }

          if (tbl.rows.length === 0) continue
          const cols = Object.keys(tbl.rows[0])
          const placeholders = cols.map(() => '?').join(', ')
          const stmt = db.prepare(
            `INSERT INTO "${tbl.name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
          )
          for (const row of tbl.rows) {
            stmt.run(...cols.map((c) => row[c]))
          }
          restored.push(tbl.name)
        } catch (e: any) {
          // 某表失败不影响其他表
          log.warn(`恢复表 ${tbl.name} 失败:`, e.message)
        }
      }
    })

    transaction(data.tables)

    if (onProgress) onProgress({ stage: 'finalizing', currentItem: '恢复完成', progress: 100 })

    log.info(`备份恢复完成，表: ${restored.join(', ')}`)
    return { ok: true, restoredTables: restored }
  } catch (e: any) {
    log.error('恢复备份失败', e)
    return { ok: false, error: e.message || '恢复失败' }
  }
}

// ========== 列表 & 删除 ==========

export interface BackupListItem {
  fileName: string
  filePath: string
  size: number
  createdAt: string
}

export function listBackups(): BackupListItem[] {
  const dir = getBackupDir()
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir)
  const result: BackupListItem[] = []
  for (const f of files) {
    const full = path.join(dir, f)
    try {
      const stat = fs.statSync(full)
      if (stat.isFile() && (f.endsWith('.mclabackup') || f.endsWith('.zip'))) {
        result.push({
          fileName: f,
          filePath: full,
          size: stat.size,
          createdAt: stat.mtime.toISOString()
        })
      }
    } catch {}
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function deleteBackup(fileName: string): boolean {
  try {
    const full = path.join(getBackupDir(), fileName)
    if (fs.existsSync(full)) {
      fs.unlinkSync(full)
      return true
    }
  } catch {}
  return false
}

export function getBackupDirPath(): string {
  return getBackupDir()
}
