import { parseFile } from 'music-metadata'
import { getDb } from '../database/db'
import { songs, artists, albums } from '../database/schema'
import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import sharp from 'sharp'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.wav', '.ogg', '.aac', '.alac'])
export class LibraryService {
  private static isScanning = false

  static async importSingleFile(filePath: string): Promise<string> {
    const db = getDb()
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

    // Extract artwork
    let coverPath = null
    const picture = metadata.common.picture?.[0]
    if (picture) {
      const coversDir = path.join(app.getPath('userData'), 'covers')
      await fs.ensureDir(coversDir)
      const filename = `${crypto.createHash('md5').update(filePath).digest('hex')}.jpg`
      const destPath = path.join(coversDir, filename)
      
      try {
        await sharp(picture.data)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(destPath)
        coverPath = destPath
      } catch (err) {
        console.error('Failed to extract artwork for', filePath, err)
      }
    }

    const songId = crypto.createHash('md5').update(filePath).digest('hex')
    const artistId = crypto.createHash('md5').update(artistName).digest('hex')
    const albumId = crypto.createHash('md5').update(albumTitle + artistName).digest('hex')

    // Upsert Artist
    await db.insert(artists).values({
      id: artistId,
      name: artistName
    }).onConflictDoNothing()

    // Upsert Album
    await db.insert(albums).values({
      id: albumId,
      title: albumTitle,
      artist: artistName,
      year,
      cover: coverPath
    }).onConflictDoNothing()

    // Upsert Song
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
      coverPath,
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
        coverPath,
        updatedAt: nowStr
      }
    })

    return songId
  }

  static async scanFolder(folderPath: string, mainWindow: BrowserWindow) {
    if (this.isScanning) return
    this.isScanning = true

    try {
      const files: string[] = []

      // Recursive directory walker
      async function walk(dir: string) {
        const list = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of list) {
          const res = path.resolve(dir, entry.name)
          if (entry.isDirectory()) {
            await walk(res)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (AUDIO_EXTENSIONS.has(ext)) {
              files.push(res)
            }
          }
        }
      }

      await walk(folderPath)
      const total = files.length
      let scanned = 0

      mainWindow.webContents.send('scan-progress', { scanned, total, status: 'scanning' })

      for (const filePath of files) {
        try {
          await this.importSingleFile(filePath)
        } catch (err) {
          console.error('Failed to scan file', filePath, err)
        }

        scanned++
        mainWindow.webContents.send('scan-progress', {
          scanned,
          total,
          currentFile: path.basename(filePath),
          status: scanned === total ? 'done' : 'scanning'
        })
      }

      mainWindow.webContents.send('scan-progress', { scanned, total, status: 'done' })
    } catch (err: any) {
      mainWindow.webContents.send('scan-progress', { scanned: 0, total: 0, status: 'error' })
      console.error('Scan error:', err)
    } finally {
      this.isScanning = false
    }
  }

  static async getSongs() {
    const db = getDb()
    return db.select().from(songs).all()
  }

  static async deleteSong(songId: string, deleteFile: boolean): Promise<void> {
    const db = getDb()
    const song = db.select().from(songs).where(eq(songs.id, songId)).get()
    if (!song) {
      throw new Error('Song not found')
    }

    if (deleteFile && song.filePath) {
      if (await fs.pathExists(song.filePath)) {
        await shell.trashItem(song.filePath)
      }
    }

    db.delete(songs).where(eq(songs.id, songId)).run()
  }
}
