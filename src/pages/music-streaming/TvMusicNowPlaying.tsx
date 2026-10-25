import { useEffect, useCallback } from 'react'
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaRedo,
  FaSlidersH,
  FaVolumeUp,
  FaVolumeMute,
  FaTv,
  FaMusic,
  FaCompress,
} from 'react-icons/fa'
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
    toggleRepeatMode,
    toggleShuffle,
    toggleMixer,
  } = useAudioPlayer()

  const remoteContext = useOptionalRemoteControlContext()

  // Cycle through visualizer modes
  const cycleVisualizerMode = useCallback(() => {
    if (visualizerMode === 'bars') setVisualizerMode('mirror')
    else if (visualizerMode === 'mirror') setVisualizerMode('wave')
    else setVisualizerMode('bars')
  }, [visualizerMode, setVisualizerMode])

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

  const coverUrl = currentAlbum?.hasCover ? getCoverUrl(currentAlbum.id) : null
  const nextTrackItem = queueIndex >= 0 && queueIndex + 1 < queue.length ? queue[queueIndex + 1] : null

  return (
    <div className={styles.tvOverlay}>
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

      <div className={styles.content}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.tvBadge}>
            <FaTv className={styles.tvBadgeIcon} />
            <span>Music TV Mode</span>
            {remoteContext?.roomId && (
              <span className={styles.remoteBadge} title="Paired remote control Room ID">
                📱 Room {remoteContext.roomId}
              </span>
            )}
          </div>

          <div className={styles.topControls}>
            {/* Visualizer Mode Switch */}
            <div className={styles.modeSwitch}>
              <button
                className={`${styles.modeBtn} ${visualizerMode === 'bars' ? styles.modeBtnActive : ''}`}
                onClick={() => setVisualizerMode('bars')}
              >
                Equalizer
              </button>
              <button
                className={`${styles.modeBtn} ${visualizerMode === 'mirror' ? styles.modeBtnActive : ''}`}
                onClick={() => setVisualizerMode('mirror')}
              >
                Mirror
              </button>
              <button
                className={`${styles.modeBtn} ${visualizerMode === 'wave' ? styles.modeBtnActive : ''}`}
                onClick={() => setVisualizerMode('wave')}
              >
                Wave
              </button>
            </div>

            {/* Minimize / Back to Library */}
            <button
              className={styles.minimizeBtn}
              onClick={() => setIsTvViewOpen(false)}
              title="Minimize to browse library (Esc)"
            >
              <FaCompress />
              <span>Browse Library</span>
            </button>
          </div>
        </header>

        {/* Center Stage: Album Art & Track Details & Visualizer */}
        <main className={styles.centerStage}>
          {/* Album Cover Art */}
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
              {currentTrack.artist || currentAlbum?.artist || 'Unknown Artist'}
            </div>

            <div className={styles.albumMeta}>
              {currentAlbum?.title && (
                <span className={styles.albumTitle}>
                  {currentAlbum.title}
                </span>
              )}
              {(currentAlbum?.releaseYear || currentTrack.year) && (
                <span className={styles.tag}>
                  {currentAlbum?.releaseYear || currentTrack.year}
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
            </div>

            {/* Live Center-Stage Audio Visualizer */}
            <div className={styles.visualizerContainer}>
              <AudioVisualizer
                width={560}
                height={100}
                barCount={36}
                mode={visualizerMode}
                isPlaying={isPlaying}
              />
            </div>

            {/* Seek Bar & Progress Row */}
            <div className={styles.progressSection}>
              <div className={styles.progressRow}>
                <span className={styles.timeLabel}>
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  className={styles.progressBar}
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                />
                <span className={styles.timeLabel}>
                  {formatSeconds(duration)}
                </span>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className={styles.playbackRow}>
              <div className={styles.mainControls}>
                <button
                  className={`${styles.ctrlBtn} ${isShuffle ? styles.ctrlBtnActive : ''}`}
                  onClick={toggleShuffle}
                  title="Shuffle"
                >
                  <FaRandom />
                </button>

                <button
                  className={styles.ctrlBtn}
                  onClick={prevTrack}
                  title="Previous track (P)"
                >
                  <FaStepBackward />
                </button>

                <button
                  className={styles.playPauseBtn}
                  onClick={togglePlayPause}
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 3 }} />}
                </button>

                <button
                  className={styles.ctrlBtn}
                  onClick={nextTrack}
                  title="Next track (N)"
                >
                  <FaStepForward />
                </button>

                <button
                  className={`${styles.ctrlBtn} ${repeatMode !== 'off' ? styles.ctrlBtnActive : ''}`}
                  onClick={toggleRepeatMode}
                  title={`Repeat: ${repeatMode}`}
                >
                  <FaRedo />
                  {repeatMode === 'one' && (
                    <span style={{ fontSize: 10, marginLeft: -3, fontWeight: 700 }}>1</span>
                  )}
                </button>

                <button
                  className={`${styles.ctrlBtn} ${isMixerEnabled ? styles.ctrlBtnActive : ''}`}
                  onClick={toggleMixer}
                  title={`Auto-Mixer (skip 10s intro & outro silence): ${isMixerEnabled ? 'ON' : 'OFF'} (X)`}
                  style={{ position: 'relative' }}
                >
                  <FaSlidersH />
                  {isMixerEnabled && (
                    <span style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -3,
                      fontSize: 8,
                      fontWeight: 800,
                      lineHeight: 1,
                      background: 'var(--color-primary)',
                      color: '#fff',
                      padding: '1px 2px',
                      borderRadius: 3,
                    }}>10s</span>
                  )}
                </button>
              </div>

              {/* Volume Slider */}
              <div className={styles.volumeBox}>
                <button className={styles.ctrlBtn} onClick={toggleMute} title="Mute (M)">
                  {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <input
                  type="range"
                  className={styles.volSlider}
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  title={`Volume ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Bar: Up Next Preview & Shortcuts */}
        <footer className={styles.bottomBar}>
          {nextTrackItem ? (
            <div className={styles.upNextCard}>
              <span className={styles.upNextLabel}>
                <FaStepForward /> Up Next:
              </span>
              <span className={styles.upNextTitle}>
                {nextTrackItem.title}
              </span>
              <span>
                • {nextTrackItem.artist || currentAlbum?.artist || 'Unknown Artist'}
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className={styles.shortcutsHint}>
            <span><kbd className={styles.kbd}>Space</kbd> Play/Pause</span>
            <span><kbd className={styles.kbd}>←</kbd> <kbd className={styles.kbd}>→</kbd> Seek</span>
            <span><kbd className={styles.kbd}>N</kbd> Next</span>
            <span><kbd className={styles.kbd}>V</kbd> Visualizer</span>
            <span><kbd className={styles.kbd}>X</kbd> Auto-Mixer</span>
            <span><kbd className={styles.kbd}>Esc</kbd> Browse</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
