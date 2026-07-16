import { ipcMain, dialog, BrowserWindow } from 'electron'
import { z } from 'zod'
import { LibraryService } from '../services/libraryService'
import { MetadataService } from '../services/metadataService'
import { ArtworkService } from '../services/artworkService'
import { PlaylistService } from '../services/playlistService'
import { ConverterService } from '../services/converterService'
import { DuplicateService } from '../services/duplicateService'
import { ScannerService } from '../services/scannerService'
import { DownloadService, SearchResult } from '../services/downloadService'

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

// Phase 3 Schemas
const convertFileSchema = z.object({
  filePath: z.string().min(1),
  outputFormat: z.string().min(1),
  preset: z.string().min(1)
})

const findDuplicatesSchema = z.enum(['hash', 'metadata'])
const trashSongSchema = z.string().min(1)
const watchFolderSchema = z.string().min(1)
const searchDownloadsSchema = z.string()
const addDownloadSchema = z.object({
  trackId: z.string().min(1),
  title: z.string().min(1),
  artist: z.string(),
  album: z.string(),
  duration: z.number(),
  provider: z.string()
})
const downloadIdSchema = z.string().min(1)

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Initialize Download Service with main window
  DownloadService.init(mainWindow)

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
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Playlist to M3U',
      defaultPath: 'playlist.m3u',
      filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
    })

    if (result.canceled || !result.filePath) return false

    await PlaylistService.exportPlaylistM3U(parsedId, result.filePath)
    return true
  })

  // --- Phase 3 Handlers ---

  // Audio Converter
  ipcMain.handle('convert-file', async (_event, payload: unknown) => {
    const { filePath, outputFormat, preset } = convertFileSchema.parse(payload)
    return ConverterService.convert(filePath, outputFormat, preset, mainWindow)
  })

  // Duplicate Finder
  ipcMain.handle('find-duplicates', async (_event, method: unknown) => {
    const parsedMethod = findDuplicatesSchema.parse(method)
    return DuplicateService.findDuplicates(parsedMethod)
  })

  ipcMain.handle('trash-song', async (_event, songId: unknown) => {
    const parsedId = trashSongSchema.parse(songId)
    await DuplicateService.trashSong(parsedId)
  })

  // Folder Watcher
  ipcMain.handle('start-watching-folder', async (_event, folderPath: unknown) => {
    const parsedPath = watchFolderSchema.parse(folderPath)
    ScannerService.startWatching(parsedPath, mainWindow)
  })

  ipcMain.handle('stop-watching-folder', async (_event, folderPath: unknown) => {
    const parsedPath = watchFolderSchema.parse(folderPath)
    ScannerService.stopWatching(parsedPath)
  })

  // Download Manager
  ipcMain.handle('search-downloads', async (_event, query: unknown) => {
    const parsedQuery = searchDownloadsSchema.parse(query)
    return DownloadService.searchMock(parsedQuery)
  })

  ipcMain.handle('add-to-download-queue', async (_event, payload: unknown) => {
    const parsedTrack = addDownloadSchema.parse(payload) as SearchResult
    return DownloadService.addToQueue(parsedTrack)
  })

  ipcMain.handle('get-download-queue', async () => {
    return DownloadService.getQueue()
  })

  ipcMain.handle('pause-download', async (_event, id: unknown) => {
    const parsedId = downloadIdSchema.parse(id)
    DownloadService.pauseDownload(parsedId)
  })

  ipcMain.handle('resume-download', async (_event, id: unknown) => {
    const parsedId = downloadIdSchema.parse(id)
    DownloadService.resumeDownload(parsedId)
  })

  ipcMain.handle('cancel-download', async (_event, id: unknown) => {
    const parsedId = downloadIdSchema.parse(id)
    DownloadService.cancelDownload(parsedId)
  })
}
