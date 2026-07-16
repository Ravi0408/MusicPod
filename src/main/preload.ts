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
    ipcRenderer.invoke('export-playlist-m3u', playlistId)
}

contextBridge.exposeInMainWorld('electron', electronAPI)

declare global {
  interface Window {
    electron: typeof electronAPI
  }
}
