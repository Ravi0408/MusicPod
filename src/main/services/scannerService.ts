import chokidar from 'chokidar'
import { getDb } from '../database/db'
import { songs } from '../database/schema'
import { eq } from 'drizzle-orm'
import { BrowserWindow } from 'electron'
import path from 'path'
import crypto from 'crypto'
import { LibraryService } from './libraryService'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.wav', '.ogg', '.aac', '.alac'])

export class ScannerService {
  private static watchers = new Map<string, chokidar.FSWatcher>()

  static startWatching(folderPath: string, mainWindow: BrowserWindow) {
    if (this.watchers.has(folderPath)) return

    const watcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(ext)) return
      try {
        await LibraryService.importSingleFile(filePath)
      } catch (err) {
        console.error('Failed to import file on watcher add:', filePath, err)
      }
      mainWindow.webContents.send('library-updated')
    })

    watcher.on('change', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(ext)) return
      try {
        await LibraryService.importSingleFile(filePath)
      } catch (err) {
        console.error('Failed to import file on watcher change:', filePath, err)
      }
      mainWindow.webContents.send('library-updated')
    })

    watcher.on('unlink', async (filePath) => {
      const songId = crypto.createHash('md5').update(filePath).digest('hex')
      const db = getDb()
      db.delete(songs).where(eq(songs.id, songId)).run()
      mainWindow.webContents.send('library-updated')
    })

    this.watchers.set(folderPath, watcher)
  }

  static stopWatching(folderPath: string) {
    const watcher = this.watchers.get(folderPath)
    if (watcher) {
      watcher.close()
      this.watchers.delete(folderPath)
    }
  }
}
