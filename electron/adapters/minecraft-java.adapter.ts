/**
 * Minecraft Java Edition 游戏适配器
 * 实现 IGameAdapter 接口，封装 Java 版启动/版本/Java检测等逻辑
 */

import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { IGameAdapter } from './IGameAdapter'
import type {
  GameInfo,
  GameInstance,
  GameVersion,
  JavaInfo,
  ModLoader,
  CrashReport,
} from '../types/adapter.types'

const execFileAsync = promisify(execFile)

// ── 平台相关工具 ──────────────────────────────────────────────
function getDefaultMinecraftDir(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', '.minecraft')
    case 'darwin':
      return path.join(process.env.HOME || '', 'Library', 'Application Support', 'minecraft')
    default: // linux
      return path.join(process.env.HOME || '', '.minecraft')
  }
}

/** 获取系统默认 Java 搜索路径 */
function getJavaSearchPaths(): string[] {
  if (process.platform === 'win32') {
    return [
      'C:\\Program Files\\Java',
      'C:\\Program Files (x86)\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      path.join(process.env.LOCALAPPDATA || '', 'Packages\\Microsoft.4297127D64EC6_8wekyb3d8bbwe\\LocalCache\\local-runtime'),
    ]
  }
  if (process.platform === 'darwin') {
    return [
      '/Library/Java/JavaVirtualMachines',
      '/usr/local/opt',
    ]
  }
  return [
    '/usr/lib/jvm',
    '/usr/local/lib/jvm',
    '/opt/java',
  ]
}

/** 在目录树中找到 java 可执行文件 */
async function findJavaExecutables(searchDir: string): Promise<string[]> {
  const results: string[] = []
  if (!fs.existsSync(searchDir)) return results

  const javaExe = process.platform === 'win32' ? 'java.exe' : 'java'

  function walk(dir: string, depth = 0) {
    if (depth > 4) return
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isFile() && entry.name === javaExe) {
          results.push(fullPath)
        } else if (entry.isDirectory()) {
          walk(fullPath, depth + 1)
        }
      }
    } catch { /* ignore permission errors */ }
  }
  walk(searchDir)
  return results
}

/** 通过 java -version 获取版本号和架构 */
async function getJavaInfo(javaPath: string): Promise<JavaInfo | null> {
  try {
    const { stderr } = await execFileAsync(javaPath, ['-version'], { timeout: 5000 })
    const output = stderr || ''

    // 版本号
    const versionMatch = output.match(/version "([^"]+)"/)
    if (!versionMatch) return null
    const versionStr = versionMatch[1]
    // 规范化: "1.8.0_xxx" → "8", "17.0.x" → "17"
    const version = versionStr.startsWith('1.')
      ? versionStr.split('.')[1]
      : versionStr.split('.')[0]

    // 架构
    let architecture: JavaInfo['architecture'] = 'x64'
    if (output.includes('aarch64') || output.includes('arm64')) architecture = 'arm64'
    else if (output.includes('x86') && !output.includes('x86_64')) architecture = 'x86'

    return { path: javaPath, version, architecture }
  } catch {
    return null
  }
}

// ── Mojang 版本清单 ───────────────────────────────────────────
const MOJANG_MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json'

async function fetchMojangVersions(): Promise<GameVersion[]> {
  try {
    const res = await fetch(MOJANG_MANIFEST_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { versions: Array<{ id: string; type: string; releaseTime: string }> }
    return data.versions.map(v => ({
      id: v.id,
      name: v.id,
      releaseTime: v.releaseTime,
      type: v.type as GameVersion['type'],
    }))
  } catch (e) {
    console.error('[MC Adapter] Failed to fetch versions:', e)
    return []
  }
}

// ── 崩溃日志解析 ──────────────────────────────────────────────
function parseCrashLogContent(content: string): CrashReport {
  const versionMatch = content.match(/Minecraft Version:\s+(.+)/)
  const causeMatch = content.match(/-- Head --[\s\S]*?Caused by:\s+(.+)/) ||
                     content.match(/Description:\s+(.+)/)
  const timestamp = Date.now()

  const stackLines = content
    .split('\n')
    .filter(l => l.trim().startsWith('at ') || l.trim().startsWith('Caused by:'))
    .slice(0, 20)
    .map(l => l.trim())

  const recommendations: string[] = []
  if (content.includes('OutOfMemoryError')) recommendations.push('增加 JVM 最大内存（-Xmx）')
  if (content.includes('OpenGL')) recommendations.push('更新显卡驱动或关闭硬件加速')
  if (content.includes('java.version')) recommendations.push('检查 Java 版本是否与 MC 版本兼容')
  if (recommendations.length === 0) recommendations.push('查看完整日志排查原因')

  return {
    version: versionMatch?.[1] ?? 'unknown',
    timestamp,
    cause: causeMatch?.[1] ?? '未知原因',
    stackTrace: stackLines,
    recommendedActions: recommendations,
  }
}

// ── 适配器实现 ────────────────────────────────────────────────
export class MinecraftJavaAdapter implements IGameAdapter {
  readonly gameInfo: GameInfo = {
    id: 'minecraft-java',
    name: 'Minecraft: Java Edition',
    icon: 'mc-java',
    supportedPlatforms: ['windows', 'macos', 'linux'],
  }

  async getVersions(): Promise<GameVersion[]> {
    return fetchMojangVersions()
  }

  async installVersion(_instance: GameInstance): Promise<void> {
    // TODO: 接入 download.service 完成版本文件下载与安装
    console.warn('[MC Adapter] installVersion not yet fully implemented')
  }

  async launchGame(instance: GameInstance, account: unknown): Promise<unknown> {
    // 委托给已有的 launcher.ts service
    // 实际使用时由 game.ipc.ts 调用 launcherService，这里作为接口占位
    console.log('[MC Adapter] launchGame ->', instance.id, (account as any)?.username)
    return { success: true, pid: -1 }
  }

  async detectJava(): Promise<JavaInfo[]> {
    const searchPaths = getJavaSearchPaths()
    const found: JavaInfo[] = []
    const seen = new Set<string>()

    for (const searchPath of searchPaths) {
      const exes = await findJavaExecutables(searchPath)
      for (const exe of exes) {
        if (seen.has(exe)) continue
        seen.add(exe)
        const info = await getJavaInfo(exe)
        if (info) found.push(info)
      }
    }

    // 也检测 PATH 中的 java
    try {
      const pathJava = process.platform === 'win32' ? 'java.exe' : 'java'
      const info = await getJavaInfo(pathJava)
      if (info && !seen.has(info.path)) found.push(info)
    } catch { /* ignore */ }

    return found
  }

  async getModLoaders(minecraftVersion: string): Promise<ModLoader[]> {
    // 基础列表，实际版本支持范围由 modloader.service 提供
    const loaders: ModLoader[] = [
      { type: 'fabric', name: 'Fabric', supportedVersions: [] },
      { type: 'forge', name: 'Forge', supportedVersions: [] },
      { type: 'quilt', name: 'Quilt', supportedVersions: [] },
      { type: 'neoforge', name: 'NeoForge', supportedVersions: [] },
    ]

    // 过滤：1.13 以前的版本不支持 Fabric/Quilt/NeoForge
    const [major, minor] = minecraftVersion.split('.').map(Number)
    if (major === 1 && minor < 13) {
      return loaders.filter(l => l.type === 'forge')
    }
    // NeoForge 仅支持 1.20.2+
    if (major === 1 && minor < 20) {
      return loaders.filter(l => l.type !== 'neoforge')
    }

    return loaders
  }

  async parseCrashLog(logPath: string): Promise<CrashReport | null> {
    try {
      if (!fs.existsSync(logPath)) return null
      const content = fs.readFileSync(logPath, 'utf-8')
      return parseCrashLogContent(content)
    } catch {
      return null
    }
  }

  getDefaultGameDir(): string {
    return getDefaultMinecraftDir()
  }

  async resolveAssets(instance: GameInstance): Promise<void> {
    // 检查 assets/indexes 目录是否存在，如缺失则标记需要重新安装
    const assetsDir = path.join(instance.gameDir, 'assets', 'indexes')
    if (!fs.existsSync(assetsDir)) {
      console.warn('[MC Adapter] Assets missing, re-install recommended:', instance.id)
    }
  }
}
