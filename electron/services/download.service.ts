import {
  createWriteStream,
  mkdirSync,
  existsSync,
  statSync,
  unlinkSync,
  openSync,
  closeSync,
  writeSync,
  readSync
} from 'fs'
import { dirname, basename, join } from 'path'
import { EventEmitter } from 'events'
import Database from 'better-sqlite3'
import type { DownloadTask, DownloadChunk } from '../types/download.types'
export type { DownloadTask } from '../types/download.types'
import { logger } from '../utils/logger'
const log = logger.child('Download')

const BMCLAPI_MIRRORS = [
  { name: '官方', url: 'https://bmclapi2.bangbang93.com', ping: 0 },
  { name: '阿里云', url: 'https://bmclapi.akarin.dev', ping: 0 },
  { name: '自建', url: 'https://download.mcbbs.net', ping: 0 }
]



export class DownloadService extends EventEmitter {
  private tasks: Map<string, DownloadTask> = new Map()
  private activeDownloads: Map<string, AbortController[]> = new Map()
  private maxConcurrent = 4
  private maxThreadsPerFile = 8
  private db: Database.Database | null = null
  private currentMirror = BMCLAPI_MIRRORS[0]
  private speedLimit = 0
  private maxRetries = 5
  private chunkSize = 1024 * 1024 * 4

  constructor(db?: Database.Database) {
    super()
    if (db) this.db = db
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max
  }

  setMaxThreadsPerFile(max: number): void {
    this.maxThreadsPerFile = max
  }

  setSpeedLimit(limitBytesPerSec: number): void {
    this.speedLimit = limitBytesPerSec
  }

  setMaxRetries(max: number): void {
    this.maxRetries = max
  }

  getMirrors() {
    return BMCLAPI_MIRRORS
  }

  getCurrentMirror() {
    return this.currentMirror
  }

  setMirror(index: number): void {
    if (index >= 0 && index < BMCLAPI_MIRRORS.length) {
      this.currentMirror = BMCLAPI_MIRRORS[index]
      log.info(`[Download] Mirror set to: ${this.currentMirror.name}`)
    }
  }

  async testMirrorSpeed(): Promise<Array<{ name: string; url: string; ping: number }>> {
    const results = []
    for (const mirror of BMCLAPI_MIRRORS) {
      try {
        const start = Date.now()
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        await fetch(`${mirror.url}/mc/game/version_manifest.json`, {
          signal: controller.signal,
          method: 'HEAD'
        })
        clearTimeout(timeout)
        mirror.ping = Date.now() - start
      } catch {
        mirror.ping = 9999
      }
      results.push({ name: mirror.name, url: mirror.url, ping: mirror.ping })
    }
    return results
  }

  async selectFastestMirror(): Promise<number> {
    const results = await this.testMirrorSpeed()
    const fastest = results.reduce((prev, curr) => (curr.ping < prev.ping ? curr : prev))
    const index = BMCLAPI_MIRRORS.findIndex((m) => m.url === fastest.url)
    if (index >= 0) {
      this.setMirror(index)
    }
    return index
  }

  replaceWithMirror(url: string): string {
    for (const mirror of BMCLAPI_MIRRORS) {
      if (url.includes('bmclapi')) {
        return url.replace(/https?:\/\/[^/]+/, mirror.url)
      }
    }
    return url
  }

  async addDownload(
    url: string,
    destination: string,
    options?: { useMirror?: boolean; threads?: number }
  ): Promise<DownloadTask> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const useMirror = options?.useMirror ?? true
    const finalUrl = useMirror ? this.replaceWithMirror(url) : url

    const task: DownloadTask = {
      id,
      url: finalUrl,
      originalUrl: url,
      destination,
      fileName: basename(destination),
      totalSize: 0,
      downloadedSize: 0,
      status: 'pending',
      speed: 0,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      threads: options?.threads || this.maxThreadsPerFile,
      chunks: [],
      useMirror
    }

    this.tasks.set(id, task)
    this.emit('task:added', task)
    this.saveTaskToDb(task)

    if (this.activeDownloads.size < this.maxConcurrent) {
      this.startDownload(task)
    }

    return task
  }

  private async startDownload(task: DownloadTask): Promise<void> {
    task.status = 'downloading'
    task.updatedAt = new Date()
    this.emit('task:started', task)

    const tempFile = `${task.destination}.tmp`
    const resumeFile = `${task.destination}.resume`

    try {
      mkdirSync(dirname(task.destination), { recursive: true })

      if (existsSync(resumeFile) && existsSync(tempFile)) {
        log.info(`[Download] Resuming download: ${task.fileName}`)
        this.loadResumeData(task, resumeFile)
      } else {
        await this.initChunks(task)
      }

      if ((task.chunks?.length ?? 0) === 0) {
        await this.downloadSingleThread(task, tempFile)
      } else {
        await this.downloadMultiThread(task, tempFile)
      }

      if (existsSync(tempFile)) {
        const stats = statSync(tempFile)
        if (task.totalSize > 0 && stats.size === task.totalSize) {
          if (existsSync(task.destination)) {
            unlinkSync(task.destination)
          }
          require('fs').renameSync(tempFile, task.destination)
          if (existsSync(resumeFile)) {
            unlinkSync(resumeFile)
          }
          task.status = 'completed'
          task.progress = 100
          task.downloadedSize = task.totalSize
          task.updatedAt = new Date()
          this.emit('task:completed', task)
          this.updateTaskInDb(task)
          log.info(`[Download] Completed: ${task.fileName}`)
        } else {
          throw new Error(`File size mismatch: expected ${task.totalSize}, got ${stats.size}`)
        }
      } else {
        throw new Error('Temp file not found')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        task.status = 'cancelled'
        this.emit('task:cancelled', task)
      } else {
        task.status = 'error'
        task.error = err.message
        this.emit('task:error', task)
        log.error(`[Download] Error ${task.fileName}:`, err.message)
      }
      this.updateTaskInDb(task)
    } finally {
      this.activeDownloads.delete(task.id)
      task.updatedAt = new Date()
      this.processQueue()
    }
  }

  private async initChunks(task: DownloadTask): Promise<void> {
    try {
      const response = await fetch(task.url, { method: 'HEAD' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const acceptRanges = response.headers.get('accept-ranges')

      task.totalSize = contentLength ? parseInt(contentLength, 10) : 0

      if (acceptRanges === 'bytes' && task.totalSize > this.chunkSize * 2) {
        const chunkCount = Math.min(
          task.threads || this.maxThreadsPerFile,
          Math.ceil(task.totalSize / this.chunkSize)
        )
        const actualChunkSize = Math.ceil(task.totalSize / chunkCount)

        task.chunks = []
        for (let i = 0; i < chunkCount; i++) {
          task.chunks.push({
            index: i,
            start: i * actualChunkSize,
            end: Math.min((i + 1) * actualChunkSize - 1, task.totalSize - 1),
            downloaded: 0,
            status: 'pending',
            retries: 0
          })
        }
        log.info(`[Download] Using ${chunkCount} threads for ${task.fileName}`)
      } else {
        task.chunks = []
        log.info(`[Download] Using single thread for ${task.fileName}`)
      }
    } catch (err: any) {
      log.warn(`[Download] Failed to get file info, using single thread:`, err.message)
      task.chunks = []
    }
  }

  private loadResumeData(task: DownloadTask, resumeFile: string): void {
    try {
      const data = require('fs').readFileSync(resumeFile, 'utf8')
      const resume = JSON.parse(data)
      task.totalSize = resume.totalSize
      task.chunks = resume.chunks ?? []
      task.downloadedSize = resume.downloadedSize || 0
      log.info(`[Download] Resume data loaded: ${task.chunks.length} chunks`)
    } catch (err: any) {
      log.warn(`[Download] Failed to load resume data:`, err.message)
      task.chunks = []
    }
  }

  private saveResumeData(task: DownloadTask, resumeFile: string): void {
    try {
      const data = JSON.stringify({
        totalSize: task.totalSize,
        chunks: task.chunks,
        downloadedSize: task.downloadedSize
      })
      require('fs').writeFileSync(resumeFile, data)
    } catch (err: any) {
      log.warn(`[Download] Failed to save resume data:`, err.message)
    }
  }

  private async downloadSingleThread(task: DownloadTask, tempFile: string): Promise<void> {
    const controller = new AbortController()
    this.activeDownloads.set(task.id, [controller])

    let start = 0
    if (existsSync(tempFile)) {
      const stats = statSync(tempFile)
      start = stats.size
      task.downloadedSize = start
    }

    const headers: Record<string, string> = {}
    if (start > 0) {
      headers['Range'] = `bytes=${start}-`
    }

    const response = await fetch(task.url, {
      signal: controller.signal,
      headers
    })

    if (!response.ok && response.status !== 206) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (task.totalSize === 0) {
      const contentLength = response.headers.get('content-length')
      task.totalSize = contentLength ? parseInt(contentLength, 10) + start : 0
    }

    const writer = createWriteStream(tempFile, { flags: start > 0 ? 'a' : 'w' })
    const reader = response.body!.getReader()
    const startTime = Date.now()
    let lastSave = Date.now()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (this.speedLimit > 0) {
        const elapsed = Date.now() - startTime
        const expectedBytes = (this.speedLimit * elapsed) / 1000
        if (task.downloadedSize > expectedBytes) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      writer.write(value)
      task.downloadedSize += value.length
      task.progress = task.totalSize > 0 ? (task.downloadedSize / task.totalSize) * 100 : 0
      task.speed = task.downloadedSize / ((Date.now() - startTime) / 1000)
      task.updatedAt = new Date()
      this.emit('task:progress', task)

      if (Date.now() - lastSave > 2000) {
        this.updateTaskInDb(task)
        lastSave = Date.now()
      }
    }

    writer.end()
    await new Promise<void>((resolve) => writer.on('finish', () => resolve()))
  }

  private async downloadMultiThread(task: DownloadTask, tempFile: string): Promise<void> {
    const controllers: AbortController[] = []
    this.activeDownloads.set(task.id, controllers)

    if (!existsSync(tempFile)) {
      const fd = openSync(tempFile, 'w')
      if (task.totalSize > 0) {
        writeSync(fd, Buffer.alloc(1), 0, 1, task.totalSize - 1)
      }
      closeSync(fd)
    }

    const resumeFile = `${task.destination}.resume`
    const startTime = Date.now()
    let lastSave = Date.now()

    const downloadChunk = async (chunk: DownloadChunk): Promise<void> => {
      if (chunk.status === 'completed') return

      chunk.status = 'downloading'
      const controller = new AbortController()
      controllers.push(controller)

      try {
        const start = chunk.start + chunk.downloaded
        if (start > chunk.end) {
          chunk.status = 'completed'
          return
        }

        const response = await fetch(task.url, {
          signal: controller.signal,
          headers: { Range: `bytes=${start}-${chunk.end}` }
        })

        if (!response.ok && response.status !== 206) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const reader = response.body!.getReader()
        const fd = openSync(tempFile, 'r+')
        let position = start

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (this.speedLimit > 0) {
            const elapsed = Date.now() - startTime
            const expectedBytes = (this.speedLimit * elapsed) / 1000
            if (task.downloadedSize > expectedBytes) {
              await new Promise((resolve) => setTimeout(resolve, 10))
            }
          }

          writeSync(fd, value, 0, value.length, position)
          position += value.length
          chunk.downloaded = position - chunk.start
          task.downloadedSize += value.length
          task.progress = task.totalSize > 0 ? (task.downloadedSize / task.totalSize) * 100 : 0
          task.speed = task.downloadedSize / ((Date.now() - startTime) / 1000)
          task.updatedAt = new Date()
          this.emit('task:progress', task)

          if (Date.now() - lastSave > 2000) {
            this.saveResumeData(task, resumeFile)
            this.updateTaskInDb(task)
            lastSave = Date.now()
          }
        }

        closeSync(fd)
        chunk.status = 'completed'
      } catch (err: any) {
        if (err.name === 'AbortError') {
          chunk.status = 'pending'
          throw err
        }

        chunk.retries++
        if (chunk.retries < this.maxRetries) {
          chunk.status = 'pending'
          const delay = Math.pow(2, chunk.retries) * 1000
          log.warn(
            `[Download] Chunk ${chunk.index} failed, retry ${chunk.retries} after ${delay}ms:`,
            err.message
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          return downloadChunk(chunk)
        } else {
          chunk.status = 'error'
          log.error(
            `[Download] Chunk ${chunk.index} failed after ${this.maxRetries} retries:`,
            err.message
          )
          throw err
        }
      }
    }

    const pendingChunks = (task.chunks ?? []).filter((c) => c.status !== 'completed')
    const maxParallel = Math.min(task.threads || this.maxThreadsPerFile, pendingChunks.length)
    const queue = [...pendingChunks]

    const workers = Array(maxParallel)
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const chunk = queue.shift()
          if (chunk) {
            await downloadChunk(chunk)
          }
        }
      })

    await Promise.all(workers)

    const failedChunks = (task.chunks ?? []).filter((c) => c.status === 'error')
    if (failedChunks.length > 0) {
      throw new Error(`${failedChunks.length} chunks failed to download`)
    }

    this.saveResumeData(task, resumeFile)
  }

  private processQueue(): void {
    if (this.activeDownloads.size >= this.maxConcurrent) return
    const pending = [...this.tasks.values()].find((t) => t.status === 'pending')
    if (pending) this.startDownload(pending)
  }

  cancelDownload(taskId: string): boolean {
    const controllers = this.activeDownloads.get(taskId)
    if (controllers) {
      controllers.forEach((c) => c.abort())
      return true
    }
    const task = this.tasks.get(taskId)
    if (task && task.status === 'pending') {
      task.status = 'cancelled'
      task.updatedAt = new Date()
      this.emit('task:cancelled', task)
      this.updateTaskInDb(task)
      return true
    }
    return false
  }

  pauseDownload(taskId: string): boolean {
    return this.cancelDownload(taskId)
  }

  resumeDownload(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (
      task &&
      (task.status === 'paused' || task.status === 'error' || task.status === 'cancelled')
    ) {
      task.status = 'pending'
      task.updatedAt = new Date()
      this.processQueue()
      return true
    }
    return false
  }

  getActiveDownloads(): DownloadTask[] {
    return [...this.tasks.values()].filter((t) => t.status === 'downloading')
  }

  getDownloadQueue(): DownloadTask[] {
    return [...this.tasks.values()]
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId)
  }

  clearCompleted(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'error') {
        this.tasks.delete(id)
      }
    }
  }

  private saveTaskToDb(task: DownloadTask): void {
    if (!this.db) return
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO download_tasks 
        (id, url, destination, fileName, totalSize, downloadedSize, status, progress, createdAt, updatedAt, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        task.id,
        task.url,
        task.destination,
        task.fileName,
        task.totalSize,
        task.downloadedSize,
        task.status,
        task.progress,
        task.createdAt.toISOString(),
        task.updatedAt.toISOString(),
        task.error || null
      )
    } catch (err: any) {
      log.warn('[Download] Failed to save task to DB:', err.message)
    }
  }

  private updateTaskInDb(task: DownloadTask): void {
    this.saveTaskToDb(task)
  }
}
