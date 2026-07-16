import { create } from 'zustand'

export interface Song {
  id: string
  title: string
  artist: string | null
  album: string | null
  genre: string | null
  year: number | null
  track: number | null
  disc: number | null
  duration: number
  filePath: string
  coverPath: string | null
  bitrate: number | null
  sampleRate: number | null
  codec: string | null
}

interface PlayerState {
  currentSong: Song | null
  queue: Song[]
  history: Song[]
  isPlaying: boolean
  volume: number // 0 to 1
  isMuted: boolean
  isShuffle: boolean
  isRepeat: 'none' | 'all' | 'one'
  currentTime: number
  duration: number
  
  setCurrentSong: (song: Song | null) => void
  setQueue: (queue: Song[]) => void
  addToQueue: (song: Song) => void
  playNext: () => void
  playPrevious: () => void
  togglePlay: () => void
  setIsPlaying: (isPlaying: boolean) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  history: [],
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  isRepeat: 'none',
  currentTime: 0,
  duration: 0,

  setCurrentSong: (song) => {
    if (song) {
      set((state) => ({
        currentSong: song,
        isPlaying: true,
        // Add to history if not already the latest
        history: state.history[0]?.id === song.id ? state.history : [song, ...state.history].slice(0, 50)
      }))
    } else {
      set({ currentSong: null, isPlaying: false })
    }
  },

  setQueue: (queue) => set({ queue }),

  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),

  playNext: () => {
    const { queue, currentSong, isShuffle, isRepeat } = get()
    if (queue.length === 0) return

    let nextIndex = 0
    if (currentSong) {
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * queue.length)
      } else if (currentIndex !== -1) {
        if (currentIndex < queue.length - 1) {
          nextIndex = currentIndex + 1
        } else if (isRepeat === 'all') {
          nextIndex = 0
        } else {
          set({ isPlaying: false })
          return
        }
      }
    }

    set({ currentSong: queue[nextIndex], isPlaying: true, currentTime: 0 })
  },

  playPrevious: () => {
    const { queue, currentSong, isShuffle } = get()
    if (queue.length === 0) return

    let prevIndex = 0
    if (currentSong) {
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
      if (isShuffle) {
        prevIndex = Math.floor(Math.random() * queue.length)
      } else if (currentIndex > 0) {
        prevIndex = currentIndex - 1
      } else {
        prevIndex = queue.length - 1
      }
    }

    set({ currentSong: queue[prevIndex], isPlaying: true, currentTime: 0 })
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setVolume: (volume) => set({ volume }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  toggleRepeat: () => set((state) => {
    const nextMap: Record<'none' | 'all' | 'one', 'none' | 'all' | 'one'> = {
      none: 'all',
      all: 'one',
      one: 'none'
    }
    return { isRepeat: nextMap[state.isRepeat] }
  }),

  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration })
}))
