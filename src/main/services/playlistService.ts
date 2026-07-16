import { getDb } from '../database/db'
import { playlists, playlistSongs, songs } from '../database/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import fs from 'fs-extra'

export class PlaylistService {
  static async createPlaylist(name: string) {
    const db = getDb()
    const id = crypto.randomUUID()
    const nowStr = new Date().toISOString()
    
    await db.insert(playlists).values({
      id,
      name,
      createdAt: nowStr
    })
    
    return { id, name, createdAt: nowStr }
  }

  static async deletePlaylist(id: string) {
    const db = getDb()
    // Cascade delete of playlist songs will happen automatically via references
    await db.delete(playlists).where(eq(playlists.id, id))
  }

  static async getPlaylists() {
    const db = getDb()
    return db.select().from(playlists).all()
  }

  static async getPlaylistSongs(playlistId: string) {
    const db = getDb()
    
    // Joint query using drizzle to select song details
    const records = db
      .select({
        song: songs
      })
      .from(playlistSongs)
      .innerJoin(songs, eq(playlistSongs.songId, songs.id))
      .where(eq(playlistSongs.playlistId, playlistId))
      .all()
      
    return records.map((r) => r.song)
  }

  static async addSongToPlaylist(playlistId: string, songId: string) {
    const db = getDb()
    await db.insert(playlistSongs).values({
      playlistId,
      songId
    }).onConflictDoNothing()
  }

  static async removeSongFromPlaylist(playlistId: string, songId: string) {
    const db = getDb()
    await db.delete(playlistSongs).where(
      and(
        eq(playlistSongs.playlistId, playlistId),
        eq(playlistSongs.songId, songId)
      )
    )
  }

  static async exportPlaylistM3U(playlistId: string, exportPath: string) {
    const db = getDb()
    
    const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
    if (!playlist) {
      throw new Error('Playlist not found')
    }

    const tracks = await this.getPlaylistSongs(playlistId)

    let m3uContent = '#EXTM3U\n'
    for (const song of tracks) {
      m3uContent += `#EXTINF:${song.duration},${song.artist || 'Unknown Artist'} - ${song.title}\n`
      m3uContent += `${song.filePath}\n`
    }

    await fs.writeFile(exportPath, m3uContent, 'utf-8')
  }
}
