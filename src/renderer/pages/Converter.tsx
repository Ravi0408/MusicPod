import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  LinearProgress,
  Stack,
  Autocomplete,
  TextField,
  Divider,
  Paper
} from '@mui/material'
import {
  Transform,
  PlayArrow,
  CheckCircle,
  ErrorOutline,
  FolderOpen
} from '@mui/icons-material'
import { useLibraryStore } from '../store/libraryStore'
import { Song } from '../store/playerStore'

export default function Converter() {
  const songs = useLibraryStore((state) => state.songs)
  
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [customFilePath, setCustomFilePath] = useState<string>('')
  
  const [outputFormat, setOutputFormat] = useState<string>('mp3')
  const [preset, setPreset] = useState<string>('High Quality')
  
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<'idle' | 'converting' | 'done' | 'error'>('idle')
  const [outputPath, setOutputPath] = useState<string>('')

  useEffect(() => {
    const unsubscribe = window.electron.onConversionProgress((update) => {
      setProgress(update.progress)
      if (update.status === 'done') {
        setStatus('done')
        setIsConverting(false)
        if (update.outputFilePath) {
          setOutputPath(update.outputFilePath)
        }
      } else if (update.status === 'error') {
        setStatus('error')
        setIsConverting(false)
      } else {
        setStatus('converting')
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSelectCustomFile = async () => {
    // Standard folder selection, but for files. Let's use select-artwork-image helper or trigger file select.
    // Actually we can reuse selectArtworkImage since it filters file formats, or select any file.
    // Let's invoke a dialog via selectArtworkImage to pick a custom audio file (supporting standard music formats)
    try {
      const selected = await window.electron.selectArtworkImage() // Returns a file path
      if (selected) {
        setCustomFilePath(selected)
        setSelectedSong(null)
      }
    } catch (err) {
      console.error('Failed to select file:', err)
    }
  }

  const handleStartConversion = async () => {
    const fileToConvert = selectedSong ? selectedSong.filePath : customFilePath
    if (!fileToConvert) return

    setIsConverting(true)
    setProgress(0)
    setStatus('converting')
    setOutputPath('')

    try {
      await window.electron.convertFile(fileToConvert, outputFormat, preset)
    } catch (err) {
      console.error('Conversion failed:', err)
      setStatus('error')
      setIsConverting(false)
    }
  }

  const formats = ['mp3', 'aac', 'wav', 'alac']
  const presets = ['iPod Classic', 'iPod Nano', 'High Quality', 'Lossless']

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Audio Converter
      </Typography>

      <Box sx={{ maxWidth: 800 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Select Source File
            </Typography>

            <GridContainer>
              <Autocomplete
                options={songs}
                getOptionLabel={(option) => `${option.title} - ${option.artist || 'Unknown Artist'}`}
                value={selectedSong}
                onChange={(_event, newValue) => {
                  setSelectedSong(newValue)
                  if (newValue) setCustomFilePath('')
                }}
                disabled={isConverting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Choose from Music Library"
                    variant="outlined"
                    size="small"
                  />
                )}
                sx={{ mb: 2 }}
              />

              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<FolderOpen />}
                  onClick={handleSelectCustomFile}
                  disabled={isConverting}
                >
                  Choose Custom File
                </Button>
                <Typography
                  variant="body2"
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
                  {customFilePath || (selectedSong ? selectedSong.filePath : 'No file chosen')}
                </Typography>
              </Stack>
            </GridContainer>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Conversion Settings
            </Typography>

            <Stack direction="row" spacing={3}>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={outputFormat}
                  label="Output Format"
                  onChange={(e) => setOutputFormat(e.target.value)}
                  disabled={isConverting}
                >
                  {formats.map((f) => (
                    <MenuItem key={f} value={f}>
                      {f.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Target Preset</InputLabel>
                <Select
                  value={preset}
                  label="Target Preset"
                  onChange={(e) => setPreset(e.target.value)}
                  disabled={isConverting}
                >
                  {presets.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Button
              variant="contained"
              startIcon={<Transform />}
              onClick={handleStartConversion}
              disabled={isConverting || (!selectedSong && !customFilePath)}
              sx={{ mt: 3 }}
            >
              Convert Audio
            </Button>
          </CardContent>
        </Card>

        {status !== 'idle' && (
          <Paper sx={{ p: 3, border: '1px solid #27272a' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Conversion Progress
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {status === 'converting' && 'Transcoding audio tracks...'}
                  {status === 'done' && 'Conversion complete!'}
                  {status === 'error' && 'Failed to convert file.'}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {progress}%
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 8, borderRadius: 4 }}
              />

              {status === 'done' && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'success.main', mt: 1 }}>
                  <CheckCircle fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Successfully saved to: {outputPath}
                  </Typography>
                </Stack>
              )}

              {status === 'error' && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'error.main', mt: 1 }}>
                  <ErrorOutline fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    An error occurred. Check if ffmpeg is installed and the format is valid.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  )
}

function GridContainer({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>
}
