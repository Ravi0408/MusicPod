import React, { useState, useEffect } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  MusicNote,
  FolderSpecial,
  Settings as SettingsIcon
} from '@mui/icons-material'
import Dashboard from '../pages/Dashboard'
import Library from '../pages/Library'
import FolderScanner from '../pages/FolderScanner'
import Settings from '../pages/Settings'
import Player from '../components/Player'
import { useLibraryStore } from '../store/libraryStore'

type View = 'dashboard' | 'library' | 'scanner' | 'settings'

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const fetchSongs = useLibraryStore((state) => state.fetchSongs)

  // Fetch songs on startup
  useEffect(() => {
    fetchSongs()
  }, [])

  const navigationItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'library', text: 'Library', icon: <MusicNote /> },
    { id: 'scanner', text: 'Folder Scanner', icon: <FolderSpecial /> },
    { id: 'settings', text: 'Settings', icon: <SettingsIcon /> }
  ]

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'library':
        return <Library />
      case 'scanner':
        return <FolderScanner />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar navigation */}
      <Box
        sx={{
          width: 240,
          backgroundColor: '#121214',
          borderRight: '1px solid #27272a',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 90px)'
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MusicNote sx={{ color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            MusicDock
          </Typography>
        </Box>
        <Divider sx={{ mx: 2, mb: 2 }} />

        <List sx={{ px: 1 }}>
          {navigationItems.map((item) => {
            const isSelected = currentView === item.id
            return (
              <ListItem disablePadding key={item.id} sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => setCurrentView(item.id as View)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText'
                      },
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'inherit' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: isSelected ? 600 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>

      {/* Main panel */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: 'background.default',
          overflowY: 'auto',
          height: 'calc(100vh - 90px)'
        }}
      >
        {renderContent()}
      </Box>

      {/* Bottom audio controller footer */}
      <Player />
    </Box>
  )
}
