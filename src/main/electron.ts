import { app, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import fs from 'fs'
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

/**
 * Serve a local file with proper Range request support so the browser's
 * <audio> element can seek freely.  Without 206 Partial Content responses,
 * audioElement.currentTime writes are silently ignored.
 */
function handleMediaProtocol(request: Request): Response {
  const encodedPath = request.url.slice('media://'.length)
  const filePath = decodeURIComponent(encodedPath)

  let stat: fs.Stats
  try {
    stat = fs.statSync(filePath)
  } catch {
    return new Response('File not found', { status: 404 })
  }

  const fileSize = stat.size
  const rangeHeader = request.headers.get('range')

  if (rangeHeader) {
    // Parse "bytes=start-end"
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
    if (!match) {
      return new Response('Invalid range', { status: 416 })
    }

    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const stream = fs.createReadStream(filePath, { start, end })

    // Convert Node.js ReadableStream → Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      },
      cancel() {
        stream.destroy()
      }
    })

    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': getMimeType(filePath)
      }
    })
  }

  // No Range header — serve the whole file
  const stream = fs.createReadStream(filePath)
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    }
  })

  return new Response(webStream, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
      'Content-Type': getMimeType(filePath)
    }
  })
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.alac': 'audio/mp4',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  }
  return mimeMap[ext] ?? 'application/octet-stream'
}

app.whenReady().then(() => {
  // Initialize Database
  initDb()

  // Register media:// custom protocol with Range request support for seeking
  protocol.handle('media', handleMediaProtocol)

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
