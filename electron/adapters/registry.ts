/**
 * 游戏适配器注册中心
 * 统一管理所有游戏适配器，支持后续扩展（Bedrock、其他游戏等）
 */

import type { IGameAdapter } from './IGameAdapter'
import { MinecraftJavaAdapter } from './minecraft-java.adapter'
import { logger } from '../utils/logger'
const log = logger.child('AdapterRegistry')

class AdapterRegistry {
  private adapters = new Map<string, IGameAdapter>()

  constructor() {
    // 注册内置适配器
    this.register(new MinecraftJavaAdapter())
  }

  /**
   * 注册一个游戏适配器
   */
  register(adapter: IGameAdapter): void {
    const { id } = adapter.gameInfo
    if (this.adapters.has(id)) {
      log.warn(`[AdapterRegistry] Overwriting adapter: ${id}`)
    }
    this.adapters.set(id, adapter)
    log.info(`[AdapterRegistry] Registered: ${id}`)
  }

  /**
   * 通过 gameId 获取适配器
   */
  get(gameId: string): IGameAdapter | undefined {
    return this.adapters.get(gameId)
  }

  /**
   * 获取适配器（不存在则抛出）
   */
  getOrThrow(gameId: string): IGameAdapter {
    const adapter = this.adapters.get(gameId)
    if (!adapter) {
      throw new Error(`[AdapterRegistry] No adapter found for gameId: ${gameId}`)
    }
    return adapter
  }

  /**
   * 获取所有已注册的游戏信息列表
   */
  listGames() {
    return Array.from(this.adapters.values()).map(a => a.gameInfo)
  }

  /**
   * 获取当前平台支持的适配器
   */
  getSupportedAdapters(): IGameAdapter[] {
    const platform: 'windows' | 'macos' | 'linux' = process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
        ? 'macos'
        : 'linux'

    return Array.from(this.adapters.values()).filter(
      a => a.gameInfo.supportedPlatforms.includes(platform)
    )
  }
}

// 单例导出
export const adapterRegistry = new AdapterRegistry()

// 便捷方法
export function getAdapter(gameId: string): IGameAdapter | undefined {
  return adapterRegistry.get(gameId)
}

export function getMinecraftAdapter(): IGameAdapter {
  return adapterRegistry.getOrThrow('minecraft-java')
}

export type { IGameAdapter }
