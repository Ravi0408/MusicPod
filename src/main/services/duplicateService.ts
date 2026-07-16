import { getDb } from '../database/db'
import { songs } from '../database/schema'
import { eq } from 'drizzle-orm'
import { shell } from 'electron'
import crypto from 'crypto'
import fs from 'fs-extra'

export interface DuplicateGroup {
  key: string
  songs: any[]
}

export class DuplicateService {
  static async findDuplicates(method: 'hash' | 'metadata'): Promise<DuplicateGroup[]> {
    const db = getDb()
    const allSongs = db.select().from(songs).all()
    const groupsMap = new Map<string, any[]>()

    if (method === 'metadata') {
      for (const song of allSongs) {
        const key = `${(song.title || '').trim().toLowerCase()} - ${(song.artist || '').trim().toLowerCase()}`
        const existing = groupsMap.get(key) || []
        groupsMap.set(key, [...existing, song])
      }
    } else {
      for (const song of allSongs) {
        try {
          if (await fs.pathExists(song.filePath)) {
            const hash = await this.getFileHash(song.filePath)
            const existing = groupsMap.get(hash) || []
            groupsMap.set(hash, [...existing, song])
          }
        } catch (err) {
          console.error('Failed to hash file', song.filePath, err)
        }
      }
    }

    const duplicateGroups: DuplicateGroup[] = []
    for (const [key, songsList] of groupsMap.entries()) {
      if (songsList.length > 1) {
        duplicateGroups.push({ key, songs: songsList })
      }
    }

    return duplicateGroups
  }

  static async trashSong(songId: string) {
    const db = getDb()
    const song = db.select().from(songs).where(eq(songs.id, songId)).get()
    if (!song) {
      throw new Error('Song not found')
    }

    // Move to system Trash instead of direct hard delete for safety
    if (await fs.pathExists(song.filePath)) {
      await shell.trashItem(song.filePath)
    }

    db.delete(songs).where(eq(songs.id, songId)).run()
  }

  private static async getFileHash(filePath: string): Promise<string> {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', (err) => reject(err))
    })
  }
}
