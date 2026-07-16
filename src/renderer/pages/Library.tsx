import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  InputAdornment
} from '@mui/material'
import {
  PlayArrow,
  Search,
  MusicNote,
  Timer
} from '@mui/icons-material'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore, Song } from '../store/playerStore'

export default function Library() {
  const songs = useLibraryStore((state) => state.songs)
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)

  const [searchQuery, setSearchQuery] = useState('')

  const handlePlaySong = (song: Song) => {
    setQueue(filteredSongs)
    setCurrentSong(song)
  }

  const filteredSongs = React.useMemo(() => {
    if (!searchQuery) return songs
    const query = searchQuery.toLowerCase()
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        (song.artist && song.artist.toLowerCase().includes(query)) ||
        (song.album && song.album.toLowerCase().includes(query))
    )
  }, [songs, searchQuery])

  const formatDuration = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          My Music Library
        </Typography>

        <TextField
          placeholder="Search by Title, Artist or Album..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 350 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {filteredSongs.length === 0 ? (
        <Paper
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            p: 4,
            border: '1px solid #27272a'
          }}
        >
          <MusicNote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No songs found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search query, or use the Folder Scanner to import music folders.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto', border: '1px solid #27272a' }}>
          <Table stickyHeader size="medium">
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell width={60}>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Artist</TableCell>
                <TableCell>Album</TableCell>
                <TableCell>Format</TableCell>
                <TableCell align="right" width={100}>
                  <Timer fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id
                return (
                  <TableRow
                    key={song.id}
                    hover
                    selected={isCurrent}
                    onClick={() => handlePlaySong(song)}
                    sx={{ cursor: 'pointer', '&.Mui-selected': { backgroundColor: 'action.selected' } }}
                  >
                    <TableCell onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}>
                      <IconButton size="small" color={isCurrent ? 'primary' : 'default'}>
                        <PlayArrow />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      {song.coverPath ? (
                        <Avatar
                          variant="rounded"
                          src={`media://${encodeURIComponent(song.coverPath)}`}
                          alt={song.title}
                          sx={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 40, height: 40, backgroundColor: 'background.default' }}>
                          <MusicNote />
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: isCurrent ? 'primary.main' : 'text.primary' }}>
                      {song.title}
                    </TableCell>
                    <TableCell color="text.secondary">{song.artist || 'Unknown Artist'}</TableCell>
                    <TableCell color="text.secondary">{song.album || 'Unknown Album'}</TableCell>
                    <TableCell color="text.secondary">
                      {song.codec?.toUpperCase() || 'MP3'} {song.bitrate ? `(${song.bitrate} kbps)` : ''}
                    </TableCell>
                    <TableCell align="right" color="text.secondary">
                      {formatDuration(song.duration)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
