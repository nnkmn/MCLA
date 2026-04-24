/**
 * Java 管理 IPC
 */
import { ipcMain } from 'electron'
import * as javaService from '../services/java.management.service'

export function registerJavaHandlers(): void {
  /** 扫描系统所有 Java */
  ipcMain.handle('java:detect', async () => {
    return javaService.detectAllJava()
  })

  /** 获取默认 Java */
  ipcMain.handle('java:get-default', async () => {
    return javaService.getDefaultJava()
  })

  /** 设置默认 Java */
  ipcMain.handle('java:set-default', async (_event, javaPath: string) => {
    javaService.setDefaultJava(javaPath)
    return true
  })

  /** 验证指定路径的 Java */
  ipcMain.handle('java:validate', async (_event, javaPath: string) => {
    return javaService.validateJava(javaPath)
  })

  /** 查询 MC 版本推荐的 Java 主版本号 */
  ipcMain.handle('java:recommended-major', (_event, mcVersion: string) => {
    return javaService.recommendedJavaMajor(mcVersion)
  })
}
