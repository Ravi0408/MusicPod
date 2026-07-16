import { app, BrowserWindow } from 'electron'
import { getDb } from '../database/db'
import { downloads } from '../database/schema'
import { eq } from 'drizzle-orm'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'

export interface DownloadItem {
  id: string
  title: string
  provider: string
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  speed: string
  eta: string
  startedAt?: string
  finishedAt?: string
  outputPath?: string
}

export interface SearchResult {
  trackId: string
  title: string
  artist: string
  album: string
  duration: number
  provider: string
}

export class DownloadService {
  private static queue: DownloadItem[] = []
  private static activeCount = 0
  private static maxConcurrent = 2
  private static mainWindow: BrowserWindow | null = null

  static init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  static async searchMock(query: string): Promise<SearchResult[]> {
    if (!query) return []
    return [
      { trackId: 'mock-1', title: `Summer Breeze (${query})`, artist: 'Ocean Blue', album: 'Chillwaves', duration: 180, provider: 'MockProvider' },
      { trackId: 'mock-2', title: `Neon Horizon (${query})`, artist: 'Synthrunner', album: 'RetroGrid', duration: 240, provider: 'MockProvider' },
      { trackId: 'mock-3', title: `Rainy Coffee Shop (${query})`, artist: 'Lofi Dreamer', album: 'Warm Mug', duration: 150, provider: 'MockProvider' }
    ]
  }

  static async addToQueue(track: SearchResult) {
    const downloadId = crypto.randomUUID()
    
    const item: DownloadItem = {
      id: downloadId,
      title: track.title,
      provider: track.provider,
      status: 'pending',
      progress: 0,
      speed: '0 KB/s',
      eta: '--:--'
    }

    this.queue.push(item)

    const db = getDb()
    const nowStr = new Date().toISOString()
    db.insert(downloads).values({
      id: downloadId,
      title: track.title,
      provider: track.provider,
      status: 'pending',
      startedAt: nowStr
    }).run()

    this.notifyQueueUpdate()
    this.processQueue()
    return downloadId
  }

  static getQueue() {
    return this.queue
  }

  static pauseDownload(id: string) {
    const item = this.queue.find((i) => i.id === id)
    if (item && item.status === 'downloading') {
      item.status = 'paused'
      this.activeCount--
      this.notifyQueueUpdate()
      this.processQueue()
    }
  }

  static resumeDownload(id: string) {
    const item = this.queue.find((i) => i.id === id)
    if (item && item.status === 'paused') {
      item.status = 'pending'
      this.notifyQueueUpdate()
      this.processQueue()
    }
  }

  static cancelDownload(id: string) {
    const index = this.queue.findIndex((i) => i.id === id)
    if (index !== -1) {
      const item = this.queue[index]
      if (item.status === 'downloading') {
        this.activeCount--
      }
      this.queue.splice(index, 1)

      const db = getDb()
      db.delete(downloads).where(eq(downloads.id, id)).run()

      this.notifyQueueUpdate()
      this.processQueue()
    }
  }

  private static notifyQueueUpdate() {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('download-queue-updated', this.queue)
    }
  }

  private static async processQueue() {
    if (this.activeCount >= this.maxConcurrent) return

    const nextItem = this.queue.find((i) => i.status === 'pending')
    if (!nextItem) return

    nextItem.status = 'downloading'
    this.activeCount++
    this.notifyQueueUpdate()

    this.runDownloadSim(nextItem).catch((err) => {
      console.error('Download simulation failed:', err)
    })
  }

  private static async runDownloadSim(item: DownloadItem) {
    const downloadsDir = path.join(app.getPath('userData'), 'downloads')
    await fs.ensureDir(downloadsDir)
    const destFilePath = path.join(downloadsDir, `${item.title.replace(/[^\w\s-]/g, '')}.mp3`)

    let progress = 0
    const interval = setInterval(async () => {
      if (item.status !== 'downloading') {
        clearInterval(interval)
        return
      }

      progress += 10
      item.progress = progress
      item.speed = `${(1.0 + Math.random() * 0.5).toFixed(1)} MB/s`
      const remainingSecs = Math.max(0, Math.round(((100 - progress) / 10) * 0.5))
      item.eta = `0:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`

      this.notifyQueueUpdate()

      if (progress >= 100) {
        clearInterval(interval)
        
        await fs.writeFile(destFilePath, 'MOCK AUDIO DATA')

        item.status = 'completed'
        item.progress = 100
        item.outputPath = destFilePath
        item.finishedAt = new Date().toISOString()
        this.activeCount--

        const db = getDb()
        db.update(downloads)
          .set({
            status: 'completed',
            finishedAt: item.finishedAt,
            outputPath: destFilePath
          })
          .where(eq(downloads.id, item.id))
          .run()

        this.notifyQueueUpdate()
        this.processQueue()
      }
    }, 500)
  }
}
