import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Avatar,
  Stack
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { Song } from '../store/playerStore'
import { useLibraryStore } from '../store/libraryStore'
import { Edit, Image } from '@mui/icons-material'

interface MetadataEditorProps {
  song: Song
  open: boolean
  onClose: () => void
  onSave: () => void
}

interface FormInputs {
  title: string
  artist: string
  album: string
  genre: string
  year: number | ''
  track: number | ''
  disc: number | ''
}

export default function MetadataEditor({ song, open, onClose, onSave }: MetadataEditorProps) {
  const fetchSongs = useLibraryStore((state) => state.fetchSongs)
  const [coverPath, setCoverPath] = useState<string | null>(song.coverPath)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      title: song.title,
      artist: song.artist || '',
      album: song.album || '',
      genre: song.genre || '',
      year: song.year || '',
      track: song.track || '',
      disc: song.disc || ''
    }
  })

  const handleUpdateArtwork = async () => {
    try {
      const selectedImage = await window.electron.selectArtworkImage()
      if (selectedImage) {
        const cachedPath = await window.electron.updateSongArtwork(song.id, selectedImage)
        setCoverPath(cachedPath)
        fetchSongs() // Refresh songs list in background
      }
    } catch (err) {
      console.error('Failed to update artwork:', err)
    }
  }

  const onSubmit = async (data: FormInputs) => {
    setIsSubmitting(true)
    try {
      const tags = {
        title: data.title,
        artist: data.artist || undefined,
        album: data.album || undefined,
        genre: data.genre || undefined,
        year: data.year === '' ? undefined : Number(data.year),
        track: data.track === '' ? undefined : Number(data.track),
        disc: data.disc === '' ? undefined : Number(data.disc)
      }
      await window.electron.updateSongMetadata(song.id, tags)
      onSave()
      onClose()
    } catch (err) {
      console.error('Failed to save metadata:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Song Metadata</DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Left Column: Artwork editing */}
            <Grid item xs={12} sm={4}>
              <Stack alignItems="center" spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Cover Art
                </Typography>
                
                <Box
                  sx={{
                    position: 'relative',
                    width: 140,
                    height: 140,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #27272a',
                    cursor: 'pointer',
                    '&:hover .overlay': { opacity: 1 }
                  }}
                  onClick={handleUpdateArtwork}
                >
                  {coverPath ? (
                    <Box
                      component="img"
                      src={`media://${encodeURIComponent(coverPath)}`}
                      alt={song.title}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#18181b',
                        color: 'text.secondary'
                      }}
                    >
                      <Image fontSize="large" />
                    </Box>
                  )}
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: '#ffffff'
                    }}
                  >
                    <Edit />
                  </Box>
                </Box>
                <Button size="small" variant="text" onClick={handleUpdateArtwork}>
                  Change Art
                </Button>
              </Stack>
            </Grid>

            {/* Right Column: Fields */}
            <Grid item xs={12} sm={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="title"
                    control={control}
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Song Title"
                        variant="outlined"
                        fullWidth
                        size="small"
                        error={!!errors.title}
                        helperText={errors.title?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="artist"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Artist" variant="outlined" fullWidth size="small" />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="album"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Album" variant="outlined" fullWidth size="small" />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="genre"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Genre" variant="outlined" fullWidth size="small" />
                    )}
                  />
                </Grid>

                <Grid item xs={4}>
                  <Controller
                    name="year"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Year" variant="outlined" fullWidth size="small" />
                    )}
                  />
                </Grid>

                <Grid item xs={4}>
                  <Controller
                    name="track"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Track" variant="outlined" fullWidth size="small" />
                    )}
                  />
                </Grid>

                <Grid item xs={4}>
                  <Controller
                    name="disc"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} type="number" label="Disc" variant="outlined" fullWidth size="small" />
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
