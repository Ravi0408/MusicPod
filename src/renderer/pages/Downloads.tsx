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
  CloudDone
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
      // Sort by startedAt descending so newest entries are at the top
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

  // Listen to queue updates from main process
  useEffect(() => {
    // Initial queue state
    window.electron.getDownloadQueue().then((q) => setQueue(q))

    const unsubscribe = window.electron.onDownloadQueueUpdated((updatedQueue) => {
      setQueue(updatedQueue)
      // If history tab is selected or any download completes, refresh history
      fetchHistory()
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (tab === 1) {
      fetchHistory()
    }
  }, [tab])

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
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Downloads
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search and download legal music tracks via pluggable download providers.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_e, newValue) => setTab(newValue)} aria-label="download tabs">
          <Tab label="Search & Active Queue" icon={<CloudDownload />} iconPosition="start" />
          <Tab label="Download History" icon={<History />} iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
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
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton
                          size="small"
                          component="a"
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in YouTube"
                          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                        >
                          <OpenInNew fontSize="small" />
                        </IconButton>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CloudDownload />}
                          onClick={() => handleAddToQueue(track)}
                        >
                          Queue
                        </Button>
                      </Stack>
                    }
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mr: 12, minWidth: 0, flex: 1 }}>
                      {track.thumbnailUrl ? (
                        <Box
                          component="img"
                          src={track.thumbnailUrl}
                          alt={track.title}
                          sx={{
                            width: 60,
                            height: 45,
                            borderRadius: 1,
                            objectFit: 'cover',
                            backgroundColor: '#27272a',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 60,
                            height: 45,
                            borderRadius: 1,
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
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                              {track.title}
                            </Typography>
                            <YouTube sx={{ color: '#ef4444', fontSize: 16, flexShrink: 0 }} />
                          </Stack>
                        }
                        secondary={`${track.artist} • ${formatDuration(track.duration)}`}
                        primaryTypographyProps={{ style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                      />
                    </Stack>
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
      )}

      {tab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Completed & Past Downloads
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={handleClearHistory}
              disabled={history.length === 0}
            >
              Clear History
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ flex: 1, overflowY: 'auto', border: '1px solid #27272a' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Finished At</TableCell>
                  <TableCell align="right">File Path</TableCell>
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
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                      <TableCell>{item.provider}</TableCell>
                      <TableCell>
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
                      <TableCell>
                        {item.finishedAt ? new Date(item.finishedAt).toLocaleString() : '--'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '11px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.outputPath ? (
                          <Tooltip title={item.outputPath}>
                            <Link href="#" onClick={(e) => e.preventDefault()} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                              {item.outputPath}
                            </Link>
                          </Tooltip>
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
