import { useRef, useEffect, useState } from 'react'
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Stack,
  Tooltip
} from '@mui/material'
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeMute,
  Shuffle,
  Repeat,
  RepeatOne,
  MusicNote
} from '@mui/icons-material'
import { usePlayerStore } from '../store/playerStore'

export default function Player() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Tracks the slider position while the user is dragging.
  // We do NOT write to audioRef during drag — only on release.
  const [seekValue, setSeekValue] = useState<number | null>(null)
  const isSeeking = seekValue !== null

  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    currentTime,
    duration,
    togglePlay,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    playNext,
    playPrevious,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setVolume
  } = usePlayerStore()

  // Sync audio source when song changes
  useEffect(() => {
    if (!audioRef.current) return

    if (currentSong) {
      const sourceUrl = `media://${encodeURIComponent(currentSong.filePath)}`
      audioRef.current.src = sourceUrl
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error('Playback error:', err)
          setIsPlaying(false)
        })
      }
    } else {
      audioRef.current.src = ''
    }
    // Reset seek state on song change
    setSeekValue(null)
  }, [currentSong])

  // Sync play/pause
  useEffect(() => {
    if (!audioRef.current || !currentSong) return

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error('Play command failed:', err)
        setIsPlaying(false)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying])

  // Sync volume & mute
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
    audioRef.current.muted = isMuted
  }, [volume, isMuted])

  // Fired ~4x per second by the browser — only update store when not seeking
  const handleTimeUpdate = () => {
    if (!audioRef.current || isSeeking) return
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  const handleAudioEnded = () => {
    if (isRepeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(console.error)
      }
    } else {
      playNext()
    }
  }

  // While dragging: just update the visual slider position (no audio seek yet)
  const handleSeekChange = (_event: Event, newValue: number | number[]) => {
    setSeekValue(newValue as number)
  }

  // On mouse-up / touch-end: perform the actual seek
  const handleSeekCommit = (_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const seekTime = newValue as number
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime
    }
    setCurrentTime(seekTime)
    setSeekValue(null)
  }

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    setVolume((newValue as number) / 100)
  }

  const formatTime = (timeInSeconds: number) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '0:00'
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // The displayed slider value: seekValue while dragging, currentTime otherwise
  const displayedTime = isSeeking ? seekValue! : currentTime

  return (
    <Box
      sx={{
        height: 90,
        backgroundColor: '#18181b',
        borderTop: '1px solid #27272a',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Left panel: Song Details */}
      <Box sx={{ width: '30%', display: 'flex', alignItems: 'center', gap: 2 }}>
        {currentSong?.coverPath ? (
          <Box
            component="img"
            src={`media://${encodeURIComponent(currentSong.coverPath)}`}
            alt={currentSong.title}
            sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              backgroundColor: '#27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MusicNote sx={{ color: '#71717a' }} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
            {currentSong ? currentSong.title : 'Not Playing'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {currentSong ? currentSong.artist : 'Select a song to start'}
          </Typography>
        </Box>
      </Box>

      {/* Middle panel: Playback Controls */}
      <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Shuffle">
            <IconButton onClick={toggleShuffle} color={isShuffle ? 'primary' : 'default'} size="small">
              <Shuffle fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton onClick={playPrevious} disabled={!currentSong} size="medium">
            <SkipPrevious />
          </IconButton>

          <IconButton
            onClick={togglePlay}
            disabled={!currentSong}
            sx={{
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { backgroundColor: 'primary.dark' },
              width: 40,
              height: 40
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <IconButton onClick={playNext} disabled={!currentSong} size="medium">
            <SkipNext />
          </IconButton>

          <Tooltip title={isRepeat === 'one' ? 'Repeat One' : isRepeat === 'all' ? 'Repeat All' : 'Repeat Off'}>
            <IconButton onClick={toggleRepeat} color={isRepeat !== 'none' ? 'primary' : 'default'} size="small">
              {isRepeat === 'one' ? <RepeatOne fontSize="small" /> : <Repeat fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ width: '100%', mt: 0.5 }} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: 'right' }}>
            {formatTime(displayedTime)}
          </Typography>
          <Slider
            size="small"
            value={displayedTime}
            min={0}
            max={duration || 100}
            onChange={handleSeekChange}
            onChangeCommitted={handleSeekCommit}
            disabled={!currentSong}
            sx={{
              py: 1,
              '& .MuiSlider-track': { border: 'none' },
              '& .MuiSlider-thumb': {
                width: 8,
                height: 8,
                transition: '0.2s',
                '&:before': { boxShadow: 'none' },
                '&:hover, &.Mui-focusVisible, &.Mui-active': {
                  boxShadow: 'none',
                  width: 12,
                  height: 12
                }
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
            {formatTime(duration)}
          </Typography>
        </Stack>
      </Box>

      {/* Right panel: Volume Controls */}
      <Box sx={{ width: '30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Stack direction="row" spacing={2} sx={{ width: 140 }} alignItems="center">
          <IconButton onClick={toggleMute} size="small">
            {isMuted || volume === 0 ? <VolumeMute /> : <VolumeUp />}
          </IconButton>
          <Slider
            size="small"
            value={isMuted ? 0 : volume * 100}
            onChange={handleVolumeChange}
            min={0}
            max={100}
            sx={{
              '& .MuiSlider-thumb': {
                width: 8,
                height: 8,
                '&:before': { boxShadow: 'none' }
              }
            }}
          />
        </Stack>
      </Box>
    </Box>
  )
}
