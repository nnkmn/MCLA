/**
 * Java 管理服务
 * 负责自动检测系统 Java 安装、验证版本、管理多版本
 */

import { execSync, execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { getDatabase } from './database'

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

/** 获取默认 Java（DB 里标记的，或自动选最高版本） */
export async function getDefaultJava(): Promise<JavaInfo | null> {
  const db = getDatabase()
  const row = db.prepare("SELECT value FROM configs WHERE key = 'default_java'").get() as { value: string } | undefined

  if (row?.value) {
    const info = await probeJava(row.value)
    if (info) return info
  }

  // 没有配置，自动选第一个可用的 Java
  const all = await detectAllJava()
  if (all.length > 0) return all[0]
  return null
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
    return result || null
  } catch {
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
    // java -XshowSettings:all -version 2>&1 包含 arch 和 vendor 信息
    const output = execFileSync(javaExe, ['-version'], {
      timeout: 5000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString() + execFileSync(javaExe, [
      '-XshowSettings:property', '-version'
    ], {
      timeout: 5000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString()

    return parseJavaInfo(javaExe, output)
  } catch (e: any) {
    // -version 输出到 stderr，尝试 stderr
    try {
      let stderr = ''
      try {
        execFileSync(javaExe, ['-version'], { timeout: 5000, encoding: 'utf8', stdio: 'pipe' })
      } catch (err: any) {
        stderr = (err.stderr || '') + (err.stdout || '')
      }
      if (stderr) return parseJavaInfo(javaExe, stderr)
    } catch {}
    return null
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
