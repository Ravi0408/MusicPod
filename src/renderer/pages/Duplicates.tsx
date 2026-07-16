import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Grid,
  CircularProgress
} from '@mui/material'
import {
  Delete,
  Search,
  FilterNone,
  CheckCircleOutline
} from '@mui/icons-material'

interface SongInfo {
  id: string
  title: string
  artist: string | null
  album: string | null
  filePath: string
  codec: string | null
  bitrate: number | null
  duration: number
}

interface DuplicateGroup {
  key: string
  songs: SongInfo[]
}

export default function Duplicates() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanMethod, setScanMethod] = useState<'hash' | 'metadata'>('metadata')
  const [hasScanned, setHasScanned] = useState(false)

  const handleScan = async (method: 'hash' | 'metadata') => {
    setIsScanning(true)
    setScanMethod(method)
    setHasScanned(true)
    try {
      const results = await window.electron.findDuplicates(method)
      setDuplicates(results)
    } catch (err) {
      console.error('Duplicate scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const handleTrashSong = async (songId: string) => {
    if (!confirm('Are you sure you want to move this file to the system Trash?')) return
    try {
      await window.electron.trashSong(songId)
      // Refresh the scan results
      const results = await window.electron.findDuplicates(scanMethod)
      setDuplicates(results)
    } catch (err) {
      console.error('Failed to trash song:', err)
    }
  }

  const formatDuration = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Duplicate Finder
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find and clean up duplicate songs in your local music library.
        </Typography>
      </Box>

      {/* Control Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<Search />}
          onClick={() => handleScan('metadata')}
          disabled={isScanning}
        >
          Scan by Title & Artist
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterNone />}
          onClick={() => handleScan('hash')}
          disabled={isScanning}
        >
          Scan by File Hash (MD5)
        </Button>
      </Stack>

      {isScanning ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Scanning files for duplicates... (Hash scans can take longer for large libraries)
          </Typography>
        </Box>
      ) : hasScanned && duplicates.length === 0 ? (
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
          <CheckCircleOutline sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Clean Library!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No duplicate songs were found in your library.
          </Typography>
        </Paper>
      ) : !hasScanned ? (
        <Paper
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            p: 4,
            border: '1px dashed #27272a'
          }}
        >
          <FilterNone sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Select a scanning method above to check for duplicates.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {duplicates.map((group, index) => (
            <Card key={index} sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Duplicate Group: {group.key.toUpperCase()}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List disablePadding>
                  {group.songs.map((song) => (
                    <ListItem
                      key={song.id}
                      disablePadding
                      sx={{
                        mb: 1.5,
                        p: 2,
                        backgroundColor: 'background.default',
                        borderRadius: 1.5,
                        border: '1px solid #27272a'
                      }}
                      secondaryAction={
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Delete />}
                          onClick={() => handleTrashSong(song.id)}
                        >
                          Trash File
                        </Button>
                      }
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <ListItemText
                            primary={song.title}
                            secondary={song.artist || 'Unknown Artist'}
                            primaryTypographyProps={{ fontWeight: 600 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }} noWrap>
                            {song.filePath}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Codec: {song.codec?.toUpperCase() || 'MP3'} | Bitrate: {song.bitrate || 'Unknown'} kbps
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Duration: {formatDuration(song.duration)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}
