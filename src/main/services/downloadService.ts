import { app, BrowserWindow } from 'electron'
import { ChildProcess } from 'child_process'
import { getDb } from '../database/db'
import { downloads } from '../database/schema'
import { eq } from 'drizzle-orm'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import { YouTubeProvider, YoutubeSearchResult } from './youtubeProvider'
import { LibraryService } from './libraryService'

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
  error?: string
}

export interface SearchResult {
  trackId: string    // YouTube video ID
  title: string
  artist: string
  album: string
  duration: number
  provider: string
  url: string        // YouTube watch URL
  thumbnailUrl: string
}

export class DownloadService {
  private static queue: DownloadItem[] = []
  private static activeCount = 0
  private static maxConcurrent = 2
  private static mainWindow: BrowserWindow | null = null

  // Map of downloadId → active ChildProcess (for cancel support)
  private static activeProcesses = new Map<string, ChildProcess>()

  static init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  static async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return []

    const results = await YouTubeProvider.search(query)
    return results.map((r: YoutubeSearchResult) => ({
      trackId: r.videoId,
      title: r.title,
      artist: r.uploader,
      album: '',
      duration: r.duration,
      provider: 'YouTube',
      url: r.watchUrl,
      thumbnailUrl: r.thumbnailUrl
    }))
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
    this.processQueue(track)
    return downloadId
  }

  static getQueue() {
    return this.queue
  }

  static pauseDownload(id: string) {
    // yt-dlp doesn't support true pause — we cancel and mark paused
    const item = this.queue.find((i) => i.id === id)
    if (item && item.status === 'downloading') {
      const proc = this.activeProcesses.get(id)
      if (proc) {
        proc.kill('SIGTERM')
        this.activeProcesses.delete(id)
      }
      item.status = 'paused'
      item.speed = '--'
      item.eta = '--:--'
      this.activeCount = Math.max(0, this.activeCount - 1)
      this.notifyQueueUpdate()
    }
  }

  static resumeDownload(id: string) {
    const item = this.queue.find((i) => i.id === id)
    if (item && item.status === 'paused') {
      item.status = 'pending'
      item.progress = 0
      this.notifyQueueUpdate()
      // Find the original track url from the DB title — re-search isn't ideal,
      // so we store the url in the title field during queue for now.
      // The next processQueue() call picks it up.
      this.processQueue()
    }
  }

  static cancelDownload(id: string) {
    const index = this.queue.findIndex((i) => i.id === id)
    if (index === -1) return

    const item = this.queue[index]
    if (item.status === 'downloading') {
      const proc = this.activeProcesses.get(id)
      if (proc) {
        proc.kill('SIGTERM')
        this.activeProcesses.delete(id)
      }
      this.activeCount = Math.max(0, this.activeCount - 1)
    }

    this.queue.splice(index, 1)

    const db = getDb()
    db.delete(downloads).where(eq(downloads.id, id)).run()

    this.notifyQueueUpdate()
    this.processQueue()
  }

  private static notifyQueueUpdate() {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('download-queue-updated', this.queue)
    }
  }

  private static processQueue(track?: SearchResult) {
    if (this.activeCount >= this.maxConcurrent) return

    // If a specific track is provided (newly queued), use it directly
    if (track) {
      const item = this.queue.find((i) => i.status === 'pending' && i.title === track.title)
      if (item) {
        this.startDownload(item, track.url)
        return
      }
    }

    // Otherwise pick the next pending item — but we need its url.
    // For resumed items we re-attempt via a stored url on the item.
    const nextItem = this.queue.find((i) => i.status === 'pending')
    if (nextItem && (nextItem as any)._url) {
      this.startDownload(nextItem, (nextItem as any)._url)
    }
  }

  private static startDownload(item: DownloadItem, watchUrl: string) {
    item.status = 'downloading'
    // Store url on item for resume support (internal, not sent to renderer)
    ;(item as any)._url = watchUrl
    this.activeCount++
    this.notifyQueueUpdate()

    this.runYtDlpDownload(item, watchUrl).catch((err) => {
      console.error('Download failed:', err)
      item.status = 'failed'
      item.error = err.message
      this.activeCount = Math.max(0, this.activeCount - 1)
      this.activeProcesses.delete(item.id)
      this.notifyQueueUpdate()

      const db = getDb()
      db.update(downloads)
        .set({ status: 'failed' })
        .where(eq(downloads.id, item.id))
        .run()

      this.processQueue()
    })
  }

  private static async runYtDlpDownload(item: DownloadItem, watchUrl: string) {
    const downloadsDir = path.join(app.getPath('userData'), 'downloads')
    await fs.ensureDir(downloadsDir)

    const { promise, process: proc } = YouTubeProvider.download(
      watchUrl,
      downloadsDir,
      item.title,
      (progress) => {
        item.progress = progress.percent
        item.speed = progress.speed
        item.eta = progress.eta
        this.notifyQueueUpdate()
      }
    )

    this.activeProcesses.set(item.id, proc)

    const outputPath = await promise

    this.activeProcesses.delete(item.id)
    item.status = 'completed'
    item.progress = 100
    item.outputPath = outputPath
    item.finishedAt = new Date().toISOString()
    this.activeCount = Math.max(0, this.activeCount - 1)

    const db = getDb()
    db.update(downloads)
      .set({
        status: 'completed',
        finishedAt: item.finishedAt,
        outputPath
      })
      .where(eq(downloads.id, item.id))
      .run()

    this.notifyQueueUpdate()

    // Auto-import the downloaded MP3 into the music library
    if (this.mainWindow && await fs.pathExists(outputPath)) {
      try {
        await LibraryService.importSingleFile(outputPath, this.mainWindow)
        this.mainWindow.webContents.send('library-updated')
      } catch (err) {
        console.error('Failed to auto-import downloaded file:', err)
      }
    }

    this.processQueue()
  }
}
