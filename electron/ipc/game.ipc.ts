/**
 * 游戏启动 / 版本管理 IPC（接入增强服务）
 */
import { ipcMain } from 'electron'
import * as gameLauncher from '../services/game.launcher.service'
import type { BrowserWindow } from 'electron'

let versionsService: any = null
let modLoaderService: any = null

export function setGameDependencies(versions: any, modloader: any) {
  versionsService = versions
  modLoaderService = modloader
}

export function registerGameHandlers(mainWindow: BrowserWindow): void {

  // ===== 游戏启动 =====

  ipcMain.handle('game:launch', async (_event, { instanceId, accountId }) => {
    return gameLauncher.launchGame(mainWindow, { instanceId, accountId })
  })

  ipcMain.handle('game:terminate', () => gameLauncher.terminateGame())
  ipcMain.handle('game:is-running', () => gameLauncher.isRunning())
  ipcMain.handle('game:status', () => gameLauncher.getGameStatus())
  ipcMain.handle('game:get-log', () => gameLauncher.getCurrentLog())

  // ===== MC 版本清单 =====

  ipcMain.handle('versions:list', async () =>
    versionsService?.getAllVersions() ?? [])

  ipcMain.handle('versions:get-latest', async () =>
    versionsService?.getLatestVersion() ?? null)

  ipcMain.handle('versions:get-info', async (_event, versionId: string) =>
    versionsService?.getVersionInfo(versionId) ?? null)

  // ===== ModLoader =====

  ipcMain.handle('modloader:get-loaders', async (_event, args: { minecraftVersion: string }) =>
    modLoaderService?.getModLoaders(args.minecraftVersion) ?? [])

  ipcMain.handle('modloader:install', async (_event, args) =>
    modLoaderService?.installModLoader(
      { gameDir: args.gameDir, version: '', id: args.instanceId },
      args.loaderType,
      args.loaderVersion
    ))

  // 旧版兼容
  ipcMain.handle('version:list', async () => [])
  ipcMain.handle('version:list-loaders', async () => [])
}
