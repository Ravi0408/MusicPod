import fs from 'fs-extra'
import crypto from 'crypto'
import { getDb } from '../database/db'
import { songs, artists, albums, movies } from '../database/schema'
import { eq } from 'drizzle-orm'

export class CatalogImporter {
  /**
   * Normalize artist names:
   * e.g., "A R Rahman", "AR Rahman", "A.R Rahman" -> "A. R. Rahman"
   */
  static normalizeArtistName(name: string): string {
    let clean = name.trim()
    if (!clean) return 'Unknown Artist'

    // Match A R Rahman, A.R. Rahman, AR Rahman, A. R. Rahman, etc.
    const arRahmanRegex = /^(A\.?\s*R\.?\s*Rahman|A\s*R\s*Rahman)$/i
    if (arRahmanRegex.test(clean)) {
      return 'A. R. Rahman'
    }

    // Expand other initials if necessary, or just standard trim
    return clean
  }

  /**
   * Normalize movie names:
   * e.g., "Dil Se", "Dil Se." -> "Dil Se.."
   */
  static normalizeMovieName(name: string): string {
    let clean = name.trim()
    if (!clean) return 'Unknown Movie'

    // "Dil Se" or "Dil Se." -> "Dil Se.."
    if (/^Dil Se\.?$/i.test(clean)) {
      return 'Dil Se..'
    }

    return clean
  }

  /**
   * Import songs from a JSON file.
   * Expects an array of Song metadata objects.
   */
  static async importFromJson(filePath: string): Promise<{ imported: number; skipped: number }> {
    const rawData = await fs.readFile(filePath, 'utf-8')
    const records = JSON.parse(rawData)

    if (!Array.isArray(records)) {
      throw new Error('Invalid JSON format. Expected an array of song records.')
    }

    return this.importRecords(records)
  }

  /**
   * Import songs from a CSV file.
   * Basic quote-aware CSV parser.
   */
  static async importFromCsv(filePath: string): Promise<{ imported: number; skipped: number }> {
    const rawData = await fs.readFile(filePath, 'utf-8')
    const lines = rawData.split(/\r?\n/)
    if (lines.length <= 1) {
      return { imported: 0, skipped: 0 }
    }

    const headers = this.parseCsvLine(lines[0])
    const records = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = this.parseCsvLine(line)
      const record: Record<string, any> = {}

      headers.forEach((header, index) => {
        const val = values[index] !== undefined ? values[index] : ''
        record[header.trim()] = val
      })

      // Convert fields to match Song interface expectation
      const singers = record.artists ? record.artists.split(',').map((s: string) => s.trim()) : []
      const composers = record.composers ? record.composers.split(',').map((c: string) => c.trim()) : []
      const lyricists = record.lyricists ? record.lyricists.split(',').map((l: string) => l.trim()) : []
      const genres = record.genres ? record.genres.split(',').map((g: string) => g.trim()) : []
      const moods = record.moods ? record.moods.split(',').map((m: string) => m.trim()) : []
      const tags = record.tags ? record.tags.split(',').map((t: string) => t.trim()) : []
      const searchKeywords = record.searchKeywords ? record.searchKeywords.split(',').map((k: string) => k.trim()) : []

      records.push({
        title: record.title || '',
        movie: record.movie || '',
        artists: singers,
        composers,
        lyricists,
        genres,
        moods,
        tags,
        searchKeywords,
        year: record.year ? parseInt(record.year, 10) : 2000,
        duration: record.duration ? parseInt(record.duration, 10) : 0,
        popularity: record.popularity ? parseInt(record.popularity, 10) : 50,
        youtubeQuery: record.youtubeQuery || ''
      })
    }

    return this.importRecords(records)
  }

  /**
   * Helper to parse a single line of CSV respecting double quotes
   */
  private static parseCsvLine(line: string): string[] {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  /**
   * Core bulk import with normalization, validation, and database upserts.
   */
  private static async importRecords(rawRecords: any[]): Promise<{ imported: number; skipped: number }> {
    const db = getDb()
    let imported = 0
    let skipped = 0

    // Cache unique title+movie checks to prevent duplicate imports within this batch
    const processedKeys = new Set<string>()

    // Run imports in transactional batches of 2000 for high performance
    const batchSize = 2000
    for (let offset = 0; offset < rawRecords.length; offset += batchSize) {
      const batch = rawRecords.slice(offset, offset + batchSize)
      const songsToInsert: any[] = []

      for (const record of batch) {
        const title = (record.title || '').trim()
        const rawMovie = (record.movie || '').trim()

        if (!title || !rawMovie) {
          skipped++
          continue
        }

        // Apply Data Normalization
        const normalizedMovie = this.normalizeMovieName(rawMovie)
        const dupKey = `${title.toLowerCase()}||${normalizedMovie.toLowerCase()}`

        // Deduplication: skip duplicate songs within this batch or database
        if (processedKeys.has(dupKey)) {
          skipped++
          continue
        }
        processedKeys.add(dupKey)

        const normalizedSingers = (record.artists || []).map((s: string) => this.normalizeArtistName(s))
        const normalizedComposers = (record.composers || []).map((c: string) => this.normalizeArtistName(c))
        const normalizedLyricists = (record.lyricists || []).map((l: string) => this.normalizeArtistName(l))

        const year = record.year ? parseInt(record.year, 10) : 2000
        const decade = year >= 2000 ? '2000s' : '1990s'
        const songId = crypto.createHash('md5').update(normalizedMovie + title).digest('hex')

        // Check if song already exists in the database
        const existingSong = db.select().from(songs).where(eq(songs.id, songId)).get()
        if (existingSong) {
          skipped++
          continue
        }

        // Prepare relational entity inserts
        const movieId = crypto.createHash('md5').update(normalizedMovie).digest('hex')
        await db.insert(movies).values({
          id: movieId,
          title: normalizedMovie,
          year,
          director: record.director || '',
          castJson: JSON.stringify(record.cast || []),
          poster: '',
          favorite: 0
        }).onConflictDoNothing()

        const albumTitle = record.album || `${normalizedMovie} Soundtracks`
        const albumId = crypto.createHash('md5').update(albumTitle + normalizedComposers.join(',')).digest('hex')
        await db.insert(albums).values({
          id: albumId,
          title: albumTitle,
          artist: normalizedComposers.join(', '),
          year,
          cover: '',
          favorite: 0
        }).onConflictDoNothing()

        for (const singer of normalizedSingers) {
          const singerId = crypto.createHash('md5').update(singer).digest('hex')
          await db.insert(artists).values({
            id: singerId,
            name: singer,
            image: '',
            bio: 'Artist in the Bollywood verified music catalog.',
            popularity: record.popularity || 50,
            favorite: 0
          }).onConflictDoNothing()
        }

        songsToInsert.push({
          id: songId,
          title,
          artist: normalizedSingers[0] || 'Unknown Artist',
          album: albumTitle,
          genre: record.genres?.[0] || 'Unknown',
          year,
          composer: normalizedComposers[0] || 'Unknown Composer',
          lyrics: '',
          duration: record.duration || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          movie: normalizedMovie,
          decade,
          artistsJson: JSON.stringify(normalizedSingers),
          composersJson: JSON.stringify(normalizedComposers),
          lyricistsJson: JSON.stringify(normalizedLyricists),
          genresJson: JSON.stringify(record.genres || []),
          moodsJson: JSON.stringify(record.moods || []),
          popularity: record.popularity || 50,
          tagsJson: JSON.stringify(record.tags || []),
          searchKeywordsJson: JSON.stringify(record.searchKeywords || [title, normalizedMovie]),
          youtubeQuery: record.youtubeQuery || `${title} ${normalizedMovie} official song`,
          downloaded: 0,
          favorite: 0,
          playCount: 0
        })

        imported++
      }

      // Write songs transaction batch
      if (songsToInsert.length > 0) {
        const txn = db.transaction((items) => {
          for (const item of items) {
            db.insert(songs).values(item).onConflictDoNothing().run()
          }
        })
        txn(songsToInsert)
      }
    }

    return { imported, skipped }
  }
}
