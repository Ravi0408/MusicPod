import { create } from 'zustand'
import { Song } from './playerStore'
import { ScanProgress } from '../../main/preload'

interface LibraryState {
  songs: Song[]
  isLoading: boolean
  scanProgress: ScanProgress | null
  
  setSongs: (songs: Song[]) => void
  fetchSongs: () => Promise<void>
  setScanProgress: (progress: ScanProgress | null) => void
}

export const useLibraryStore = create<LibraryState>((set) => ({
  songs: [],
  isLoading: false,
  scanProgress: null,

  setSongs: (songs) => set({ songs }),

  fetchSongs: async () => {
    set({ isLoading: true })
    try {
      const fetchedSongs = await window.electron.getSongs()
      set({ songs: fetchedSongs, isLoading: false })
    } catch (err) {
      console.error('Failed to fetch songs:', err)
      set({ isLoading: false })
    }
  },

  setScanProgress: (scanProgress) => set({ scanProgress })
}))
