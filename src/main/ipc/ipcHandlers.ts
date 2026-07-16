import { ipcMain, dialog, BrowserWindow } from 'electron'
import { z } from 'zod'
import { LibraryService } from '../services/libraryService'

const scanLibrarySchema = z.string().min(1)

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('ping', () => {
    return 'pong'
  })

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('scan-library', async (_event, folderPath: unknown) => {
    const parsed = scanLibrarySchema.safeParse(folderPath)
    if (!parsed.success) {
      throw new Error('Invalid folder path')
    }
    // Trigger scanning asynchronously to avoid blocking the initial IPC call return
    LibraryService.scanFolder(parsed.data, mainWindow).catch((err) => {
      console.error('Scan error in IPC handler:', err)
    })
    return
  })

  ipcMain.handle('get-songs', async () => {
    return LibraryService.getSongs()
  })
}
