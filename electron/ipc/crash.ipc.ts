import { ipcMain } from 'electron';
import { CrashService } from '../services/crash.service';

/**
 * 注册崩溃分析 IPC handlers
 */
export function registerCrashIpcHandlers(crashService: CrashService) {
  
  /**
   * 解析崩溃日志
   */
  ipcMain.handle('crash:parse', async (_event, { logPath, instanceId }) => {
    try {
      const report = await crashService.parseCrashLog(logPath, instanceId);
      return { ok: true, data: report };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 生成诊断报告
   */
  ipcMain.handle('crash:diagnose', async (_event, { logPath, instanceId }) => {
    try {
      const report = await crashService.parseCrashLog(logPath, instanceId);
      if (!report) {
        return { ok: false, error: '无法解析崩溃日志' };
      }
      const diagnosis = crashService.generateDiagnosisReport(report);
      return { ok: true, data: { report, diagnosis } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 列出所有崩溃报告
   */
  ipcMain.handle('crash:list', async (_event, { gameDir }) => {
    try {
      const reports = await crashService.listCrashReports(gameDir);
      return { ok: true, data: reports };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
  
  /**
   * 获取最新崩溃报告
   */
  ipcMain.handle('crash:latest', async (_event, { gameDir }) => {
    try {
      const report = await crashService.getLatestCrashReport(gameDir);
      if (!report) {
        return { ok: true, data: null };
      }
      const diagnosis = crashService.generateDiagnosisReport(report);
      return { ok: true, data: { report, diagnosis } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });
}
