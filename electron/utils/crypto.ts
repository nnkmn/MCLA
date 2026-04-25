/**
 * MCLA 加密工具
 *
 * 基于 Electron safeStorage 实现敏感数据加密存储：
 * - 账户令牌（refresh token / access token）
 * - 密码 / 敏感配置项
 *
 * safeStorage 使用操作系统级加密方案：
 *   Windows: DPAPI (Data Protection API)
 *   macOS: Keychain
 *   Linux: libsecret (GNOME Keyring / KWallet)
 */

import { safeStorage } from 'electron'

/**
 * 加密明文字符串
 * @param plainText 待加密的字符串
 * @returns 加密后的 Buffer（存入数据库或文件时用 toString('hex') 转换为字符串）
 * @throws 如果 safeStorage 不可用则抛出错误
 */
export function encrypt(plainText: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'safeStorage encryption is not available on this platform. '
      + 'Ensure the OS supports secure storage (DPAPI / Keychain / libsecret).'
    )
  }
  return safeStorage.encryptString(plainText)
}

/**
 * 解密加密的 Buffer
 * @param encrypted 加密的 Buffer 或 hex 字符串
 * @returns 解密后的原始明文
 * @throws 如果数据格式无效或解密失败则抛出错误
 */
export function decrypt(encrypted: Buffer | string): string {
  let buf: Buffer
  if (typeof encrypted === 'string') {
    buf = Buffer.from(encrypted, 'hex')
  } else {
    buf = encrypted
  }
  return safeStorage.decryptString(buf)
}

/**
 * 安全地加密并序列化为 hex 字符串（适合存入 SQLite TEXT 列）
 */
export function encryptToHex(plainText: string): string {
  return encrypt(plainText).toString('hex')
}

/**
 * 从 hex 字符串解密回明文
 */
export function decryptFromHex(hexString: string): string {
  return decrypt(Buffer.from(hexString, 'hex'))
}
