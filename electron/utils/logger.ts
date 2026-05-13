/**
 * MCLA 日志工具
 *
 * 纯 Node.js 实现（不依赖 electron-log/winston），
 * 支持控制台输出 + 文件持久化 + IPC 通道转发。
 */

import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, appendFileSync, existsSync } from 'fs'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
const LEVEL_ORDER: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }

/** 当前日志级别（可通过 setLevel 调整） */
let currentLevel: LogLevel = process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO'

/** 是否写入文件 */
let fileLogging = true

/** 日志目录（延迟初始化，避免 Electron app 未 ready 时调用 getPath） */
let _logDir: string | null = null
function getLogDirLazy(): string {
  if (!_logDir) {
    const dir =
      process.env['MCLA_LOG_DIR'] || join(app.getPath('userData'), 'logs')
    // 确保日志目录存在
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    } catch {
      // 忽略目录创建失败（某些沙箱环境）
    }
    _logDir = dir
  }
  return _logDir
}

function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function formatMessage(level: LogLevel, module: string, ...args: unknown[]): string {
  const ts = getTimestamp()
  const prefix = `[${ts}][${level}]${module ? ` [${module}]` : ''}`
  const rest = args.map(a => {
    if (a instanceof Error) {
      return `${a.message}\n${a.stack || ''}`
    }
    if (typeof a === 'object' && a !== null) {
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    }
    return String(a)
  }).join(' ')
  const safe = redactSensitive(rest)
  return `${prefix} ${safe}`
}

function redactSensitive(text: string): string {
  // 脱敏 JWT（三段 base64，access_token / refresh_token）
  let s = text.replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED-JWT]')
  // 脱敏独立长 hex 字符串（32+ 位，前后非 hex 字符，避免误伤 UUID）
  s = s.replace(/(^|[^0-9a-fA-F])[0-9a-fA-F]{32,}(?=[^0-9a-fA-F]|$)/g, '$1[REDACTED-HEX]')
  return s
}

function writeToFile(message: string): void {
  if (!fileLogging) return
  try {
    const date = new Date().toISOString().slice(0, 10)
    appendFileSync(join(getLogDirLazy(), `${date}.log`), message + '\n', 'utf-8')
  } catch {
    // 文件写入失败静默忽略，不影响主流程
  }
}

export interface Logger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  child(module: string): Logger
}

function createLogger(moduleName?: string): Logger {
  return {
    debug(...args: unknown[]) {
      if (LEVEL_ORDER.DEBUG < LEVEL_ORDER[currentLevel]) return
      const msg = formatMessage('DEBUG', moduleName || '', ...args)
      console.debug(msg)
      writeToFile(msg)
    },
    info(...args: unknown[]) {
      if (LEVEL_ORDER.INFO < LEVEL_ORDER[currentLevel]) return
      const msg = formatMessage('INFO', moduleName || '', ...args)
      console.log(msg)
      writeToFile(msg)
    },
    warn(...args: unknown[]) {
      if (LEVEL_ORDER.WARN < LEVEL_ORDER[currentLevel]) return
      const msg = formatMessage('WARN', moduleName || '', ...args)
      console.warn(msg)
      writeToFile(msg)
    },
    error(...args: unknown[]) {
      if (LEVEL_ORDER.ERROR < LEVEL_ORDER[currentLevel]) return
      const msg = formatMessage('ERROR', moduleName || '', ...args)
      console.error(msg)
      writeToFile(msg)
    },
    child(subModule: string): Logger {
      return createLogger(moduleName ? `${moduleName}:${subModule}` : subModule)
    },
  }
}

/** 全局默认日志器 */
export const logger = createLogger()

/** 设置全局日志级别 */
export function setLevel(level: LogLevel): void {
  currentLevel = level
}

/** 启用/禁用文件日志 */
export function setFileLogging(enabled: boolean): void {
  fileLogging = enabled
}

/** 获取日志目录 */
export function getLogDir(): string {
  return getLogDirLazy()
}
