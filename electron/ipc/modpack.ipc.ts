/**
 * 整合包（mrpack）IPC 处理器
 */
import { ipcMain } from 'electron'
import { logger } from '../utils/logger'
import {
  packAsMrpack,
  importMrpack,
  getDefaultModpackOutputDir,
  type PackOptions,
  type PackProgress
} from '../services/modpack.service'

const log = logger.child('modpack.ipc')

export function registerModpackHandlers(): void {
  log.info('Registering modpack IPC handlers')

  // 创建整合包
  ipcMain.handle(
    'modpack:pack',
    async (
      _event,
      payload: {
        instancePath: string
        outputPath?: string
        options: PackOptions
      }
    ) => {
      try {
        log.info('开始打包整合包', {
          instancePath: payload.instancePath,
          name: payload.options.name
        })

        const outPath =
          payload.outputPath || `${getDefaultModpackOutputDir()}/${payload.options.name || 'modpack'}.mrpack`

        const res = await packAsMrpack(payload.instancePath, outPath, payload.options, (p: PackProgress) => {
          // 通过 webContents 推送进度（可选）
          const win = _event.sender
          try {
            win.send('modpack:progress', { stage: p.stage, progress: p.progress, currentFile: p.currentFile })
          } catch {}
        })

        if (!res.ok) {
          return { ok: false, error: res.error }
        }
        log.info('整合包打包完成', { filePath: res.filePath, fileCount: res.fileCount })
        return { ok: true, filePath: res.filePath, fileCount: res.fileCount }
      } catch (e: any) {
        log.error('整合包打包失败', e)
        return { ok: false, error: e.message || '打包失败' }
      }
    }
  )

  // 导入整合包
  ipcMain.handle(
    'modpack:import',
    async (
      _event,
      payload: {
        mrpackPath: string
        targetParentDir: string
        instanceName: string
      }
    ) => {
      try {
        log.info('开始导入整合包', { mrpackPath: payload.mrpackPath })
        const res = await importMrpack(
          payload.mrpackPath,
          payload.targetParentDir,
          payload.instanceName,
          (p: PackProgress) => {
            const win = _event.sender
            try {
              win.send('modpack:progress', {
                stage: p.stage,
                progress: p.progress,
                currentFile: p.currentFile
              })
            } catch {}
          }
        )

        if (!res.ok) return { ok: false, error: res.error }
        log.info('整合包导入完成', { instancePath: res.instancePath })
        return res
      } catch (e: any) {
        log.error('整合包导入失败', e)
        return { ok: false, error: e.message || '导入失败' }
      }
    }
  )

  // 获取默认输出目录
  ipcMain.handle('modpack:get-default-output-dir', () => {
    return getDefaultModpackOutputDir()
  })

  log.info('modpack handlers registered')
}
