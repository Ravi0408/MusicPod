import React, { useState, MouseEvent } from 'react'
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
  Avatar,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  PlayArrow,
  Search,
  MusicNote,
  Timer,
  PlaylistAdd,
  Edit,
  PlaylistPlay
} from '@mui/icons-material'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore, Song } from '../store/playerStore'
import MetadataEditor from '../dialogs/MetadataEditor'
import { Playlist } from './Playlists'

export default function Library() {
  const songs = useLibraryStore((state) => state.songs)
  const fetchSongs = useLibraryStore((state) => state.fetchSongs)
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)

  const [searchQuery, setSearchQuery] = useState('')
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null)
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  
  // Editor Dialog State
  const [editorOpen, setEditorOpen] = useState(false)
  
  // Playlist Adder Dialog State
  const [playlistAdderOpen, setPlaylistAdderOpen] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])

  const handlePlaySong = (song: Song) => {
    setQueue(filteredSongs)
    setCurrentSong(song)
  }

  const handleRowContextMenu = (event: MouseEvent<HTMLTableRowElement>, song: Song) => {
    event.preventDefault()
    setSelectedSong(song)
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleOpenEditor = () => {
    handleCloseContextMenu()
    if (selectedSong) {
      setEditorOpen(true)
    }
  }

  const handleOpenPlaylistAdder = async () => {
    handleCloseContextMenu()
    try {
      const data = await window.electron.getPlaylists()
      setPlaylists(data)
      setPlaylistAdderOpen(true)
    } catch (err) {
      console.error('Failed to load playlists for adder:', err)
    }
  }

  const handleAddSongToPlaylist = async (playlistId: string) => {
    if (!selectedSong) return
    try {
      await window.electron.addSongToPlaylist(playlistId, selectedSong.id)
      setPlaylistAdderOpen(false)
      alert(`Added "${selectedSong.title}" to playlist!`)
    } catch (err) {
      console.error('Failed to add song to playlist:', err)
    }
  }

  const filteredSongs = React.useMemo(() => {
    if (!searchQuery) return songs
    const query = searchQuery.toLowerCase()
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        (song.artist && song.artist.toLowerCase().includes(query)) ||
        (song.album && song.album.toLowerCase().includes(query))
    )
  }, [songs, searchQuery])

  const formatDuration = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          My Music Library
        </Typography>

        <TextField
          placeholder="Search by Title, Artist or Album..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 350 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {filteredSongs.length === 0 ? (
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
          <MusicNote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No songs found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search query, or use the Folder Scanner to import music folders.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto', border: '1px solid #27272a' }}>
          <Table stickyHeader size="medium">
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell width={60}>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Artist</TableCell>
                <TableCell>Album</TableCell>
                <TableCell>Format</TableCell>
                <TableCell align="right" width={100}>
                  <Timer fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id
                return (
                  <TableRow
                    key={song.id}
                    hover
                    selected={isCurrent}
                    onClick={() => handlePlaySong(song)}
                    onContextMenu={(e) => handleRowContextMenu(e, song)}
                    sx={{ cursor: 'pointer', '&.Mui-selected': { backgroundColor: 'action.selected' } }}
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
                          sx={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 40, height: 40, backgroundColor: 'background.default' }}>
                          <MusicNote />
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: isCurrent ? 'primary.main' : 'text.primary' }}>
                      {song.title}
                    </TableCell>
                    <TableCell color="text.secondary">{song.artist || 'Unknown Artist'}</TableCell>
                    <TableCell color="text.secondary">{song.album || 'Unknown Album'}</TableCell>
                    <TableCell color="text.secondary">
                      {song.codec?.toUpperCase() || 'MP3'} {song.bitrate ? `(${song.bitrate} kbps)` : ''}
                    </TableCell>
                    <TableCell align="right" color="text.secondary">
                      {formatDuration(song.duration)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Row Right-Click Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleOpenEditor}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Edit Metadata
        </MenuItem>
        <MenuItem onClick={handleOpenPlaylistAdder}>
          <ListItemIcon>
            <PlaylistAdd fontSize="small" />
          </ListItemIcon>
          Add to Playlist...
        </MenuItem>
      </Menu>

      {/* Metadata Editor Dialog */}
      {selectedSong && editorOpen && (
        <MetadataEditor
          song={selectedSong}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={() => {
            fetchSongs()
            if (currentSong?.id === selectedSong.id) {
              // Update playing song state
              window.electron.getSongs().then((allSongs) => {
                const refreshed = allSongs.find((s) => s.id === selectedSong.id)
                if (refreshed) {
                  usePlayerStore.getState().setCurrentSong(refreshed)
                }
              })
            }
          }}
        />
      )}

      {/* Add Song to Playlist Dialog */}
      <Dialog open={playlistAdderOpen} onClose={() => setPlaylistAdderOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Add to Playlist</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {playlists.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No playlists available. Create a playlist first in the Playlists tab!
              </Typography>
            </Box>
          ) : (
            <List>
              {playlists.map((playlist) => (
                <ListItem key={playlist.id} disablePadding>
                  <ListItemButton onClick={() => handleAddSongToPlaylist(playlist.id)}>
                    <ListItemIcon>
                      <PlaylistPlay />
                    </ListItemIcon>
                    <ListItemText primary={playlist.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPlaylistAdderOpen(false)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
