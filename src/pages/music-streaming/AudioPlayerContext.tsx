import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { AudioAlbum, AudioTrack } from './types'
import { getTrackStreamUrl, getCoverUrl, fetchAlbum } from './api'
import type { VisualizerMode } from './AudioVisualizer'
import { useIsTv } from '../../common/hooks/useIsTv'
import { useOptionalRemoteControlContext } from '../../components/layout/RemoteControlProvider'

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null
  currentAlbum: AudioAlbum | null
  queue: AudioTrack[]
  queueIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  repeatMode: 'off' | 'all' | 'one'
  isShuffle: boolean
  isTv: boolean
  isTvViewOpen: boolean
  setIsTvViewOpen: (open: boolean) => void
  toggleTvView: () => void
  visualizerMode: VisualizerMode
  setVisualizerMode: (mode: VisualizerMode) => void
  playTrack: (track: AudioTrack, album: AudioAlbum | null, fullQueue?: AudioTrack[]) => void
  togglePlayPause: () => void
  nextTrack: () => void
  prevTrack: () => void
  seekTo: (seconds: number) => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  toggleRepeatMode: () => void
  toggleShuffle: () => void
  addToQueue: (track: AudioTrack) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  getAnalyser: () => AnalyserNode | null
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [currentAlbum, setCurrentAlbum] = useState<AudioAlbum | null>(null)
  const [queue, setQueue] = useState<AudioTrack[]>([])
  const [queueIndex, setQueueIndex] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('music_player_volume')
    return saved !== null ? Number(saved) : 0.8
  })
  const [isMuted, setIsMuted] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [isShuffle, setIsShuffle] = useState(false)

  const isTv = useIsTv()
  const [isTvViewOpen, setIsTvViewOpen] = useState(false)
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars')
  const toggleTvView = () => setIsTvViewOpen((prev) => !prev)

  const remoteContext = useOptionalRemoteControlContext()

  const getAnalyser = () => {
    if (!analyserRef.current && audioRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 128
          analyser.smoothingTimeConstant = 0.78
          const source = ctx.createMediaElementSource(audioRef.current)
          source.connect(analyser)
          analyser.connect(ctx.destination)
          audioCtxRef.current = ctx
          analyserRef.current = analyser
          sourceRef.current = source
        }
      } catch (e) {
        console.warn('Could not initialize Web Audio API analyser', e)
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return analyserRef.current
  }

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
      if (audio.currentTime !== 0) setCurrentTime(audio.currentTime)
    }
    const onPlay = () => {
      setIsPlaying(true)
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    }
    const onPause = () => setIsPlaying(false)
    const onError = (e: Event) => {
      console.warn('Audio playback error', e)
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
    localStorage.setItem('music_player_volume', String(volume))
  }, [volume, isMuted])

  // Play track handler
  const playTrack = (track: AudioTrack, album: AudioAlbum | null, fullQueue?: AudioTrack[]) => {
    setCurrentTrack(track)
    setCurrentAlbum(album)

    const newQueue = fullQueue && fullQueue.length > 0 ? fullQueue : (album ? album.tracks : [track])
    setQueue(newQueue)
    const idx = newQueue.findIndex((t) => t.id === track.id)
    setQueueIndex(idx >= 0 ? idx : 0)

    if (audioRef.current) {
      const streamUrl = getTrackStreamUrl(track.id)
      audioRef.current.src = streamUrl
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          if (isTv) setIsTvViewOpen(true)
        })
        .catch((err) => {
          console.warn('Play was prevented or failed:', err)
          setIsPlaying(false)
        })
    }

    // Media Session API integration
    if ('mediaSession' in navigator) {
      const artwork = album?.hasCover
        ? [{ src: getCoverUrl(album.id), sizes: '512x512', type: 'image/jpeg' }]
        : []
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || album?.artist || '',
        album: album?.title || track.album || '',
        artwork,
      })
    }
  }

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Play error:', err))
    }
  }

  const nextTrack = () => {
    if (queue.length === 0 || queueIndex < 0) return

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      return
    }

    let nextIdx: number
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length)
    } else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') {
          nextIdx = 0
        } else {
          setIsPlaying(false)
          return
        }
      }
    }

    const nextTrk = queue[nextIdx]
    if (nextTrk) {
      setQueueIndex(nextIdx)
      playTrack(nextTrk, currentAlbum, queue)
    }
  }

  const prevTrack = () => {
    if (!audioRef.current) return
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }

    if (queue.length === 0 || queueIndex <= 0) {
      audioRef.current.currentTime = 0
      return
    }

    const prevIdx = queueIndex - 1
    const prevTrk = queue[prevIdx]
    if (prevTrk) {
      setQueueIndex(prevIdx)
      playTrack(prevTrk, currentAlbum, queue)
    }
  }

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      setCurrentTime(seconds)
    }
  }

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol))
    setVolumeState(clamped)
    if (isMuted && clamped > 0) setIsMuted(false)
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const toggleRepeatMode = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'))
  }

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev)
  }

  const addToQueue = (track: AudioTrack) => {
    setQueue((prev) => [...prev, track])
  }

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
    if (index === queueIndex) {
      nextTrack()
    } else if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1)
    }
  }

  const clearQueue = () => {
    if (currentTrack) {
      setQueue([currentTrack])
      setQueueIndex(0)
    } else {
      setQueue([])
      setQueueIndex(-1)
    }
  }

  // Handle onEnded
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleEnded = () => {
      nextTrack()
    }
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [queue, queueIndex, repeatMode, isShuffle, currentAlbum])

  // Setup MediaSession action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', togglePlayPause)
    navigator.mediaSession.setActionHandler('pause', togglePlayPause)
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack)
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack)
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seekTo(details.seekTime)
    })
  }, [isPlaying, queueIndex, queue, currentAlbum])

  // Heartbeat to phone remote control so it knows current track, time, cover, etc.
  useEffect(() => {
    if (!remoteContext) return

    const interval = setInterval(() => {
      const audio = audioRef.current
      remoteContext.sendStatus({
        title: currentTrack?.title ?? 'No track playing',
        playing: isPlaying,
        currentTime: audio ? audio.currentTime : currentTime,
        duration: audio && isFinite(audio.duration) ? audio.duration : duration,
        artist: currentTrack?.artist || currentAlbum?.artist || '',
        albumTitle: currentAlbum?.title || '',
        albumId: currentAlbum?.id || '',
        trackId: currentTrack?.id || '',
        coverUrl: currentAlbum?.hasCover ? getCoverUrl(currentAlbum.id) : undefined,
        repeatMode,
        isShuffle,
        visualizerMode,
        showTvView: isTvViewOpen,
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [
    remoteContext,
    currentTrack,
    currentAlbum,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    isShuffle,
    visualizerMode,
    isTvViewOpen,
  ])

  // Subscribe to remote commands (from phone pilot or TV remote)
  useEffect(() => {
    if (!remoteContext) return

    return remoteContext.subscribe((cmd) => {
      switch (cmd.action) {
        case 'PLAY':
          if (audioRef.current && !isPlaying) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
          }
          break
        case 'PAUSE':
          if (audioRef.current && isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
          }
          break
        case 'TOGGLE_PLAY':
          togglePlayPause()
          break
        case 'NEXT_TRACK':
        case 'NEXT_EPISODE':
          nextTrack()
          break
        case 'PREV_TRACK':
        case 'PREV_EPISODE':
          prevTrack()
          break
        case 'SEEK':
          if (audioRef.current && typeof cmd.relative === 'number') {
            seekTo(Math.max(0, Math.min(duration, audioRef.current.currentTime + cmd.relative)))
          }
          break
        case 'SEEK_TO':
          if (typeof cmd.currentTime === 'number') {
            seekTo(cmd.currentTime)
          }
          break
        case 'VOLUME':
          if (typeof cmd.relative === 'number') {
            setVolumeState((v) => {
              const next = Math.max(0, Math.min(1, Math.round((v + cmd.relative!) * 100) / 100))
              return next
            })
          }
          break
        case 'TOGGLE_MUTE':
          toggleMute()
          break
        case 'TOGGLE_SHUFFLE':
          toggleShuffle()
          break
        case 'TOGGLE_REPEAT':
          toggleRepeatMode()
          break
        case 'TOGGLE_TV_VIEW':
        case 'FULLSCREEN':
        case 'FULLSCREEN_PROMPT':
          setIsTvViewOpen((prev) => !prev)
          break
        case 'SET_VISUALIZER_MODE':
          if (cmd.visualizerMode === 'bars' || cmd.visualizerMode === 'mirror' || cmd.visualizerMode === 'wave') {
            setVisualizerMode(cmd.visualizerMode)
          }
          break
        case 'MUSIC_PLAY_TRACK':
          if (cmd.albumId && cmd.trackId) {
            fetchAlbum(cmd.albumId).then((res) => {
              const album = res.data
              const tr = album.tracks.find((t) => t.id === cmd.trackId)
              if (tr) {
                playTrack(tr, album, album.tracks)
                if (isTv) setIsTvViewOpen(true)
              }
            }).catch(() => {})
          }
          break
        case 'MUSIC_PLAY_ALBUM':
          if (cmd.albumId) {
            fetchAlbum(cmd.albumId).then((res) => {
              const album = res.data
              if (album.tracks && album.tracks.length > 0) {
                playTrack(album.tracks[0], album, album.tracks)
                if (isTv) setIsTvViewOpen(true)
              }
            }).catch(() => {})
          }
          break
      }
    })
  }, [
    remoteContext,
    isPlaying,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    toggleMute,
    toggleShuffle,
    toggleRepeatMode,
    isTv,
  ])

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        currentAlbum,
        queue,
        queueIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffle,
        isTv,
        isTvViewOpen,
        setIsTvViewOpen,
        toggleTvView,
        visualizerMode,
        setVisualizerMode,
        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleRepeatMode,
        toggleShuffle,
        addToQueue,
        removeFromQueue,
        clearQueue,
        getAnalyser,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  return ctx
}
