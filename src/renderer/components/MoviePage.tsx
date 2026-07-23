import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  Tooltip,
  Chip
} from '@mui/material'
import {
  ArrowBack,
  Favorite,
  FavoriteBorder,
  MusicNote,
  PlayArrow,
  CloudDownload,
  CheckCircle,
  Movie as MovieIcon
} from '@mui/icons-material'
import { usePlayerStore, Song } from '../store/playerStore'

interface MoviePageProps {
  movieTitle: string
  onBack: () => void
  onSelectArtist: (name: string) => void
}

export default function MoviePage({ movieTitle, onBack, onSelectArtist }: MoviePageProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)

  const fetchMovieDetails = async () => {
    setLoading(true)
    try {
      const data = await window.electron.getMovieDetails(movieTitle)
      setDetails(data)
    } catch (err) {
      console.error('Failed to fetch movie details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovieDetails()
  }, [movieTitle])

  const handleToggleFavorite = async () => {
    if (!details) return
    const isFav = details.favorite === 1
    try {
      await window.electron.toggleFavoriteMovie(details.id, !isFav)
      setDetails((prev: any) => ({
        ...prev,
        favorite: isFav ? 0 : 1
      }))
    } catch (err) {
      console.error('Failed to toggle movie favorite:', err)
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
        <Typography variant="body1" color="text.secondary">Loading movie details...</Typography>
      </Box>
    )
  }

  if (!details) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 3 }}>Back to Catalog</Button>
        <Typography variant="h6">Movie details not found.</Typography>
      </Box>
    )
  }

  const cast = details.castJson ? JSON.parse(details.castJson) : []
  
  // Extract all unique genres from songs
  const genres = Array.from(
    new Set((details.songs || []).map((s: any) => s.genre).filter(Boolean))
  ) as string[]

  return (
    <Box sx={{ p: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 4, textTransform: 'none' }}>
        Back to Catalog
      </Button>

      {/* Header section with placeholder cover layout */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4} md={3}>
          <Box
            sx={{
              aspectRatio: '2/3',
              width: '100%',
              borderRadius: 2,
              backgroundColor: '#1c1c1e',
              border: '1px solid #27272a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
            }}
          >
            <MovieIcon sx={{ fontSize: 64, color: '#48484a', mb: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {movieTitle}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={8} md={9}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>
              {movieTitle}
            </Typography>
            <IconButton onClick={handleToggleFavorite} color={details.favorite === 1 ? 'error' : 'default'}>
              {details.favorite === 1 ? <Favorite fontSize="large" /> : <FavoriteBorder fontSize="large" />}
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Chip label={`${details.year || 'Unknown Year'}`} size="small" variant="outlined" />
            {genres.map((g) => (
              <Chip key={g} label={g} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Director</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{details.director || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Music Director</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {details.songs[0]?.composer || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Starring</Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {cast.join(', ') || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Soundtrack list */}
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
        Soundtrack / Songs ({(details.songs || []).length})
      </Typography>

      <Paper sx={{ border: '1px solid #27272a', p: 2 }}>
        <List>
          {(details.songs || []).map((song: any, index: number) => {
            const isCurrent = currentSong?.id === song.id
            const singers = song.artistsJson ? JSON.parse(song.artistsJson) : [song.artist]

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
                <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', width: 24, textAlign: 'center' }}>
                    {index + 1}
                  </Typography>

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

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: isCurrent ? 'primary.main' : 'text.primary' }}>
                      {song.title}
                    </Typography>
                    
                    {/* Interactive Singer Buttons */}
                    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', mt: 0.5 }}>
                      {singers.map((singer: string) => (
                        <Button
                          key={singer}
                          size="small"
                          onClick={() => onSelectArtist(singer)}
                          sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '11px', p: 0, minWidth: 0, mr: 1 }}
                        >
                          {singer}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
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
    </Box>
  )
}
