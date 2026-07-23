import { contextBridge, ipcRenderer } from 'electron'

export interface ScanProgress {
  scanned: number
  total: number
  currentFile?: string
  status: 'scanning' | 'done' | 'error'
}

export interface EditableTags {
  title: string
  artist?: string
  album?: string
  genre?: string
  year?: number | null
  track?: number | null
  disc?: number | null
}

const electronAPI = {
  ping: (): Promise<string> => ipcRenderer.invoke('ping'),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  scanLibrary: (folderPath: string): Promise<void> => ipcRenderer.invoke('scan-library', folderPath),
  getSongs: (): Promise<any[]> => ipcRenderer.invoke('get-songs'),
  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const subscription = (_event: any, progress: ScanProgress) => callback(progress)
    ipcRenderer.on('scan-progress', subscription)
    return () => {
      ipcRenderer.removeListener('scan-progress', subscription)
    }
  },

  // Metadata Updates
  updateSongMetadata: (songId: string, tags: EditableTags): Promise<void> => 
    ipcRenderer.invoke('update-song-metadata', { songId, tags }),

  // Artwork Updates
  selectArtworkImage: (): Promise<string | null> => ipcRenderer.invoke('select-artwork-image'),
  updateSongArtwork: (songId: string, imagePath: string): Promise<string> => 
    ipcRenderer.invoke('update-song-artwork', { songId, imagePath }),

  // Playlists CRUD
  getPlaylists: (): Promise<any[]> => ipcRenderer.invoke('get-playlists'),
  createPlaylist: (name: string): Promise<any> => ipcRenderer.invoke('create-playlist', name),
  deletePlaylist: (id: string): Promise<void> => ipcRenderer.invoke('delete-playlist', id),
  getPlaylistSongs: (playlistId: string): Promise<any[]> => ipcRenderer.invoke('get-playlist-songs', playlistId),
  addSongToPlaylist: (playlistId: string, songId: string): Promise<void> => 
    ipcRenderer.invoke('add-song-to-playlist', { playlistId, songId }),
  removeSongFromPlaylist: (playlistId: string, songId: string): Promise<void> => 
    ipcRenderer.invoke('remove-song-from-playlist', { playlistId, songId }),
  exportPlaylistM3U: (playlistId: string): Promise<boolean> => 
    ipcRenderer.invoke('export-playlist-m3u', playlistId),

  // --- Phase 3 APIs ---

  // Audio Converter
  convertFile: (filePath: string, outputFormat: string, preset: string): Promise<string> =>
    ipcRenderer.invoke('convert-file', { filePath, outputFormat, preset }),
  onConversionProgress: (callback: (progress: any) => void): (() => void) => {
    const subscription = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('conversion-progress', subscription)
    return () => {
      ipcRenderer.removeListener('conversion-progress', subscription)
    }
  },

  // Duplicate Finder
  findDuplicates: (method: 'hash' | 'metadata'): Promise<any[]> =>
    ipcRenderer.invoke('find-duplicates', method),
  trashSong: (songId: string): Promise<void> =>
    ipcRenderer.invoke('trash-song', songId),
  deleteSong: (songId: string, deleteFile: boolean): Promise<void> =>
    ipcRenderer.invoke('delete-song', { songId, deleteFile }),

  // Folder Watcher
  startWatchingFolder: (folderPath: string): Promise<void> =>
    ipcRenderer.invoke('start-watching-folder', folderPath),
  stopWatchingFolder: (folderPath: string): Promise<void> =>
    ipcRenderer.invoke('stop-watching-folder', folderPath),
  onLibraryUpdated: (callback: () => void): (() => void) => {
    const subscription = () => callback()
    ipcRenderer.on('library-updated', subscription)
    return () => {
      ipcRenderer.removeListener('library-updated', subscription)
    }
  },

  // Download Manager
  searchDownloads: (query: string): Promise<any[]> =>
    ipcRenderer.invoke('search-downloads', query),
  addToDownloadQueue: (track: any): Promise<string> =>
    ipcRenderer.invoke('add-to-download-queue', track),
  getDownloadQueue: (): Promise<any[]> =>
    ipcRenderer.invoke('get-download-queue'),
  getDownloadHistory: (): Promise<any[]> =>
    ipcRenderer.invoke('get-download-history'),
  clearDownloadHistory: (): Promise<void> =>
    ipcRenderer.invoke('clear-download-history'),
  pauseDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke('cancel-download', id),
  onDownloadQueueUpdated: (callback: (queue: any[]) => void): (() => void) => {
    const subscription = (_event: any, queue: any[]) => callback(queue)
    ipcRenderer.on('download-queue-updated', subscription)
    return () => {
      ipcRenderer.removeListener('download-queue-updated', subscription)
    }
  },
  revealFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('reveal-file', filePath),

  // --- Phase 4 APIs ---

  // Device Management & Sync
  getConnectedDevices: (): Promise<any[]> => ipcRenderer.invoke('get-connected-devices'),
  syncDevice: (devicePath: string, songs: any[]): Promise<void> =>
    ipcRenderer.invoke('sync-device', { devicePath, songs }),
  backupDevice: (devicePath: string): Promise<string> =>
    ipcRenderer.invoke('backup-device', devicePath),
  restoreDevice: (devicePath: string, backupPath: string): Promise<void> =>
    ipcRenderer.invoke('restore-device', { devicePath, backupPath }),
  enableVirtualDevice: (dirName: string): Promise<string> =>
    ipcRenderer.invoke('enable-virtual-device', dirName),
  disableVirtualDevice: (): Promise<void> =>
    ipcRenderer.invoke('disable-virtual-device'),
  onSyncProgress: (callback: (progress: any) => void): (() => void) => {
    const subscription = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('sync-progress', subscription)
    return () => {
      ipcRenderer.removeListener('sync-progress', subscription)
    }
  },

  // --- Phase 5 APIs ---

  // Plugins, AI Cleanup, Smart Playlists, & Analytics
  getInstalledPlugins: (): Promise<any[]> => ipcRenderer.invoke('get-installed-plugins'),
  installPlugin: (manifest: any): Promise<void> => ipcRenderer.invoke('install-plugin', manifest),
  aiCleanupSuggest: (songId: string): Promise<any> => ipcRenderer.invoke('ai-cleanup-suggest', songId),
  createSmartPlaylist: (name: string, rules: string): Promise<any> =>
    ipcRenderer.invoke('create-smart-playlist', { name, rules }),
  getLibraryAnalytics: (): Promise<any> => ipcRenderer.invoke('get-library-analytics'),

  // Catalog & Recommendations
  searchCatalogSongs: (
    query: string,
    filters: any,
    sorting: string,
    limit?: number,
    offset?: number
  ): Promise<{ songs: any[]; total: number }> =>
    ipcRenderer.invoke('search-catalog-songs', { query, filters, sorting, limit, offset }),
  importCatalog: (filePath: string, format: 'json' | 'csv'): Promise<any> =>
    ipcRenderer.invoke('import-catalog', { filePath, format }),
  generatePerfCatalog: (count: number): Promise<void> =>
    ipcRenderer.invoke('generate-perf-catalog', count),
  getMovieDetails: (title: string): Promise<any> =>
    ipcRenderer.invoke('get-movie-details', title),
  getArtistDetails: (name: string): Promise<any> =>
    ipcRenderer.invoke('get-artist-details', name),
  toggleFavoriteSong: (id: string, isFav: boolean): Promise<void> =>
    ipcRenderer.invoke('toggle-favorite-song', { id, isFav }),
  toggleFavoriteArtist: (id: string, isFav: boolean): Promise<void> =>
    ipcRenderer.invoke('toggle-favorite-artist', { id, isFav }),
  toggleFavoriteMovie: (id: string, isFav: boolean): Promise<void> =>
    ipcRenderer.invoke('toggle-favorite-movie', { id, isFav }),
  incrementPlayCount: (songId: string): Promise<void> =>
    ipcRenderer.invoke('increment-play-count', songId),
  getRecommendations: (): Promise<any[]> =>
    ipcRenderer.invoke('get-recommendations')
}

contextBridge.exposeInMainWorld('electron', electronAPI)

declare global {
  interface Window {
    electron: typeof electronAPI
  }
}
