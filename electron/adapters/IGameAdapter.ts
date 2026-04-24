/**
 * 游戏适配器接口定义
 * 所有游戏（MC Java / Bedrock 等）必须实现此接口
 */

import type {
  GameInfo,
  GameInstance,
  GameVersion,
  JavaInfo,
  ModLoader,
  CrashReport,
} from '../types/adapter.types'

export interface IGameAdapter {
  /** 游戏基础信息 */
  readonly gameInfo: GameInfo

  /**
   * 获取可用版本列表
   */
  getVersions(): Promise<GameVersion[]>

  /**
   * 安装指定版本到实例目录
   */
  installVersion(instance: GameInstance): Promise<void>

  /**
   * 启动游戏
   * @returns 进程 PID 或状态对象
   */
  launchGame(instance: GameInstance, account: unknown): Promise<unknown>

  /**
   * 检测本机已安装的 Java
   */
  detectJava(): Promise<JavaInfo[]>

  /**
   * 获取支持该 MC 版本的 ModLoader 列表
   */
  getModLoaders(minecraftVersion: string): Promise<ModLoader[]>

  /**
   * 解析崩溃日志
   */
  parseCrashLog(logPath: string): Promise<CrashReport | null>

  /**
   * 返回该游戏的默认数据目录
   */
  getDefaultGameDir(): string

  /**
   * （可选）预解析/修复资源文件
   */
  resolveAssets?(instance: GameInstance): Promise<void>
}

export type { GameInfo, GameInstance, GameVersion, JavaInfo, ModLoader, CrashReport }
