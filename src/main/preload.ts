import { contextBridge, ipcRenderer } from 'electron'

export interface ScanProgress {
  scanned: number
  total: number
  currentFile?: string
  status: 'scanning' | 'done' | 'error'
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
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)

declare global {
  interface Window {
    electron: typeof electronAPI
  }
}
