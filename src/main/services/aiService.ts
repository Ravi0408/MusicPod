import { getDb } from '../database/db'
import { songs } from '../database/schema'
import { eq } from 'drizzle-orm'
import path from 'path'

export interface CleanupSuggestion {
  songId: string
  current: {
    title: string
    artist: string
    album: string
    track: number | null
  }
  suggested: {
    title: string
    artist: string
    album: string
    track: number | null
  }
  confidence: number
}

export class AiService {
  static suggestCleanup(songId: string): CleanupSuggestion {
    const db = getDb()
    const song = db.select().from(songs).where(eq(songs.id, songId)).get()
    if (!song) {
      throw new Error('Song not found')
    }

    const filename = path.basename(song.filePath, path.extname(song.filePath))
    
    let title = song.title || ''
    let artist = song.artist || ''
    let album = song.album || ''
    let track: number | null = song.track || null
    let confidence = 30

    // Split filename to analyze heuristics
    const parts = filename.split('-').map((p) => p.trim())

    if (parts.length === 2) {
      artist = this.capitalizeWords(parts[0])
      title = this.capitalizeWords(parts[1])
      confidence = 80
    } else if (parts.length === 3) {
      const maybeTrack = parseInt(parts[0])
      if (!isNaN(maybeTrack)) {
        track = maybeTrack
        artist = this.capitalizeWords(parts[1])
        title = this.capitalizeWords(parts[2])
        confidence = 90
      } else {
        artist = this.capitalizeWords(parts[0])
        album = this.capitalizeWords(parts[1])
        title = this.capitalizeWords(parts[2])
        confidence = 85
      }
    }

    return {
      songId,
      current: {
        title: song.title || 'Unknown',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        track: song.track
      },
      suggested: {
        title,
        artist,
        album,
        track
      },
      confidence
    }
  }

  private static capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
