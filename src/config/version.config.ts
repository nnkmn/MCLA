export interface VersionInfo {
  id: string
  description: string
  featured?: boolean
}

export interface VersionTypeColors {
  release: string
  snapshot: string
  old_alpha: string
  old_beta: string
  april: string
}

export const versionTypeColors: VersionTypeColors = {
  release: '#4CAF50',
  snapshot: '#FF9800',
  old_alpha: '#78909C',
  old_beta: '#78909C',
  april: '#E91E63'
}

export const featuredVersions: string[] = [
  '1.21.4',
  '1.21.3',
  '1.20.4',
  '1.20.1',
  '1.19.2',
  '1.18.2',
  '1.16.5',
  '1.12.2'
]

export const versionDescriptions: Record<string, string> = {
  '1.21.4': '花园与密林更新',
  '1.21.3': 'Bundles of Bravery',
  '1.21.2': '错误修复更新',
  '1.21.1': '错误修复更新',
  '1.21': '棘巧试炼',
  '1.20.6': '错误修复更新',
  '1.20.4': '错误修复更新',
  '1.20.3': '主要更新',
  '1.20.2': '主要更新',
  '1.20.1': '足迹与故事',
  '1.19.4': '主要更新',
  '1.19.3': '深暗古城更新',
  '1.19.2': '荒野更新',
  '1.19.1': '错误修复更新',
  '1.19': '荒野更新',
  '1.18.2': '洞穴与悬崖 Part 2',
  '1.18.1': '主要更新',
  '1.18': '洞穴与悬崖 Part 1',
  '1.17.1': '主要更新',
  '1.17': '洞穴与悬崖 Part 1',
  '1.16.5': '主要更新',
  '1.16.4': '主要更新',
  '1.16.3': '主要更新',
  '1.16.2': '主要更新',
  '1.16.1': '主要更新',
  '1.16': '下界更新',
  '1.15.2': '蜜蜂更新',
  '1.15.1': '主要更新',
  '1.15': '蜜蜂更新',
  '1.14.4': '主要更新',
  '1.14.3': '主要更新',
  '1.14.2': '主要更新',
  '1.14.1': '主要更新',
  '1.14': '村庄与掠夺',
  '1.13.2': '水域更新',
  '1.13.1': '主要更新',
  '1.13': '水域更新',
  '1.12.2': '缤纷更新',
  '1.12.1': '主要更新',
  '1.12': '缤纷更新',
  '1.11.2': '主要更新',
  '1.11.1': '主要更新',
  '1.11': '探险时间',
  '1.10.2': '主要更新',
  '1.10.1': '主要更新',
  '1.10': '主要更新',
  '1.9.4': 'Combat Update',
  '1.9.3': '主要更新',
  '1.9.2': '主要更新',
  '1.9.1': '主要更新',
  '1.9': 'Combat Update',
  '1.8.9': '重要更新',
  '1.8.8': '主要更新',
  '1.8.7': '主要更新',
  '1.8.6': '主要更新',
  '1.8.5': '主要更新',
  '1.8.4': '主要更新',
  '1.8.3': '主要更新',
  '1.8.2': '主要更新',
  '1.8.1': '主要更新',
  '1.8': '重要更新',
  '1.7.10': '改变世界的更新',
  '1.7.9': '主要更新',
  '1.7.8': '主要更新',
  '1.7.7': '主要更新',
  '1.7.6': '主要更新',
  '1.7.5': '主要更新',
  '1.7.4': '主要更新',
  '1.7.2': '改变世界的更新'
}

export function isFeaturedVersion(id: string, type: string): boolean {
  return type === 'release' && featuredVersions.includes(id)
}

export function getVersionDesc(id: string): string {
  return versionDescriptions[id] || ''
}

export function getVersionTypeColor(type: string): string {
  return versionTypeColors[type as keyof VersionTypeColors] || '#4CAF50'
}
