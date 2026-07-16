import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Stack,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import {
  Search,
  CloudDownload,
  Pause,
  PlayArrow,
  Cancel,
  CheckCircle
} from '@mui/icons-material'

interface SearchResult {
  trackId: string
  title: string
  artist: string
  album: string
  duration: number
  provider: string
}

interface DownloadItem {
  id: string
  title: string
  provider: string
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  speed: string
  eta: string
}

export default function Downloads() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [queue, setQueue] = useState<DownloadItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Listen to queue updates from main process
  useEffect(() => {
    // Initial queue state
    window.electron.getDownloadQueue().then((q) => setQueue(q))

    const unsubscribe = window.electron.onDownloadQueueUpdated((updatedQueue) => {
      setQueue(updatedQueue)
    })
    return () => unsubscribe()
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const results = await window.electron.searchDownloads(query.trim())
      setSearchResults(results)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddToQueue = async (track: SearchResult) => {
    try {
      await window.electron.addToDownloadQueue(track)
    } catch (err) {
      console.error('Failed to add download:', err)
    }
  }

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Downloads
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search and download legal music tracks via pluggable download providers.
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Side: Search & Search Results */}
        <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <TextField
              placeholder="Search tracks or artists online..."
              size="small"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }}
            />
            <Button variant="contained" onClick={handleSearch} disabled={isSearching}>
              Search
            </Button>
          </Stack>

          <Paper sx={{ flex: 1, overflowY: 'auto', border: '1px solid #27272a', p: 2 }}>
            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <LinearProgress sx={{ width: 120 }} />
              </Box>
            ) : searchResults.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No search results. Enter a query above to search.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {searchResults.map((track) => (
                  <ListItem
                    key={track.trackId}
                    sx={{
                      mb: 1.5,
                      p: 2,
                      backgroundColor: 'background.default',
                      borderRadius: 1.5,
                      border: '1px solid #27272a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    secondaryAction={
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CloudDownload />}
                        onClick={() => handleAddToQueue(track)}
                      >
                        Queue
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={track.title}
                      secondary={`${track.artist} • ${track.album} • ${formatDuration(track.duration)}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right Side: Active Downloads Queue */}
        <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Downloads Queue
          </Typography>
          
          <TableContainer component={Paper} sx={{ flex: 1, overflowY: 'auto', border: '1px solid #27272a' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                      No active downloads in queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {item.status === 'downloading' && (
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                              {item.speed} (ETA {item.eta})
                            </Typography>
                          )}
                          {item.status === 'paused' && (
                            <Typography variant="caption" color="text.secondary">
                              Paused
                            </Typography>
                          )}
                          {item.status === 'pending' && (
                            <Typography variant="caption" color="text.secondary">
                              Pending
                            </Typography>
                          )}
                          {item.status === 'completed' && (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'success.main' }}>
                              <CheckCircle sx={{ fontSize: 14 }} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Done
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ minWidth: 100 }}>
                        <Stack spacing={0.5}>
                          <LinearProgress
                            variant="determinate"
                            value={item.progress}
                            color={item.status === 'completed' ? 'success' : 'primary'}
                          />
                          <Typography variant="caption" align="right">
                            {item.progress}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                          {item.status === 'downloading' && (
                            <IconButton size="small" onClick={() => window.electron.pauseDownload(item.id)}>
                              <Pause sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                          {item.status === 'paused' && (
                            <IconButton size="small" onClick={() => window.electron.resumeDownload(item.id)}>
                              <PlayArrow sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                          {item.status !== 'completed' && (
                            <IconButton size="small" onClick={() => window.electron.cancelDownload(item.id)} color="error">
                              <Cancel sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  )
}
