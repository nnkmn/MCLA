/**
 * MCLA 文件校验工具
 *
 * 提供 SHA1 / MD5 哈希计算，用于：
 * - 下载完成后验证文件完整性
 * - Mod / 资源包校验和对比
 * - 游戏库文件完整性检查
 *
 * 纯 Node.js crypto 实现，无外部依赖。
 */

import { createHash } from 'crypto'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

type HashAlgorithm = 'sha1' | 'md5' | 'sha256' | 'sha512'

/**
 * 计算文件的哈希值（流式读取，支持大文件）
 * @param filePath 文件绝对路径
 * @param algorithm 哈希算法（默认 sha1）
 * @param onProgress 可选进度回调 (0~1)
 * @returns 小写十六进制哈希字符串
 */
export async function hashFile(
  filePath: string,
  algorithm: HashAlgorithm = 'sha1',
  onProgress?: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm)
    const stream = createReadStream(filePath)

    let totalBytes = 0
    try {
      totalBytes = statSync(filePath).size
    } catch {
      totalBytes = 0
    }
    let loadedBytes = 0

    stream.on('data', (chunk) => {
      hash.update(chunk)
      loadedBytes += chunk.length
      if (onProgress && totalBytes > 0) {
        onProgress(Math.min(loadedBytes / totalBytes, 1))
      }
    })

    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    stream.on('error', (err) => {
      reject(new Error(`Failed to hash file "${filePath}": ${err.message}`))
    })
  })
}

/**
 * 同步计算小文件的哈希值（< 10MB 推荐）
 * 注意：大文件使用此方法会占用较多内存
 */
export function hashFileSync(filePath: string, algorithm: HashAlgorithm = 'sha1'): string {
  const { readFileSync } = require('fs')
  const data = readFileSync(filePath)
  return createHash(algorithm).update(data).digest('hex')
}

/**
 * 计算字符串的哈希值
 */
export function hashString(text: string, algorithm: HashAlgorithm = 'sha1'): string {
  return createHash(algorithm).update(text, 'utf8').digest('hex')
}

/**
 * 验证文件哈希是否匹配预期值
 * @returns true=匹配, false=不匹配
 */
export async function verifyFileHash(
  filePath: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'sha1',
): Promise<boolean> {
  try {
    const actual = await hashFile(filePath, algorithm)
    return actual.toLowerCase() === expectedHash.toLowerCase()
  } catch {
    return false
  }
}
