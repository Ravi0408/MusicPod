import React, { useEffect, useState, useMemo } from 'react'
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
  ListItemButton,
  Stack,
  LinearProgress
} from '@mui/material'
import {
  MusicNote,
  People,
  Album,
  FolderCopy,
  QueueMusic,
  AccessTime,
  BarChart,
  HardDrive
} from '@mui/icons-material'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore, Song } from '../store/playerStore'

interface Analytics {
  totalSongs: number
  totalDuration: number
  totalSize: number
  formats: Record<string, number>
  genres: Record<string, number>
  artists: number
}

export default function Dashboard() {
  const songs = useLibraryStore((state) => state.songs)
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    window.electron.getLibraryAnalytics().then((res) => {
      setAnalytics(res)
    }).catch(console.error)
  }, [songs])

  // Recent songs (latest added)
  const recentSongs = useMemo(() => {
    return [...songs].slice(-5).reverse()
  }, [songs])

  const handlePlaySong = (song: Song) => {
    setQueue(songs)
    setCurrentSong(song)
  }

  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600)
    const minutes = Math.floor((secs % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes} mins`
  }

  const formatSize = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb.toFixed(0)} MB`
  }

  const statCards = [
    {
      title: 'Total Songs',
      value: songs.length,
      icon: <MusicNote sx={{ fontSize: 32 }} />,
      color: '#2196f3'
    },
    {
      title: 'Artists',
      value: analytics?.artists || 0,
      icon: <People sx={{ fontSize: 32 }} />,
      color: '#9c27b0'
    },
    {
      title: 'Library Size',
      value: formatSize(analytics?.totalSize || 0),
      icon: <FolderCopy sx={{ fontSize: 32 }} />,
      color: '#4caf50'
    },
    {
      title: 'Total Time',
      value: formatDuration(analytics?.totalDuration || 0),
      icon: <AccessTime sx={{ fontSize: 32 }} />,
      color: '#ff9800'
    }
  ]

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', overflowY: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
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
        {/* Recently Added */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid #27272a', minHeight: 320 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Recently Added
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recentSongs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
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

        {/* Library Format & Analytics breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid #27272a', minHeight: 320 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart />
              Format Analytics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {analytics && Object.keys(analytics.formats).length > 0 ? (
              <Stack spacing={3} sx={{ py: 1 }}>
                {Object.entries(analytics.formats).map(([format, count]) => {
                  const percent = Math.round((count / songs.length) * 100)
                  return (
                    <Box key={format}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                          {format}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {count} tracks ({percent}%)
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        color={format === 'flac' || format === 'alac' ? 'success' : 'primary'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                No format data available. Scan your library directory to generate analytics.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
