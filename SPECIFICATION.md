# MusicDock

### A Modern Local Music Manager & iPod Sync Tool

Version: 1.0 (Architecture Specification)

---

# Vision

Build a modern desktop application for managing local music libraries, editing metadata, downloading legally available media, converting audio, and synchronizing music with legacy devices such as the iPod Nano 7G.

The application is **offline-first**, requires **no backend server**, and stores all data locally.

**Primary Goals**

* No Express backend
* No REST API
* No Docker
* No cloud dependency
* One executable
* Cross-platform (Windows, macOS, Linux)
* Native desktop experience
* Fast startup
* Modern UI
* Plugin-ready architecture

---

# Tech Stack

## Desktop

* Electron
* Electron Builder

## Frontend

* React 19
* TypeScript
* Vite
* Material UI (MUI)
* React Router
* Zustand
* React Hook Form
* Zod

## Database

SQLite

ORM

Drizzle ORM

---

## Node Libraries

Filesystem

fs-extra

Metadata

music-metadata

node-id3

Artwork

Sharp

Images

Jimp

Conversion

FFmpeg

Media Information

ffprobe

Watch folders

Chokidar

Database

better-sqlite3

Settings

electron-store

Logging

electron-log

Updater

electron-updater

---

# Architecture

```
MusicDock

├── Electron Main
│
├── React Renderer
│
├── IPC Layer
│
├── Services
│
├── Database
│
├── File System
│
├── Downloader
│
├── Converter
│
├── Metadata
│
├── Artwork
│
└── Device Manager
```

Only Electron starts.

No backend.

---

# Folder Structure

```
musicdock/

src/

    main/

        electron.ts

        preload.ts

        ipc/

        services/

        database/

        repositories/

        downloader/

        converter/

        metadata/

        artwork/

        devices/

        utils/

    renderer/

        app/

        pages/

        layouts/

        components/

        dialogs/

        hooks/

        store/

        services/

        theme/

        assets/

database/

storage/

downloads/

covers/

cache/

logs/

temp/

build/

```

---

# Navigation

```
Dashboard

Library

Downloads

History

Playlists

Devices

Metadata Editor

Converter

Artwork

Duplicates

Folder Scanner

Settings
```

---

# Dashboard

Widgets

```
Total Songs

Artists

Albums

Playlists

Downloads

Storage Used

Recent Songs

Recently Added

Connected Devices

Download Queue
```

---

# Library

Features

* Search
* Sort
* Filter
* Infinite scroll
* Grid
* List
* Album view
* Artist view
* Genre view
* Folder view

Columns

```
Artwork

Title

Artist

Album

Genre

Year

Bitrate

Duration

Format

Location
```

---

# Search

Global Search

Supports

```
Song

Artist

Album

Genre

Lyrics

Filename

Folder
```

Instant Search

SQLite Full Text Search

---

# Downloads

Features

```
Queue

Pause

Resume

Retry

Cancel

Priority

Concurrent Downloads

Speed

ETA

Bandwidth Limit
```

---

# Download Sources

The application should support **pluggable download providers** rather than being tied to any one online service. Providers can include local folders, user-owned media libraries, NAS storage, or online services that explicitly permit downloading. The provider interface should be extensible so additional legal sources can be added later without changing the core application.

---

# Download History

Store

```
File

Provider

Date

Status

Duration

Folder

Errors
```

---

# Music Player

Features

```
Play

Pause

Shuffle

Repeat

Queue

Volume

Playback Speed

Mini Player

Visualizer
```

---

# Metadata Editor

Editable Fields

```
Title

Artist

Album

Album Artist

Genre

Year

Composer

Track

Disc

Comments

Lyrics

Artwork

Rating
```

Actions

```
Auto Detect

Save

Undo

Compare

Batch Edit
```

---

# Artwork Manager

Features

```
Drag Drop

Paste

Resize

Crop

Embed

Extract

Replace

Auto Search

Export
```

---

# Playlist Manager

Features

```
Create

Delete

Import

Export

Smart Playlist

Manual Playlist
```

Export

```
M3U

M3U8

PLS
```

---

# Converter

Input

```
MP3

FLAC

AAC

ALAC

WAV

OGG

M4A
```

Output

```
MP3

AAC

ALAC

WAV
```

Presets

```
iPod Nano

iPod Classic

Car Audio

Android

High Quality

Lossless
```

---

# Folder Scanner

Functions

```
Scan Folder

Recursive

Watch Folder

Auto Import

Ignore Patterns
```

---

# Duplicate Finder

Methods

```
Hash

Filename

Metadata

Audio Fingerprint
```

Actions

```
Merge

Delete

Ignore
```

---

# Device Manager

Support

```
iPod Nano

iPod Classic

USB Drives

Android MTP (future)
```

Functions

```
Sync

Import

Export

Backup

Restore

Eject
```

---

# File Manager

Functions

```
Rename

Move

Delete

Copy

Reveal

Open Folder

Duplicate

Batch Rename
```

---

# Database Schema

Songs

```
id

title

artist

album

genre

year

track

disc

composer

lyrics

rating

duration

bitrate

sampleRate

channels

codec

filePath

coverPath

createdAt

updatedAt
```

Artists

```
id

name

image

bio
```

Albums

```
id

title

artist

year

cover
```

Downloads

```
id

title

provider

status

startedAt

finishedAt

outputPath
```

Playlists

```
id

name

createdAt
```

PlaylistSongs

```
playlistId

songId
```

Settings

```
key

value
```

---

# IPC Architecture

```
Renderer

↓

Electron IPC

↓

Services

↓

Repositories

↓

SQLite

↓

Filesystem
```

No HTTP.

No localhost.

No REST.

---

# State Management

Zustand

Stores

```
LibraryStore

DownloadStore

PlayerStore

SettingsStore

DeviceStore

UIStore
```

---

# Theme

Material UI

Modes

```
Dark

Light
```

Accent Colors

```
Blue

Purple

Green

Orange
```

---

# Security

* Context Isolation enabled
* Node Integration disabled in renderer
* Strict IPC allow-list
* Validate all IPC payloads with Zod
* Content Security Policy enabled
* No `eval`
* Sanitize imported metadata before display

---

# Future Plugins

```
Lyrics Provider

Artwork Provider

Metadata Provider

Cloud Storage

Additional Device Support

AI Metadata Repair
```

---

# Milestone Roadmap

### Phase 1

* Electron shell
* React UI
* SQLite
* Library scanning
* Music player

### Phase 2

* Metadata editor
* Artwork manager
* Playlist manager
* Search

### Phase 3

* Converter
* Duplicate finder
* Folder watcher
* Download manager (provider framework)

### Phase 4

* Device manager
* iPod sync
* Backup/restore
* Auto-sync profiles

### Phase 5

* Plugin SDK
* AI-assisted metadata cleanup
* Smart playlists
* Analytics and statistics

## Notes for Antigravity

* Follow a **feature-first** folder organization.
* Use **strict TypeScript** with ESLint and Prettier.
* Keep the renderer free of direct Node.js access; all filesystem and database work must go through typed IPC services.
* Prefer reusable UI components and custom hooks.
* Make every long-running task (scanning, conversion, syncing, downloads) cancellable and report progress through IPC events.
* Design the application to work completely offline except when the user explicitly enables a provider that accesses online resources.
* Treat download providers as interchangeable plugins rather than hard-coded services, so the core application remains independent of any specific source. This also keeps the architecture adaptable to different legal content providers in the future.
