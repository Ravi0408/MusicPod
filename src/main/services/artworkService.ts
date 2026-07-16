import { getDb } from '../database/db'
import { songs, albums } from '../database/schema'
import { eq } from 'drizzle-orm'
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import sharp from 'sharp'
import nodeID3 from 'node-id3'

export class ArtworkService {
  static async updateSongArtwork(songId: string, imagePath: string) {
    const db = getDb()
    const song = db.select().from(songs).where(eq(songs.id, songId)).get()
    if (!song) {
      throw new Error('Song not found in database')
    }

    // Read the new image and process it with sharp
    const coversDir = path.join(app.getPath('userData'), 'covers')
    await fs.ensureDir(coversDir)
    
    const filename = `${crypto.createHash('md5').update(song.filePath).digest('hex')}.jpg`
    const destPath = path.join(coversDir, filename)
    
    const imageBuffer = await fs.readFile(imagePath)
    
    // Process and resize image
    const processedBuffer = await sharp(imageBuffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Write resized image to cache directory
    await fs.writeFile(destPath, processedBuffer)

    // Embed in MP3 file if file type is MP3
    const ext = path.extname(song.filePath).toLowerCase()
    if (ext === '.mp3') {
      try {
        const tags = {
          APIC: {
            mime: 'image/jpeg',
            type: {
              id: 3,
              name: 'front cover'
            },
            description: 'Cover Art',
            imageBuffer: processedBuffer
          }
        }
        nodeID3.update(tags, song.filePath)
      } catch (err) {
        console.error('Failed to embed cover in MP3:', err)
      }
    }

    // Update SQLite database entries
    const nowStr = new Date().toISOString()
    
    // Update Song record
    db.update(songs)
      .set({
        coverPath: destPath,
        updatedAt: nowStr
      })
      .where(eq(songs.id, songId))
      .run()

    // Also update Album record if applicable
    if (song.album) {
      const artistName = song.artist || 'Unknown Artist'
      const albumId = crypto.createHash('md5').update(song.album + artistName).digest('hex')
      db.update(albums)
        .set({
          cover: destPath
        })
        .where(eq(albums.id, albumId))
        .run()
    }

    return destPath
  }
}
