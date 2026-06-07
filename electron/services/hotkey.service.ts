/**
 * 全局快捷键服务
 *
 * 功能：
 *  - 注册 Electron 全局快捷键
 *  - 持久化配置到数据库
 *  - 冲突检测
 *  - 启用/禁用切换
 *
 *  快捷键配置格式：
 *    { accelerator: 'Ctrl+Alt+M', action: 'launch-game', enabled: true }
 */

import { app, globalShortcut } from 'electron'
import { getConfig, setConfig } from './config'
import { logger } from '../utils/logger'

const log = logger.child('Hotkey')

const HOTKEY_CONFIG_KEY = 'global_hotkeys'

export interface HotkeyConfig {
  id: string
  label: string
  description: string
  accelerator: string // Electron accelerator 格式，例如 'Ctrl+Alt+M'
  action: HotkeyAction
  enabled: boolean
}

export type HotkeyAction = 'launch-game' | 'toggle-window' | 'quick-join'

// 内置预设
export const DEFAULT_HOTKEYS: HotkeyConfig[] = [
  {
    id: 'launch-game',
    label: '快速启动游戏',
    description: '全局按下后立即启动当前选中的游戏版本',
    accelerator: 'Ctrl+Alt+M',
    action: 'launch-game',
    enabled: false
  },
  {
    id: 'toggle-window',
    label: '显示/隐藏启动器窗口',
    description: '全局按下后切换启动器主窗口的显示/隐藏',
    accelerator: 'Ctrl+Alt+H',
    action: 'toggle-window',
    enabled: false
  }
]

// 已注册的加速器 -> id 映射
const registeredMap = new Map<string, string>()

// 回调（由 main.ts 注入）
type ActionCallback = (action: HotkeyAction, hotkeyId: string) => void
let actionCallback: ActionCallback | null = null

export function setHotkeyActionCallback(cb: ActionCallback): void {
  actionCallback = cb
}

// ========== 读取/保存配置 ==========

export function loadHotkeys(): HotkeyConfig[] {
  try {
    const saved = getConfig<HotkeyConfig[]>(HOTKEY_CONFIG_KEY)
    if (Array.isArray(saved) && saved.length > 0) {
      // 合并默认配置（新增的预设项在老数据中可能没有）
      const merged = [...saved]
      for (const def of DEFAULT_HOTKEYS) {
        if (!merged.find((m) => m.id === def.id)) merged.push(def)
      }
      return merged
    }
  } catch (e) {
    log.warn('加载快捷键配置失败，使用默认', e)
  }
  return DEFAULT_HOTKEYS.map((h) => ({ ...h }))
}

export function saveHotkeys(hotkeys: HotkeyConfig[]): void {
  setConfig(HOTKEY_CONFIG_KEY, hotkeys)
}

// ========== 注册 / 注销 ==========

/**
 * 注册全部启用的快捷键。在 app.whenReady 之后调用。
 */
export function registerAllEnabledHotkeys(): void {
  if (!app.isReady()) {
    log.warn('app 尚未 ready，无法注册全局快捷键，延后到 ready 之后')
    app.whenReady().then(() => registerAllEnabledHotkeys())
    return
  }
  const list = loadHotkeys()
  // 先全部注销旧的，再重新注册
  unregisterAllHotkeys()
  for (const h of list) {
    if (h.enabled && h.accelerator) {
      const ok = registerSingleHotkey(h)
      log.info(`注册快捷键: ${h.id} = ${h.accelerator} -> ${ok ? '成功' : '失败'}`)
    }
  }
}

export function unregisterAllHotkeys(): void {
  try {
    globalShortcut.unregisterAll()
  } catch {}
  registeredMap.clear()
}

function registerSingleHotkey(h: HotkeyConfig): boolean {
  try {
    const ok = globalShortcut.register(h.accelerator, () => {
      log.info(`触发快捷键: ${h.id} (${h.accelerator})`)
      if (actionCallback) actionCallback(h.action, h.id)
    })
    if (ok) registeredMap.set(h.accelerator, h.id)
    return ok
  } catch (e: any) {
    log.error(`注册快捷键失败: ${h.id}`, e.message)
    return false
  }
}

// ========== 对外 API：更新单个快捷键 ==========

export interface UpdateHotkeyResult {
  ok: boolean
  error?: string
  conflictWith?: string
}

export function updateHotkey(hotkey: HotkeyConfig): UpdateHotkeyResult {
  // 冲突检测：同一个 accelerator 被多个 id 使用
  const all = loadHotkeys()
  const conflict = all.find((h) => h.id !== hotkey.id && h.accelerator === hotkey.accelerator && h.enabled)
  if (conflict && hotkey.enabled) {
    return { ok: false, error: '快捷键冲突', conflictWith: conflict.label }
  }

  // 保存
  const next = all.map((h) => (h.id === hotkey.id ? hotkey : h))
  // 保证新的 id 也加进去
  if (!next.find((h) => h.id === hotkey.id)) next.push(hotkey)
  saveHotkeys(next)

  // 重新注册
  unregisterAllHotkeys()
  for (const h of next) {
    if (h.enabled && h.accelerator) registerSingleHotkey(h)
  }

  return { ok: true }
}

export function toggleHotkey(id: string, enabled: boolean): UpdateHotkeyResult {
  const all = loadHotkeys()
  const target = all.find((h) => h.id === id)
  if (!target) return { ok: false, error: '未找到该快捷键' }
  return updateHotkey({ ...target, enabled })
}

export function validateAccelerator(accelerator: string): { ok: boolean; error?: string } {
  if (!accelerator || !accelerator.trim()) {
    return { ok: false, error: '快捷键不能为空' }
  }
  // 简单校验：至少包含一个修饰键或 FunctionKey
  const hasModifier = /(Ctrl|Alt|Shift|Super)/i.test(accelerator)
  const hasFKey = /F\d{1,2}/.test(accelerator)
  if (!hasModifier && !hasFKey) {
    return { ok: false, error: '必须包含至少一个修饰键（Ctrl/Alt/Shift）或功能键（F1-F12）' }
  }
  return { ok: true }
}

// 便捷：导出给 main.ts 在退出时清理
export function cleanupHotkeys(): void {
  unregisterAllHotkeys()
}
