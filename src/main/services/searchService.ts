import { getDb } from '../database/db'

export interface AdvancedFilters {
  year?: string
  decade?: string
  movie?: string
  artist?: string
  composer?: string
  lyricist?: string
  genre?: string
  mood?: string
  downloaded?: boolean
  favorite?: boolean
}

export class SearchService {
  /**
   * Execute fuzzy search across FTS5 tables and combine with advanced filters/sorting.
   */
  static searchSongs(
    query: string,
    filters: AdvancedFilters,
    sorting: string,
    limit?: number,
    offset?: number
  ): { songs: any[]; total: number } {
    const db = getDb()
    const rawDb = db.session.client as any

    let baseSql = ` FROM songs s`
    const params: Record<string, any> = {}
    const whereConditions: string[] = []

    const cleanQuery = query.trim()
    if (cleanQuery) {
      // Split query into terms, clean special chars, append * for prefix search
      const terms = cleanQuery
        .split(/\s+/)
        .map((t) => `${t.replace(/[*"':]/g, '')}*`)
        .filter((t) => t.length > 1)
        .join(' ')

      if (terms) {
        baseSql = ` FROM songs s INNER JOIN songs_fts f ON s.id = f.id`
        whereConditions.push(`f.songs_fts MATCH :ftsQuery`)
        params.ftsQuery = terms
      }
    }

    // Advanced Filters
    if (filters.year) {
      whereConditions.push(`s.year = :year`)
      params.year = parseInt(filters.year, 10)
    }
    if (filters.decade) {
      whereConditions.push(`s.decade = :decade`)
      params.decade = filters.decade
    }
    if (filters.movie) {
      whereConditions.push(`s.movie LIKE :movie`)
      params.movie = `%${filters.movie}%`
    }
    if (filters.artist) {
      whereConditions.push(`(s.artist LIKE :artist OR s.artists_json LIKE :artist)`)
      params.artist = `%${filters.artist}%`
    }
    if (filters.composer) {
      whereConditions.push(`(s.composer LIKE :composer OR s.composers_json LIKE :composer)`)
      params.composer = `%${filters.composer}%`
    }
    if (filters.lyricist) {
      whereConditions.push(`s.lyricists_json LIKE :lyricist`)
      params.lyricist = `%${filters.lyricist}%`
    }
    if (filters.genre) {
      whereConditions.push(`(s.genre LIKE :genre OR s.genres_json LIKE :genre)`)
      params.genre = `%${filters.genre}%`
    }
    if (filters.mood) {
      whereConditions.push(`s.moods_json LIKE :mood`)
      params.mood = `%${filters.mood}%`
    }
    if (filters.downloaded !== undefined) {
      whereConditions.push(`s.downloaded = :downloaded`)
      params.downloaded = filters.downloaded ? 1 : 0
    }
    if (filters.favorite !== undefined) {
      whereConditions.push(`s.favorite = :favorite`)
      params.favorite = filters.favorite ? 1 : 0
    }

    if (whereConditions.length > 0) {
      baseSql += ` WHERE ` + whereConditions.join(' AND ')
    }

    // 1. Get total match count
    const countSql = `SELECT COUNT(*) as total` + baseSql
    const countStmt = rawDb.prepare(countSql)
    const countResult = countStmt.get(params) as { total: number }
    const total = countResult ? countResult.total : 0

    // 2. Fetch paginated/sorted rows
    let sql = `SELECT s.*` + baseSql

    // Sorting
    switch (sorting) {
      case 'popularity':
        sql += ` ORDER BY s.popularity DESC`
        break
      case 'year':
        sql += ` ORDER BY s.year DESC`
        break
      case 'title':
        sql += ` ORDER BY s.title ASC`
        break
      case 'recentlyPlayed':
        sql += ` ORDER BY s.last_played DESC`
        break
      case 'mostPlayed':
        sql += ` ORDER BY s.play_count DESC`
        break
      case 'recentlyAdded':
        sql += ` ORDER BY s.created_at DESC`
        break
      default:
        sql += ` ORDER BY s.popularity DESC`
    }

    // Pagination
    if (limit !== undefined && limit !== null) {
      sql += ` LIMIT :limit`
      params.limit = limit
    }
    if (offset !== undefined && offset !== null) {
      sql += ` OFFSET :offset`
      params.offset = offset
    }

    const stmt = rawDb.prepare(sql)
    const songs = stmt.all(params)

    return { songs, total }
  }
}
