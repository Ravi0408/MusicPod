import React from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemButton
} from '@mui/material'
import {
  MusicNote,
  People,
  Album,
  FolderCopy,
  QueueMusic
} from '@mui/icons-material'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore, Song } from '../store/playerStore'

export default function Dashboard() {
  const songs = useLibraryStore((state) => state.songs)
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)

  // Calculate stats
  const totalSongs = songs.length
  const uniqueArtists = new Set(songs.map((s) => s.artist).filter(Boolean)).size
  const uniqueAlbums = new Set(songs.map((s) => s.album).filter(Boolean)).size

  // Recent songs (latest added)
  const recentSongs = React.useMemo(() => {
    return [...songs].slice(-5).reverse()
  }, [songs])

  const handlePlaySong = (song: Song) => {
    setQueue(songs)
    setCurrentSong(song)
  }

  const statCards = [
    { title: 'Total Songs', value: totalSongs, icon: <MusicNote sx={{ fontSize: 32 }} />, color: '#2196f3' },
    { title: 'Artists', value: uniqueArtists, icon: <People sx={{ fontSize: 32 }} />, color: '#9c27b0' },
    { title: 'Albums', value: uniqueAlbums, icon: <Album sx={{ fontSize: 32 }} />, color: '#4caf50' }
  ]

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={4} key={idx}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  backgroundColor: `${card.color}15`,
                  color: card.color,
                  ml: 2
                }}
              >
                {card.icon}
              </Box>
              <CardContent sx={{ flex: '1 0 auto' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid #27272a' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Recently Added
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recentSongs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No songs in the library. Go to Folder Scanner to add music!
              </Typography>
            ) : (
              <List disablePadding>
                {recentSongs.map((song) => (
                  <ListItem disablePadding key={song.id} sx={{ mb: 1 }}>
                    <ListItemButton onClick={() => handlePlaySong(song)} sx={{ borderRadius: 1.5 }}>
                      <ListItemAvatar>
                        {song.coverPath ? (
                          <Avatar
                            variant="rounded"
                            src={`media://${encodeURIComponent(song.coverPath)}`}
                            alt={song.title}
                          />
                        ) : (
                          <Avatar variant="rounded" sx={{ backgroundColor: 'background.default' }}>
                            <MusicNote />
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={song.title}
                        secondary={song.artist || 'Unknown Artist'}
                        primaryTypographyProps={{ noWrap: true, fontWeight: 500 }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid #27272a' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              System Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              <ListItem>
                <ListItemText primary="Environment" secondary="Development Mode (Electron + Vite)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Database" secondary="Local SQLite (WAL Mode)" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Audio Support" secondary="MP3, FLAC, M4A, WAV, AAC, ALAC" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
