import { useState, useEffect } from 'react'
import {
  FaTimes,
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaMusic,
  FaWaveSquare,
} from 'react-icons/fa'
import { useAudioPlayer } from './AudioPlayerContext'
import { getCoverUrl } from './api'
import { AudioVisualizer, type VisualizerMode } from './AudioVisualizer'
import styles from './AudioVisualizerModal.module.css'

interface Props {
  onClose: () => void
}

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function AudioVisualizerModal({ onClose }: Props) {
  const {
    currentTrack,
    currentAlbum,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
  } = useAudioPlayer()

  const [mode, setMode] = useState<VisualizerMode>('bars')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault()
        togglePlayPause()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, togglePlayPause])

  if (!currentTrack) return null

  const coverSrc = currentAlbum?.hasCover ? getCoverUrl(currentAlbum.id) : null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FaWaveSquare style={{ color: 'var(--color-primary)' }} />
            <span>Audio Visualizer</span>
          </div>

          <div className={styles.modeSwitch}>
            <button
              className={`${styles.modeBtn} ${mode === 'bars' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('bars')}
            >
              Equalizer
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'mirror' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('mirror')}
            >
              Mirror
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'wave' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('wave')}
            >
              Wave
            </button>
          </div>

          <button className={styles.closeBtn} onClick={onClose} title="Close visualizer (Esc)">
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Artwork */}
          <div className={styles.artworkContainer}>
            {coverSrc ? (
              <img src={coverSrc} alt={currentTrack.title} className={styles.artworkImg} />
            ) : (
              <div className={styles.artworkPlaceholder}>
                <FaMusic />
              </div>
            )}
          </div>

          {/* Track metadata */}
          <div className={styles.trackInfo}>
            <div className={styles.trackTitle}>{currentTrack.title}</div>
            <div className={styles.trackArtist}>
              {currentTrack.artist || currentAlbum?.artist || 'Unknown Artist'}
              {currentAlbum && ` • ${currentAlbum.title}`}
            </div>
          </div>

          {/* Main Visualizer Canvas */}
          <div className={styles.visualizerWrapper}>
            <AudioVisualizer
              width={560}
              height={120}
              barCount={32}
              mode={mode}
              isPlaying={isPlaying}
            />
          </div>

          {/* Playback Controls */}
          <div className={styles.controls}>
            <div className={styles.progressRow}>
              <span className={styles.timeLabel}>{formatSeconds(currentTime)}</span>
              <input
                type="range"
                className={styles.progressBar}
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
              />
              <span className={styles.timeLabel}>{formatSeconds(duration)}</span>
            </div>

            <div className={styles.buttonRow}>
              <button className={styles.controlBtn} onClick={prevTrack} title="Previous">
                <FaStepBackward />
              </button>
              <button
                className={styles.playPauseBtn}
                onClick={togglePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 2 }} />}
              </button>
              <button className={styles.controlBtn} onClick={nextTrack} title="Next">
                <FaStepForward />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
