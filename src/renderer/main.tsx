import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './app/App'
import { getTheme } from './theme/theme'
import { useSettingsStore } from './store/settingsStore'

function Root() {
  const accentColor = useSettingsStore((state) => state.accentColor)
  const theme = React.useMemo(() => getTheme(accentColor), [accentColor])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
