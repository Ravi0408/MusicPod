import { getDb } from '../database/db'
import { songs, movies } from '../database/schema'
import { eq, like, and } from 'drizzle-orm'

export interface CatalogMetadata {
  title?: string
  movie?: string
  album?: string
  year?: number
  artists?: string[]
  composers?: string[]
  lyricists?: string[]
  genres?: string[]
  moods?: string[]
  duration?: number
  director?: string
  cast?: string[]
  poster?: string
  lyrics?: string
}

export interface IMetadataProvider {
  name: string
  fetchMetadata(title: string, movie?: string): Promise<CatalogMetadata | null>
}

/**
 * 1. Local Database Provider (Offline)
 */
export class LocalDbProvider implements IMetadataProvider {
  name = 'Local Database'

  async fetchMetadata(title: string, movie?: string): Promise<CatalogMetadata | null> {
    try {
      const db = getDb()
      let songRecord

      if (movie) {
        songRecord = db.select()
          .from(songs)
          .where(
            and(
              like(songs.title, `%${title}%`),
              like(songs.movie, `%${movie}%`)
            )
          )
          .get()
      } else {
        songRecord = db.select()
          .from(songs)
          .where(like(songs.title, `%${title}%`))
          .get()
      }

      if (!songRecord) return null

      // Get movie details if available
      let movieRecord
      if (songRecord.movie) {
        movieRecord = db.select()
          .from(movies)
          .where(eq(movies.title, songRecord.movie))
          .get()
      }

      const artistsList = songRecord.artistsJson ? JSON.parse(songRecord.artistsJson) : (songRecord.artist ? [songRecord.artist] : [])
      const composersList = songRecord.composersJson ? JSON.parse(songRecord.composersJson) : (songRecord.composer ? [songRecord.composer] : [])
      const lyricistsList = songRecord.lyricistsJson ? JSON.parse(songRecord.lyricistsJson) : []
      const genresList = songRecord.genresJson ? JSON.parse(songRecord.genresJson) : (songRecord.genre ? [songRecord.genre] : [])
      const moodsList = songRecord.moodsJson ? JSON.parse(songRecord.moodsJson) : []
      const castList = movieRecord?.castJson ? JSON.parse(movieRecord.castJson) : []

      return {
        title: songRecord.title,
        movie: songRecord.movie || undefined,
        album: songRecord.album || undefined,
        year: songRecord.year || undefined,
        artists: artistsList,
        composers: composersList,
        lyricists: lyricistsList,
        genres: genresList,
        moods: moodsList,
        duration: songRecord.duration || undefined,
        director: movieRecord?.director || undefined,
        cast: castList,
        poster: movieRecord?.poster || undefined,
        lyrics: songRecord.lyrics || undefined
      }
    } catch (err) {
      console.error('LocalDbProvider fetch failed:', err)
      return null
    }
  }
}

/**
 * 2. MusicBrainz API Provider (Online)
 */
export class MusicBrainzProvider implements IMetadataProvider {
  name = 'MusicBrainz'

  async fetchMetadata(title: string, movie?: string): Promise<CatalogMetadata | null> {
    try {
      const q = movie 
        ? `recording:"${title}" AND release:"${movie}"` 
        : `recording:"${title}"`
      
      const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(q)}&fmt=json`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MusicPod/1.0.0 ( ravi@ravi.com )' }
      })

      if (!res.ok) return null
      const data = await res.json() as any
      const record = data.recordings?.[0]
      if (!record) return null

      const artists = record['artist-credit']?.map((ac: any) => ac.name) || []
      const release = record.releases?.[0]
      const year = release?.date ? parseInt(release.date.substring(0, 4), 10) : undefined

      return {
        title: record.title || title,
        movie: release?.title || movie,
        album: release?.title,
        year,
        artists,
        duration: record.length ? Math.round(record.length / 1000) : undefined
      }
    } catch (err) {
      console.warn('MusicBrainzProvider fetch failed (offline or blocked):', err)
      return null
    }
  }
}

/**
 * 3. Spotify API Provider (Online)
 */
export class SpotifyProvider implements IMetadataProvider {
  name = 'Spotify'

  async fetchMetadata(title: string, movie?: string): Promise<CatalogMetadata | null> {
    // Spotify search requires a client token. Since we don't assume client credentials config
    // is set up, we query Spotify's public embed proxy search or return null if unconfigured.
    try {
      const query = movie ? `track:${title} album:${movie}` : `track:${title}`
      const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${encodeURIComponent(query)}`
      // We can also query standard Spotify search if user inputs keys in settings.
      // For now, we stub a safe HTTP request to check if online
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`)
      if (res.status === 401) {
        // Requires OAuth, skip unless configured
        return null
      }
      const data = await res.json() as any
      const track = data.tracks?.items?.[0]
      if (!track) return null

      return {
        title: track.name,
        album: track.album?.name,
        artists: track.artists?.map((a: any) => a.name) || [],
        duration: Math.round(track.duration_ms / 1000),
        year: track.album?.release_date ? parseInt(track.album.release_date.substring(0, 4), 10) : undefined,
        poster: track.album?.images?.[0]?.url
      }
    } catch {
      // Safe fallback
      return null
    }
  }
}

/**
 * 4. Wikipedia API Provider (Online)
 */
export class WikipediaProvider implements IMetadataProvider {
  name = 'Wikipedia'

  async fetchMetadata(title: string, movie?: string): Promise<CatalogMetadata | null> {
    try {
      const searchTarget = movie || title
      if (!searchTarget) return null

      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTarget + ' film')}&format=json&origin=*`
      const searchRes = await fetch(searchUrl)
      if (!searchRes.ok) return null

      const searchData = await searchRes.json() as any
      const pageId = searchData.query?.search?.[0]?.pageid
      if (!pageId) return null

      // Fetch page info to try to find director/cast
      const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*`
      const infoRes = await fetch(infoUrl)
      if (!infoRes.ok) return null

      const infoData = await infoRes.json() as any
      const extract = infoData.query?.pages?.[pageId]?.extract || ''

      // Basic regex parsing to pull out Director
      const directorMatch = extract.match(/directed by ([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/)
      const director = directorMatch ? directorMatch[1] : undefined

      return {
        movie: movie || searchTarget,
        director
      }
    } catch {
      return null
    }
  }
}

/**
 * Metadata Provider Manager
 * Implements priority-based cascading metadata merges
 */
export class MetadataProviderManager {
  private static providers: IMetadataProvider[] = [
    new LocalDbProvider(),
    new MusicBrainzProvider(),
    new SpotifyProvider(),
    new WikipediaProvider()
  ]

  /**
   * Cascade-fetch metadata from all providers and merge details.
   */
  static async getMergedMetadata(title: string, movie?: string): Promise<CatalogMetadata | null> {
    let merged: CatalogMetadata = {}
    let foundAny = false

    for (const provider of this.providers) {
      try {
        const data = await provider.fetchMetadata(title, movie)
        if (data) {
          merged = this.merge(merged, data)
          foundAny = true
        }
      } catch (err) {
        console.error(`Provider ${provider.name} failed:`, err)
      }
    }

    return foundAny ? merged : null
  }

  /**
   * Merge two metadata objects without overwriting existing fields unless patch is more detailed.
   */
  private static merge(base: CatalogMetadata, patch: CatalogMetadata): CatalogMetadata {
    const uniqueArray = (arr1?: string[], arr2?: string[]) => {
      const set = new Set([...(arr1 || []), ...(arr2 || [])])
      return Array.from(set).filter(Boolean)
    }

    return {
      title: base.title || patch.title,
      movie: base.movie || patch.movie,
      album: base.album || patch.album,
      year: base.year || patch.year,
      artists: uniqueArray(base.artists, patch.artists),
      composers: uniqueArray(base.composers, patch.composers),
      lyricists: uniqueArray(base.lyricists, patch.lyricists),
      genres: uniqueArray(base.genres, patch.genres),
      moods: uniqueArray(base.moods, patch.moods),
      duration: base.duration || patch.duration,
      director: base.director || patch.director,
      cast: uniqueArray(base.cast, patch.cast),
      poster: base.poster || patch.poster,
      lyrics: base.lyrics || patch.lyrics
    }
  }
}
