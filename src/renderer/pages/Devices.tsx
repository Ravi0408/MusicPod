import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Paper,
  Divider,
  Grid
} from '@mui/material'
import {
  Usb,
  Sync,
  Backup,
  Restore,
  Settings,
  DeveloperMode
} from '@mui/icons-material'
import { useLibraryStore } from '../store/libraryStore'

interface ConnectedDevice {
  name: string
  path: string
  type: 'iPod' | 'USB Drive' | 'Virtual iPod'
  totalSpace: number
  freeSpace: number
}

interface SyncProgress {
  synced: number
  total: number
  currentSong?: string
  status: 'syncing' | 'done' | 'error'
}

export default function Devices() {
  const songs = useLibraryStore((state) => state.songs)
  
  const [devices, setDevices] = useState<ConnectedDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null)
  
  const [syncTarget, setSyncTarget] = useState<'all' | 'playlist'>('all')
  const [autoSync, setAutoSync] = useState(false)
  const [simEnabled, setSimEnabled] = useState(false)
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [lastBackupPath, setLastBackupPath] = useState<string>('')

  const loadDevices = async () => {
    try {
      const data = await window.electron.getConnectedDevices()
      setDevices(data)
      if (data.length > 0) {
        setSelectedDevice(data[0])
      } else {
        setSelectedDevice(null)
      }
    } catch (err) {
      console.error('Failed to load connected devices:', err)
    }
  }

  useEffect(() => {
    loadDevices()
    const interval = setInterval(loadDevices, 4000) // Poll for mounts every 4s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const unsubscribe = window.electron.onSyncProgress((progress) => {
      setSyncProgress(progress)
      if (progress.status === 'done' || progress.status === 'error') {
        setIsSyncing(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleToggleSim = async () => {
    if (simEnabled) {
      await window.electron.disableVirtualDevice()
      setSimEnabled(false)
    } else {
      await window.electron.enableVirtualDevice('iPodNano_Sim')
      setSimEnabled(true)
    }
    loadDevices()
  }

  const handleSync = async () => {
    if (!selectedDevice || isSyncing) return
    setIsSyncing(true)
    setSyncProgress({ synced: 0, total: songs.length, status: 'syncing' })
    
    try {
      // Sync all library songs in Phase 4 simulator
      await window.electron.syncDevice(selectedDevice.path, songs)
    } catch (err) {
      console.error('Sync failed:', err)
      setIsSyncing(false)
    }
  }

  const handleBackup = async () => {
    if (!selectedDevice) return
    setIsBackingUp(true)
    try {
      const backupPath = await window.electron.backupDevice(selectedDevice.path)
      setLastBackupPath(backupPath)
      alert(`Backup completed successfully!\nFiles saved to:\n${backupPath}`)
    } catch (err: any) {
      console.error('Backup failed:', err)
      alert(`Backup failed: ${err.message}`)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedDevice || !lastBackupPath) return
    if (!confirm('Are you sure you want to restore? This will overwrite the device tracks.')) return
    try {
      await window.electron.restoreDevice(selectedDevice.path, lastBackupPath)
      alert('Restore completed successfully!')
    } catch (err: any) {
      console.error('Restore failed:', err)
      alert(`Restore failed: ${err.message}`)
    }
  }

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Device Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Synchronize music, create backups, and manage iPods or USB drives.
          </Typography>
        </Box>
        <Button
          variant={simEnabled ? 'contained' : 'outlined'}
          color="secondary"
          startIcon={<DeveloperMode />}
          onClick={handleToggleSim}
        >
          {simEnabled ? 'Disable iPod Sim' : 'Simulate iPod'}
        </Button>
      </Box>

      <Grid container spacing={4} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Side: Connected Devices */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Connected Storage
          </Typography>

          {devices.length === 0 ? (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                border: '1px dashed #27272a',
                backgroundColor: 'transparent'
              }}
            >
              <Usb sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No removable drives detected. Plug in a USB Drive, iPod Classic/Nano, or click "Simulate iPod" to begin.
              </Typography>
            </Paper>
          ) : (
            devices.map((device, idx) => {
              const isSelected = selectedDevice?.path === device.path
              return (
                <Card
                  key={idx}
                  onClick={() => setSelectedDevice(device)}
                  sx={{
                    mb: 2,
                    cursor: 'pointer',
                    borderColor: isSelected ? 'primary.main' : '#27272a',
                    borderWidth: isSelected ? 2 : 1
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        backgroundColor: isSelected ? 'primary.main' : 'background.default',
                        color: isSelected ? 'primary.contrastText' : 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Usb />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {device.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Type: {device.type} | Path: {device.path}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Storage: {formatSize(device.freeSpace)} free of {formatSize(device.totalSpace)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )
            })
          )}
        </Grid>

        {/* Right Side: Sync & Profile Settings */}
        <Grid item xs={12} md={6}>
          {selectedDevice ? (
            <Paper sx={{ p: 3, border: '1px solid #27272a', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Sync Profile Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3} sx={{ flex: 1 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Sync Tracks Selection</InputLabel>
                  <Select
                    value={syncTarget}
                    label="Sync Tracks Selection"
                    onChange={(e) => setSyncTarget(e.target.value as 'all' | 'playlist')}
                    disabled={isSyncing}
                  >
                    <MenuItem value="all">Entire Library ({songs.length} Tracks)</MenuItem>
                    <MenuItem value="playlist" disabled>Custom Playlists Selection</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      disabled={isSyncing}
                    />
                  }
                  label="Auto-Sync tracks automatically when this device connects"
                />

                <Divider />

                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Maintenance Tools
                </Typography>
                
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Backup />}
                    onClick={handleBackup}
                    disabled={isSyncing || isBackingUp}
                  >
                    Backup Device
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Restore />}
                    onClick={handleRestore}
                    disabled={isSyncing || !lastBackupPath}
                  >
                    Restore Device
                  </Button>
                </Stack>
                
                {lastBackupPath && (
                  <Typography variant="caption" color="text.secondary">
                    Last backup: {lastBackupPath.split('/').pop()}
                  </Typography>
                )}

                <Divider sx={{ my: 1 }} />

                <Button
                  variant="contained"
                  startIcon={<Sync />}
                  size="large"
                  onClick={handleSync}
                  disabled={isSyncing || songs.length === 0}
                  fullWidth
                >
                  Start Syncing Now
                </Button>

                {syncProgress && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {syncProgress.status === 'syncing' && 'Syncing tracks...'}
                        {syncProgress.status === 'done' && 'Syncing complete!'}
                        {syncProgress.status === 'error' && 'Sync failed.'}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {syncProgress.synced} / {syncProgress.total} tracks
                      </Typography>
                    </Stack>

                    <LinearProgress
                      variant="determinate"
                      value={Math.round((syncProgress.synced / syncProgress.total) * 100)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />

                    {syncProgress.currentSong && syncProgress.status === 'syncing' && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>
                        Writing: {syncProgress.currentSong}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          ) : (
            <Paper
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #27272a',
                color: 'text.secondary'
              }}
            >
              Select a connected drive to configure sync profiles.
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
