/**
 * P2P 分享核心服务
 *
 * 基于 PeerJS + WebRTC 实现实例分享的点对点传输。
 *
 * 架构：
 * - 分享端（Sender）：打包实例 → 启动 Peer → 生成分享码 → 等待连接 → 发送分片
 * - 接收端（Receiver）：输入分享码 → 连接 Peer → 请求分片 → 接收并组装 → 校验 MD5
 *
 * 协议：
 * - type:info - 文件元数据（Sender → Receiver）
 * - type:request-chunk - 请求分片（Receiver → Sender）
 * - type:chunk - 分片数据（Sender → Receiver）
 * - type:complete - 传输完成（Receiver → Sender）
 * - type:error - 错误信息（双向）
 */

import Peer, { type DataConnection } from 'peerjs'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { logger } from '../utils/logger'
import { hashFile } from '../utils/hash'
import type { PackedInstance } from './instanceSharePack.service'
import { getChunk } from './instanceSharePack.service'

const log = logger.child('p2pShare')

export interface ShareSession {
  sessionId: string
  shareCode: string
  type: 'sender' | 'receiver'
  status: 'idle' | 'waiting' | 'connecting' | 'transferring' | 'completed' | 'error'
  peerId?: string
  remotePeerId?: string
  packedInstance?: PackedInstance
  transferredChunks: number
  totalChunks: number
  startTime: number
  endTime?: number
  error?: string
}

export interface TransferProgress {
  sessionId: string
  transferredChunks: number
  totalChunks: number
  bytesPerSecond: number
  estimatedRemaining: number
}

type MessageType = 'info' | 'request-chunk' | 'chunk' | 'complete' | 'error'

interface P2PMessage {
  type: MessageType
  data?: unknown
}

interface InfoMessage extends P2PMessage {
  type: 'info'
  data: {
    instanceName: string
    mcVersion: string
    loaderType: string
    loaderVersion: string
    fileSize: number
    fileMd5: string
    totalChunks: number
    chunkSize: number
  }
}

interface RequestChunkMessage extends P2PMessage {
  type: 'request-chunk'
  data: {
    chunkIndex: number
  }
}

interface ChunkMessage extends P2PMessage {
  type: 'chunk'
  data: {
    chunkIndex: number
    buffer: ArrayBuffer
  }
}

interface CompleteMessage extends P2PMessage {
  type: 'complete'
  data: {
    receivedMd5: string
  }
}

interface ErrorMessage extends P2PMessage {
  type: 'error'
  data: {
    message: string
  }
}

const PEER_CONFIG = {
  host: 'peerjs-server.herokuapp.com',
  port: 443,
  path: '/',
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  }
}

const FALLBACK_PEER_CONFIGS = [
  {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    debug: 0
  }
]

const CONNECTION_TIMEOUT = 30000
const CHUNK_RETRY_COUNT = 3
const MAX_PEER_INIT_RETRIES = 2

class P2PShareService {
  private peer: Peer | null = null
  private senderSessions: Map<string, ShareSession> = new Map()
  private receiverSessions: Map<string, ShareSession> = new Map()
  private connections: Map<string, DataConnection> = new Map()
  private progressCallbacks: Map<string, (progress: TransferProgress) => void> = new Map()
  private statusCallbacks: Map<string, (session: ShareSession) => void> = new Map()
  private shareCodeToPeerId: Map<string, string> = new Map()

  generateShareCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private async createPeerWithRetry(preferredId?: string): Promise<Peer> {
    let lastError: Error | null = null

    const configs = [PEER_CONFIG, ...FALLBACK_PEER_CONFIGS]

    for (let retry = 0; retry <= MAX_PEER_INIT_RETRIES; retry++) {
      for (const config of configs) {
        try {
          const peer = new Peer(preferredId as string, {
            ...config,
            config: PEER_CONFIG.config
          })

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              peer.destroy()
              reject(new Error('Connection timeout'))
            }, CONNECTION_TIMEOUT)

            peer.on('open', () => {
              clearTimeout(timeout)
              resolve()
            })

            peer.on('error', (err) => {
              clearTimeout(timeout)
              reject(err)
            })
          })

          return peer
        } catch (e) {
          lastError = e as Error
          log.warn('Peer creation failed, trying next', {
            retry,
            host: config.host,
            error: lastError.message
          })
        }
      }
    }

    throw lastError || new Error('Failed to create peer connection')
  }

  private getTempReceiveDir(): string {
    const dir = path.join(app.getPath('temp'), 'mcla-receive')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return dir
  }

  async startShareSession(
    packedInstance: PackedInstance
  ): Promise<{ sessionId: string; shareCode: string; peerId: string }> {
    log.info('Starting share session', { instanceId: packedInstance.instanceId })

    const sessionId = `sender_${Date.now()}`
    const shareCode = this.generateShareCode()

    try {
      const peer = await this.createPeerWithRetry()
      const peerId = peer.id

      this.shareCodeToPeerId.set(shareCode, peerId)

      const session: ShareSession = {
        sessionId,
        shareCode,
        type: 'sender',
        status: 'waiting',
        peerId,
        packedInstance,
        transferredChunks: 0,
        totalChunks: packedInstance.totalChunks,
        startTime: Date.now()
      }

      this.senderSessions.set(sessionId, session)
      this.peer = peer

      peer.on('connection', (conn) => {
        this.handleSenderConnection(sessionId, conn, packedInstance)
      })

      peer.on('error', (err) => {
        log.error('Peer error', err)
        this.updateSessionStatus(sessionId, 'error', err.message)
      })

      peer.on('disconnected', () => {
        log.warn('Peer disconnected, attempting to reconnect', { sessionId })
        this.updateSessionStatus(sessionId, 'error', '连接已断开，请重试')
      })

      log.info('Share session started', { sessionId, peerId, shareCode })
      return { sessionId, shareCode, peerId }
    } catch (e: any) {
      log.error('Failed to start share session', e)
      throw new Error(`启动分享失败: ${e.message || '请检查网络连接'}`)
    }
  }

  private handleSenderConnection(
    sessionId: string,
    conn: DataConnection,
    packedInstance: PackedInstance
  ): void {
    log.info('New connection to sender', { sessionId, remotePeer: conn.peer })

    const session = this.senderSessions.get(sessionId)
    if (!session) return

    this.connections.set(sessionId, conn)
    this.updateSessionStatus(sessionId, 'connecting')

    conn.on('open', () => {
      log.info('Sender connection opened', { sessionId })
      this.updateSessionStatus(sessionId, 'transferring')

      const infoMsg: InfoMessage = {
        type: 'info',
        data: {
          instanceName: packedInstance.instanceName,
          mcVersion: packedInstance.mcVersion,
          loaderType: packedInstance.loaderType,
          loaderVersion: packedInstance.loaderVersion,
          fileSize: packedInstance.fileSize,
          fileMd5: packedInstance.fileMd5,
          totalChunks: packedInstance.totalChunks,
          chunkSize: packedInstance.chunkSize
        }
      }
      conn.send(infoMsg)
    })

    conn.on('data', (data: unknown) => {
      this.handleSenderMessage(sessionId, conn, data as P2PMessage, packedInstance)
    })

    conn.on('close', () => {
      log.info('Sender connection closed', { sessionId })
    })

    conn.on('error', (err) => {
      log.error('Sender connection error', sessionId, err)
      this.updateSessionStatus(sessionId, 'error', err.message)
    })
  }

  private handleSenderMessage(
    sessionId: string,
    conn: DataConnection,
    msg: P2PMessage,
    packedInstance: PackedInstance
  ): void {
    const session = this.senderSessions.get(sessionId)
    if (!session) return

    switch (msg.type) {
      case 'request-chunk': {
        const { chunkIndex } = (msg as RequestChunkMessage).data

        try {
          const chunkBuffer = getChunk(
            packedInstance.filePath,
            chunkIndex,
            packedInstance.chunkSize
          )

          const chunkMsg: ChunkMessage = {
            type: 'chunk',
            data: {
              chunkIndex,
              buffer: chunkBuffer.buffer.slice(
                chunkBuffer.byteOffset,
                chunkBuffer.byteOffset + chunkBuffer.length
              ) as ArrayBuffer
            }
          }

          conn.send(chunkMsg)

          session.transferredChunks = chunkIndex + 1
          this.notifyProgress(sessionId)

          if (chunkIndex + 1 >= packedInstance.totalChunks) {
            log.info('All chunks sent', { sessionId })
          }
        } catch (e) {
          log.error('Failed to send chunk', { sessionId, chunkIndex }, e)
          const errMsg: ErrorMessage = {
            type: 'error',
            data: { message: `分片 ${chunkIndex} 发送失败` }
          }
          conn.send(errMsg)
        }
        break
      }

      case 'complete': {
        log.info('Receiver confirmed completion', { sessionId })
        this.updateSessionStatus(sessionId, 'completed')
        break
      }

      case 'error': {
        const errData = (msg as ErrorMessage).data
        log.error('Receiver reported error', { sessionId, error: errData.message })
        this.updateSessionStatus(sessionId, 'error', errData.message)
        break
      }
    }
  }

  async startReceiveSession(
    shareCode: string,
    senderPeerId?: string
  ): Promise<{ sessionId: string; peerId: string }> {
    log.info('Starting receive session', { shareCode })

    const sessionId = `receiver_${Date.now()}`

    try {
      const peer = await this.createPeerWithRetry()
      const peerId = peer.id

      const session: ShareSession = {
        sessionId,
        shareCode,
        type: 'receiver',
        status: 'connecting',
        peerId,
        transferredChunks: 0,
        totalChunks: 0,
        startTime: Date.now()
      }

      this.receiverSessions.set(sessionId, session)
      this.peer = peer

      peer.on('error', (err) => {
        log.error('Peer error (receiver)', err)
        this.updateSessionStatus(sessionId, 'error', err.message)
      })

      peer.on('disconnected', () => {
        log.warn('Receiver peer disconnected', { sessionId })
        this.updateSessionStatus(sessionId, 'error', '连接已断开，请重试')
      })

      const targetPeerId = senderPeerId || this.shareCodeToPeerId.get(shareCode) || shareCode
      log.info('Connecting to sender', { targetPeerId, shareCode })

      const conn = peer.connect(targetPeerId, { reliable: true, serialization: 'binary' })
      this.connections.set(sessionId, conn)

      let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
        if (session.status === 'connecting') {
          log.warn('Connection timeout, attempting to retry', { sessionId })
          this.updateSessionStatus(sessionId, 'error', '连接超时，请确保分享码正确且分享者在线')
        }
      }, CONNECTION_TIMEOUT)

      conn.on('open', () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout)
          connectionTimeout = null
        }
        log.info('Receiver connection opened', { sessionId })
        this.updateSessionStatus(sessionId, 'transferring')
      })

      conn.on('data', (data: unknown) => {
        this.handleReceiverMessage(sessionId, conn, data as P2PMessage)
      })

      conn.on('close', () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout)
          connectionTimeout = null
        }
        log.info('Receiver connection closed', { sessionId })
      })

      conn.on('error', (err) => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout)
          connectionTimeout = null
        }
        log.error('Receiver connection error', sessionId, err)
        this.updateSessionStatus(sessionId, 'error', err.message || '连接失败，请检查网络')
      })

      log.info('Receive session initialized', { sessionId, peerId })
      return { sessionId, peerId }
    } catch (e: any) {
      log.error('Failed to start receive session', e)
      throw new Error(`连接失败: ${e.message || '请检查网络连接'}`)
    }
  }

  private fileInfo: Map<
    string,
    {
      instanceName: string
      mcVersion: string
      loaderType: string
      loaderVersion: string
      fileSize: number
      fileMd5: string
      totalChunks: number
      chunkSize: number
      tempFilePath: string
      receivedChunks: Set<number>
    }
  > = new Map()

  private handleReceiverMessage(
    sessionId: string,
    conn: DataConnection,
    msg: P2PMessage
  ): void {
    const session = this.receiverSessions.get(sessionId)
    if (!session) return

    switch (msg.type) {
      case 'info': {
        const info = (msg as InfoMessage).data
        const tempDir = this.getTempReceiveDir()
        const tempFilePath = path.join(tempDir, `${sessionId}.mcla.tmp`)

        this.fileInfo.set(sessionId, {
          instanceName: info.instanceName,
          mcVersion: info.mcVersion,
          loaderType: info.loaderType,
          loaderVersion: info.loaderVersion,
          fileSize: info.fileSize,
          fileMd5: info.fileMd5,
          totalChunks: info.totalChunks,
          chunkSize: info.chunkSize,
          tempFilePath,
          receivedChunks: new Set()
        })

        session.totalChunks = info.totalChunks
        log.info('Received file info', { sessionId, totalChunks: info.totalChunks })

        this.requestNextChunk(sessionId, conn, 0)
        break
      }

      case 'chunk': {
        const { chunkIndex, buffer } = (msg as ChunkMessage).data
        const info = this.fileInfo.get(sessionId)
        if (!info) return

        try {
          const fd = fs.openSync(info.tempFilePath, 'a')
          const nodeBuffer = Buffer.from(buffer)
          fs.writeSync(fd, nodeBuffer, 0, nodeBuffer.length, chunkIndex * info.chunkSize)
          fs.closeSync(fd)

          info.receivedChunks.add(chunkIndex)
          session.transferredChunks = info.receivedChunks.size
          this.notifyProgress(sessionId)

          const nextChunk = chunkIndex + 1
          if (nextChunk < info.totalChunks) {
            this.requestNextChunk(sessionId, conn, nextChunk)
          } else {
            this.verifyAndComplete(sessionId, conn)
          }
        } catch (e) {
          log.error('Failed to write chunk', { sessionId, chunkIndex }, e)
          const errMsg: ErrorMessage = {
            type: 'error',
            data: { message: `分片 ${chunkIndex} 写入失败` }
          }
          conn.send(errMsg)
          this.updateSessionStatus(sessionId, 'error', `分片 ${chunkIndex} 写入失败`)
        }
        break
      }

      case 'error': {
        const errData = (msg as ErrorMessage).data
        log.error('Sender reported error', { sessionId, error: errData.message })
        this.updateSessionStatus(sessionId, 'error', errData.message)
        break
      }
    }
  }

  private requestNextChunk(sessionId: string, conn: DataConnection, chunkIndex: number): void {
    const msg: RequestChunkMessage = {
      type: 'request-chunk',
      data: { chunkIndex }
    }
    conn.send(msg)
  }

  private async verifyAndComplete(sessionId: string, conn: DataConnection): Promise<void> {
    const info = this.fileInfo.get(sessionId)
    if (!info) return

    log.info('Verifying received file', { sessionId })

    try {
      const receivedMd5 = await hashFile(info.tempFilePath, 'md5')

      if (receivedMd5.toLowerCase() !== info.fileMd5.toLowerCase()) {
        throw new Error('MD5 校验失败')
      }

      const completeMsg: CompleteMessage = {
        type: 'complete',
        data: { receivedMd5 }
      }
      conn.send(completeMsg)

      this.updateSessionStatus(sessionId, 'completed')
      log.info('Receive session completed successfully', { sessionId })
    } catch (e) {
      log.error('Verification failed', { sessionId }, e)
      const errMsg: ErrorMessage = {
        type: 'error',
        data: { message: '文件校验失败' }
      }
      conn.send(errMsg)
      this.updateSessionStatus(sessionId, 'error', '文件校验失败')
    }
  }

  private updateSessionStatus(
    sessionId: string,
    status: ShareSession['status'],
    error?: string
  ): void {
    let session = this.senderSessions.get(sessionId) || this.receiverSessions.get(sessionId)
    if (!session) return

    session = { ...session, status }
    if (error) {
      session.error = error
    }
    if (status === 'completed' || status === 'error') {
      session.endTime = Date.now()
    }

    if (this.senderSessions.has(sessionId)) {
      this.senderSessions.set(sessionId, session)
    } else {
      this.receiverSessions.set(sessionId, session)
    }

    const callback = this.statusCallbacks.get(sessionId)
    if (callback) {
      callback(session)
    }
  }

  private notifyProgress(sessionId: string): void {
    const session = this.senderSessions.get(sessionId) || this.receiverSessions.get(sessionId)
    if (!session) return

    const elapsed = (Date.now() - session.startTime) / 1000
    const bytesPerSecond = elapsed > 0 ? (session.transferredChunks * 1024 * 1024) / elapsed : 0

    const remainingChunks = session.totalChunks - session.transferredChunks
    const estimatedRemaining =
      bytesPerSecond > 0 ? (remainingChunks * 1024 * 1024) / bytesPerSecond : 0

    const progress: TransferProgress = {
      sessionId,
      transferredChunks: session.transferredChunks,
      totalChunks: session.totalChunks,
      bytesPerSecond,
      estimatedRemaining
    }

    const callback = this.progressCallbacks.get(sessionId)
    if (callback) {
      callback(progress)
    }
  }

  getSession(sessionId: string): ShareSession | undefined {
    return this.senderSessions.get(sessionId) || this.receiverSessions.get(sessionId)
  }

  getReceivedFilePath(sessionId: string): string | undefined {
    return this.fileInfo.get(sessionId)?.tempFilePath
  }

  getReceivedFileInfo(sessionId: string) {
    const info = this.fileInfo.get(sessionId)
    if (!info) return undefined
    return {
      instanceName: info.instanceName,
      mcVersion: info.mcVersion,
      loaderType: info.loaderType,
      loaderVersion: info.loaderVersion,
      filePath: info.tempFilePath,
      fileMd5: info.fileMd5
    }
  }

  onProgress(sessionId: string, callback: (progress: TransferProgress) => void): void {
    this.progressCallbacks.set(sessionId, callback)
  }

  onStatusChange(sessionId: string, callback: (session: ShareSession) => void): void {
    this.statusCallbacks.set(sessionId, callback)
  }

  closeSession(sessionId: string): void {
    log.info('Closing session', { sessionId })

    const conn = this.connections.get(sessionId)
    if (conn) {
      try {
        conn.close()
      } catch {
        // ignore
      }
      this.connections.delete(sessionId)
    }

    const receiverSession = this.receiverSessions.get(sessionId)
    if (receiverSession) {
      const info = this.fileInfo.get(sessionId)
      if (info?.tempFilePath && fs.existsSync(info.tempFilePath)) {
        try {
          fs.unlinkSync(info.tempFilePath)
        } catch {
          // ignore
        }
      }
      this.fileInfo.delete(sessionId)
      this.receiverSessions.delete(sessionId)
    }

    const senderSession = this.senderSessions.get(sessionId)
    if (senderSession?.shareCode) {
      this.shareCodeToPeerId.delete(senderSession.shareCode)
    }

    this.senderSessions.delete(sessionId)
    this.progressCallbacks.delete(sessionId)
    this.statusCallbacks.delete(sessionId)

    if (this.peer && this.senderSessions.size === 0 && this.receiverSessions.size === 0) {
      try {
        this.peer.destroy()
      } catch {
        // ignore
      }
      this.peer = null
    }

    log.info('Session closed', { sessionId })
  }

  closeAllSessions(): void {
    for (const sessionId of [...this.senderSessions.keys(), ...this.receiverSessions.keys()]) {
      this.closeSession(sessionId)
    }
  }
}

export const p2pShareService = new P2PShareService()
