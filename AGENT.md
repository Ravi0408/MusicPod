# AGENT.md

## Mission

Build a production-quality Electron desktop application called **MusicDock**.

Goal:
A fast, offline-first local music manager with metadata editing, media conversion, device synchronization, and extensible download providers.

Never build unnecessary complexity.

---

# Core Principles

- Simplicity over cleverness
- Feature-first architecture
- Strong typing
- Small reusable components
- Zero duplicated logic
- Maintainable code
- Offline-first
- Fast startup
- Native desktop experience

---

# Tech Stack

Electron
React
TypeScript
Vite
Material UI
React Router
Zustand
React Hook Form
Zod
better-sqlite3
Drizzle ORM
electron-store
music-metadata
node-id3
Sharp
FFmpeg
Chokidar
electron-log

Never introduce Express, NestJS, Docker, GraphQL or REST.

---

# Architecture

Renderer

↓

IPC

↓

Services

↓

Repositories

↓

SQLite / Filesystem

Renderer never accesses Node directly.

Always use preload APIs.

---

# Folder Structure

src/

    main/

        ipc/

        services/

        repositories/

        database/

        utils/

    renderer/

        pages/

        layouts/

        components/

        dialogs/

        hooks/

        store/

        theme/

Shared/

Assets/

Storage/

---

# Layers

UI

↓

Hooks

↓

Store

↓

IPC Client

↓

IPC Handler

↓

Service

↓

Repository

↓

SQLite / Filesystem

Never skip layers.

---

# Component Rules

One responsibility.

No component over ~250 lines.

Extract reusable logic immediately.

Pages only compose components.

Business logic never lives inside UI.

---

# Services

Each feature owns one service.

Examples

LibraryService

MetadataService

ArtworkService

PlayerService

ConverterService

DeviceService

SettingsService

ScannerService

HistoryService

DownloadService

---

# Database

SQLite only.

Repositories own SQL.

Services never write SQL.

---

# State

Use Zustand.

Separate stores by feature.

No global mega store.

---

# IPC

Strongly typed.

One handler per feature.

Validate input with Zod.

Never expose Node APIs.

---

# UI

Material UI only.

Responsive.

Dark-first.

Keyboard shortcuts.

Context menus.

Lazy loading.

---

# Code Style

Strict TypeScript.

Prefer const.

Prefer early return.

No any.

No magic strings.

Small functions.

Readable names.

---

# Naming

PascalCase

Components

Services

Dialogs

camelCase

functions

variables

UPPER_CASE

constants

---

# Error Handling

Never swallow errors.

Log everything.

Show friendly messages.

Recover whenever possible.

---

# Performance

Lazy load routes.

Virtualize large lists.

Debounce search.

Cache metadata.

Avoid unnecessary renders.

Never block UI thread.

Move heavy work to Electron main.

---

# Security

Context Isolation ON

Node Integration OFF

Strict IPC

CSP enabled

No eval

Validate everything

---

# Features

Library

Search

Metadata

Artwork

Playlists

Downloads

History

Converter

Duplicates

Folder Scanner

Settings

Devices

Player

---

# Future

Plugin system.

Provider system.

AI metadata repair.

Additional devices.

---

# Git

Small commits.

One feature per PR.

No unrelated changes.

---

# Before Coding

Ask:

Is this simpler?

Can it be reused?

Can it be smaller?

Does it follow architecture?

Would another developer understand it immediately?

If not, redesign.

---

# Golden Rule

Prefer the simplest correct solution.

Optimize readability before optimization.
