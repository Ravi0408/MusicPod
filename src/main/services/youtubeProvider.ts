import { spawn, ChildProcess } from 'child_process'
import path from 'path'

export interface YoutubeSearchResult {
  videoId: string
  title: string
  uploader: string
  duration: number      // seconds
  thumbnailUrl: string
  watchUrl: string
}

export interface DownloadProgress {
  percent: number
  speed: string
  eta: string
}

// yt-dlp binary path — prefer system install, fall back to PATH
const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp'

/**
 * Wraps yt-dlp for YouTube search and audio-only downloads.
 * Requires yt-dlp and ffmpeg to be installed on the system.
 */
export class YouTubeProvider {
  /**
   * Search YouTube and return up to 5 results.
   * Uses yt-dlp's built-in ytsearch: prefix — no API key required.
   */
  static async search(query: string): Promise<YoutubeSearchResult[]> {
    return new Promise((resolve, reject) => {
      const args = [
        `ytsearch15:${query}`,
        '--dump-json',
        '--no-download',
        '--no-playlist',
        '--quiet'
      ]

      const proc = spawn(YT_DLP, args)
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (chunk) => { stdout += chunk.toString() })
      proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

      proc.on('close', (code) => {
        if (code !== 0 && !stdout) {
          reject(new Error(`yt-dlp search failed (code ${code}): ${stderr}`))
          return
        }

        const results: YoutubeSearchResult[] = []
        // yt-dlp outputs one JSON object per line (NDJSON)
        for (const line of stdout.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const entry = JSON.parse(trimmed)
            results.push({
              videoId: entry.id,
              title: entry.title || 'Unknown',
              uploader: entry.uploader || entry.channel || 'Unknown Artist',
              duration: Math.round(entry.duration || 0),
              thumbnailUrl: entry.thumbnail || '',
              watchUrl: entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`
            })
          } catch {
            // Skip malformed lines
          }
        }
        resolve(results)
      })

      proc.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('yt-dlp is not installed. Install it with: brew install yt-dlp'))
        } else {
          reject(err)
        }
      })
    })
  }

  /**
   * Download audio from a YouTube URL and convert to MP3.
   * Returns a ChildProcess so the caller can kill it to cancel.
   * Progress events are emitted via the onProgress callback.
   * Resolves with the final output file path.
   */
  static download(
    watchUrl: string,
    outputDir: string,
    title: string,
    onProgress: (progress: DownloadProgress) => void
  ): { promise: Promise<string>; process: ChildProcess } {
    // Sanitize title for use as filename
    const safeTitle = title.replace(/[^\w\s\-\.]/g, '').trim() || 'download'
    const outputTemplate = path.join(outputDir, `${safeTitle}.%(ext)s`)

    const args = [
      watchUrl,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',            // best quality
      '--embed-thumbnail',
      '--add-metadata',
      '--no-playlist',
      '--newline',                        // one progress line per update
      '--output', outputTemplate,
      '--quiet',
      '--progress'
    ]

    const proc = spawn(YT_DLP, args)
    let stderr = ''

    const promise = new Promise<string>((resolve, reject) => {
      let lastLine = ''

      proc.stdout.on('data', (chunk) => {
        const text: string = chunk.toString()
        lastLine += text

        // Parse progress lines: "[download]  42.3% of  4.23MiB at  1.23MiB/s ETA 00:03"
        const progressMatch = lastLine.match(
          /\[download\]\s+([\d.]+)%.*?at\s+([\d.]+ ?[KMG]iB\/s).*?ETA\s+([\d:]+)/
        )
        if (progressMatch) {
          onProgress({
            percent: Math.round(parseFloat(progressMatch[1])),
            speed: progressMatch[2],
            eta: progressMatch[3]
          })
          lastLine = ''
        }
      })

      proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

      proc.on('close', (code) => {
        if (code === 0 || code === null) {
          // yt-dlp writes the final filename with .mp3 extension
          const finalPath = path.join(outputDir, `${safeTitle}.mp3`)
          resolve(finalPath)
        } else {
          reject(new Error(`yt-dlp download failed (code ${code}): ${stderr}`))
        }
      })

      proc.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('yt-dlp is not installed. Install it with: brew install yt-dlp'))
        } else {
          reject(err)
        }
      })
    })

    return { promise, process: proc }
  }
}
