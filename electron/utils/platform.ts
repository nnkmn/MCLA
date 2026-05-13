/**
 * MCLA 平台工具函数
 *
 * 提供跨平台兼容的工具方法：
 * - 操作系统检测与分类
 * - Java 路径自动探测（Windows/Mac/Linux 各自的常见安装路径）
 * - Minecraft 目录定位
 * - 文件/命令执行封装
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync } from 'fs'
import { join, normalize, sep } from 'path'

const execAsync = promisify(exec)

// ==================== 类型定义 ====================

export type OSType = 'windows' | 'macos' | 'linux'

export interface PlatformInfo {
  os: OSType
  arch: string
  isWin: boolean
  isMac: boolean
  isLinux: boolean
  homeDir: string
  /** 默认 Minecraft 数据目录 */
  defaultMcDir: string
}

// ==================== 平台信息 ====================

/** 当前运行平台信息 */
export const platform: PlatformInfo = (() => {
  const p = process.platform
  return {
    os: (p === 'win32' ? 'windows' : p === 'darwin' ? 'macos' : 'linux') as OSType,
    arch: process.arch,
    isWin: p === 'win32',
    isMac: p === 'darwin',
    isLinux: p === 'linux',
    homeDir: process.env.HOME || process.env.USERPROFILE || '',
    defaultMcDir: getDefaultMcDir(),
  }
})()

function getDefaultMcDir(): string {
  const { isWin, isMac, homeDir } = platform
  if (isWin) {
    return join(process.env.APPDATA || homeDir, '.minecraft')
  }
  if (isMac) {
    return join(homeDir, 'Library', 'Application Support', 'minecraft')
  }
  return join(homeDir, '.minecraft')
}

// ==================== Java 探测 =================

export interface JavaEntry {
  path: string
  version: string
  major: number
  isValid: boolean
}

/**
 * 扫描系统已安装的 Java 版本
 * 返回按 major version 降序排列的列表
 */
export async function detectJavaInstallations(): Promise<JavaEntry[]> {
  const candidates = getCandidateJavaPaths()
  const results: JavaEntry[] = []
  const seen = new Set<string>()

  for (const javaPath of candidates) {
    if (seen.has(javaPath)) continue
    seen.add(javaPath)

    if (!existsSync(javaPath)) continue

    try {
      const { stdout } = await execAsync(`"${javaPath}" -version`, {
        timeout: 5000,
        env: { ...process.env, JAVA_TOOL_OPTIONS: '' }, // 清除可能干扰输出的环境变量
      })

      // java -version 输出到 stderr（Oracle/OpenJDK 行为），部分实现输出到 stdout
      const output = stdout || ''
      const versionMatch = output.match(/version\s+"?(\d+)(?:\.\d+)*"?/)
      if (versionMatch) {
        const major = parseInt(versionMatch[1], 10)
        results.push({
          path: javaPath,
          version: versionMatch[0],
          major,
          isValid: major >= 8, // Minecraft 需要至少 Java 8+
        })
      }
    } catch {
      // 该路径不是有效的 Java 或执行超时，跳过
    }
  }

  // 按 major 版本降序排列
  results.sort((a, b) => b.major - a.major)
  return results
}

function getCandidateJavaPaths(): string[] {
  const paths: string[] = []
  const { isWin, isMac, isLinux, homeDir } = platform
  const pathEnv = process.env.PATH || ''

  if (isWin) {
    // Windows 常见安装位置
    const programFiles = [
      process.env['PROGRAMFILES'] || 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      process.env['ProgramW6432'] || 'C:\\Program Files',
    ]
    const programDirs = [...new Set(programFiles)]

    for (const pf of programDirs) {
      paths.push(
        // Oracle JDK
        join(pf, 'Java', 'jdk-*', 'bin', 'java.exe'),
        join(pf, 'Java', 'jre-*', 'bin', 'java.exe'),
        // Eclipse Adoptium / Temurin
        join(pf, 'Eclipse Adoptium', '*', 'bin', 'java.exe'),
        join(pf, 'Eclipse Adoptium', 'jdk-*', 'bin', 'java.exe'),
        join(pf, 'Temurin', '*', 'bin', 'java.exe'),
        // Microsoft JDK
        join(pf, 'Microsoft', 'jdk-*', 'bin', 'java.exe'),
        // BellSoft Liberica
        join(pf, 'BellSoft', 'Liberica JDK-*', 'bin', 'java.exe'),
        // Azul Zulu
        join(pf, 'Zulu', 'zulu-*', 'bin', 'java.exe'),
      )
    }

    // 用户级安装
    paths.push(
      join(homeDir, '.jdks', '*', 'bin', 'java.exe'),
      join(homeDir, '.graalvm', '*', 'bin', 'java.exe'),
    )

    // PATH 中的 java
    if (pathEnv.includes('java')) {
      for (const dir of pathEnv.split(';')) {
        if (dir.toLowerCase().includes('java')) {
          paths.push(join(dir, 'java.exe'))
        }
      }
    }
  } else if (isMac) {
    // macOS 常见安装位置
    paths.push(
      '/usr/bin/java',
      '/Library/Java/JavaVirtualMachines/*/Contents/Home/bin/java',
      '/Library/Java/JavaVirtualMachines/temurin-*/Contents/Home/bin/java',
      '/System/Library/Frameworks/JavaVM.framework/Versions/Current/Commands/java',
      join(homeDir, 'Library/Java/JavaVirtualMachines', '*', 'Contents', 'Home', 'bin', 'java'),
      '/opt/homebrew/opt/openjdk/bin/java',
      '/opt/homebrew/libexec/open.jdk/Contents/Home/bin/java',
    )
    // macOS 也从 PATH 搜索
    for (const dir of pathEnv.split(':')) {
      paths.push(join(dir, 'java'))
    }
  } else {
    // Linux 常见安装位置
    paths.push(
      '/usr/bin/java',
      '/usr/lib/jvm/default/bin/java',
      '/usr/lib/jvm/java-*-openjdk-amd64/bin/java',
      '/usr/lib/jvm/java-*-openjdk/bin/java',
      '/usr/lib/jvm/temurin-*/bin/java',
      '/snap/bin/java',
      '/opt/java/*/bin/java',
      join(homeDir, '.sdkman/candidates/java/current/bin/java'),
      join(homeDir, '.jdks', '*', 'bin', 'java'),
      join(homeDir, '.graalvm', '*', 'bin', 'java'),
    )
    for (const dir of pathEnv.split(':')) {
      paths.push(join(dir, 'java'))
    }
  }

  // 展开 glob 通配符（*）
  const expanded: string[] = []
  for (const p of paths) {
    if (p.includes('*')) {
      try {
        // 手动展开一层通配符
        const baseDir = p.substring(0, p.lastIndexOf('*'))
        const suffix = p.substring(p.lastIndexOf('*') + 1)
        if (existsSync(baseDir)) {
          const entries = readdirSync(baseDir)
          for (const entry of entries) {
            expanded.push(join(baseDir, entry, suffix))
          }
        }
      } catch {
        // 展开失败，保留原样
        expanded.push(p.replace(/\*/g, ''))
      }
    } else {
      expanded.push(p)
    }
  }

  return [...new Set(expanded)]
}

// ==================== 工具函数 =================

/**
 * 规范化路径分隔符为当前平台的格式
 */
export function normalizePath(path: string): string {
  return normalize(path)
}

/**
 * 构建跨平台 shell 命令
 * Windows 用 cmd /c，Unix 用 sh -c
 */
export function buildShellCommand(command: string): string {
  if (platform.isWin) {
    return `cmd /c "${command.replace(/"/g, '\\"')}"`
  }
  return command
}

/**
 * 打开文件管理器并选中指定文件/文件夹
 */
export function revealInExplorer(targetPath: string): void {
  const { shell } = require('electron')
  if (platform.isWin) {
    shell.openPath(targetPath) // Windows Explorer 自动选中
  } else if (platform.isMac) {
    execAsync(`open -R "${targetPath}"`).catch(() => {})
  } else {
    // Linux: xdg-open 打开目录
    const dir = targetPath.endsWith(sep) ? targetPath : join(targetPath, '..')
    execAsync(`xdg-open "${dir}"`).catch(() => {})
  }
}
