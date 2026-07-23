import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema>

export function initDb(): BetterSQLite3Database<typeof schema> {
  if (db) return db

  const userDataPath = app.getPath('userData')
  fs.ensureDirSync(userDataPath)
  const dbPath = path.join(userDataPath, 'musicdock.db')

  const sqlite = new Database(dbPath)
  
  // Performance optimizations for SQLite
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')

  // Auto-detect outdated schema and drop to trigger fresh creation
  try {
    const tableInfo = sqlite.prepare("PRAGMA table_info(songs)").all() as any[]
    const hasMovie = tableInfo.some((col) => col.name === 'movie')
    const fileClass = tableInfo.find((col) => col.name === 'file_path')
    const isFilePathNotNull = fileClass ? fileClass.notnull === 1 : false

    if (tableInfo.length > 0 && (!hasMovie || isFilePathNotNull)) {
      console.log('Outdated or strictly non-null file_path schema detected. Migrating database...')
      sqlite.exec(`
        DROP TRIGGER IF EXISTS songs_ai;
        DROP TRIGGER IF EXISTS songs_ad;
        DROP TRIGGER IF EXISTS songs_au;
        DROP TABLE IF EXISTS songs_fts;
        DROP TABLE IF EXISTS playlist_songs;
        DROP TABLE IF EXISTS playlists;
        DROP TABLE IF EXISTS downloads;
        DROP TABLE IF EXISTS albums;
        DROP TABLE IF EXISTS artists;
        DROP TABLE IF EXISTS movies;
        DROP TABLE IF EXISTS songs;
      `)
    }

    // Check if the FTS5 virtual table was created with content=''
    const sqliteMaster = sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='songs_fts'").get() as any
    if (sqliteMaster && sqliteMaster.sql && sqliteMaster.sql.includes("content=''")) {
      console.log('Upgrading contentless FTS5 table to standard mutable FTS5 table...')
      sqlite.exec(`
        DROP TRIGGER IF EXISTS songs_ai;
        DROP TRIGGER IF EXISTS songs_ad;
        DROP TRIGGER IF EXISTS songs_au;
        DROP TABLE IF EXISTS songs_fts;
      `)
    }
  } catch (err) {
    console.error('Migration precheck failed:', err)
  }

  // Create tables manually to avoid runtime migration dependency issues
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      genre TEXT,
      year INTEGER,
      track INTEGER,
      disc INTEGER,
      composer TEXT,
      lyrics TEXT,
      rating INTEGER,
      duration INTEGER,
      bitrate INTEGER,
      sample_rate INTEGER,
      channels INTEGER,
      codec TEXT,
      file_path TEXT, -- Nullable now
      cover_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      
      -- Catalog fields
      movie TEXT,
      decade TEXT,
      artists_json TEXT,
      composers_json TEXT,
      lyricists_json TEXT,
      genres_json TEXT,
      moods_json TEXT,
      popularity INTEGER DEFAULT 0,
      tags_json TEXT,
      search_keywords_json TEXT,
      youtube_query TEXT,
      downloaded INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      last_played TEXT
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      image TEXT,
      bio TEXT,
      popularity INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      year INTEGER,
      cover TEXT,
      favorite INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      year INTEGER,
      director TEXT,
      cast_json TEXT,
      poster TEXT,
      favorite INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      output_path TEXT
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      PRIMARY KEY (playlist_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Standard Database Indices
    CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
    CREATE INDEX IF NOT EXISTS idx_songs_movie ON songs(movie);
    CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
    CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year);

    -- FTS5 Full Text Search Virtual Table
    CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
      id UNINDEXED,
      title,
      movie,
      artists,
      composers,
      lyricists,
      genres,
      moods,
      tags
    );

    -- Triggers to keep songs_fts in sync
    CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
      INSERT INTO songs_fts(id, title, movie, artists, composers, lyricists, genres, moods, tags)
      VALUES (new.id, new.title, new.movie, new.artists_json, new.composers_json, new.lyricists_json, new.genres_json, new.moods_json, new.tags_json);
    END;

    CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
      DELETE FROM songs_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
      DELETE FROM songs_fts WHERE id = old.id;
      INSERT INTO songs_fts(id, title, movie, artists, composers, lyricists, genres, moods, tags)
      VALUES (new.id, new.title, new.movie, new.artists_json, new.composers_json, new.lyricists_json, new.genres_json, new.moods_json, new.tags_json);
    END;
  `)

  db = drizzle(sqlite, { schema })

  // Seed verified Bollywood catalog on first run
  import('./seedCatalog').then(({ seedCatalog }) => {
    seedCatalog().catch((err) => console.error('Failed to seed catalog:', err))
  })

  return db
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    return initDb()
  }
  return db
}
