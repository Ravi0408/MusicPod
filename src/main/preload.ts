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
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)

declare global {
  interface Window {
    electron: typeof electronAPI
  }
}
