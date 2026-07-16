import { ipcMain, dialog, BrowserWindow } from 'electron'
import { z } from 'zod'
import { LibraryService } from '../services/libraryService'
import { MetadataService } from '../services/metadataService'
import { ArtworkService } from '../services/artworkService'
import { PlaylistService } from '../services/playlistService'

// Input validation schemas
const scanLibrarySchema = z.string().min(1)

const updateMetadataSchema = z.object({
  songId: z.string().min(1),
  tags: z.object({
    title: z.string().min(1),
    artist: z.string().optional(),
    album: z.string().optional(),
    genre: z.string().optional(),
    year: z.number().nullable().optional(),
    track: z.number().nullable().optional(),
    disc: z.number().nullable().optional()
  })
})

const updateArtworkSchema = z.object({
  songId: z.string().min(1),
  imagePath: z.string().min(1)
})

const createPlaylistSchema = z.string().min(1)
const playlistIdSchema = z.string().min(1)
const playlistSongSchema = z.object({
  playlistId: z.string().min(1),
  songId: z.string().min(1)
})

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Common ping-pong
  ipcMain.handle('ping', () => 'pong')

  // Folder selection
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  // Library Scanning
  ipcMain.handle('scan-library', async (_event, folderPath: unknown) => {
    const parsed = scanLibrarySchema.parse(folderPath)
    LibraryService.scanFolder(parsed, mainWindow).catch((err) => {
      console.error('Scan error in IPC:', err)
    })
  })

  ipcMain.handle('get-songs', async () => {
    return LibraryService.getSongs()
  })

  // Metadata Updates
  ipcMain.handle('update-song-metadata', async (_event, payload: unknown) => {
    const { songId, tags } = updateMetadataSchema.parse(payload)
    // Convert null/undefined to clean tags object
    const cleanTags = {
      title: tags.title,
      artist: tags.artist || undefined,
      album: tags.album || undefined,
      genre: tags.genre || undefined,
      year: tags.year || undefined,
      track: tags.track || undefined,
      disc: tags.disc || undefined
    }
    await MetadataService.updateMetadata(songId, cleanTags)
  })

  // Artwork Updates
  ipcMain.handle('select-artwork-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  ipcMain.handle('update-song-artwork', async (_event, payload: unknown) => {
    const { songId, imagePath } = updateArtworkSchema.parse(payload)
    return ArtworkService.updateSongArtwork(songId, imagePath)
  })

  // Playlists CRUD
  ipcMain.handle('get-playlists', async () => {
    return PlaylistService.getPlaylists()
  })

  ipcMain.handle('create-playlist', async (_event, name: unknown) => {
    const parsedName = createPlaylistSchema.parse(name)
    return PlaylistService.createPlaylist(parsedName)
  })

  ipcMain.handle('delete-playlist', async (_event, id: unknown) => {
    const parsedId = playlistIdSchema.parse(id)
    await PlaylistService.deletePlaylist(parsedId)
  })

  ipcMain.handle('get-playlist-songs', async (_event, playlistId: unknown) => {
    const parsedId = playlistIdSchema.parse(playlistId)
    return PlaylistService.getPlaylistSongs(parsedId)
  })

  ipcMain.handle('add-song-to-playlist', async (_event, payload: unknown) => {
    const { playlistId, songId } = playlistSongSchema.parse(payload)
    await PlaylistService.addSongToPlaylist(playlistId, songId)
  })

  ipcMain.handle('remove-song-from-playlist', async (_event, payload: unknown) => {
    const { playlistId, songId } = playlistSongSchema.parse(payload)
    await PlaylistService.removeSongFromPlaylist(playlistId, songId)
  })

  // Playlist M3U export
  ipcMain.handle('export-playlist-m3u', async (_event, playlistId: unknown) => {
    const parsedId = playlistIdSchema.parse(playlistId)
    
    // Open Save dialog to select target M3U file
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Playlist to M3U',
      defaultPath: 'playlist.m3u',
      filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
    })

    if (result.canceled || !result.filePath) return false

    await PlaylistService.exportPlaylistM3U(parsedId, result.filePath)
    return true
  })
}
