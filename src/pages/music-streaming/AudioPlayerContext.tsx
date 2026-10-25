import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { AudioAlbum, AudioTrack, AudioLibrarySummary, AudioPlaylist } from './types'
import { getTrackStreamUrl, getCoverUrl, fetchAlbum, fetchAudioSummary, fetchPlaylists } from './api'
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
  isMixerEnabled: boolean
  isTv: boolean
  isTvViewOpen: boolean
  setIsTvViewOpen: (open: boolean) => void
  toggleTvView: () => void
  visualizerMode: VisualizerMode
  setVisualizerMode: (mode: VisualizerMode) => void
  librarySummary: AudioLibrarySummary | null
  playlists: AudioPlaylist[]
  isLibraryLoading: boolean
  libraryLoaded: boolean
  loadLibrary: (force?: boolean) => Promise<void>
  getAlbumById: (albumId: string) => AudioAlbum | undefined
  playTrack: (track: AudioTrack, album: AudioAlbum | null, fullQueue?: AudioTrack[]) => void
  togglePlayPause: () => void
  nextTrack: () => void
  prevTrack: () => void
  seekTo: (seconds: number) => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  toggleRepeatMode: () => void
  toggleShuffle: () => void
  toggleMixer: () => void
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
  const [isMixerEnabled, setIsMixerEnabled] = useState<boolean>(() => {
    return localStorage.getItem('music_player_mixer') === 'true'
  })

  const isMixerEnabledRef = useRef(isMixerEnabled)
  isMixerEnabledRef.current = isMixerEnabled
  const isTransitioningRef = useRef(false)
  const pendingMixerStartRef = useRef(false)
  const nextTrackRef = useRef<() => void>(() => {})

  const toggleMixer = useCallback(() => {
    setIsMixerEnabled((prev) => {
      const next = !prev
      localStorage.setItem('music_player_mixer', String(next))
      if (next && audioRef.current) {
        const cur = audioRef.current.currentTime
        const dur = audioRef.current.duration
        if (dur && dur > 25 && cur < 10) {
          audioRef.current.currentTime = 10
          setCurrentTime(10)
        }
      }
      return next
    })
  }, [])

  const isTv = useIsTv()
  const [isTvViewOpen, setIsTvViewOpen] = useState(false)
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars')
  const toggleTvView = () => setIsTvViewOpen((prev) => !prev)

  const remoteContext = useOptionalRemoteControlContext()

  // In-memory library state and cover image preloader
  const [librarySummary, setLibrarySummary] = useState<AudioLibrarySummary | null>(null)
  const [playlists, setPlaylists] = useState<AudioPlaylist[]>([])
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  const preloadedCoversRef = useRef<Set<string>>(new Set())

  const loadLibrary = useCallback(async (force = false) => {
    if (libraryLoaded && !force) return
    setIsLibraryLoading(true)
    try {
      const [sumRes, plRes] = await Promise.all([
        fetchAudioSummary(),
        fetchPlaylists(),
      ])
      const summary = sumRes.data
      setLibrarySummary(summary)
      setPlaylists(plRes.data)
      setLibraryLoaded(true)

      // Preload all cover images into browser Image cache in memory
      if (summary && summary.albums) {
        summary.albums.forEach((alb) => {
          if (alb.hasCover && !preloadedCoversRef.current.has(alb.id)) {
            const img = new Image()
            img.src = getCoverUrl(alb.id)
            preloadedCoversRef.current.add(alb.id)
          }
        })
      }
    } catch (e) {
      console.warn('Failed to load audio library into memory', e)
    } finally {
      setIsLibraryLoading(false)
    }
  }, [libraryLoaded])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const getAlbumById = useCallback((albumId: string) => {
    if (!librarySummary || !librarySummary.albums) return undefined
    return librarySummary.albums.find((a) => a.id === albumId)
  }, [librarySummary])

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

    const applyMixerStart = () => {
      if (pendingMixerStartRef.current && audio.duration && audio.duration > 25) {
        try {
          audio.currentTime = 10
          setCurrentTime(10)
        } catch (e) {
          // ignore seek error
        }
        pendingMixerStartRef.current = false
      }
    }

    const onTimeUpdate = () => {
      const cur = audio.currentTime
      const dur = audio.duration
      setCurrentTime(cur)

      if (
        isMixerEnabledRef.current &&
        !isTransitioningRef.current &&
        dur &&
        dur > 25 &&
        cur >= dur - 10
      ) {
        isTransitioningRef.current = true
        nextTrackRef.current()
      }
    }

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
      applyMixerStart()
      if (!pendingMixerStartRef.current && audio.currentTime !== 0) {
        setCurrentTime(audio.currentTime)
      }
    }

    const onCanPlay = () => {
      applyMixerStart()
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
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('canplay', onCanPlay)
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

    isTransitioningRef.current = false
    pendingMixerStartRef.current = isMixerEnabledRef.current

    if (audioRef.current) {
      const streamUrl = getTrackStreamUrl(track.id)
      audioRef.current.src = streamUrl
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          if (isTv) setIsTvViewOpen(true)
          if (pendingMixerStartRef.current && audioRef.current && audioRef.current.duration > 25) {
            try {
              audioRef.current.currentTime = 10
              setCurrentTime(10)
            } catch (e) {}
            pendingMixerStartRef.current = false
          }
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
      const startAt = isMixerEnabled ? 10 : 0
      audioRef.current.currentTime = startAt
      setCurrentTime(startAt)
      audioRef.current.play()
      isTransitioningRef.current = false
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
          if (audioRef.current) {
            audioRef.current.pause()
          }
          setIsPlaying(false)
          isTransitioningRef.current = false
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

  nextTrackRef.current = nextTrack

  const prevTrack = () => {
    if (!audioRef.current) return
    const restartThreshold = isMixerEnabled ? 13 : 3
    if (audioRef.current.currentTime > restartThreshold) {
      const startAt = isMixerEnabled ? 10 : 0
      audioRef.current.currentTime = startAt
      setCurrentTime(startAt)
      isTransitioningRef.current = false
      return
    }

    if (queue.length === 0 || queueIndex <= 0) {
      const startAt = isMixerEnabled ? 10 : 0
      audioRef.current.currentTime = startAt
      setCurrentTime(startAt)
      isTransitioningRef.current = false
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
      const dur = audioRef.current.duration || 0
      if (dur > 25 && seconds < dur - 10) {
        isTransitioningRef.current = false
      }
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
        isMixerEnabled,
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
    isMixerEnabled,
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
        case 'TOGGLE_MIXER':
          toggleMixer()
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
    toggleMixer,
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
        isMixerEnabled,
        isTv,
        isTvViewOpen,
        setIsTvViewOpen,
        toggleTvView,
        visualizerMode,
        setVisualizerMode,
        librarySummary,
        playlists,
        isLibraryLoading,
        libraryLoaded,
        loadLibrary,
        getAlbumById,
        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleRepeatMode,
        toggleShuffle,
        toggleMixer,
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
