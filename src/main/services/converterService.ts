import { spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import { parseFile } from 'music-metadata'

export interface ConversionProgress {
  filePath: string
  progress: number
  status: 'converting' | 'done' | 'error'
  outputFilePath?: string
}

export class ConverterService {
  static async convert(
    filePath: string,
    outputFormat: string,
    preset: string,
    mainWindow: BrowserWindow
  ): Promise<string> {
    const metadata = await parseFile(filePath)
    const duration = metadata.format.duration || 0
    if (duration <= 0) {
      throw new Error('Could not read track duration')
    }

    const convertedDir = path.join(app.getPath('userData'), 'converted')
    await fs.ensureDir(convertedDir)

    const baseName = path.basename(filePath, path.extname(filePath))
    const ext = `.${outputFormat.toLowerCase()}`
    const outputFilePath = path.join(convertedDir, `${baseName}_converted${ext}`)

    // Clean up existing file if any
    if (await fs.pathExists(outputFilePath)) {
      await fs.remove(outputFilePath)
    }

    let codecArgs: string[] = []
    if (outputFormat === 'mp3') {
      const bitrate = preset === 'lossless' || preset === 'High Quality' ? '320k' : '192k'
      codecArgs = ['-codec:a', 'libmp3lame', '-b:a', bitrate]
    } else if (outputFormat === 'aac') {
      codecArgs = ['-codec:a', 'aac', '-b:a', '256k']
    } else if (outputFormat === 'wav') {
      codecArgs = ['-codec:a', 'pcm_s16le']
    } else if (outputFormat === 'alac') {
      codecArgs = ['-codec:a', 'alac']
    } else {
      codecArgs = ['-codec:a', 'copy']
    }

    const args = [
      '-y',
      '-i', filePath,
      ...codecArgs,
      '-progress', 'pipe:1',
      outputFilePath
    ]

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.stdout.on('data', (data) => {
        const text = data.toString()
        const match = text.match(/out_time_ms=(\d+)/)
        if (match) {
          const timeMs = parseInt(match[1]) / 1000 // to seconds
          const progress = Math.min(Math.round((timeMs / duration) * 100), 99)
          
          mainWindow.webContents.send('conversion-progress', {
            filePath,
            progress,
            status: 'converting'
          } as ConversionProgress)
        }
      })

      ffmpeg.stderr.on('data', () => {
        // Suppress stderr debugging spam
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          mainWindow.webContents.send('conversion-progress', {
            filePath,
            progress: 100,
            status: 'done',
            outputFilePath
          } as ConversionProgress)
          resolve(outputFilePath)
        } else {
          mainWindow.webContents.send('conversion-progress', {
            filePath,
            progress: 0,
            status: 'error'
          } as ConversionProgress)
          reject(new Error(`ffmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', (err) => {
        mainWindow.webContents.send('conversion-progress', {
          filePath,
          progress: 0,
          status: 'error'
        } as ConversionProgress)
        reject(err)
      })
    })
  }
}
