/**
 * 皮肤管理服务
 * 下载并缓存 Minecraft 玩家皮肤到本地
 */
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import axios, { type AxiosError } from 'axios'
import { logger } from '../utils/logger'

const SKIN_DIR = join(app.getPath('userData'), 'skins')

// 确保皮肤目录存在
function ensureSkinDir() {
  if (!existsSync(SKIN_DIR)) {
    mkdirSync(SKIN_DIR, { recursive: true })
    logger.info('SkinService', `创建皮肤目录: ${SKIN_DIR}`)
  }
}

/**
 * 下载皮肤到本地并返回本地路径
 * @param skinUrl Minecraft 官方皮肤 URL
 * @param uuid 玩家 UUID（用于命名文件）
 * @returns 本地皮肤文件路径，或 null 如果下载失败
 */
export async function downloadSkin(skinUrl: string, uuid: string): Promise<string | null> {
  if (!skinUrl) return null

  ensureSkinDir()

  const localPath = join(SKIN_DIR, `${uuid}.png`)

  // 已存在则直接返回
  if (existsSync(localPath)) {
    logger.info('SkinService', `皮肤已存在: ${localPath}`)
    return localPath
  }

  // 统一使用 HTTPS
  let url = skinUrl
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://')
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/png,image/*,*/*',
    'Referer': 'https://www.minecraft.net/',
  }

  try {
    logger.info('SkinService', `下载皮肤: ${url}`)
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers,
      // 跟随重定向
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
    })

    if (!response.data || (response.data as Buffer).length === 0) {
      logger.error('SkinService', '皮肤文件为空')
      return null
    }

    writeFileSync(localPath, Buffer.from(response.data))
    logger.info('SkinService', `皮肤保存成功: ${localPath}`)
    return localPath
  } catch (e: unknown) {
    const err = e as AxiosError
    const status = err.response?.status
    logger.error('SkinService', `皮肤下载失败 [${status}]: ${err.message}`)
    return null
  }
}

/**
 * 获取皮肤本地路径（file:// 协议）
 * @param uuid 玩家 UUID
 * @returns file:// URL 或 null
 */
export function getSkinPath(uuid: string): string | null {
  const localPath = join(SKIN_DIR, `${uuid}.png`)
  return existsSync(localPath) ? `file://${localPath.replace(/\\/g, '/')}` : null
}
