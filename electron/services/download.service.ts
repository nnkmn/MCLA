import { createWriteStream, mkdirSync } from 'fs'
import { dirname, basename } from 'path'
import { EventEmitter } from 'events'
import Database from 'better-sqlite3'

export interface DownloadTask {
  id: string
  url: string
  destination: string
  fileName: string
  totalSize: number
  downloadedSize: number
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled'
  speed: number
  progress: number
  error?: string
  createdAt: Date
  updatedAt: Date
}

export class DownloadService extends EventEmitter {
  private tasks: Map<string, DownloadTask> = new Map()
  private activeDownloads: Map<string, AbortController> = new Map()
  private maxConcurrent = 4
  private db: Database.Database | null = null

  constructor(db?: Database.Database) {
    super()
    if (db) this.db = db
  }

  /**
   * 添加下载任务
   */
  async addDownload(url: string, destination: string): Promise<DownloadTask> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const task: DownloadTask = {
      id,
      url,
      destination,
      fileName: basename(destination),
      totalSize: 0,
      downloadedSize: 0,
      status: 'pending',
      speed: 0,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    this.tasks.set(id, task)
    this.emit('task:added', task)

    // 如果并发数未满，立即开始
    if (this.activeDownloads.size < this.maxConcurrent) {
      this.startDownload(task)
    }

    return task
  }

  /**
   * 开始下载
   */
  private async startDownload(task: DownloadTask): Promise<void> {
    const controller = new AbortController()
    this.activeDownloads.set(task.id, controller)

    task.status = 'downloading'
    task.updatedAt = new Date()
    this.emit('task:started', task)

    try {
      // 确保目录存在
      mkdirSync(dirname(task.destination), { recursive: true })

      const response = await fetch(task.url, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      task.totalSize = contentLength ? parseInt(contentLength, 10) : 0

      const writer = createWriteStream(task.destination)
      const reader = response.body!.getReader()
      let downloaded = 0
      const startTime = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        writer.write(value)
        downloaded += value.length
        task.downloadedSize = downloaded
        task.progress = task.totalSize > 0 ? (downloaded / task.totalSize) * 100 : 0
        task.speed = downloaded / ((Date.now() - startTime) / 1000)
        task.updatedAt = new Date()
        this.emit('task:progress', task)
      }

      writer.end()
      task.status = 'completed'
      task.progress = 100
      task.updatedAt = new Date()
      this.emit('task:completed', task)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        task.status = 'cancelled'
        this.emit('task:cancelled', task)
      } else {
        task.status = 'error'
        task.error = err.message
        this.emit('task:error', task)
      }
    } finally {
      this.activeDownloads.delete(task.id)
      task.updatedAt = new Date()
      // 启动队列中下一个
      this.processQueue()
    }
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    if (this.activeDownloads.size >= this.maxConcurrent) return
    const pending = [...this.tasks.values()].find(t => t.status === 'pending')
    if (pending) this.startDownload(pending)
  }

  /**
   * 取消下载
   */
  cancelDownload(taskId: string): boolean {
    const controller = this.activeDownloads.get(taskId)
    if (controller) {
      controller.abort()
      return true
    }
    const task = this.tasks.get(taskId)
    if (task && task.status === 'pending') {
      task.status = 'cancelled'
      task.updatedAt = new Date()
      this.emit('task:cancelled', task)
      return true
    }
    return false
  }

  /**
   * 获取活动中的下载
   */
  getActiveDownloads(): DownloadTask[] {
    return [...this.tasks.values()].filter(t => t.status === 'downloading')
  }

  /**
   * 获取下载队列
   */
  getDownloadQueue(): DownloadTask[] {
    return [...this.tasks.values()]
  }

  /**
   * 获取单个任务
   */
  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 清理已完成/取消的任务
   */
  clearCompleted(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'error') {
        this.tasks.delete(id)
      }
    }
  }
}
