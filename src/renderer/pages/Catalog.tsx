import React, { useState } from 'react'
import { Box, Typography, Button, Stack } from '@mui/material'
import { AutoAwesome } from '@mui/icons-material'
import CatalogList from '../components/CatalogList'
import ArtistPage from '../components/ArtistPage'
import MoviePage from '../components/MoviePage'

type ViewItem =
  | { type: 'list' }
  | { type: 'artist'; name: string }
  | { type: 'movie'; title: string }

export default function Catalog() {
  const [history, setHistory] = useState<ViewItem[]>([{ type: 'list' }])
  const [generating, setGenerating] = useState(false)
  const current = history[history.length - 1]

  const pushView = (next: ViewItem) => {
    setHistory((prev) => [...prev, next])
  }

  const popView = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1))
    }
  }

  const handleGeneratePerf = async () => {
    setGenerating(true)
    try {
      await window.electron.generatePerfCatalog(100000)
      alert('Generated 100,000 stress test records! Search matches will now query against 100k+ songs.')
      // Force refresh of the main catalog list view by resetting history
      setHistory([{ type: 'list' }])
    } catch (err) {
      console.error('Failed to generate catalog performance records:', err)
      alert('Failed to generate performance test records.')
    } finally {
      setGenerating(false)
    }
  }

  const renderContent = () => {
    switch (current.type) {
      case 'list':
        return (
          <CatalogList
            onSelectArtist={(name) => pushView({ type: 'artist', name })}
            onSelectMovie={(title) => pushView({ type: 'movie', title })}
          />
        )
      case 'artist':
        return (
          <ArtistPage
            artistName={current.name}
            onBack={popView}
            onSelectMovie={(title) => pushView({ type: 'movie', title })}
          />
        )
      case 'movie':
        return (
          <MoviePage
            movieTitle={current.title}
            onBack={popView}
            onSelectArtist={(name) => pushView({ type: 'artist', name })}
          />
        )
      default:
        return null
    }
  }

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
      {current.type === 'list' && (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Verified Bollywood Catalog
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search and discover classic Hindi soundtracks (1990–2010). Browse artists, composers, and download/stream audio legally.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={handleGeneratePerf}
            disabled={generating}
            sx={{ textTransform: 'none' }}
          >
            {generating ? 'Generating 100k records...' : 'Generate 100k Perf Data'}
          </Button>
        </Stack>
      )}

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {renderContent()}
      </Box>
    </Box>
  )
}
