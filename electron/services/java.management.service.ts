/**
 * Java 管理服务
 * 负责自动检测系统 Java 安装、验证版本、管理多版本
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { getDatabase } from './database'
import { VersionsService } from './versions'
import { logger } from '../utils/logger'
const log = logger.child('JavaService')

export interface JavaInfo {
  id: string
  path: string           // java.exe 完整路径
  version: string        // 如 "17.0.9"
  majorVersion: number   // 主版本号 8/11/17/21
  vendor: string         // OpenJDK / Oracle / Adoptium
  arch: '64' | '32'
  isDefault: boolean
}

// ===== 公共 API =====

/** 扫描系统所有 Java，返回去重列表 */
export async function detectAllJava(): Promise<JavaInfo[]> {
  const candidates = await gatherCandidates()
  const results: JavaInfo[] = []
  const seen = new Set<string>()

  for (const javaExe of candidates) {
    if (seen.has(javaExe)) continue
    seen.add(javaExe)

    if (!fs.existsSync(javaExe)) continue

    const info = await probeJava(javaExe)
    if (info) results.push(info)
  }

  return results
}

/** 获取默认 Java（读取用户预设 + 根据游戏版本智能选择） */
export async function getDefaultJava(mcVersion?: string): Promise<JavaInfo | null> {
  const db = getDatabase()
  const versionSvc = new VersionsService(getDatabase())

  // 读取用户预设
  const presetRow = db.prepare("SELECT value FROM configs WHERE key = 'java_preset'").get() as { value: string } | undefined
  const preset = presetRow?.value || 'auto'

  // 读取自定义路径
  const customPathRow = db.prepare("SELECT value FROM configs WHERE key = 'java_custom_path'").get() as { value: string } | undefined
  const customPath = customPathRow?.value || ''

  // 1. custom 模式：直接用用户指定路径
  if (preset === 'custom') {
    if (customPath && fs.existsSync(customPath)) {
      const info = await probeJava(customPath)
      if (info) return info
    }
    log.warn('[JavaService] custom 模式路径无效，降级到自动检测')
  }

  // 2. 扫描所有 Java
  const all = await detectAllJava()
  if (all.length === 0) {
    const candidates = await gatherCandidates()
    log.warn('[JavaService] 自动检测 Java 失败，候选路径列表:', candidates)
    return null
  }

  // 3. 按预设过滤
  let candidates: JavaInfo[] = all

  if (preset === 'java8') {
    candidates = all.filter(j => j.majorVersion === 8)
  } else if (preset === 'java17') {
    candidates = all.filter(j => j.majorVersion === 17)
  } else if (preset === 'java21') {
    candidates = all.filter(j => j.majorVersion === 21)
  } else if (preset === 'auto' && mcVersion) {
    // 自动模式：根据游戏版本来推荐
    const { recommended } = versionSvc.getRecommendedJavaVersion(mcVersion)
    const targetMajor = parseInt(recommended)
    candidates = all.filter(j => j.majorVersion >= targetMajor)
    // 按推荐程度排序：优先匹配推荐版本，其次更高版本
    candidates.sort((a, b) => {
      if (a.majorVersion === targetMajor && b.majorVersion !== targetMajor) return -1
      if (b.majorVersion === targetMajor && a.majorVersion !== targetMajor) return 1
      return b.majorVersion - a.majorVersion
    })
  }

  if (candidates.length === 0) {
    // 该版本没有，降级到所有版本里找
    log.warn(`[JavaService] 未找到 ${preset}，降级到可用版本`)
    candidates = all
  }

  const chosen = candidates[0]
  log.info(`[JavaService] 自动检测到 ${all.length} 个 Java（预设: ${preset}，MC: ${mcVersion || '?'}，选中: ${chosen?.vendor} ${chosen?.version}）`)
  return chosen
}

/** 设置默认 Java 路径 */
export function setDefaultJava(javaPath: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO configs (key, value, type, updated_at)
    VALUES ('default_java', ?, 'string', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(javaPath, now)
}

/** 验证指定 Java 路径是否有效 */
export async function validateJava(javaPath: string): Promise<JavaInfo | null> {
  if (!fs.existsSync(javaPath)) return null
  return await probeJava(javaPath)
}

/** 推荐适合指定 MC 版本的 Java 主版本 */
export function recommendedJavaMajor(mcVersion: string): number {
  // MC 1.20.5+ 需要 Java 21
  if (compareVersions(mcVersion, '1.20.5') >= 0) return 21
  // MC 1.17+ 需要 Java 17
  if (compareVersions(mcVersion, '1.17') >= 0) return 17
  // 1.16 及以下 Java 8 即可
  return 8
}

/** 查找最佳 Java 版本（兼容旧版接口） */
export async function findBestJava(mcVersion?: string): Promise<JavaInfo | null> {
  return getDefaultJava(mcVersion)
}

// ===== 内部实现 =====

/** 收集所有候选 java 路径 */
async function gatherCandidates(): Promise<string[]> {
  const candidates: string[] = []

  // 1. PATH 里的 java
  try {
    const found = findInPath()
    if (found) candidates.push(found)
  } catch {}

  if (process.platform === 'win32') {
    candidates.push(...getWindowsCandidates())
  } else if (process.platform === 'darwin') {
    candidates.push(...getMacCandidates())
  } else {
    candidates.push(...getLinuxCandidates())
  }

  return candidates
}

function findInPath(): string | null {
  try {
    const cmd = process.platform === 'win32' ? 'where java' : 'which java'
    const result = execSync(cmd, { timeout: 3000 }).toString().trim().split('\n')[0].trim()
    log.info(`[JavaService] findInPath found: ${result}`)
    return result || null
  } catch (e: any) {
    log.warn('[JavaService] findInPath failed:', e.message)
    return null
  }
}

function getWindowsCandidates(): string[] {
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const local = process.env['LOCALAPPDATA'] || ''
  const appData = process.env['APPDATA'] || ''

  const roots = [
    pf, pf86, local,
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    `${appData}\\Local\\Programs`,
  ]

  const vendors = [
    'Java', 'Eclipse Adoptium', 'AdoptOpenJDK', 'OpenJDK',
    'BellSoft', 'Azul', 'GraalVM CE',
  ]
  const versions = ['jdk-21', 'jdk-17', 'jdk-11', 'jdk-8', 'jre-8', 'jdk1.8.0']

  const candidates: string[] = []

  for (const root of roots) {
    for (const vendor of vendors) {
      for (const ver of versions) {
        candidates.push(path.join(root, vendor, ver, 'bin', 'java.exe'))
        candidates.push(path.join(root, vendor, ver + '-hotspot', 'bin', 'java.exe'))
        candidates.push(path.join(root, vendor, ver + '-jre', 'bin', 'java.exe'))
      }
    }
  }

  // JAVA_HOME
  if (process.env['JAVA_HOME']) {
    candidates.push(path.join(process.env['JAVA_HOME'], 'bin', 'java.exe'))
  }

  // Oracle Java PATH 常见路径（where java 会找到的位置）
  candidates.push(
    'C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\\java.exe',
    'C:\\Program Files (x86)\\Common Files\\Oracle\\Java\\java8path\\java.exe',
    path.join(pf, 'Oracle\\Java\\javapath', 'java.exe'),
  )

  // Minecraft 官方启动器自带 JRE
  const mcJre = path.join(local, 'Packages', 'Microsoft.4297127D64EC6_8wekyb3d8bbwe', 'LocalCache', 'Local', 'runtime')
  if (fs.existsSync(mcJre)) {
    try {
      for (const dir of fs.readdirSync(mcJre)) {
        const javaExe = path.join(mcJre, dir, 'windows-x64', dir, 'bin', 'java.exe')
        if (fs.existsSync(javaExe)) candidates.push(javaExe)
      }
    } catch {}
  }

  return candidates
}

function getMacCandidates(): string[] {
  const candidates: string[] = [
    '/Library/Java/JavaVirtualMachines',
    '/System/Library/Java/JavaVirtualMachines',
  ].flatMap(base => {
    if (!fs.existsSync(base)) return []
    try {
      return fs.readdirSync(base).map(d =>
        path.join(base, d, 'Contents', 'Home', 'bin', 'java')
      )
    } catch { return [] }
  })

  if (process.env['JAVA_HOME']) {
    candidates.push(path.join(process.env['JAVA_HOME'], 'bin', 'java'))
  }

  return candidates
}

function getLinuxCandidates(): string[] {
  const candidates: string[] = []
  const jvmBase = '/usr/lib/jvm'

  if (fs.existsSync(jvmBase)) {
    try {
      for (const dir of fs.readdirSync(jvmBase)) {
        candidates.push(path.join(jvmBase, dir, 'bin', 'java'))
      }
    } catch {}
  }

  candidates.push(
    '/usr/bin/java',
    '/usr/local/bin/java',
  )

  if (process.env['JAVA_HOME']) {
    candidates.push(path.join(process.env['JAVA_HOME'], 'bin', 'java'))
  }

  return candidates
}

/** 探测单个 java 可执行文件，返回版本信息 */
async function probeJava(javaExe: string): Promise<JavaInfo | null> {
  try {
    // Java -version 退出码 0，不会抛异常；版本信息在 stderr，用 2>&1 重定向到 stdout
    const output = execSync(`"${javaExe}" -version 2>&1`, {
      timeout: 5000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return parseJavaInfo(javaExe, output)
  } catch (e: any) {
    // Windows 上某些 Java 实现仍会抛异常，尝试从 stderr 获取
    const output = (e.stderr || '').toString()
    if (!output) {
      log.warn(`[JavaService] probeJava 无法获取输出 ${javaExe}:`, e.message)
      return null
    }
    return parseJavaInfo(javaExe, output)
  }
}

function parseJavaInfo(javaExe: string, output: string): JavaInfo | null {
  // 版本提取：支持 "version \"21.0.1\"" / "version \"1.8.0_392\""
  const versionMatch = output.match(/version\s+"([\d._]+)"/)
  if (!versionMatch) return null

  const rawVersion = versionMatch[1]
  let version = rawVersion
  let majorVersion = 8

  // Java 8 格式: 1.8.0_xxx -> 8
  if (rawVersion.startsWith('1.')) {
    majorVersion = parseInt(rawVersion.split('.')[1]) || 8
    version = rawVersion
  } else {
    majorVersion = parseInt(rawVersion.split('.')[0]) || 8
    version = rawVersion
  }

  // 供应商
  let vendor = 'Unknown'
  if (output.includes('Eclipse Adoptium') || output.includes('Temurin')) vendor = 'Eclipse Temurin'
  else if (output.includes('OpenJDK')) vendor = 'OpenJDK'
  else if (output.includes('Oracle')) vendor = 'Oracle'
  else if (output.includes('Azul')) vendor = 'Azul Zulu'
  else if (output.includes('BellSoft') || output.includes('Liberica')) vendor = 'BellSoft Liberica'
  else if (output.includes('Microsoft')) vendor = 'Microsoft'
  else if (output.includes('GraalVM')) vendor = 'GraalVM'

  // 架构
  const arch: '64' | '32' = output.includes('64-Bit') || output.includes('64-bit') ? '64' : '32'

  // 生成稳定 ID（路径 hash）
  const id = `java_${Buffer.from(javaExe).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)}`

  return {
    id,
    path: javaExe,
    version,
    majorVersion,
    vendor,
    arch,
    isDefault: false,
  }
}

/** 版本比较 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
