import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { z } from 'zod'
import { LibraryService } from '../services/libraryService'
import { MetadataService } from '../services/metadataService'
import { ArtworkService } from '../services/artworkService'
import { PlaylistService } from '../services/playlistService'
import { ConverterService } from '../services/converterService'
import { DuplicateService } from '../services/duplicateService'
import { ScannerService } from '../services/scannerService'
import { DownloadService, SearchResult } from '../services/downloadService'
import { DeviceService } from '../services/deviceService'
import { PluginService } from '../services/pluginService'
import { AiService } from '../services/aiService'
import { getDb } from '../database/db'
import { songs as songsTable, playlists, movies, artists } from '../database/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { SearchService } from '../services/searchService'
import { CatalogImporter } from '../services/catalogImporter'
import { generatePerformanceTestData } from '../database/seedCatalog'
import crypto from 'crypto'

// ─── Separator used to encode smart playlist header ───────────────────────────
// Must NOT be a character that encodeURIComponent leaves unencoded.
// encodeURIComponent encodes everything except: A–Z a–z 0–9 - _ . ! ~ * ' ( )
// We use "||" as delimiter so colons inside the JSON value never split it.
const SMART_PLAYLIST_SEP = '||'

// ─── Input validation schemas ──────────────────────────────────────────────────

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
  provider: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().optional()
})
const downloadIdSchema = z.string().min(1)

const deleteSongSchema = z.object({
  songId: z.string().min(1),
  deleteFile: z.boolean()
})

// Phase 4 Schemas
const syncDeviceSchema = z.object({
  devicePath: z.string().min(1),
  songs: z.array(z.any())
})
const backupDeviceSchema = z.string().min(1)
const restoreDeviceSchema = z.object({
  devicePath: z.string().min(1),
  backupPath: z.string().min(1)
})
const enableVirtualDeviceSchema = z.string().min(1)

// Phase 5 Schemas
const installPluginSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  description: z.string(),
  type: z.enum(['downloader', 'lyrics'])
})
const aiCleanupSuggestSchema = z.string().min(1)
const createSmartPlaylistSchema = z.object({
  name: z.string().min(1),
  rules: z.string().min(1) // JSON formatted string representing filters
})

const searchCatalogSchema = z.object({
  query: z.string(),
  filters: z.object({
    year: z.string().optional(),
    decade: z.string().optional(),
    movie: z.string().optional(),
    artist: z.string().optional(),
    composer: z.string().optional(),
    lyricist: z.string().optional(),
    genre: z.string().optional(),
    mood: z.string().optional(),
    downloaded: z.boolean().optional(),
    favorite: z.boolean().optional()
  }),
  sorting: z.string(),
  limit: z.number().int().nonnegative().optional(),
  offset: z.number().int().nonnegative().optional()
})

const importCatalogSchema = z.object({
  filePath: z.string().min(1),
  format: z.enum(['json', 'csv'])
})

const toggleFavoriteSchema = z.object({
  id: z.string().min(1),
  isFav: z.boolean()
})

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Initialize Download Service
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

  // Library Scanning — fire-and-forget; errors reported via scan-progress event
  ipcMain.handle('scan-library', (_event, folderPath: unknown) => {
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

    // Check if it's a Smart Playlist (name starts with "smart:rule||")
    const db = getDb()
    const playlist = db.select().from(playlists).where(eq(playlists.id, parsedId)).get()

    if (playlist && playlist.name.startsWith(`smart:rule${SMART_PLAYLIST_SEP}`)) {
      try {
        // Format: "smart:rule||<encodedRules>||<humanName>"
        const withoutPrefix = playlist.name.slice(`smart:rule${SMART_PLAYLIST_SEP}`.length)
        const sepIndex = withoutPrefix.indexOf(SMART_PLAYLIST_SEP)
        const encodedRules = sepIndex !== -1 ? withoutPrefix.slice(0, sepIndex) : withoutPrefix
        const ruleData = JSON.parse(decodeURIComponent(encodedRules)) as { field: string; value: string }

        const allSongs = db.select().from(songsTable).all()
        return allSongs.filter((song) => {
          if (ruleData.field === 'artist') {
            return (song.artist || '').toLowerCase().includes(ruleData.value.toLowerCase())
          } else if (ruleData.field === 'genre') {
            return (song.genre || '').toLowerCase().includes(ruleData.value.toLowerCase())
          } else if (ruleData.field === 'year') {
            return String(song.year ?? '') === ruleData.value
          }
          return false
        })
      } catch (err) {
        console.error('Failed to parse smart playlist rules:', err)
        return []
      }
    }

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

  ipcMain.handle('delete-song', async (_event, payload: unknown) => {
    const { songId, deleteFile } = deleteSongSchema.parse(payload)
    await LibraryService.deleteSong(songId, deleteFile)
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
    return DownloadService.search(parsedQuery)
  })

  ipcMain.handle('add-to-download-queue', async (_event, payload: unknown) => {
    const parsedTrack = addDownloadSchema.parse(payload) as SearchResult
    return DownloadService.addToQueue(parsedTrack)
  })

  ipcMain.handle('get-download-queue', async () => {
    return DownloadService.getQueue()
  })

  ipcMain.handle('get-download-history', async () => {
    return DownloadService.getHistory()
  })

  ipcMain.handle('clear-download-history', async () => {
    DownloadService.clearHistory()
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

  // --- Phase 4 Handlers ---

  // Device Management & Sync
  ipcMain.handle('get-connected-devices', async () => {
    return DeviceService.getConnectedDevices()
  })

  ipcMain.handle('sync-device', async (_event, payload: unknown) => {
    // Rename destructured var to avoid shadowing the songsTable import
    const { devicePath, songs: songsList } = syncDeviceSchema.parse(payload)
    await DeviceService.syncDevice(devicePath, songsList, mainWindow)
  })

  ipcMain.handle('backup-device', async (_event, devicePath: unknown) => {
    const parsedPath = backupDeviceSchema.parse(devicePath)
    return DeviceService.backupDevice(parsedPath)
  })

  ipcMain.handle('restore-device', async (_event, payload: unknown) => {
    const { devicePath, backupPath } = restoreDeviceSchema.parse(payload)
    await DeviceService.restoreDevice(devicePath, backupPath)
  })

  ipcMain.handle('enable-virtual-device', async (_event, dirName: unknown) => {
    const parsedName = enableVirtualDeviceSchema.parse(dirName)
    return DeviceService.enableVirtualDevice(parsedName)
  })

  ipcMain.handle('disable-virtual-device', async () => {
    DeviceService.setSimulatedPath(null)
  })

  // --- Phase 5 Handlers ---

  // Plugin SDK
  ipcMain.handle('get-installed-plugins', async () => {
    return PluginService.getInstalledPlugins()
  })

  ipcMain.handle('install-plugin', async (_event, payload: unknown) => {
    const manifest = installPluginSchema.parse(payload)
    await PluginService.installPlugin(manifest)
  })

  // AI Tag Cleanup Heuristics
  ipcMain.handle('ai-cleanup-suggest', async (_event, songId: unknown) => {
    const parsedId = aiCleanupSuggestSchema.parse(songId)
    return AiService.suggestCleanup(parsedId)
  })

  // Create Smart Playlist
  // Name is stored as:  "smart:rule||<encodedRules>||<humanName>"
  // Using "||" as separator so colons inside JSON never corrupt the split.
  ipcMain.handle('create-smart-playlist', async (_event, payload: unknown) => {
    const { name, rules } = createSmartPlaylistSchema.parse(payload)

    const encodedName = `smart:rule${SMART_PLAYLIST_SEP}${encodeURIComponent(rules)}${SMART_PLAYLIST_SEP}${name}`
    const db = getDb()
    const id = crypto.randomUUID()
    const nowStr = new Date().toISOString()

    await db.insert(playlists).values({
      id,
      name: encodedName,
      createdAt: nowStr
    })

    return { id, name, createdAt: nowStr }
  })

  // Library Analytics & Storage Statistics
  ipcMain.handle('get-library-analytics', async () => {
    const db = getDb()
    const allSongs = db.select().from(songsTable).all()

    const totalSongs = allSongs.length
    const totalDuration = allSongs.reduce((acc, s) => acc + (s.duration ?? 0), 0)

    // Approximate disk size in MB: (bitrate kbps * duration s) / 8 / 1024
    const totalSize = allSongs.reduce((acc, s) => {
      const bitrate = s.bitrate ?? 0
      const duration = s.duration ?? 0
      return acc + (bitrate > 0 && duration > 0 ? (bitrate * duration) / 8 / 1024 : 0)
    }, 0)

    const formats: Record<string, number> = {}
    const genres: Record<string, number> = {}
    const artistsCount: Record<string, number> = {}

    for (const song of allSongs) {
      const codec = (song.codec || 'unknown').toLowerCase()
      formats[codec] = (formats[codec] || 0) + 1

      const genre = song.genre || 'Unknown'
      genres[genre] = (genres[genre] || 0) + 1

      const artist = song.artist || 'Unknown Artist'
      artistsCount[artist] = (artistsCount[artist] || 0) + 1
    }

    return {
      totalSongs,
      totalDuration,
      totalSize,
      formats,
      genres,
      artists: Object.keys(artistsCount).length
    }
  })

  // --- Bollywood Catalog Handlers ---

  ipcMain.handle('search-catalog-songs', async (_event, payload: unknown) => {
    const { query, filters, sorting, limit, offset } = searchCatalogSchema.parse(payload)
    return SearchService.searchSongs(query, filters, sorting, limit, offset)
  })

  ipcMain.handle('import-catalog', async (_event, payload: unknown) => {
    const { filePath, format } = importCatalogSchema.parse(payload)
    if (format === 'json') {
      return CatalogImporter.importFromJson(filePath)
    } else {
      return CatalogImporter.importFromCsv(filePath)
    }
  })

  ipcMain.handle('generate-perf-catalog', async (_event, count: unknown) => {
    const parsedCount = z.number().int().positive().parse(count)
    await generatePerformanceTestData(parsedCount)
  })

  ipcMain.handle('get-movie-details', async (_event, title: unknown) => {
    const parsedTitle = z.string().min(1).parse(title)
    const db = getDb()
    const movie = db.select().from(movies).where(eq(movies.title, parsedTitle)).get()
    if (!movie) return null
    // Fetch songs for this movie
    const movieSongs = db.select().from(songsTable).where(eq(songsTable.movie, parsedTitle)).all()
    return { ...movie, songs: movieSongs }
  })

  ipcMain.handle('get-artist-details', async (_event, name: unknown) => {
    const parsedName = z.string().min(1).parse(name)
    const db = getDb()
    const artist = db.select().from(artists).where(eq(artists.name, parsedName)).get()
    
    // Fetch songs where this artist is featured
    const artistSongs = db.select()
      .from(songsTable)
      .where(eq(songsTable.artist, parsedName))
      .all()
    
    const uniqueMovies = Array.from(new Set(artistSongs.map((s) => s.movie).filter(Boolean)))

    return { 
      artist: artist || { id: crypto.createHash('md5').update(parsedName).digest('hex'), name: parsedName, bio: 'Playback singer in Bollywood movies.', image: '' }, 
      songs: artistSongs,
      movies: uniqueMovies
    }
  })

  ipcMain.handle('toggle-favorite-song', async (_event, payload: unknown) => {
    const { id, isFav } = toggleFavoriteSchema.parse(payload)
    const db = getDb()
    await db.update(songsTable).set({ favorite: isFav ? 1 : 0 }).where(eq(songsTable.id, id))
  })

  ipcMain.handle('toggle-favorite-artist', async (_event, payload: unknown) => {
    const { id, isFav } = toggleFavoriteSchema.parse(payload)
    const db = getDb()
    await db.update(artists).set({ favorite: isFav ? 1 : 0 }).where(eq(artists.id, id))
  })

  ipcMain.handle('toggle-favorite-movie', async (_event, payload: unknown) => {
    const { id, isFav } = toggleFavoriteSchema.parse(payload)
    const db = getDb()
    await db.update(movies).set({ favorite: isFav ? 1 : 0 }).where(eq(movies.id, id))
  })

  // Listening History & Recommendation Engine
  ipcMain.handle('increment-play-count', async (_event, songId: unknown) => {
    const parsedId = z.string().min(1).parse(songId)
    const db = getDb()
    const song = db.select().from(songsTable).where(eq(songsTable.id, parsedId)).get()
    if (song) {
      await db.update(songsTable).set({
        playCount: (song.playCount ?? 0) + 1,
        lastPlayed: new Date().toISOString()
      }).where(eq(songsTable.id, parsedId))
    }
  })

  ipcMain.handle('get-recommendations', async () => {
    const db = getDb()
    const favSongs = db.select().from(songsTable).where(eq(songsTable.favorite, 1)).all()
    
    // Fallback: If no favorites, recommend top popular tracks
    if (favSongs.length === 0) {
      return db.select().from(songsTable).orderBy(desc(songsTable.popularity)).limit(10).all()
    }

    const matchedGenres = new Set(favSongs.map((s) => s.genre).filter(Boolean))
    const matchedArtists = new Set(favSongs.map((s) => s.artist).filter(Boolean))

    const pool = db.select().from(songsTable).where(eq(songsTable.favorite, 0)).limit(100).all()
    const recommended = pool.filter((s) => matchedGenres.has(s.genre) || matchedArtists.has(s.artist)).slice(0, 10)

    if (recommended.length < 5) {
      const popular = db.select().from(songsTable).orderBy(desc(songsTable.popularity)).limit(10).all()
      return Array.from(new Set([...recommended, ...popular])).slice(0, 10)
    }

    return recommended
  })

  ipcMain.handle('reveal-file', async (_event, filePath: unknown) => {
    const parsedPath = z.string().parse(filePath)
    shell.showItemInFolder(parsedPath)
  })
}
