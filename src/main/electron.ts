import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import { initDb } from './database/db'
import { registerIpcHandlers } from './ipc/ipcHandlers'

// Register the media protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    title: 'MusicDock'
  })

  // Set CSP headers in HTML webContents response
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; media-src 'self' media:; img-src 'self' media: data:; connect-src 'self' ws://localhost:* http://localhost:* http://127.0.0.1:* ws://127.0.0.1:*"
        ]
      }
    })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Initialize Database
  initDb()

  // Register media:// custom protocol to safely load local music files
  protocol.handle('media', (request) => {
    const encodedPath = request.url.slice('media://'.length)
    const filePath = decodeURIComponent(encodedPath)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  createWindow()

  // Register IPC Handlers
  if (mainWindow) {
    registerIpcHandlers(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      if (mainWindow) {
        registerIpcHandlers(mainWindow)
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
