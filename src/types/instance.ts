/**
 * 游戏实例相关类型定义
 * 与 electron/services/instances.ts 的 Instance 接口对齐
 */

/** 实例加载器类型 */
export type LoaderType = 'vanilla' | 'forge' | 'fabric' | 'neoforge' | 'quilt'

/** 游戏实例 */
export interface GameInstance {
  id: string
  name: string
  path: string
  mcVersion: string          // MC 原版版本号
  loaderType: LoaderType     // 加载器类型
  loaderVersion: string      // 加载器版本号
  icon: string               // 实例图标路径 / base64
  javaPath: string           // Java 可执行文件路径
  jvmArgs: string            // JVM 额外参数
  minMemory: number          // 最小内存 (MB)
  maxMemory: number          // 最大内存 (MB)
  width: number              // 窗口宽度
  height: number             // 窗口高度
  fullscreen: 0 | 1          // 是否全屏
  isFavorited: 0 | 1         // 是否收藏
  lastPlayed: string | null  // 最后游玩时间 (ISO)
  playTime: number           // 总游玩时长（秒）
  createdAt: string
  updatedAt: string
}

/** 创建实例的参数（不需要服务端生成的字段） */
export interface CreateInstanceParams {
  id?: string
  name: string
  path: string
  mcVersion: string
  loaderType?: LoaderType
  loaderVersion?: string
  icon?: string
  javaPath?: string
  jvmArgs?: string
  minMemory?: number
  maxMemory?: number
  width?: number
  height?: number
}

/** 默认实例值 */
export const DEFAULT_INSTANCE: Omit<GameInstance, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '新实例',
  path: '',
  mcVersion: '1.20.1',
  loaderType: 'vanilla',
  loaderVersion: '',
  icon: '',
  javaPath: '',
  jvmArgs: '-Xmn128m',
  minMemory: 1024,
  maxMemory: 4096,
  width: 854,
  height: 480,
  fullscreen: 0,
  isFavorited: 0,
  lastPlayed: null,
  playTime: 0,
}
