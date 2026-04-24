/**
 * 游戏适配器相关类型定义
 */

/**
 * 游戏信息
 */
export interface GameInfo {
  id: string;           // 游戏唯一标识（如 "minecraft-java"）
  name: string;         // 显示名称
  icon: string;         // 图标路径
  supportedPlatforms: ('windows' | 'macos' | 'linux')[];
}

/**
 * 游戏实例
 */
export interface GameInstance {
  id: string;
  gameId: string;       // 关联的游戏适配器 ID
  name: string;
  version: string;
  modLoader?: { type: 'forge' | 'fabric' | 'quilt' | 'neoforge'; version: string };
  gameDir: string;
  javaPath?: string;
  jvmArgs?: string;
  minMemory?: number;   // MB
  maxMemory?: number;   // MB
  createdAt: number;
  lastPlayedAt?: number;
}

/**
 * Java 信息
 */
export interface JavaInfo {
  path: string;
  version: string;
  architecture: 'x86' | 'x64' | 'arm64';
}

/**
 * Mod 加载器
 */
export type ModLoaderType = 'forge' | 'fabric' | 'quilt' | 'neoforge';

export interface ModLoader {
  type: ModLoaderType;
  name: string;
  supportedVersions: string[];
}

/**
 * 游戏版本
 */
export interface GameVersion {
  id: string;
  name: string;
  releaseTime: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
}

/**
 * 崩溃报告
 */
export interface CrashReport {
  version: string;
  timestamp: number;
  cause: string;
  stackTrace: string[];
  recommendedActions: string[];
}

/**
 * 游戏适配器接口
 */
export interface IGameAdapter {
  gameInfo: GameInfo;
  getVersions(): Promise<GameVersion[]>;
  installVersion(instance: GameInstance): Promise<void>;
  launchGame(instance: GameInstance, account: any): Promise<any>;
  detectJava(): Promise<JavaInfo[]>;
  getModLoaders(version: string): Promise<ModLoader[]>;
  parseCrashLog(logPath: string): Promise<CrashReport | null>;
  getDefaultGameDir(): string;
  resolveAssets?(instance: GameInstance): Promise<void>;
}

/**
 * IPC 通道类型安全约定
 */
export interface IpcChannels {
  'instance:list': { args: void; return: GameInstance[] };
  'instance:create': { args: Partial<GameInstance>; return: GameInstance };
  'instance:delete': { args: { id: string }; return: void };
  'account:list': { args: void; return: any[] };
  'account:login-microsoft': { args: void; return: any };
  'account:login-offline': { args: { username: string }; return: any };
  'download:search-mods': { args: { query: string; source: 'curseforge' | 'modrinth' }; return: any[] };
  'game:launch': { args: { instanceId: string; accountId: string }; return: void };
  'game:get-log': { args: { instanceId: string }; return: string };
  'java:detect': { args: void; return: JavaInfo[] };
  'modloader:get-loaders': { args: { minecraftVersion: string }; return: ModLoader[] };
  'modloader:install': { args: { instanceId: string; loaderType: ModLoaderType; loaderVersion: string; gameDir: string }; return: any };
  'modloader:get-status': { args: { instanceId: string }; return: any };
  'modloader:get-progress': { args: { instanceId: string }; return: any };
}