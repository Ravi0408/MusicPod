import { create } from 'zustand'
import { AccentColor } from '../theme/theme'

interface SettingsState {
  accentColor: AccentColor
  scanFolder: string | null
  setAccentColor: (color: AccentColor) => void
  setScanFolder: (folder: string | null) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  accentColor: 'purple', // purple by default for MusicDock
  scanFolder: null,
  setAccentColor: (accentColor) => set({ accentColor }),
  setScanFolder: (scanFolder) => set({ scanFolder })
}))
