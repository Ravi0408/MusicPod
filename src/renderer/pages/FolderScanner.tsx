import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Stack,
  Card,
  CardContent,
  Divider
} from '@mui/material'
import {
  FolderOpen,
  PlayArrow,
  CheckCircle,
  ErrorOutline
} from '@mui/icons-material'
import { useSettingsStore } from '../store/settingsStore'
import { useLibraryStore } from '../store/libraryStore'

export default function FolderScanner() {
  const scanFolder = useSettingsStore((state) => state.scanFolder)
  const setScanFolder = useSettingsStore((state) => state.setScanFolder)
  
  const scanProgress = useLibraryStore((state) => state.scanProgress)
  const setScanProgress = useLibraryStore((state) => state.setScanProgress)
  const fetchSongs = useLibraryStore((state) => state.fetchSongs)

  const [isScanning, setIsScanning] = useState(false)

  // Listen to IPC scanning progress updates
  useEffect(() => {
    const unsubscribe = window.electron.onScanProgress((progress) => {
      setScanProgress(progress)
      if (progress.status === 'done' || progress.status === 'error') {
        setIsScanning(false)
        fetchSongs() // Refetch library after scan finishes
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSelectFolder = async () => {
    try {
      const selected = await window.electron.selectFolder()
      if (selected) {
        setScanFolder(selected)
      }
    } catch (err) {
      console.error('Failed to select folder:', err)
    }
  }

  const handleStartScan = async () => {
    if (!scanFolder || isScanning) return
    setIsScanning(true)
    setScanProgress({ scanned: 0, total: 0, status: 'scanning' })
    try {
      await window.electron.scanLibrary(scanFolder)
    } catch (err) {
      console.error('Failed to start library scan:', err)
      setIsScanning(false)
    }
  }

  const getProgressPercentage = () => {
    if (!scanProgress || scanProgress.total === 0) return 0
    return Math.round((scanProgress.scanned / scanProgress.total) * 100)
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Folder Scanner
      </Typography>

      <GridContainer>
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Select Music Directory
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a local folder containing your MP3, FLAC, M4A, or WAV audio files. The scanner will read ID3/metadata tags recursively.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FolderOpen />}
                onClick={handleSelectFolder}
                disabled={isScanning}
              >
                Select Folder
              </Button>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'monospace',
                  backgroundColor: 'background.default',
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid #27272a',
                  flex: 1,
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {scanFolder || 'No folder selected'}
              </Typography>
            </Stack>

            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleStartScan}
              disabled={!scanFolder || isScanning}
              sx={{ mt: 2 }}
            >
              Start Scanning
            </Button>
          </CardContent>
        </Card>

        {scanProgress && (
          <Paper sx={{ p: 3, border: '1px solid #27272a' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Scanning Progress
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {scanProgress.status === 'scanning' && 'Scanning files...'}
                  {scanProgress.status === 'done' && 'Scanning complete!'}
                  {scanProgress.status === 'error' && 'An error occurred during scanning.'}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {getProgressPercentage()}% ({scanProgress.scanned} / {scanProgress.total})
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{ height: 8, borderRadius: 4 }}
              />

              {scanProgress.currentFile && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: 'block', fontFamily: 'monospace' }}
                >
                  Current file: {scanProgress.currentFile}
                </Typography>
              )}

              {scanProgress.status === 'done' && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'success.main', mt: 1 }}>
                  <CheckCircle fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Successfully imported {scanProgress.total} songs into your library.
                  </Typography>
                </Stack>
              )}

              {scanProgress.status === 'error' && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'error.main', mt: 1 }}>
                  <ErrorOutline fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Scanning interrupted by system error. Please try again.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}
      </GridContainer>
    </Box>
  )
}

function GridContainer({ children }: { children: React.ReactNode }) {
  return <Box sx={{ maxWidth: 800 }}>{children}</Box>
}
