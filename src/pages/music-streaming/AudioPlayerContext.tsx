import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { AudioAlbum, AudioTrack, AudioLibrarySummary, AudioPlaylist } from './types'
import { getTrackStreamUrl, getCoverUrl, fetchAlbum, fetchAudioSummary, fetchPlaylists } from './api'
import type { VisualizerMode } from './AudioVisualizer'
import { useIsTv } from '../../common/hooks/useIsTv'
import { useOptionalRemoteControlContext } from '../../components/layout/RemoteControlProvider'
import { pickHarmonicCandidate } from './harmonicMixing'

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null
  currentAlbum: AudioAlbum | null
  queue: AudioTrack[]
  queueIndex: number
  isPlaying: boolean
  isCrossfading: boolean
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

interface DeckNode {
  id: 'A' | 'B'
  audio: HTMLAudioElement
  source: MediaElementAudioSourceNode | null
  filter: BiquadFilterNode | null
  gain: GainNode | null
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  // Dual-deck DJ audio engine
  const deckARef = useRef<DeckNode | null>(null)
  const deckBRef = useRef<DeckNode | null>(null)
  const activeDeckRef = useRef<'A' | 'B'>('A')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [currentAlbum, setCurrentAlbum] = useState<AudioAlbum | null>(null)
  const [queue, setQueue] = useState<AudioTrack[]>([])
  const [queueIndex, setQueueIndex] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCrossfading, setIsCrossfading] = useState(false)
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

  // Synchronized refs for fresh values inside event handlers
  const currentTrackRef = useRef(currentTrack)
  currentTrackRef.current = currentTrack
  const currentAlbumRef = useRef(currentAlbum)
  currentAlbumRef.current = currentAlbum
  const queueRef = useRef(queue)
  queueRef.current = queue
  const queueIndexRef = useRef(queueIndex)
  queueIndexRef.current = queueIndex
  const isMixerEnabledRef = useRef(isMixerEnabled)
  isMixerEnabledRef.current = isMixerEnabled
  const repeatModeRef = useRef(repeatMode)
  repeatModeRef.current = repeatMode
  const isShuffleRef = useRef(isShuffle)
  isShuffleRef.current = isShuffle

  const isTransitioningRef = useRef(false)
  const crossfadeTimerRef = useRef<number | null>(null)
  const nextTrackRef = useRef<() => void>(() => {})
  const startCrossfadeRef = useRef<() => void>(() => {})

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

  // Initialize Web Audio graph for Dual Decks, DJ filter, and Analyser
  const initAudioGraph = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return null

      const ctx = new AudioCtx()
      const masterGain = ctx.createGain()
      masterGain.gain.value = isMuted ? 0 : volume

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.78

      masterGain.connect(analyser)
      analyser.connect(ctx.destination)

      audioCtxRef.current = ctx
      masterGainRef.current = masterGain
      analyserRef.current = analyser

      // Deck A routing: sourceA -> filterA (High-pass) -> gainA -> masterGain
      if (deckARef.current && !deckARef.current.source) {
        const sourceA = ctx.createMediaElementSource(deckARef.current.audio)
        const filterA = ctx.createBiquadFilter()
        filterA.type = 'highpass'
        filterA.frequency.value = 20
        const gainA = ctx.createGain()
        gainA.gain.value = activeDeckRef.current === 'A' ? 1.0 : 0.0

        sourceA.connect(filterA)
        filterA.connect(gainA)
        gainA.connect(masterGain)

        deckARef.current.source = sourceA
        deckARef.current.filter = filterA
        deckARef.current.gain = gainA
      }

      // Deck B routing: sourceB -> filterB (High-pass) -> gainB -> masterGain
      if (deckBRef.current && !deckBRef.current.source) {
        const sourceB = ctx.createMediaElementSource(deckBRef.current.audio)
        const filterB = ctx.createBiquadFilter()
        filterB.type = 'highpass'
        filterB.frequency.value = 20
        const gainB = ctx.createGain()
        gainB.gain.value = activeDeckRef.current === 'B' ? 1.0 : 0.0

        sourceB.connect(filterB)
        filterB.connect(gainB)
        gainB.connect(masterGain)

        deckBRef.current.source = sourceB
        deckBRef.current.filter = filterB
        deckBRef.current.gain = gainB
      }

      return ctx
    } catch (e) {
      console.warn('Could not initialize Web Audio API graph', e)
      return null
    }
  }, [isMuted, volume])

  const getAnalyser = useCallback(() => {
    initAudioGraph()
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return analyserRef.current
  }, [initAudioGraph])

  // Pick candidate for next track (using harmonic genre/style matching in shuffle/mixer)
  const pickNextTrackCandidate = useCallback((): {
    track: AudioTrack
    album: AudioAlbum | null
    index: number
  } | null => {
    const currentQ = queueRef.current
    const currentIdx = queueIndexRef.current
    const curTrack = currentTrackRef.current
    const curAlbum = currentAlbumRef.current
    const shuffle = isShuffleRef.current
    const repeat = repeatModeRef.current

    if (currentQ.length === 0 || currentIdx < 0) return null

    if (repeat === 'one' && curTrack) {
      return { track: curTrack, album: curAlbum, index: currentIdx }
    }

    let nextIdx: number

    if (shuffle) {
      // Harmonic & genre matching from queue candidates
      const candidates = currentQ
        .map((trk, idx) => ({ track: trk, originalIndex: idx }))
        .filter((item) => item.originalIndex !== currentIdx)

      if (curTrack && candidates.length > 0) {
        const chosen = pickHarmonicCandidate(curTrack, candidates)
        nextIdx = chosen !== null ? chosen : Math.floor(Math.random() * currentQ.length)
      } else {
        nextIdx = Math.floor(Math.random() * currentQ.length)
      }
    } else {
      nextIdx = currentIdx + 1
      if (nextIdx >= currentQ.length) {
        if (repeat === 'all') {
          nextIdx = 0
        } else {
          return null // Reached end of queue
        }
      }
    }

    const nextTrack = currentQ[nextIdx]
    if (!nextTrack) return null

    const nextAlbum = curAlbum?.tracks.some((t) => t.id === nextTrack.id)
      ? curAlbum
      : getAlbumById(nextTrack.album) || null

    return { track: nextTrack, album: nextAlbum, index: nextIdx }
  }, [getAlbumById])

  // DJ Crossfade Engine: smoothly crossfades outgoing & incoming tracks with high-pass bass filter sweep
  const startCrossfade = useCallback(() => {
    if (isTransitioningRef.current) return

    const nextItem = pickNextTrackCandidate()
    if (!nextItem) return // No next track available, let current track finish naturally

    isTransitioningRef.current = true
    setIsCrossfading(true)

    const ctx = initAudioGraph()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const outgoingId = activeDeckRef.current
    const incomingId: 'A' | 'B' = outgoingId === 'A' ? 'B' : 'A'

    const outDeck = outgoingId === 'A' ? deckARef.current! : deckBRef.current!
    const inDeck = incomingId === 'A' ? deckARef.current! : deckBRef.current!

    const { track: nextTrk, album: nextAlb, index: nextIdx } = nextItem

    const CROSSFADE_TIME = 10 // 10s smooth mix

    // Start incoming song from second 10 if track is long enough (>25s)
    const startOffset = nextTrk.durationSeconds && nextTrk.durationSeconds > 25 ? 10 : 0
    const streamUrl = getTrackStreamUrl(nextTrk.id)

    inDeck.audio.src = streamUrl
    inDeck.audio.currentTime = startOffset

    if (ctx && outDeck.gain && inDeck.gain) {
      const now = ctx.currentTime

      // 1. Outgoing Deck: Fade out volume 1.0 -> 0.0
      outDeck.gain.gain.cancelScheduledValues(now)
      outDeck.gain.gain.setValueAtTime(1.0, now)
      outDeck.gain.gain.linearRampToValueAtTime(0.0, now + CROSSFADE_TIME)

      // 2. Outgoing Deck: DJ High-Pass Filter sweep 20Hz -> 600Hz
      // Eliminates low bass/kick from the outgoing song so it doesn't clash with incoming bass!
      if (outDeck.filter) {
        outDeck.filter.frequency.cancelScheduledValues(now)
        outDeck.filter.frequency.setValueAtTime(20, now)
        outDeck.filter.frequency.exponentialRampToValueAtTime(600, now + CROSSFADE_TIME)
      }

      // 3. Incoming Deck: Fade in volume 0.0 -> 1.0
      inDeck.gain.gain.cancelScheduledValues(now)
      inDeck.gain.gain.setValueAtTime(0.0, now)
      inDeck.gain.gain.linearRampToValueAtTime(1.0, now + CROSSFADE_TIME)

      // 4. Incoming Deck: Full transparent bass range
      if (inDeck.filter) {
        inDeck.filter.frequency.cancelScheduledValues(now)
        inDeck.filter.frequency.setValueAtTime(20, now)
      }
    }

    // Start playing incoming deck simultaneously
    inDeck.audio
      .play()
      .then(() => {
        setIsPlaying(true)
      })
      .catch((err) => {
        console.warn('Incoming deck play error:', err)
      })

    // Switch active deck pointer so UI instantly tracks the incoming track
    activeDeckRef.current = incomingId
    audioRef.current = inDeck.audio
    setCurrentTrack(nextTrk)
    setCurrentAlbum(nextAlb)
    setQueueIndex(nextIdx)

    // Update MediaSession
    if ('mediaSession' in navigator) {
      const artwork = nextAlb?.hasCover
        ? [{ src: getCoverUrl(nextAlb.id), sizes: '512x512', type: 'image/jpeg' }]
        : []
      navigator.mediaSession.metadata = new MediaMetadata({
        title: nextTrk.title,
        artist: nextTrk.artist || nextAlb?.artist || '',
        album: nextAlb?.title || nextTrk.album || '',
        artwork,
      })
    }

    // Schedule cleanup after crossfade duration
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current)
    }
    crossfadeTimerRef.current = window.setTimeout(() => {
      outDeck.audio.pause()
      outDeck.audio.src = ''

      if (ctx && outDeck.gain) {
        outDeck.gain.gain.setValueAtTime(1.0, ctx.currentTime)
      }
      if (ctx && outDeck.filter) {
        outDeck.filter.frequency.setValueAtTime(20, ctx.currentTime)
      }

      isTransitioningRef.current = false
      setIsCrossfading(false)
    }, CROSSFADE_TIME * 1000)
  }, [initAudioGraph, pickNextTrackCandidate])

  startCrossfadeRef.current = startCrossfade

  // Initialize Dual Audio elements and bind listeners
  useEffect(() => {
    const audioA = new Audio()
    audioA.preload = 'metadata'
    audioA.crossOrigin = 'anonymous'

    const audioB = new Audio()
    audioB.preload = 'metadata'
    audioB.crossOrigin = 'anonymous'

    deckARef.current = { id: 'A', audio: audioA, source: null, filter: null, gain: null }
    deckBRef.current = { id: 'B', audio: audioB, source: null, filter: null, gain: null }
    activeDeckRef.current = 'A'
    audioRef.current = audioA

    const bindDeckEvents = (deckAudio: HTMLAudioElement, deckId: 'A' | 'B') => {
      const onTimeUpdate = () => {
        if (activeDeckRef.current !== deckId) return
        const cur = deckAudio.currentTime
        const dur = deckAudio.duration
        setCurrentTime(cur)

        // DJ Auto-Mixer: trigger crossfade 10s before the song ends
        const CROSSFADE_TIME = 10
        if (
          isMixerEnabledRef.current &&
          !isTransitioningRef.current &&
          dur &&
          dur > 25 &&
          cur >= dur - CROSSFADE_TIME
        ) {
          startCrossfadeRef.current()
        }
      }

      const onLoadedMetadata = () => {
        if (activeDeckRef.current === deckId) {
          setDuration(deckAudio.duration || 0)
        }
      }

      const onPlay = () => {
        setIsPlaying(true)
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {})
        }
      }

      const onPause = () => {
        const otherAudio = deckId === 'A' ? audioB : audioA
        if (deckAudio.paused && otherAudio.paused) {
          setIsPlaying(false)
        }
      }

      const onEnded = () => {
        if (activeDeckRef.current === deckId && !isTransitioningRef.current) {
          nextTrackRef.current()
        }
      }

      const onError = (e: Event) => {
        console.warn(`Deck ${deckId} error:`, e)
        if (activeDeckRef.current === deckId && !isTransitioningRef.current) {
          setIsPlaying(false)
        }
      }

      deckAudio.addEventListener('timeupdate', onTimeUpdate)
      deckAudio.addEventListener('loadedmetadata', onLoadedMetadata)
      deckAudio.addEventListener('play', onPlay)
      deckAudio.addEventListener('pause', onPause)
      deckAudio.addEventListener('ended', onEnded)
      deckAudio.addEventListener('error', onError)

      return () => {
        deckAudio.removeEventListener('timeupdate', onTimeUpdate)
        deckAudio.removeEventListener('loadedmetadata', onLoadedMetadata)
        deckAudio.removeEventListener('play', onPlay)
        deckAudio.removeEventListener('pause', onPause)
        deckAudio.removeEventListener('ended', onEnded)
        deckAudio.removeEventListener('error', onError)
        deckAudio.pause()
        deckAudio.src = ''
      }
    }

    const cleanA = bindDeckEvents(audioA, 'A')
    const cleanB = bindDeckEvents(audioB, 'B')

    return () => {
      cleanA()
      cleanB()
    }
  }, [])

  // Sync master volume with Web Audio masterGain node & fallback audio elements
  useEffect(() => {
    const targetVol = isMuted ? 0 : volume
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(targetVol, audioCtxRef.current.currentTime)
    } else {
      if (deckARef.current?.audio) deckARef.current.audio.volume = targetVol
      if (deckBRef.current?.audio) deckBRef.current.audio.volume = targetVol
    }
    localStorage.setItem('music_player_volume', String(volume))
  }, [volume, isMuted])

  // Toggle Auto-Mixer
  const toggleMixer = useCallback(() => {
    setIsMixerEnabled((prev) => {
      const next = !prev
      localStorage.setItem('music_player_mixer', String(next))
      return next
    })
  }, [])

  // Play track immediately
  const playTrack = (track: AudioTrack, album: AudioAlbum | null, fullQueue?: AudioTrack[]) => {
    setCurrentTrack(track)
    setCurrentAlbum(album)

    const newQueue = fullQueue && fullQueue.length > 0 ? fullQueue : (album ? album.tracks : [track])
    setQueue(newQueue)
    const idx = newQueue.findIndex((t) => t.id === track.id)
    setQueueIndex(idx >= 0 ? idx : 0)

    // Cancel any running crossfade
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current)
      crossfadeTimerRef.current = null
    }
    isTransitioningRef.current = false
    setIsCrossfading(false)

    // Stop inactive deck
    const inactiveDeck = activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current
    if (inactiveDeck) {
      inactiveDeck.audio.pause()
      inactiveDeck.audio.src = ''
    }

    const activeDeck = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current
    if (activeDeck) {
      const ctx = initAudioGraph()
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        const now = ctx.currentTime
        if (activeDeck.gain) {
          activeDeck.gain.gain.cancelScheduledValues(now)
          activeDeck.gain.gain.setValueAtTime(1.0, now)
        }
        if (activeDeck.filter) {
          activeDeck.filter.frequency.cancelScheduledValues(now)
          activeDeck.filter.frequency.setValueAtTime(20, now)
        }
      }

      const streamUrl = getTrackStreamUrl(track.id)
      activeDeck.audio.src = streamUrl
      activeDeck.audio.currentTime = 0
      activeDeck.audio
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
    const activeDeck = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current
    if (!activeDeck || !currentTrack) return

    if (isPlaying) {
      deckARef.current?.audio.pause()
      deckBRef.current?.audio.pause()
      setIsPlaying(false)
    } else {
      initAudioGraph()
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
      activeDeck.audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Play error:', err))

      // If paused during crossfade, resume secondary deck as well
      if (isTransitioningRef.current) {
        const inactiveDeck = activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current
        if (inactiveDeck && inactiveDeck.audio.src) {
          inactiveDeck.audio.play().catch(() => {})
        }
      }
    }
  }

  const nextTrack = () => {
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current)
      crossfadeTimerRef.current = null
    }
    isTransitioningRef.current = false
    setIsCrossfading(false)

    const inactiveDeck = activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current
    if (inactiveDeck) {
      inactiveDeck.audio.pause()
      inactiveDeck.audio.src = ''
    }

    const nextItem = pickNextTrackCandidate()
    if (nextItem) {
      playTrack(nextItem.track, nextItem.album, queueRef.current)
    } else {
      const activeDeck = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current
      if (activeDeck) activeDeck.audio.pause()
      setIsPlaying(false)
    }
  }

  nextTrackRef.current = nextTrack

  const prevTrack = () => {
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current)
      crossfadeTimerRef.current = null
    }
    isTransitioningRef.current = false
    setIsCrossfading(false)

    const activeAudio = activeDeckRef.current === 'A' ? deckARef.current?.audio : deckBRef.current?.audio
    if (activeAudio && activeAudio.currentTime > 3) {
      activeAudio.currentTime = 0
      setCurrentTime(0)
      return
    }

    const q = queueRef.current
    const qIdx = queueIndexRef.current
    if (q.length === 0 || qIdx <= 0) {
      if (activeAudio) {
        activeAudio.currentTime = 0
        setCurrentTime(0)
      }
      return
    }

    const prevIdx = qIdx - 1
    const prevTrk = q[prevIdx]
    if (prevTrk) {
      playTrack(prevTrk, currentAlbumRef.current, q)
    }
  }

  const seekTo = (seconds: number) => {
    const activeAudio = activeDeckRef.current === 'A' ? deckARef.current?.audio : deckBRef.current?.audio
    if (activeAudio) {
      activeAudio.currentTime = seconds
      setCurrentTime(seconds)
      const dur = activeAudio.duration || 0
      if (dur > 25 && seconds < dur - 10) {
        // If user seeks backwards before the transition window, cancel crossfade
        if (isTransitioningRef.current) {
          if (crossfadeTimerRef.current) {
            clearTimeout(crossfadeTimerRef.current)
            crossfadeTimerRef.current = null
          }
          isTransitioningRef.current = false
          setIsCrossfading(false)
          const inactiveDeck = activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current
          if (inactiveDeck) {
            inactiveDeck.audio.pause()
            inactiveDeck.audio.src = ''
          }
        }
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
      const activeAudio = activeDeckRef.current === 'A' ? deckARef.current?.audio : deckBRef.current?.audio
      remoteContext.sendStatus({
        title: currentTrack?.title ?? 'No track playing',
        playing: isPlaying,
        currentTime: activeAudio ? activeAudio.currentTime : currentTime,
        duration: activeAudio && isFinite(activeAudio.duration) ? activeAudio.duration : duration,
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
      const activeAudio = activeDeckRef.current === 'A' ? deckARef.current?.audio : deckBRef.current?.audio
      switch (cmd.action) {
        case 'PLAY':
          if (activeAudio && !isPlaying) {
            activeAudio.play().then(() => setIsPlaying(true)).catch(() => {})
          }
          break
        case 'PAUSE':
          if (activeAudio && isPlaying) {
            activeAudio.pause()
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
          if (activeAudio && typeof cmd.relative === 'number') {
            seekTo(Math.max(0, Math.min(duration, activeAudio.currentTime + cmd.relative)))
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
        isCrossfading,
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
