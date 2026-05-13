/**
 * 游戏启动 / 版本管理 IPC（接入增强服务）
 */
import { ipcMain } from 'electron'
import * as gameLauncher from '../services/game.launcher.service'
import { getInstanceById } from '../services/instances'
import type { BrowserWindow } from 'electron'
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, createWriteStream } from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger'
const log = logger.child('Game-IPC')

/** 简单流式下载（用于下载 MC 版本文件到本地） */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`下载失败 HTTP ${response.status} (${url})`)
  if (!response.body) throw new Error(`响应体为空 (${url})`)
  const writer = createWriteStream(destPath)
  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    writer.write(value)
  }
  writer.end()
}

/** 带进度回调的流式下载 */
async function downloadFileWithProgress(
  url: string,
  destPath: string,
  onProgress: (downloaded: number, total: number, speed: number) => void
): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`下载失败 HTTP ${response.status} (${url})`)
  if (!response.body) throw new Error(`响应体为空 (${url})`)

  const contentLength = response.headers.get('content-length')
  const totalSize = contentLength ? parseInt(contentLength, 10) : 0

  const writer = createWriteStream(destPath)
  const reader = response.body.getReader()
  let downloaded = 0
  const startTime = Date.now()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    writer.write(value)
    downloaded += value.length
    const elapsed = (Date.now() - startTime) / 1000
    const speed = elapsed > 0 ? downloaded / elapsed : 0
    onProgress(downloaded, totalSize, speed)
  }
  writer.end()
}

let versionsService: any = null
let modLoaderService: any = null

export function setGameDependencies(versions: any, modloader: any) {
  versionsService = versions
  modLoaderService = modloader
}

/** 扫描文件夹下已安装的 MC 版本 */
interface ScannedVersion {
  id: string
  name: string
  type: string
  baseVersion: string
  loaderInfo: string
  jarPath: string
  jsonPath: string
}

async function scanInstalledVersions(gameDir: string): Promise<ScannedVersion[]> {
  const versionsDir = join(gameDir, 'versions')
  if (!existsSync(versionsDir)) return []

  const results: ScannedVersion[] = []
  const entries = readdirSync(versionsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const versionName = entry.name
    const versionDir = join(versionsDir, versionName)

    // 找 JSON 文件（MC 版本元数据）
    let jsonFile = ''
    let jarFile = ''
    try {
      const files = readdirSync(versionDir)
      jsonFile = files.find(f => f.endsWith('.json')) || ''
      jarFile = files.find(f => f.endsWith('.jar')) || ''
    } catch {
      continue
    }

    if (!jsonFile) continue

    try {
      const jsonPath = join(versionDir, jsonFile)
      const jsonContent = readFileSync(jsonPath, 'utf-8')
      const meta = JSON.parse(jsonContent)

      // 判断类型
      let type = 'release'
      let loaderInfo = ''
      let baseVersion = meta.id

      if (meta.inheritsFrom) {
        // 继承自另一个版本（通常是 ModLoader 版本）
        loaderInfo = versionName.replace(meta.inheritsFrom + '-', '').replace(meta.inheritsFrom, '')
        type = 'modded'
        baseVersion = meta.inheritsFrom
      } else if (meta.type === 'snapshot') {
        type = 'snapshot'
      } else if (meta.type === 'old_alpha' || meta.type === 'old_beta') {
        type = 'old'
      }

      // 尝试判断 ModLoader 类型
      const lowerName = versionName.toLowerCase()
      if (lowerName.includes('fabric')) loaderInfo = loaderInfo || 'Fabric'
      else if (lowerName.includes('forge')) loaderInfo = loaderInfo || 'Forge'
      else if (lowerName.includes('neoforge')) loaderInfo = loaderInfo || 'NeoForge'
      else if (lowerName.includes('quilt')) loaderInfo = loaderInfo || 'Quilt'

      results.push({
        id: versionName,
        name: versionName,
        type,
        baseVersion,
        loaderInfo: loaderInfo.trim(),
        jarPath: jarFile ? join(versionDir, jarFile) : '',
        jsonPath: jsonPath,
      })
    } catch {
      // JSON 解析失败，忽略
    }
  }

  return results
}

export function registerGameHandlers(mainWindow: BrowserWindow): void {

  // ===== 游戏启动 =====

  ipcMain.handle('game:launch', async (_event, { instanceId, accountId, versionId }: {
    instanceId?: string
    accountId?: string
    versionId?: string
  }) => {
    // 优先用 versionId 直接启动（绕过数据库实例依赖）
    if (versionId) {
      return gameLauncher.launchByVersion(mainWindow, { versionId, accountId })
    }

    // 兜底：尝试从数据库找实例
    if (!instanceId) {
      return { success: false, error: '未指定版本或实例' }
    }

    const inst = getInstanceById(instanceId)
    if (!inst) {
      return { success: false, error: `实例不存在: ${instanceId}` }
    }

    return gameLauncher.launchGame(mainWindow, { instanceId: inst.id, accountId })
  })

  ipcMain.handle('game:terminate', () => gameLauncher.terminateGame())
  ipcMain.handle('game:is-running', () => gameLauncher.isRunning())
  ipcMain.handle('game:status', () => gameLauncher.getGameStatus())
  ipcMain.handle('game:get-log', () => gameLauncher.getCurrentLog())

  // ===== MC 版本清单 =====

  ipcMain.handle('versions:list', async () => {
    try {
      const result = await (versionsService?.getAllVersions() ?? [])
      return result
    } catch(e: any) {
      log.error('[versions:list] ERROR:', e.message, e.stack)
      return []
    }
  })

  ipcMain.handle('versions:get-latest', async () =>
    versionsService?.getLatestVersion() ?? null)

  ipcMain.handle('versions:get-info', async (_event, versionId: string) =>
    versionsService?.getVersionInfo(versionId) ?? null)

  // ===== 下载 MC 版本到目录 =====
  // StarLight.Core 方案：从 version_manifest 找到版本 URL，再下载
  ipcMain.handle('versions:download', async (_event, { versionId, gameDir }: { versionId: string; gameDir: string }) => {
    log.error('[versions:download] ▶ versionId=', versionId, 'gameDir=', gameDir)
    const bmclUrl = 'https://bmclapi2.bangbang93.com'
    const versionDir = join(gameDir, 'versions', versionId)

    try {
      mkdirSync(versionDir, { recursive: true })

      // 1. 获取版本清单，找到该版本的 URL
      log.error('[versions:download] Step1 获取版本清单...')
      const manifestRes = await fetch(`${bmclUrl}/mc/game/version_manifest.json`)
      if (!manifestRes.ok) throw new Error(`获取版本清单失败 HTTP ${manifestRes.status}`)
      const manifest = await manifestRes.json() as { versions: Array<{ id: string; url: string }> }
      const verEntry = manifest.versions.find(v => v.id === versionId)
      if (!verEntry) throw new Error(`版本清单中未找到 ${versionId}`)

      // BMCLAPI 返回的 url 已经是镜像地址，直接用
      const jsonUrl = verEntry.url
      log.error('[versions:download] Step1 JSON URL:', jsonUrl)

      // 2. 下载版本 JSON
      const jsonPath = join(versionDir, `${versionId}.json`)
      await downloadFile(jsonUrl, jsonPath)
      log.error('[versions:download] Step1 JSON 下载成功')

      // 3. 解析出官方下载地址
      const vjson = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const clientUrl = vjson.downloads?.client?.url
      log.error('[versions:download] Step2 clientUrl:', clientUrl)
      if (!clientUrl) {
        return { ok: false, error: 'version.json 中缺少 downloads.client.url，可能是不支持的远古版' }
      }

      // 4. 下载 client.jar（官方 URL）
      const jarPath = join(versionDir, `${versionId}.jar`)
      log.error('[versions:download] Step3 下载 jar from:', clientUrl)
      await downloadFile(clientUrl, jarPath)
      log.error('[versions:download] Step3 jar 下载成功')

      return { ok: true, data: { jarPath, jsonPath } }
    } catch (err: any) {
      log.error('[versions:download] 失败:', err.message)
      return { ok: false, error: err.message }
    }
  })

  // ===== 带进度的版本下载（流式） =====
  // 返回 { taskId } 后立即启动后台下载，过程中通过 webContents.send 推送进度
  ipcMain.handle('versions:download-start', async (_event, { versionId, gameDir }: {
    versionId: string; gameDir: string
  }) => {
    const taskId = `vdl_${versionId}_${Date.now()}`
    const bmclUrl = 'https://bmclapi2.bangbang93.com'
    const versionDir = join(gameDir, 'versions', versionId)
    const jsonPath = join(versionDir, `${versionId}.json`)
    const jarPath = join(versionDir, `${versionId}.jar`)

    const sendProgress = (phase: string, phaseLabel: string, progress: number,
                          downloaded: number, total: number, speed: number) => {
      mainWindow.webContents.send('version:download-progress', {
        taskId, versionId, phase, phaseLabel, progress, downloaded, total, speed, gameDir
      })
    }

    // 异步执行下载，不阻塞 IPC 响应
    ;(async () => {
      try {
        mkdirSync(versionDir, { recursive: true })

        // 阶段1：获取版本清单
        sendProgress('resolving', '解析版本清单...', 5, 0, 1, 0)
        const manifestRes = await fetch(`${bmclUrl}/mc/game/version_manifest.json`)
        if (!manifestRes.ok) throw new Error(`获取版本清单失败 HTTP ${manifestRes.status}`)
        const manifest = await manifestRes.json() as { versions: Array<{ id: string; url: string }> }
        const verEntry = manifest.versions.find(v => v.id === versionId)
        if (!verEntry) throw new Error(`版本清单中未找到 ${versionId}`)

        // 阶段2：下载 JSON（流式）
        sendProgress('downloading_json', '下载版本信息...', 10, 0, 1, 0)
        await downloadFileWithProgress(verEntry.url, jsonPath, (dl, total) => {
          const pct = total > 0 ? Math.min(30, 10 + (dl / total) * 20) : 30
          sendProgress('downloading_json', '下载版本信息...', pct, dl, total, 0)
        })
        sendProgress('downloading_json_ok', '版本信息下载完成', 35, 0, 1, 0)

        // 阶段3：解析官方 jar URL
        const vjson = JSON.parse(readFileSync(jsonPath, 'utf-8'))
        const clientUrl = vjson.downloads?.client?.url
        if (!clientUrl) throw new Error('version.json 中缺少 downloads.client.url，可能是不支持的远古版')

        // 阶段4：下载 client.jar（流式）
        sendProgress('downloading_jar', '下载核心文件...', 40, 0, 1, 0)
        await downloadFileWithProgress(clientUrl, jarPath, (dl, total) => {
          const pct = total > 0 ? Math.min(95, 40 + (dl / total) * 55) : 95
          sendProgress('downloading_jar', '下载核心文件...', pct, dl, total, dl / ((Date.now() - (Date.now() - 1)) / 1000 + 0.1))
        })

        sendProgress('completed', '下载完成', 100, 0, 1, 0)
        mainWindow.webContents.send('version:download-complete', { taskId, versionId, gameDir })
      } catch (err: any) {
        log.error('[versions:download-start] 失败:', err.message)
        sendProgress('failed', `失败: ${err.message}`, 0, 0, 0, 0)
        mainWindow.webContents.send('version:download-error', { taskId, versionId, error: err.message })
      }
    })()

    // 立即返回 taskId，下载在后台运行
    return { ok: true, data: { taskId } }
  })

  // ===== 删除目录下的 MC 版本 =====
  ipcMain.handle('versions:delete', async (_event, { versionId, gameDir }: { versionId: string; gameDir: string }) => {
    try {
      const versionDir = join(gameDir, 'versions', versionId)
      if (existsSync(versionDir)) {
        rmSync(versionDir, { recursive: true, force: true })
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // ===== 扫描文件夹已安装版本 =====

  ipcMain.handle('versions:scan-folder', async (_event, { gameDir }: { gameDir: string }) => {
    try {
      const versions = await scanInstalledVersions(gameDir)
      return { ok: true, data: versions }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  // ===== 检查单个版本是否已安装 =====

  ipcMain.handle('versions:is-installed', async (_event, { versionId, gameDir }: {
    versionId: string
    gameDir: string
  }) => {
    try {
      if (!versionsService) {
        return { ok: false, error: 'VersionsService 未初始化' }
      }
      const installed = await versionsService.isVersionInstalled(versionId, gameDir)
      return { ok: true, data: installed }
    } catch (error: any) {
      return { ok: false, error: error.message }
    }
  })

  // ===== 补全文件：检测缺失 =====

  ipcMain.handle('versions:validate', async (_event, { versionId, gameDir }: {
    versionId: string
    gameDir: string
  }) => {
    try {
      const versionDir = join(gameDir, 'versions', versionId)
      const jsonPath = join(versionDir, `${versionId}.json`)
      if (!existsSync(jsonPath)) {
        return { ok: false, error: '版本 JSON 不存在，请先重新下载该版本' }
      }

      const versionJson = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const libs = versionJson.libraries || []

      // 解析所有需要的库路径
      const missing: string[] = []
      const baseLibPath = join(gameDir, 'libraries')

      for (const lib of libs) {
        const dl = lib.downloads?.artifact
        if (!dl) continue
        const libPath = join(baseLibPath, dl.path)
        if (!existsSync(libPath)) {
          missing.push(dl.path)
        }
      }

      // 检查 client.jar
      const jarPath = join(versionDir, `${versionId}.jar`)
      if (!existsSync(jarPath)) {
        missing.unshift(`${versionId}/${versionId}.jar`)
      }

      // 如果有继承版本（ModLoader），也要检查父版本 JSON
      if (versionJson.inheritsFrom) {
        const parentJsonPath = join(gameDir, 'versions', versionJson.inheritsFrom, `${versionJson.inheritsFrom}.json`)
        if (!existsSync(parentJsonPath)) {
          missing.unshift(`父版本 JSON 缺失: ${versionJson.inheritsFrom}`)
        }
      }

      return { ok: true, data: { missing, total: libs.length, checked: true } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // ===== 补全文件：下载缺失的库 =====

  ipcMain.handle('versions:download-missing', async (_event, { versionId, gameDir }: {
    versionId: string
    gameDir: string
  }) => {
    const versionDir = join(gameDir, 'versions', versionId)
    const jsonPath = join(versionDir, `${versionId}.json`)
    const baseUrl = versionsService?.getBaseUrl?.() ?? 'https://bmclapi2.bangbang93.com'

    try {
      if (!existsSync(jsonPath)) {
        return { ok: false, error: '版本 JSON 不存在' }
      }

      const versionJson = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const libs = versionJson.libraries || []
      const baseLibPath = join(gameDir, 'libraries')

      // 收集缺失的库
      const missing: Array<{ path: string; url: string }> = []
      for (const lib of libs) {
        const dl = lib.downloads?.artifact
        if (!dl) continue
        const libPath = join(baseLibPath, dl.path)
        if (!existsSync(libPath)) {
          missing.push({ path: dl.path, url: dl.url || `${baseUrl}/libraries/${dl.path}` })
        }
      }

      if (!missing.length) {
        // 下载 client.jar（如果缺失）
        const jarPath = join(versionDir, `${versionId}.jar`)
        if (!existsSync(jarPath)) {
          const jarUrl = `${baseUrl}/mc/version/${versionId}/client`
          mkdirSync(join(versionDir), { recursive: true })
          await downloadFile(jarUrl, jarPath)
        }
        // 下载父版本 JSON（如果缺失）
        if (versionJson.inheritsFrom) {
          const parentJsonPath = join(gameDir, 'versions', versionJson.inheritsFrom, `${versionJson.inheritsFrom}.json`)
          if (!existsSync(parentJsonPath)) {
            mkdirSync(join(gameDir, 'versions', versionJson.inheritsFrom), { recursive: true })
            await downloadFile(`${baseUrl}/mc/game/version/${versionJson.inheritsFrom}`, parentJsonPath)
          }
        }
        return { ok: true, data: { downloaded: 0, message: '所有文件已完整，无需下载' } }
      }

      let downloaded = 0
      for (const lib of missing) {
        const libFilePath = join(baseLibPath, lib.path)
        mkdirSync(join(baseLibPath, lib.path).replace(/[^/\\]+$/, ''), { recursive: true })
        // 优先用 BMCLAPI 镜像
        const url = `${baseUrl}/libraries/${lib.path}`
        try {
          await downloadFile(url, libFilePath)
          downloaded++
          // 推送进度
          mainWindow.webContents.send('version:download-progress', {
            versionId,
            current: downloaded,
            total: missing.length,
            file: lib.path,
          })
        } catch {
          // 尝试备用 URL
          try {
            await downloadFile(lib.url, libFilePath)
            downloaded++
            mainWindow.webContents.send('version:download-progress', {
              versionId,
              current: downloaded,
              total: missing.length,
              file: lib.path,
            })
          } catch (e: any) {
            log.warn(`[补全] 下载失败: ${lib.path}`, e.message)
          }
        }
      }

      // 最后下载 client.jar 和父版本 JSON
      const jarPath = join(versionDir, `${versionId}.jar`)
      if (!existsSync(jarPath)) {
        mkdirSync(versionDir, { recursive: true })
        await downloadFile(`${baseUrl}/mc/version/${versionId}/client`, jarPath)
        downloaded++
      }
      if (versionJson.inheritsFrom) {
        const parentJsonPath = join(gameDir, 'versions', versionJson.inheritsFrom, `${versionJson.inheritsFrom}.json`)
        if (!existsSync(parentJsonPath)) {
          mkdirSync(join(gameDir, 'versions', versionJson.inheritsFrom), { recursive: true })
          await downloadFile(`${baseUrl}/mc/game/version/${versionJson.inheritsFrom}`, parentJsonPath)
          downloaded++
        }
      }

      return { ok: true, data: { downloaded, total: missing.length } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // ===== ModLoader handlers (已在 modloader.ts 中注册) =====
  // - modloader:get-loaders
  // - modloader:install
  // - modloader:get-status
  // - modloader:get-progress

  // 旧版兼容
  ipcMain.handle('version:list', async () => [])
  ipcMain.handle('version:list-loaders', async () => [])
}
