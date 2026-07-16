import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist'),
  album: text('album'),
  genre: text('genre'),
  year: integer('year'),
  track: integer('track'),
  disc: integer('disc'),
  composer: text('composer'),
  lyrics: text('lyrics'),
  rating: integer('rating'),
  duration: integer('duration'), // in seconds
  bitrate: integer('bitrate'),
  sampleRate: integer('sample_rate'),
  channels: integer('channels'),
  codec: text('codec'),
  filePath: text('file_path').notNull().unique(),
  coverPath: text('cover_path'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  image: text('image'),
  bio: text('bio')
})

export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist'),
  year: integer('year'),
  cover: text('cover')
})

export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  provider: text('provider').notNull(),
  status: text('status').notNull(), // 'pending', 'downloading', 'completed', 'failed', 'cancelled'
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  outputPath: text('output_path')
})

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').notNull()
})

export const playlistSongs = sqliteTable('playlist_songs', {
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' })
}, (table) => [
  table.playlistId,
  table.songId
])

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})
