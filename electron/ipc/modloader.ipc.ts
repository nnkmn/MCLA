/**
 * ModLoader 安装 IPC Handlers
 *
 * 注册 modloader:get-loaders / modloader:install / modloader:get-status / modloader:get-progress
 * 并通过 webContents.send('modloader:progress', ...) 推送安装进度
 */
import { ipcMain, BrowserWindow } from 'electron'
import { ModLoaderService } from '../services/modloader.service'
import type { InstallationProgress } from '../services/modloader.service'
import { getInstanceById } from '../services/instances'
import type { GameInstance } from '../types/adapter.types'

let mainWindow: BrowserWindow | null = null
let service: ModLoaderService | null = null

// 缓存最近一次进度，供 get-progress 查询
let lastProgress: {
  instanceId: string
  stage: string
  progress: number
  message: string
} | null = null

/**
 * 向渲染进程推送进度
 */
function broadcastProgress(data: {
  instanceId: string
  stage: string
  progress: number
  message: string
}) {
  lastProgress = data
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('modloader:progress', data)
  }
}

/**
 * 查询 ModLoader 安装状态
 * 检查游戏目录中是否存在对应加载器的核心文件
 */
async function getModLoaderStatus(instance: { gameDir: string; loaderType: string; loaderVersion: string }): Promise<{ installed: boolean; version: string }> {
  const { gameDir, loaderType, loaderVersion } = instance
  if (!gameDir || !loaderType) return { installed: false, version: '' }

  const { promises: fs } = require('fs')
  const path = require('path')

  try {
    if (loaderType === 'fabric') {
      const fabricDir = path.join(gameDir, 'libraries', 'net', 'fabricmc', 'fabric-loader')
      await fs.access(fabricDir)
      return { installed: true, version: loaderVersion }
    }
    if (loaderType === 'forge') {
      const forgeDir = path.join(gameDir, 'libraries', 'net', 'minecraftforge', 'forge')
      await fs.access(forgeDir)
      return { installed: true, version: loaderVersion }
    }
    if (loaderType === 'neoforge') {
      const neoDir = path.join(gameDir, 'libraries', 'net', 'neoforged', 'neoforge')
      await fs.access(neoDir)
      return { installed: true, version: loaderVersion }
    }
    if (loaderType === 'quilt') {
      const quiltDir = path.join(gameDir, 'libraries', 'org', 'quiltmc', 'quilt-loader')
      await fs.access(quiltDir)
      return { installed: true, version: loaderVersion }
    }
  } catch {
    // 目录不存在，认为未安装
  }
  return { installed: false, version: loaderVersion }
}

export function registerModLoaderHandlers(win: BrowserWindow, modLoaderService: ModLoaderService): void {
  mainWindow = win
  service = modLoaderService

  // ── 获取指定 MC 版本支持的 ModLoader 列表 ──────────────────
  ipcMain.handle('modloader:get-loaders', async (_event, opts: { minecraftVersion: string }) => {
    try {
      const loaders = service!.getModLoaders(opts.minecraftVersion)
      return { ok: true, data: loaders }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // ── 安装 ModLoader（带进度推送）────────────────────────────
  ipcMain.handle(
    'modloader:install',
    async (
      _event,
      payload: { instanceId: string; loaderType: string; loaderVersion: string; gameDir: string },
    ) => {
      const { instanceId, loaderType, loaderVersion, gameDir } = payload

      try {
        const inst = getInstanceById(instanceId)
        if (!inst) return { ok: false, error: `实例不存在: ${instanceId}` }

        const effectiveGameDir = gameDir || inst.path || ''

        const instanceForInstall: GameInstance = {
          id: inst.id,
          gameId: 'minecraft-java',
          name: inst.name,
          version: inst.mc_version,
          gameDir: effectiveGameDir,
          createdAt: inst.created_at ? new Date(inst.created_at).getTime() : Date.now(),
          loaderType: inst.loader_type || 'vanilla',
          loaderVersion: inst.loader_version || '',
        } as GameInstance

        // 挂载进度回调 → 推送到渲染进程
        service!.setProgressCallback((p: InstallationProgress) => {
          broadcastProgress({
            instanceId,
            stage: p.stage,
            progress: p.progress,
            message: p.message,
          })
        })

        await service!.installModLoader(instanceForInstall, loaderType, loaderVersion)

        return { ok: true }
      } catch (err: any) {
        broadcastProgress({
          instanceId,
          stage: 'error',
          progress: 0,
          message: err.message,
        })
        return { ok: false, error: err.message }
      } finally {
        service!.setProgressCallback(undefined!)
      }
    },
  )

  // ── 获取 ModLoader 安装状态 ─────────────────────────────
  ipcMain.handle(
    'modloader:get-status',
    async (_event, opts: { instanceId: string }) => {
      try {
        const inst = getInstanceById(opts.instanceId)
        if (!inst) return { ok: true, data: { installed: false, version: '', type: '' } }

        const status = await getModLoaderStatus({
          gameDir: inst.path || '',
          loaderType: inst.loader_type || '',
          loaderVersion: inst.loader_version || '',
        })

        return {
          ok: true,
          data: {
            type: inst.loader_type || '',
            version: status.version,
            installed: status.installed,
            lastChecked: Date.now(),
          },
        }
      } catch (err: any) {
        return { ok: false, error: err.message }
      }
    },
  )

  // ── 获取最近一次安装进度 ─────────────────────────────
  ipcMain.handle(
    'modloader:get-progress',
    async (_event, opts: { instanceId: string }) => {
      if (lastProgress && lastProgress.instanceId === opts.instanceId) {
        return {
          ok: true,
          data: {
            instanceId: lastProgress.instanceId,
            stage: lastProgress.stage,
            progress: lastProgress.progress,
            message: lastProgress.message,
          },
        }
      }
      return {
        ok: true,
        data: {
          instanceId: opts.instanceId,
          stage: 'idle',
          progress: 0,
          message: '',
        },
      }
    },
  )
}

/**
 * 供外部更新 mainWindow 引用（如 app:activate 重建窗口时）
 */
export function updateModLoaderMainWindow(win: BrowserWindow): void {
  mainWindow = win
}
