import chokidar from 'chokidar'
import { getDb } from '../database/db'
import { songs, artists, albums } from '../database/schema'
import { eq } from 'drizzle-orm'
import { parseFile } from 'music-metadata'
import { BrowserWindow } from 'electron'
import path from 'path'
import crypto from 'crypto'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.wav', '.ogg', '.aac', '.alac'])

export class ScannerService {
  private static watchers = new Map<string, chokidar.FSWatcher>()

  static startWatching(folderPath: string, mainWindow: BrowserWindow) {
    if (this.watchers.has(folderPath)) return

    const watcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(ext)) return
      await this.importSingleFile(filePath)
      mainWindow.webContents.send('library-updated')
    })

    watcher.on('change', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(ext)) return
      await this.importSingleFile(filePath)
      mainWindow.webContents.send('library-updated')
    })

    watcher.on('unlink', async (filePath) => {
      const songId = crypto.createHash('md5').update(filePath).digest('hex')
      const db = getDb()
      db.delete(songs).where(eq(songs.id, songId)).run()
      mainWindow.webContents.send('library-updated')
    })

    this.watchers.set(folderPath, watcher)
  }

  static stopWatching(folderPath: string) {
    const watcher = this.watchers.get(folderPath)
    if (watcher) {
      watcher.close()
      this.watchers.delete(folderPath)
    }
  }

  private static async importSingleFile(filePath: string) {
    try {
      const metadata = await parseFile(filePath)
      const title = metadata.common.title || path.basename(filePath, path.extname(filePath))
      const artistName = metadata.common.artist || 'Unknown Artist'
      const albumTitle = metadata.common.album || 'Unknown Album'
      const genre = metadata.common.genre?.[0] || 'Unknown'
      const year = metadata.common.year || null
      const track = metadata.common.track.no || null
      const disc = metadata.common.disk.no || null
      
      const duration = Math.round(metadata.format.duration || 0)
      const bitrate = Math.round((metadata.format.bitrate || 0) / 1000)
      const sampleRate = metadata.format.sampleRate || null
      const channels = metadata.format.numberOfChannels || null
      const codec = metadata.format.codec || null

      const songId = crypto.createHash('md5').update(filePath).digest('hex')
      const artistId = crypto.createHash('md5').update(artistName).digest('hex')
      const albumId = crypto.createHash('md5').update(albumTitle + artistName).digest('hex')

      const db = getDb()
      
      await db.insert(artists).values({ id: artistId, name: artistName }).onConflictDoNothing()
      await db.insert(albums).values({ id: albumId, title: albumTitle, artist: artistName, year }).onConflictDoNothing()

      const nowStr = new Date().toISOString()
      await db.insert(songs).values({
        id: songId,
        title,
        artist: artistName,
        album: albumTitle,
        genre,
        year,
        track,
        disc,
        duration,
        bitrate,
        sampleRate,
        channels,
        codec,
        filePath,
        createdAt: nowStr,
        updatedAt: nowStr
      }).onConflictDoUpdate({
        target: songs.filePath,
        set: {
          title,
          artist: artistName,
          album: albumTitle,
          genre,
          year,
          track,
          disc,
          duration,
          bitrate,
          sampleRate,
          channels,
          codec,
          updatedAt: nowStr
        }
      })
    } catch (err) {
      console.error('Failed to import file on watch event:', filePath, err)
    }
  }
}
