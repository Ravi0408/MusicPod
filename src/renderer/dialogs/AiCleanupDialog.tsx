import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Chip,
  Divider,
  Paper,
  Grid
} from '@mui/material'
import { AutoAwesome, CheckCircle, CompareArrows } from '@mui/icons-material'

interface Props {
  open: boolean
  songId: string | null
  onClose: () => void
  onSaved: () => void
}

interface CleanupSuggestion {
  songId: string
  current: {
    title: string
    artist: string
    album: string
    track: number | null
  }
  suggested: {
    title: string
    artist: string
    album: string
    track: number | null
  }
  confidence: number
}

export default function AiCleanupDialog({ open, songId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<CleanupSuggestion | null>(null)

  useEffect(() => {
    if (open && songId) {
      setLoading(true)
      window.electron
        .aiCleanupSuggest(songId)
        .then((res) => {
          setSuggestion(res)
          setLoading(false)
        })
        .catch((err) => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [open, songId])

  const handleApply = async () => {
    if (!songId || !suggestion) return
    setLoading(true)
    try {
      await window.electron.updateSongMetadata(songId, {
        title: suggestion.suggested.title,
        artist: suggestion.suggested.artist,
        album: suggestion.suggested.album,
        track: suggestion.suggested.track
      })
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const hasDiff = (field: 'title' | 'artist' | 'album' | 'track') => {
    if (!suggestion) return false
    return suggestion.current[field] !== suggestion.suggested[field]
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
        <AutoAwesome color="secondary" />
        AI Metadata Suggestion
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : suggestion ? (
          <Stack spacing={3}>
            {/* Confidence info */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Heuristic filename parser check
              </Typography>
              <Chip
                label={`Confidence: ${suggestion.confidence}%`}
                color={suggestion.confidence > 75 ? 'success' : 'warning'}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Divider />

            {/* Comparison panels */}
            <Stack spacing={2}>
              <CompareRow
                label="Title"
                current={suggestion.current.title}
                suggested={suggestion.suggested.title}
                changed={hasDiff('title')}
              />
              <CompareRow
                label="Artist"
                current={suggestion.current.artist}
                suggested={suggestion.suggested.artist}
                changed={hasDiff('artist')}
              />
              <CompareRow
                label="Album"
                current={suggestion.current.album}
                suggested={suggestion.suggested.album}
                changed={hasDiff('album')}
              />
              <CompareRow
                label="Track #"
                current={String(suggestion.current.track ?? '--')}
                suggested={String(suggestion.suggested.track ?? '--')}
                changed={hasDiff('track')}
              />
            </Stack>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Could not parse suggestions for this song.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<CheckCircle />}
          onClick={handleApply}
          disabled={loading || !suggestion}
        >
          Apply Suggestions
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface CompareRowProps {
  label: string
  current: string
  suggested: string
  changed: boolean
}

function CompareRow({ label, current, suggested, changed }: CompareRowProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
        <Grid item xs={5.5}>
          <Paper sx={{ p: 1.5, border: '1px solid #27272a', backgroundColor: 'background.default' }}>
            <Typography variant="body2" noWrap>
              {current}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={1} sx={{ display: 'flex', justifyContent: 'center' }}>
          <CompareArrows color={changed ? 'secondary' : 'disabled'} />
        </Grid>
        <Grid item xs={5.5}>
          <Paper
            sx={{
              p: 1.5,
              border: changed ? '1px solid #c084fc' : '1px solid #27272a',
              backgroundColor: changed ? 'rgba(192, 132, 252, 0.05)' : 'background.default'
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: changed ? 600 : 400, color: changed ? 'secondary.main' : 'text.primary' }}
              noWrap
            >
              {suggested}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
