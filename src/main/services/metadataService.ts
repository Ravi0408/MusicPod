import nodeID3 from 'node-id3'
import { getDb } from '../database/db'
import { songs, albums, artists } from '../database/schema'
import { eq } from 'drizzle-orm'
import path from 'path'
import crypto from 'crypto'

export interface EditableTags {
  title: string
  artist?: string
  album?: string
  genre?: string
  year?: number
  track?: number
  disc?: number
}

export class MetadataService {
  static async updateMetadata(songId: string, updatedTags: EditableTags) {
    const db = getDb()
    const song = db.select().from(songs).where(eq(songs.id, songId)).get()
    if (!song) {
      throw new Error('Song not found in database')
    }

    const filePath = song.filePath
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.mp3') {
      const tags: nodeID3.Tags = {
        title: updatedTags.title,
        artist: updatedTags.artist || '',
        album: updatedTags.album || '',
        genre: updatedTags.genre || '',
        year: updatedTags.year ? String(updatedTags.year) : undefined,
        trackNumber: updatedTags.track ? String(updatedTags.track) : undefined
      }

      // Write tags back to the file using node-id3
      const success = nodeID3.update(tags, filePath)
      if (!success) {
        throw new Error('Failed to write ID3 tags to file')
      }
    } else {
      console.warn('Metadata file edits currently only supported for MP3. Updating SQLite instead.')
    }

    // Update SQLite database
    const nowStr = new Date().toISOString()
    
    // Update artist and album entries if changed
    if (updatedTags.artist) {
      const artistId = crypto.createHash('md5').update(updatedTags.artist).digest('hex')
      await db.insert(artists).values({
        id: artistId,
        name: updatedTags.artist
      }).onConflictDoNothing()
    }

    if (updatedTags.album) {
      const artistName = updatedTags.artist || song.artist || 'Unknown Artist'
      const albumId = crypto.createHash('md5').update(updatedTags.album + artistName).digest('hex')
      await db.insert(albums).values({
        id: albumId,
        title: updatedTags.album,
        artist: artistName,
        year: updatedTags.year || null
      }).onConflictDoNothing()
    }

    db.update(songs)
      .set({
        title: updatedTags.title,
        artist: updatedTags.artist || null,
        album: updatedTags.album || null,
        genre: updatedTags.genre || null,
        year: updatedTags.year || null,
        track: updatedTags.track || null,
        disc: updatedTags.disc || null,
        updatedAt: nowStr
      })
      .where(eq(songs.id, songId))
      .run()
  }
}
