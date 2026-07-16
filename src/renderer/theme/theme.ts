import { createTheme } from '@mui/material/styles'

export type AccentColor = 'blue' | 'purple' | 'green' | 'orange'

export const getTheme = (accent: AccentColor) => {
  const primaryColors = {
    blue: '#2196f3',
    purple: '#9c27b0',
    green: '#4caf50',
    orange: '#ff9800'
  }

  return createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: primaryColors[accent],
        contrastText: '#ffffff'
      },
      background: {
        default: '#09090b', // Sleek dark gray/black
        paper: '#18181b'    // Card background
      },
      text: {
        primary: '#f4f4f5',
        secondary: '#a1a1aa'
      }
    },
    typography: {
      fontFamily: [
        'Outfit',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif'
      ].join(',')
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: '#18181b',
            border: '1px solid #27272a'
          }
        }
      }
    }
  })
}
