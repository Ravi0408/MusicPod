import React, { useState, useEffect, useRef } from 'react'
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
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Avatar,
  TablePagination
} from '@mui/material'
import {
  Search,
  CloudDownload,
  PlayArrow,
  Favorite,
  FavoriteBorder,
  YouTube,
  CheckCircle,
  AccountCircle,
  Movie as MovieIcon
} from '@mui/icons-material'
import { usePlayerStore, Song } from '../store/playerStore'

interface CatalogListProps {
  onSelectArtist: (name: string) => void
  onSelectMovie: (title: string) => void
}

export default function CatalogList({ onSelectArtist, onSelectMovie }: CatalogListProps) {
  const [query, setQuery] = useState('')
  const [songsList, setSongsList] = useState<any[]>([])
  const [sorting, setSorting] = useState('popularity')
  
  // Filters
  const [decade, setDecade] = useState('')
  const [genre, setGenre] = useState('')
  const [downloadedOnly, setDownloadedOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)

  const fetchSongs = async (resetPage = false) => {
    setLoading(true)
    try {
      const currentPage = resetPage ? 0 : page
      if (resetPage) setPage(0)

      const filters = {
        decade: decade || undefined,
        genre: genre || undefined,
        downloaded: downloadedOnly ? true : undefined,
        favorite: favoritesOnly ? true : undefined
      }

      const offset = currentPage * rowsPerPage

      // Invoke FTS5 Fuzzy search in SQLite via bridge
      const response = await window.electron.searchCatalogSongs(
        query.trim(),
        filters,
        sorting,
        rowsPerPage,
        offset
      )
      setSongsList(response?.songs || [])
      setTotalCount(response?.total || 0)
    } catch (err) {
      console.error('Failed to query catalog:', err)
    } finally {
      setLoading(false)
    }
  }

  // Reload when query, filters, or sorting changes (resets page to 0)
  useEffect(() => {
    fetchSongs(true)
  }, [query, decade, genre, downloadedOnly, favoritesOnly, sorting])

  // Reload when page or rowsPerPage changes
  useEffect(() => {
    fetchSongs(false)
  }, [page, rowsPerPage])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handlePlay = (song: any) => {
    if (song.downloaded) {
      // Map catalog song format to player Song format
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
      setQueue(songsList.filter((s) => s.downloaded).map((s) => ({
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

  const handleToggleFavorite = async (songId: string, currentFav: number) => {
    try {
      const isFav = currentFav === 1
      await window.electron.toggleFavoriteSong(songId, !isFav)
      // Refetch locally
      setSongsList((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, favorite: isFav ? 0 : 1 } : s))
      )
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const handleQueueDownload = async (song: any) => {
    try {
      // Map catalog track details to search result format for queue
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
      console.error('Failed to queue catalog track download:', err)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search & Filter Header */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid #27272a', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            placeholder="Fuzzy search by Title, Movie, Singer, Composer, Tag..."
            size="small"
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Decade</InputLabel>
            <Select value={decade} label="Decade" onChange={(e) => setDecade(e.target.value)}>
              <MenuItem value="">All Decades</MenuItem>
              <MenuItem value="1970s">1970s</MenuItem>
              <MenuItem value="1980s">1980s</MenuItem>
              <MenuItem value="1990s">1990s</MenuItem>
              <MenuItem value="2000s">2000s</MenuItem>
              <MenuItem value="2010s">2010s</MenuItem>
              <MenuItem value="2020s">2020s</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Genre</InputLabel>
            <Select value={genre} label="Genre" onChange={(e) => setGenre(e.target.value)}>
              <MenuItem value="">All Genres</MenuItem>
              <MenuItem value="Romantic">Romantic</MenuItem>
              <MenuItem value="Sad">Sad</MenuItem>
              <MenuItem value="Dance">Dance</MenuItem>
              <MenuItem value="Wedding">Wedding</MenuItem>
              <MenuItem value="Pop">Pop</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sorting} label="Sort By" onChange={(e) => setSorting(e.target.value)}>
              <MenuItem value="popularity">Popularity</MenuItem>
              <MenuItem value="year">Release Year</MenuItem>
              <MenuItem value="title">Song Title</MenuItem>
              <MenuItem value="recentlyPlayed">Recently Played</MenuItem>
              <MenuItem value="mostPlayed">Most Played</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={downloadedOnly}
                onChange={(e) => setDownloadedOnly(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Downloaded Only</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
            }
            label={<Typography variant="body2">Favorites Only</Typography>}
          />
        </Stack>
      </Paper>

      {/* Songs Catalog Table */}
      <TableContainer
        component={Paper}
        sx={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #27272a',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Movie</TableCell>
              <TableCell>Singers</TableCell>
              <TableCell>Composer</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell align="center" width={140}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {songsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                  No songs match the current query or filters.
                </TableCell>
              </TableRow>
            ) : (
              songsList.map((song) => {
                const isCurrent = currentSong?.id === song.id
                const singers = song.artistsJson ? JSON.parse(song.artistsJson) : [song.artist]

                return (
                  <TableRow key={song.id} hover selected={isCurrent}>
                    <TableCell>
                      {song.downloaded === 1 ? (
                        <IconButton size="small" color="primary" onClick={() => handlePlay(song)}>
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      ) : (
                        <Tooltip title="Not downloaded yet. Download below.">
                          <Box sx={{ pl: 1 }}>
                            <YouTube sx={{ color: 'text.secondary', opacity: 0.5, fontSize: 18 }} />
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: isCurrent ? 'primary.main' : 'text.primary' }}>
                      {song.title}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<MovieIcon fontSize="inherit" />}
                        onClick={() => onSelectMovie(song.movie)}
                        sx={{ textTransform: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                      >
                        {song.movie}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', maxWidth: 220 }}>
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
                    </TableCell>
                    <TableCell>{song.composer}</TableCell>
                    <TableCell align="right">{formatDuration(song.duration)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                        <IconButton
                          size="small"
                          onClick={() => handleToggleFavorite(song.id, song.favorite)}
                          color={song.favorite === 1 ? 'error' : 'default'}
                        >
                          {song.favorite === 1 ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                        </IconButton>

                        {song.downloaded === 1 ? (
                          <Tooltip title="Downloaded & ready to play">
                            <CheckCircle color="success" sx={{ fontSize: 18, mx: 1 }} />
                          </Tooltip>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CloudDownload sx={{ fontSize: 12 }} />}
                            onClick={() => handleQueueDownload(song)}
                            sx={{ py: 0.25, px: 1, fontSize: '11px', textTransform: 'none' }}
                          >
                            Get
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Footer */}
      <TablePagination
        rowsPerPageOptions={[25, 50, 100, 200]}
        component={Paper}
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          border: '1px solid #27272a',
          borderTop: 'none',
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8
        }}
      />
    </Box>
  )
}
