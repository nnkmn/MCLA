/**
 * Mod 相关类型定义
 */

/** 本地 Mod 文件状态 */
export type LocalModStatus = 'active' | 'disabled' | 'incompatible' | 'error'

/** 本地已安装的 Mod */
export interface LocalMod {
  id: string
  fileName: string                // 原始文件名
  displayName: string             // 显示名称（从文件元数据解析）
  version: string                 // Mod 版本
  description: string
  author: string
  instanceId: string              // 所属实例 ID
  status: LocalModStatus           // 启用/禁用状态
  filePath: string                 // 文件绝对路径
  fileSize: number                 // 字节
  dependencies: string[]           // 依赖的 Mod ID 列表
  dependsOn: string[]              // 被哪些 Mod 依赖
  installedAt: string              // 安装时间 (ISO)
}

/** Mod 依赖信息 */
export interface ModDependency {
  projectId: string               // 依赖的项目 ID
  projectName: string              // 项目名称（用于展示）
  versionRange: string             // 版本范围约束（如 ">=1.0.0"）
  isRequired: boolean              // true = 硬依赖, false = 可选
  installed: boolean               // 是否已安装
}

/** 实例 Mod 概览 */
export interface InstanceModOverview {
  instanceId: string
  totalMods: number
  activeMods: number
  disabledMods: number
  hasConflicts: boolean
  missingDependencies: ModDependency[]
}
