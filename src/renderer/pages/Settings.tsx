import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material'
import { Circle } from '@mui/icons-material'
import { useSettingsStore } from '../store/settingsStore'
import { AccentColor } from '../theme/theme'

export default function Settings() {
  const accentColor = useSettingsStore((state) => state.accentColor)
  const setAccentColor = useSettingsStore((state) => state.setAccentColor)

  const accentOptions: { color: AccentColor; hex: string; name: string }[] = [
    { color: 'blue', hex: '#2196f3', name: 'Cool Blue' },
    { color: 'purple', hex: '#9c27b0', name: 'Royal Purple' },
    { color: 'green', hex: '#4caf50', name: 'Emerald Green' },
    { color: 'orange', hex: '#ff9800', name: 'Vibrant Orange' }
  ]

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Settings
      </Typography>

      <Box sx={{ maxWidth: 600 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Appearance
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Customize the visual style and accent color of the MusicDock interface.
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Accent Color
            </Typography>
            
            <Stack direction="row" spacing={2}>
              {accentOptions.map((opt) => {
                const isSelected = accentColor === opt.color
                return (
                  <Tooltip title={opt.name} key={opt.color}>
                    <IconButton
                      onClick={() => setAccentColor(opt.color)}
                      sx={{
                        p: 0.5,
                        border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      <Circle sx={{ color: opt.hex, fontSize: 32 }} />
                    </IconButton>
                  </Tooltip>
                )
              })}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
