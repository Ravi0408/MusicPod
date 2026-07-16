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
      file_path TEXT NOT NULL UNIQUE,
      cover_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      image TEXT,
      bio TEXT
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      year INTEGER,
      cover TEXT
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
  `)

  db = drizzle(sqlite, { schema })
  return db
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    return initDb()
  }
  return db
}
