import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Paper,
  Divider,
  Tooltip
} from '@mui/material'
import {
  ArrowBack,
  Favorite,
  FavoriteBorder,
  MusicNote,
  Movie as MovieIcon,
  PlayArrow,
  CloudDownload,
  CheckCircle
} from '@mui/icons-material'
import { usePlayerStore, Song } from '../store/playerStore'

interface ArtistPageProps {
  artistName: string
  onBack: () => void
  onSelectMovie: (title: string) => void
}

export default function ArtistPage({ artistName, onBack, onSelectMovie }: ArtistPageProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)

  const fetchArtistDetails = async () => {
    setLoading(true)
    try {
      const data = await window.electron.getArtistDetails(artistName)
      setDetails(data)
    } catch (err) {
      console.error('Failed to fetch artist details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArtistDetails()
  }, [artistName])

  const handleToggleFavorite = async () => {
    if (!details) return
    const isFav = details.artist.favorite === 1
    try {
      await window.electron.toggleFavoriteArtist(details.artist.id, !isFav)
      setDetails((prev: any) => ({
        ...prev,
        artist: { ...prev.artist, favorite: isFav ? 0 : 1 }
      }))
    } catch (err) {
      console.error('Failed to toggle artist favorite:', err)
    }
  }

  const handlePlay = (song: any) => {
    if (song.downloaded && details) {
      const playerSong: Song = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        genre: song.genre,
        year: song.year,
        track: song.track,
        disc: song.disc,
        duration: song.duration || 0,
        filePath: song.filePath,
        coverPath: song.coverPath,
        bitrate: song.bitrate,
        sampleRate: song.sampleRate,
        codec: song.codec
      }
      setQueue(details.songs.filter((s: any) => s.downloaded).map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        genre: s.genre,
        year: s.year,
        track: s.track,
        disc: s.disc,
        duration: s.duration || 0,
        filePath: s.filePath,
        coverPath: s.coverPath,
        bitrate: s.bitrate,
        sampleRate: s.sampleRate,
        codec: s.codec
      })))
      setCurrentSong(playerSong)
      window.electron.incrementPlayCount(song.id)
    }
  }

  const handleQueueDownload = async (song: any) => {
    try {
      const searchTrack = {
        trackId: song.id,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        album: song.movie || 'Soundtrack',
        duration: song.duration || 200,
        provider: 'YouTube',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(song.youtubeQuery)}`,
        thumbnailUrl: ''
      }
      await window.electron.addToDownloadQueue(searchTrack)
      alert(`Queued "${song.title}" for download from YouTube!`)
    } catch (err) {
      console.error('Failed to queue download:', err)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">Loading artist page...</Typography>
      </Box>
    )
  }

  if (!details) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 3 }}>Back to Catalog</Button>
        <Typography variant="h6">Artist details not found.</Typography>
      </Box>
    )
  }

  // Deduplicate and process composers worked with
  const composerList = Array.from(
    new Set((details.songs || []).map((s: any) => s.composer).filter(Boolean))
  ) as string[]

  // Determine active decades
  const decadesSet = new Set((details.songs || []).map((s: any) => s.decade).filter(Boolean))
  const decadesActive = Array.from(decadesSet).join(', ')

  return (
    <Box sx={{ p: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 4, textTransform: 'none' }}>
        Back to Catalog
      </Button>

      {/* Artist header banner */}
      <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 5 }}>
        <Avatar
          sx={{
            width: 90,
            height: 90,
            fontSize: '2.5rem',
            fontWeight: 800,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText'
          }}
        >
          {artistName.substring(0, 2).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {artistName}
            </Typography>
            <IconButton onClick={handleToggleFavorite} color={details.artist.favorite === 1 ? 'error' : 'default'}>
              {details.artist.favorite === 1 ? <Favorite fontSize="large" /> : <FavoriteBorder fontSize="large" />}
            </IconButton>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 650 }}>
            {details.artist.bio}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #27272a', backgroundColor: '#18181b' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Catalog Songs
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {details.songs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #27272a', backgroundColor: '#18181b' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Decades Active
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {decadesActive || '1990s, 2000s'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ border: '1px solid #27272a', backgroundColor: '#18181b' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Composers Partnered
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {composerList.join(', ') || 'Various'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Left Side: Filmography (Movies list) */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Movies Contributed
          </Typography>
          <Paper sx={{ border: '1px solid #27272a', p: 1 }}>
            <List>
              {(details.movies || []).length === 0 ? (
                <ListItem>
                  <ListItemText secondary="No movies indexed." />
                </ListItem>
              ) : (
                (details.movies || []).map((movie: string) => (
                  <ListItem
                    key={movie}
                    button
                    onClick={() => onSelectMovie(movie)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <MovieIcon sx={{ color: 'text.secondary', mr: 2, fontSize: 18 }} />
                    <ListItemText primary={movie} primaryTypographyProps={{ fontWeight: 600 }} />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* Right Side: Popular Tracks list */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Tracks By Artist
          </Typography>
          <Paper sx={{ border: '1px solid #27272a', p: 2 }}>
            <List>
              {(details.songs || []).map((song: any) => {
                const isCurrent = currentSong?.id === song.id
                return (
                  <ListItem
                    key={song.id}
                    sx={{
                      mb: 1,
                      borderRadius: 1.5,
                      border: '1px solid #27272a',
                      backgroundColor: isCurrent ? 'action.selected' : 'background.default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                      {song.downloaded === 1 ? (
                        <IconButton size="small" color="primary" onClick={() => handlePlay(song)}>
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      ) : (
                        <Tooltip title="Not downloaded yet">
                          <Box sx={{ p: 1 }}>
                            <MusicNote sx={{ color: 'text.secondary', opacity: 0.4, fontSize: 18 }} />
                          </Box>
                        </Tooltip>
                      )}
                      <ListItemText
                        primary={song.title}
                        secondary={`${song.movie} • Composer: ${song.composer}`}
                        primaryTypographyProps={{ fontWeight: 600, color: isCurrent ? 'primary.main' : 'text.primary' }}
                      />
                    </Stack>
                    
                    <Box sx={{ ml: 2 }}>
                      {song.downloaded === 1 ? (
                        <CheckCircle color="success" sx={{ fontSize: 18 }} />
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CloudDownload sx={{ fontSize: 12 }} />}
                          onClick={() => handleQueueDownload(song)}
                          sx={{ textTransform: 'none', py: 0.25 }}
                        >
                          Get
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                )
              })}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
