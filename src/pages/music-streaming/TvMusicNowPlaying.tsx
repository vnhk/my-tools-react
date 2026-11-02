import { useEffect, useCallback, useState, useRef } from 'react'
import { FaMusic, FaCompress } from 'react-icons/fa'
import { useAudioPlayer } from './AudioPlayerContext'
import { AudioVisualizer } from './AudioVisualizer'
import { getCoverUrl } from './api'
import { useOptionalRemoteControlContext } from '../../components/layout/RemoteControlProvider'
import styles from './TvMusicNowPlaying.module.css'

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function TvMusicNowPlaying() {
  const {
    currentTrack,
    currentAlbum,
    librarySummary,
    queue,
    queueIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isCrossfading,
    isTvViewOpen,
    setIsTvViewOpen,
    visualizerMode,
    setVisualizerMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleMixer,
  } = useAudioPlayer()

  const remoteContext = useOptionalRemoteControlContext()

  // Cycle through visualizer modes
  const cycleVisualizerMode = useCallback(() => {
    if (visualizerMode === 'bars') setVisualizerMode('mirror')
    else if (visualizerMode === 'mirror') setVisualizerMode('wave')
    else setVisualizerMode('bars')
  }, [visualizerMode, setVisualizerMode])

  // Auto-hide mouse cursor and floating close button after 3s of inactivity on TV
  const [isIdle, setIsIdle] = useState(true)
  const idleTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isTvViewOpen) return

    const handleMouseMove = () => {
      setIsIdle(false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true)
      }, 3000)
    }

    idleTimerRef.current = window.setTimeout(() => {
      setIsIdle(true)
    }, 3000)

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isTvViewOpen])

  // TV remote & keyboard shortcut handling
  useEffect(() => {
    if (!isTvViewOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowRight':
          e.preventDefault()
          seekTo(Math.min(duration, currentTime + 10))
          break
        case 'ArrowLeft':
          e.preventDefault()
          seekTo(Math.max(0, currentTime - 10))
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, Math.round((volume + 0.1) * 10) / 10))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, Math.round((volume - 0.1) * 10) / 10))
          break
        case 'KeyN':
          e.preventDefault()
          nextTrack()
          break
        case 'KeyP':
          e.preventDefault()
          prevTrack()
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          break
        case 'KeyV':
          e.preventDefault()
          cycleVisualizerMode()
          break
        case 'KeyX':
          e.preventDefault()
          toggleMixer()
          break
        case 'Escape':
          e.preventDefault()
          setIsTvViewOpen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isTvViewOpen,
    togglePlayPause,
    seekTo,
    currentTime,
    duration,
    setVolume,
    volume,
    nextTrack,
    prevTrack,
    toggleMute,
    cycleVisualizerMode,
    toggleMixer,
    setIsTvViewOpen,
  ])

  if (!isTvViewOpen || !currentTrack) {
    return null
  }

  // Resolve album metadata and cover even when playing from a mixed playlist
  const effectiveAlbum =
    currentAlbum ||
    (currentTrack
      ? librarySummary?.albums.find(
          (a) =>
            a.tracks?.some((t) => t.id === currentTrack.id) ||
            a.id === currentTrack.album ||
            a.title === currentTrack.album
        )
      : null)

  const coverUrl = effectiveAlbum?.hasCover ? getCoverUrl(effectiveAlbum.id) : null
  const nextTrackItem =
    queueIndex >= 0 && queueIndex + 1 < queue.length ? queue[queueIndex + 1] : null

  return (
    <div className={`${styles.tvOverlay} ${isIdle ? styles.idleCursor : ''}`}>
      {/* Dynamic blurred ambient album art background */}
      {coverUrl ? (
        <div
          className={styles.backdrop}
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      ) : (
        <div
          className={styles.backdrop}
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
          }}
        />
      )}

      {/* Radial vignette overlay */}
      <div className={styles.vignette} />

      {/* Floating Header (only visible on desktop mouse movement, never clutters TV) */}
      <header className={`${styles.floatingHeader} ${!isIdle ? styles.headerVisible : ''}`}>
        {remoteContext?.roomId && (
          <div className={styles.remoteBadge}>
            📱 Room {remoteContext.roomId}
          </div>
        )}
        <button
          className={styles.floatingCloseBtn}
          onClick={() => setIsTvViewOpen(false)}
          title="Exit Fullscreen (Esc)"
        >
          <FaCompress />
        </button>
      </header>

      {/* Clean, centered TV Stage */}
      <div className={styles.content}>
        <main className={styles.centerStage}>
          {/* Album Cover Art / Poster */}
          <div className={styles.coverWrap}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentTrack.title}
                className={styles.coverImg}
              />
            ) : (
              <div className={styles.coverPlaceholder}>
                <FaMusic />
              </div>
            )}
          </div>

          {/* Track Details & Visualizer */}
          <div className={styles.trackDetails}>
            <div className={styles.title}>{currentTrack.title}</div>
            <div className={styles.artist}>
              {currentTrack.artist || effectiveAlbum?.artist || 'Unknown Artist'}
            </div>

            <div className={styles.albumMeta}>
              {(effectiveAlbum?.title || currentTrack.album) && (
                <span className={styles.albumTitle}>
                  {effectiveAlbum?.title || currentTrack.album}
                </span>
              )}
              {(effectiveAlbum?.releaseYear || currentTrack.year) && (
                <span className={styles.tag}>
                  {effectiveAlbum?.releaseYear || currentTrack.year}
                </span>
              )}
              {currentTrack.genre && (
                <span className={styles.tag}>{currentTrack.genre}</span>
              )}
              {queue.length > 1 && (
                <span className={styles.tag}>
                  {queueIndex + 1} / {queue.length}
                </span>
              )}
              {isCrossfading && (
                <span className={styles.djBadge}>
                  🎛️ DJ Crossfade
                </span>
              )}
            </div>

            {/* Live Center-Stage Audio Visualizer */}
            <div className={styles.visualizerContainer}>
              <AudioVisualizer
                width={560}
                height={120}
                barCount={32}
                mode={visualizerMode}
                isPlaying={isPlaying}
              />
            </div>

            {/* Sleek TV Progress Bar & Times */}
            <div className={styles.progressSection}>
              <div className={styles.progressRow}>
                <span className={styles.timeLabel}>
                  {formatSeconds(currentTime)}
                </span>
                <div
                  className={styles.progressTrack}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const pct = Math.max(0, Math.min(1, clickX / rect.width))
                    seekTo(pct * (duration || 0))
                  }}
                  title="Click to seek"
                >
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, duration ? (currentTime / duration) * 100 : 0)
                      )}%`,
                    }}
                  />
                </div>
                <span className={styles.timeLabel}>
                  {formatSeconds(duration)}
                </span>
              </div>
            </div>

            {/* Subtle Up Next Preview (clean typography, no buttons) */}
            {nextTrackItem && (
              <div className={styles.upNextHint}>
                <span className={styles.upNextLabel}>Up Next:</span>{' '}
                <span className={styles.upNextTitle}>{nextTrackItem.title}</span>
                <span className={styles.upNextArtist}>
                  {' '}• {nextTrackItem.artist || effectiveAlbum?.artist || 'Unknown Artist'}
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
