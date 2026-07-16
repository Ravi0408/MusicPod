import React, { useEffect, useState } from 'react'
import {
  Box,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Avatar,
  Divider
} from '@mui/material'
import {
  PlaylistPlay,
  Add,
  Delete,
  FileDownload,
  PlayArrow,
  MusicNote,
  Timer,
  DeleteOutline
} from '@mui/icons-material'
import { usePlayerStore, Song } from '../store/playerStore'

export interface Playlist {
  id: string
  name: string
  createdAt: string
}

export default function Playlists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<Song[]>([])
  
  const [createOpen, setCreateOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)

  const loadPlaylists = async () => {
    try {
      const data = await window.electron.getPlaylists()
      setPlaylists(data)
      if (data.length > 0 && !selectedPlaylist) {
        setSelectedPlaylist(data[0])
      }
    } catch (err) {
      console.error('Failed to load playlists:', err)
    }
  }

  const loadPlaylistSongs = async (playlistId: string) => {
    try {
      const data = await window.electron.getPlaylistSongs(playlistId)
      setPlaylistTracks(data)
    } catch (err) {
      console.error('Failed to load playlist songs:', err)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist.id)
    } else {
      setPlaylistTracks([])
    }
  }, [selectedPlaylist])

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    try {
      const created = await window.electron.createPlaylist(newPlaylistName.trim())
      setNewPlaylistName('')
      setCreateOpen(false)
      loadPlaylists()
      setSelectedPlaylist(created)
    } catch (err) {
      console.error('Failed to create playlist:', err)
    }
  }

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this playlist?')) return
    try {
      await window.electron.deletePlaylist(id)
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null)
      }
      loadPlaylists()
    } catch (err) {
      console.error('Failed to delete playlist:', err)
    }
  }

  const handleRemoveSong = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedPlaylist) return
    try {
      await window.electron.removeSongFromPlaylist(selectedPlaylist.id, songId)
      loadPlaylistSongs(selectedPlaylist.id)
    } catch (err) {
      console.error('Failed to remove song from playlist:', err)
    }
  }

  const handlePlaySong = (song: Song) => {
    setQueue(playlistTracks)
    setCurrentSong(song)
  }

  const handleExportM3U = async () => {
    if (!selectedPlaylist) return
    try {
      const success = await window.electron.exportPlaylistM3U(selectedPlaylist.id)
      if (success) {
        alert('Playlist exported successfully!')
      }
    } catch (err) {
      console.error('Failed to export playlist:', err)
    }
  }

  const formatDuration = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Playlists
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Create Playlist
        </Button>
      </Box>

      <Grid container spacing={4} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Pane: Playlists List */}
        <Grid item xs={12} md={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper sx={{ flex: 1, overflowY: 'auto', border: '1px solid #27272a' }}>
            {playlists.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No playlists yet. Click "Create Playlist" to add one!
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {playlists.map((playlist) => {
                  const isSelected = selectedPlaylist?.id === playlist.id
                  return (
                    <ListItem
                      key={playlist.id}
                      disablePadding
                      secondaryAction={
                        <IconButton size="small" onClick={(e) => handleDeletePlaylist(playlist.id, e)}>
                          <DeleteOutline sx={{ fontSize: 18 }} />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => setSelectedPlaylist(playlist)}
                        sx={{
                          py: 1.5,
                          '&.Mui-selected': {
                            borderLeft: '4px solid',
                            borderColor: 'primary.main',
                            pl: 1
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <PlaylistPlay color={isSelected ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={playlist.name}
                          primaryTypographyProps={{
                            fontWeight: isSelected ? 600 : 500,
                            noWrap: true
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right Pane: Selected Playlist tracks */}
        <Grid item xs={12} md={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {selectedPlaylist ? (
            <Paper
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                border: '1px solid #27272a',
                p: 3
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {selectedPlaylist.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {playlistTracks.length} Songs • Created {new Date(selectedPlaylist.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownload />}
                  onClick={handleExportM3U}
                  disabled={playlistTracks.length === 0}
                >
                  Export M3U
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {playlistTracks.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <MusicNote sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    This playlist is empty.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Go to the Library tab, right click any song, and add it here!
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width={40}></TableCell>
                        <TableCell width={50}>Cover</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Artist</TableCell>
                        <TableCell>Album</TableCell>
                        <TableCell align="right" width={90}>
                          <Timer fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        </TableCell>
                        <TableCell width={50}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {playlistTracks.map((song) => {
                        const isCurrent = currentSong?.id === song.id
                        return (
                          <TableRow
                            key={song.id}
                            hover
                            selected={isCurrent}
                            onClick={() => handlePlaySong(song)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}>
                              <IconButton size="small" color={isCurrent ? 'primary' : 'default'}>
                                <PlayArrow />
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              {song.coverPath ? (
                                <Avatar
                                  variant="rounded"
                                  src={`media://${encodeURIComponent(song.coverPath)}`}
                                  alt={song.title}
                                  sx={{ width: 36, height: 36 }}
                                />
                              ) : (
                                <Avatar variant="rounded" sx={{ width: 36, height: 36, backgroundColor: 'background.default' }}>
                                  <MusicNote />
                                </Avatar>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: isCurrent ? 'primary.main' : 'text.primary' }}>
                              {song.title}
                            </TableCell>
                            <TableCell color="text.secondary">{song.artist || 'Unknown Artist'}</TableCell>
                            <TableCell color="text.secondary">{song.album || 'Unknown Album'}</TableCell>
                            <TableCell align="right" color="text.secondary">
                              {formatDuration(song.duration)}
                            </TableCell>
                            <TableCell onClick={(e) => handleRemoveSong(song.id, e)}>
                              <TooltipIconButton title="Remove from playlist">
                                <Delete sx={{ fontSize: 16 }} />
                              </TooltipIconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          ) : (
            <Paper
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #27272a',
                color: 'text.secondary'
              }}
            >
              Select or create a playlist to view tracks.
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create Playlist Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Playlist</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 1 }}>
          <TextField
            autoFocus
            label="Playlist Name"
            fullWidth
            variant="outlined"
            size="small"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleCreatePlaylist} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function TooltipIconButton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <IconButton size="small">
      {children}
    </IconButton>
  )
}
