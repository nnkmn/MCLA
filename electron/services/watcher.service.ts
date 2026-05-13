import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger'
const log = logger.child('WatcherService')

/**
 * 游戏进程状态
 */
export type GameProcessState = 
  | 'idle'           // 空闲
  | 'launching'       // 启动中
  | 'running'         // 运行中
  | 'crashed'         // 崩溃
  | 'exited'          // 正常退出
  | 'error';         // 错误

/**
 * 游戏进程信息
 */
export interface GameProcessInfo {
  pid: number;
  state: GameProcessState;
  startTime: number;
  instanceId: string;
  exitCode?: number;
  crashReportPath?: string;
}

/**
 * 进程事件
 */
export interface ProcessEvent {
  type: 'stateChange' | 'output' | 'error' | 'exit' | 'crash';
  instanceId: string;
  data?: any;
}

/**
 * 游戏进程监控服务
 */
export class WatcherService extends EventEmitter {
  private processes: Map<string, GameProcessInfo> = new Map();
  private outputCollectors: Map<string, string[]> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private maxOutputLines = 1000; // 最多保留 1000 行日志
  
  constructor() {
    super();
  }
  
  /**
   * 注册游戏进程
   */
  registerProcess(instanceId: string, process: ChildProcess): void {
    const pid = process.pid!;
    
    const info: GameProcessInfo = {
      pid,
      state: 'launching',
      startTime: Date.now(),
      instanceId
    };
    
    this.processes.set(instanceId, info);
    this.outputCollectors.set(instanceId, []);
    
    // 监听进程事件
    process.on('exit', (code) => {
      this.handleProcessExit(instanceId, code ?? 0);
    });
    
    process.on('error', (error) => {
      this.handleProcessError(instanceId, error);
    });
    
    // 收集 stdout
    process.stdout?.on('data', (data) => {
      this.collectOutput(instanceId, data.toString(), 'stdout');
    });
    
    // 收集 stderr
    process.stderr?.on('data', (data) => {
      this.collectOutput(instanceId, data.toString(), 'stderr');
    });
    
    // 开始轮询检查进程状态
    this.startPolling(instanceId);
    
    // 发射注册事件
    this.emit('stateChange', {
      type: 'stateChange',
      instanceId,
      data: info
    } as ProcessEvent);
    
    log.info(`[WatcherService] 注册进程 ${instanceId} (PID: ${pid})`);
  }
  
  /**
   * 收集进程输出
   */
  private collectOutput(instanceId: string, data: string, source: 'stdout' | 'stderr'): void {
    const collector = this.outputCollectors.get(instanceId);
    if (!collector) return;
    
    const lines = data.split('\n').filter(line => line.trim());
    collector.push(...lines);
    
    // 限制输出行数
    if (collector.length > this.maxOutputLines) {
      collector.splice(0, collector.length - this.maxOutputLines);
    }
    
    // 发射输出事件（限流）
    this.emit('output', {
      type: 'output',
      instanceId,
      data: { source, lines, raw: data }
    } as ProcessEvent);
    
    // 检查崩溃关键词
    this.checkForCrashKeywords(instanceId, data);
  }
  
  /**
   * 检查崩溃关键词
   */
  private checkForCrashKeywords(instanceId: string, output: string): void {
    const crashKeywords = [
      'java.lang.OutOfMemoryError',
      'FATAL ERROR',
      'EXCEPTION_ACCESS_VIOLATION',
      'Process crashed',
      'SIGSEGV',
      'The game crashed whilst'
    ];
    
    for (const keyword of crashKeywords) {
      if (output.includes(keyword)) {
        this.handlePotentialCrash(instanceId, keyword);
        break;
      }
    }
  }
  
  /**
   * 处理可能的崩溃
   */
  private handlePotentialCrash(instanceId: string, reason: string): void {
    const info = this.processes.get(instanceId);
    if (!info) return;
    
    // 查找崩溃报告
    const crashReportPath = this.findCrashReport(instanceId);
    
    info.state = 'crashed';
    info.crashReportPath = crashReportPath;
    
    this.emit('crash', {
      type: 'crash',
      instanceId,
      data: { reason, crashReportPath }
    } as ProcessEvent);
    
    log.info(`[WatcherService] 检测到 ${instanceId} 可能崩溃: ${reason}`);
  }
  
  /**
   * 查找崩溃报告
   */
  private findCrashReport(instanceId: string): string | undefined {
    // 这个需要在实例创建时传入 gameDir
    return undefined; // 暂时返回 undefined
  }
  
  /**
   * 处理进程退出
   */
  private handleProcessExit(instanceId: string, exitCode: number): void {
    const info = this.processes.get(instanceId);
    if (!info) return;
    
    // 检查是否已经标记为崩溃
    if (info.state !== 'crashed') {
      info.state = 'exited';
    }
    info.exitCode = exitCode;
    
    // 停止轮询
    this.stopPolling(instanceId);
    
    this.emit('exit', {
      type: 'exit',
      instanceId,
      data: info
    } as ProcessEvent);
    
    log.info(`[WatcherService] 进程 ${instanceId} 退出，退出码: ${exitCode}`);
  }
  
  /**
   * 处理进程错误
   */
  private handleProcessError(instanceId: string, error: Error): void {
    const info = this.processes.get(instanceId);
    if (info) {
      info.state = 'error';
    }
    
    this.emit('error', {
      type: 'error',
      instanceId,
      data: { message: error.message, stack: error.stack }
    } as ProcessEvent);
    
    log.error(`[WatcherService] 进程 ${instanceId} 错误:`, error);
  }
  
  /**
   * 开始轮询检查进程状态
   */
  private startPolling(instanceId: string): void {
    // 每 5 秒检查一次进程状态
    const interval = setInterval(() => {
      this.pollProcess(instanceId);
    }, 5000);
    
    this.pollIntervals.set(instanceId, interval);
  }
  
  /**
   * 轮询检查进程
   */
  private pollProcess(instanceId: string): void {
    const info = this.processes.get(instanceId);
    if (!info || info.state !== 'launching') return;
    
    // 检查进程是否仍在运行
    try {
      process.kill(info.pid, 0);
      // 进程仍在运行，切换到 running 状态
      if (info.state === 'launching') {
        info.state = 'running';
        this.emit('stateChange', {
          type: 'stateChange',
          instanceId,
          data: info
        } as ProcessEvent);
        log.info(`[WatcherService] 进程 ${instanceId} 已启动`);
      }
    } catch {
      // 进程不存在，可能已经退出
      // 等待 exit 事件处理
    }
  }
  
  /**
   * 停止轮询
   */
  private stopPolling(instanceId: string): void {
    const interval = this.pollIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(instanceId);
    }
  }
  
  /**
   * 获取进程信息
   */
  getProcessInfo(instanceId: string): GameProcessInfo | undefined {
    return this.processes.get(instanceId);
  }
  
  /**
   * 获取所有运行中的进程
   */
  getRunningProcesses(): GameProcessInfo[] {
    return Array.from(this.processes.values())
      .filter(info => info.state === 'running' || info.state === 'launching');
  }
  
  /**
   * 获取输出日志
   */
  getOutput(instanceId: string): string[] {
    return this.outputCollectors.get(instanceId) || [];
  }
  
  /**
   * 获取完整输出字符串
   */
  getFullOutput(instanceId: string): string {
    return this.outputCollectors.get(instanceId)?.join('\n') || '';
  }
  
  /**
   * 终止游戏进程
   */
  async terminateProcess(instanceId: string): Promise<boolean> {
    const info = this.processes.get(instanceId);
    if (!info) return false;
    
    try {
      // 发送 SIGTERM 信号
      process.kill(info.pid, 'SIGTERM');
      
      // 等待 5 秒
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 如果还在运行，强制终止
      try {
        process.kill(info.pid, 0);
        process.kill(info.pid, 'SIGKILL');
      } catch {
        // 进程已经退出
      }
      
      return true;
    } catch (error: any) {
      log.error(`[WatcherService] 终止进程 ${instanceId} 失败:`, error.message);
      return false;
    }
  }
  
  /**
   * 清理进程记录
   */
  cleanup(instanceId: string): void {
    this.processes.delete(instanceId);
    this.outputCollectors.delete(instanceId);
    this.stopPolling(instanceId);
  }
  
  /**
   * 清理所有进程记录
   */
  cleanupAll(): void {
    for (const instanceId of this.processes.keys()) {
      this.cleanup(instanceId);
    }
  }
}

// 单例实例
let watcherService: WatcherService | null = null;

export function getWatcherService(): WatcherService {
  if (!watcherService) {
    watcherService = new WatcherService();
  }
  return watcherService;
}
