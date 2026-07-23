import { useState, useEffect } from 'react'
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
  ListItemText,
  Tabs,
  Tab,
  Chip,
  Link,
  Tooltip
} from '@mui/material'
import {
  Search,
  CloudDownload,
  Pause,
  PlayArrow,
  Cancel,
  CheckCircle,
  YouTube,
  OpenInNew,
  DeleteSweep,
  History,
  CloudDone,
  TrendingUp,
  ErrorOutline,
  FolderOpen,
  MusicNote
} from '@mui/icons-material'

interface SearchResult {
  trackId: string
  title: string
  artist: string
  album: string
  duration: number
  provider: string
  url: string
  thumbnailUrl?: string
}

interface DownloadItem {
  id: string
  title: string
  provider: string
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  speed: string
  eta: string
  startedAt?: string
  finishedAt?: string
  outputPath?: string
  error?: string
}

const SUGGESTIONS = [
  'Arijit Singh Hits',
  'Kishore Kumar Classics',
  'Lofi Bollywood Beats',
  'A.R. Rahman Masterpieces',
  'Coke Studio Season 14',
  'Punjabi Hits 2026'
]

export default function Downloads() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [queue, setQueue] = useState<DownloadItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [tab, setTab] = useState(0)
  const [history, setHistory] = useState<DownloadItem[]>([])

  const fetchHistory = async () => {
    try {
      const data = await window.electron.getDownloadHistory()
      const sorted = (data || []).sort((a, b) => {
        const ad = a.startedAt ? new Date(a.startedAt).getTime() : 0
        const bd = b.startedAt ? new Date(b.startedAt).getTime() : 0
        return bd - ad
      })
      setHistory(sorted)
    } catch (err) {
      console.error('Failed to load download history:', err)
    }
  }

  const handleClearHistory = async () => {
    try {
      await window.electron.clearDownloadHistory()
      fetchHistory()
    } catch (err) {
      console.error('Failed to clear download history:', err)
    }
  }

  useEffect(() => {
    window.electron.getDownloadQueue().then((q) => setQueue(q))

    const unsubscribe = window.electron.onDownloadQueueUpdated((updatedQueue) => {
      setQueue(updatedQueue)
      fetchHistory()
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (tab === 1) {
      fetchHistory()
    }
  }, [tab])

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return
    setIsSearching(true)
    try {
      const results = await window.electron.searchDownloads(searchTerm.trim())
      setSearchResults(results || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = () => {
    performSearch(query)
  }

  const handleSuggestionClick = (term: string) => {
    setQuery(term)
    performSearch(term)
  }

  const handleAddToQueue = async (track: SearchResult) => {
    try {
      await window.electron.addToDownloadQueue(track)
    } catch (err) {
      console.error('Failed to add download:', err)
    }
  }

  const handleRevealFile = async (outputPath?: string) => {
    if (!outputPath) return
    try {
      await window.electron.revealFile(outputPath)
    } catch (err) {
      console.error('Failed to reveal file in folder:', err)
    }
  }

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, tracking: '-0.5px' }}>
            MP3 Downloader
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search online, download high-quality MP3s instantly, and manage your download queue.
          </Typography>
        </Box>
        {queue.some((item) => item.status === 'downloading') && (
          <Chip
            label="Downloading Active"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, animation: 'pulse 1.5s infinite' }}
          />
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_e, newValue) => setTab(newValue)} aria-label="download tabs">
          <Tab label="Search & Downloads" icon={<CloudDownload />} iconPosition="start" />
          <Tab label="Completed History" icon={<History />} iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Main Search Input */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <TextField
              placeholder="Search tracks, artists, or paste YouTube video URL..."
              size="small"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: '#121214',
                  '& fieldset': { borderColor: '#27272a' },
                  '&:hover fieldset': { borderColor: 'primary.main' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={isSearching}
              sx={{ px: 4, borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
            >
              Search
            </Button>
          </Stack>

          {isSearching ? (
            <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <LinearProgress sx={{ width: 180, height: 6, borderRadius: 3, mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Scraping search results online...
              </Typography>
            </Box>
          ) : searchResults.length === 0 ? (
            /* Spacious Placeholder with Suggestions */
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center'
            }}>
              <CloudDownload sx={{ fontSize: 80, color: 'primary.main', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Find & Download MP3s
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mb: 4 }}>
                Enter a song title, artist, or YouTube URL to search and download high-quality audio files directly into your local library.
              </Typography>
              
              <Box sx={{ maxWidth: 500, width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 600, textTransform: 'uppercase' }}>
                  Popular Searches
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
                  {SUGGESTIONS.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      icon={<TrendingUp fontSize="small" />}
                      variant="outlined"
                      sx={{
                        borderColor: '#27272a',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderColor: 'primary.main',
                          transform: 'translateY(-1px)'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          ) : (
            /* Results + Queue Grid */
            <Grid container spacing={4} sx={{ flex: 1, minHeight: 0 }}>
              {/* Left Column: Search Results */}
              <Grid item xs={12} md={7} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Search Results
                  <Chip label={searchResults.length} size="small" color="primary" sx={{ fontWeight: 700 }} />
                </Typography>
                
                <Paper
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    border: '1px solid #27272a',
                    p: 2,
                    backgroundColor: '#0c0c0e',
                    borderRadius: 3
                  }}
                >
                  <List disablePadding>
                    {searchResults.map((track, index) => (
                      <ListItem
                        key={track.trackId}
                        sx={{
                          mb: 1.5,
                          p: 2,
                          borderRadius: 2.5,
                          border: '1px solid #1f1f23',
                          backgroundColor: '#121215',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: '#16161a',
                            transform: 'translateY(-1px)'
                          },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1, pr: 2 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, width: 24, textAlign: 'center' }}>
                            {index + 1}
                          </Typography>
                          
                          {track.thumbnailUrl ? (
                            <Box
                              component="img"
                              src={track.thumbnailUrl}
                              alt={track.title}
                              sx={{
                                width: 64,
                                height: 48,
                                borderRadius: 1.5,
                                objectFit: 'cover',
                                backgroundColor: '#27272a',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 64,
                                height: 48,
                                borderRadius: 1.5,
                                backgroundColor: '#27272a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <YouTube sx={{ color: '#71717a' }} />
                            </Box>
                          )}
                          
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
                              {track.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {track.artist}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {formatDuration(track.duration)}
                          </Typography>
                          
                          <IconButton
                            size="small"
                            component="a"
                            href={track.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview on YouTube"
                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                          >
                            <YouTube fontSize="small" />
                          </IconButton>
                          
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CloudDownload />}
                            onClick={() => handleAddToQueue(track)}
                            sx={{
                              borderRadius: '20px',
                              textTransform: 'none',
                              px: 2.5,
                              fontWeight: 700
                            }}
                          >
                            Get MP3
                          </Button>
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>

              {/* Right Column: Active Downloads Queue */}
              <Grid item xs={12} md={5} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Downloads Queue
                  {queue.length > 0 && <Chip label={queue.length} size="small" color="secondary" sx={{ fontWeight: 700 }} />}
                </Typography>
                
                <Paper
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    border: '1px solid #27272a',
                    p: 2,
                    backgroundColor: '#0c0c0e',
                    borderRadius: 3
                  }}
                >
                  {queue.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <CloudDone sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
                      <Typography variant="body2" color="text.secondary">
                        No active downloads in queue.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {queue.map((item) => {
                        const isDownloading = item.status === 'downloading'
                        const isPaused = item.status === 'paused'
                        const isFailed = item.status === 'failed'
                        const isPending = item.status === 'pending'
                        const isCompleted = item.status === 'completed'
                        
                        return (
                          <Paper
                            key={item.id}
                            sx={{
                              mb: 2,
                              p: 2,
                              backgroundColor: '#121215',
                              border: '1px solid #27272a',
                              borderRadius: 2.5,
                              transition: 'border-color 0.2s',
                              '&:hover': { borderColor: 'primary.light' }
                            }}
                          >
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }} noWrap>
                                  {item.title}
                                </Typography>
                                
                                <Stack direction="row" spacing={0.5}>
                                  {isDownloading && (
                                    <IconButton size="small" onClick={() => window.electron.pauseDownload(item.id)} title="Pause">
                                      <Pause sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  )}
                                  {isPaused && (
                                    <IconButton size="small" onClick={() => window.electron.resumeDownload(item.id)} title="Resume">
                                      <PlayArrow sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  )}
                                  {!isCompleted && (
                                    <IconButton size="small" onClick={() => window.electron.cancelDownload(item.id)} color="error" title="Cancel">
                                      <Cancel sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  )}
                                </Stack>
                              </Stack>
                              
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {isDownloading && (
                                    <Chip label="Downloading" size="small" color="primary" variant="outlined" />
                                  )}
                                  {isPaused && (
                                    <Chip label="Paused" size="small" color="default" variant="outlined" />
                                  )}
                                  {isPending && (
                                    <Chip label="Pending" size="small" color="default" variant="outlined" />
                                  )}
                                  {isCompleted && (
                                    <Chip label="Completed" size="small" color="success" variant="outlined" icon={<CheckCircle fontSize="small" />} />
                                  )}
                                  {isFailed && (
                                    <Chip label="Failed" size="small" color="error" variant="outlined" icon={<ErrorOutline fontSize="small" />} />
                                  )}
                                </Stack>
                                
                                {isDownloading && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {item.speed} • ETA {item.eta}
                                  </Typography>
                                )}
                              </Stack>
                              
                              <Box sx={{ width: '100%' }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Box sx={{ flex: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={item.progress}
                                      color={isCompleted ? 'success' : isFailed ? 'error' : 'primary'}
                                      sx={{ height: 6, borderRadius: 3 }}
                                    />
                                  </Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28, textAlign: 'right' }}>
                                    {item.progress}%
                                  </Typography>
                                </Stack>
                              </Box>
                            </Stack>
                          </Paper>
                        )
                      })}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Completed & Past Downloads
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={handleClearHistory}
              disabled={history.length === 0}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Clear History
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ flex: 1, overflowY: 'auto', border: '1px solid #27272a', borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Provider</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Finished At</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                      No download history recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 600, py: 1.5 }}>{item.title}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{item.provider}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {item.status === 'completed' && (
                          <Chip
                            label="Completed"
                            color="success"
                            size="small"
                            variant="outlined"
                            icon={<CloudDone fontSize="small" />}
                          />
                        )}
                        {item.status === 'failed' && (
                          <Tooltip title={item.error || 'Unknown error'}>
                            <Chip
                              label="Failed"
                              color="error"
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                        {item.status !== 'completed' && item.status !== 'failed' && (
                          <Chip
                            label={item.status.toUpperCase()}
                            color="default"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {item.finishedAt ? new Date(item.finishedAt).toLocaleString() : '--'}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        {item.outputPath ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.outputPath.split('/').pop()}
                            </Typography>
                            <Tooltip title="Show in folder">
                              <IconButton
                                size="small"
                                onClick={() => handleRevealFile(item.outputPath)}
                                sx={{ color: 'primary.main', '&:hover': { color: 'primary.dark' } }}
                              >
                                <FolderOpen fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          '--'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  )
}
