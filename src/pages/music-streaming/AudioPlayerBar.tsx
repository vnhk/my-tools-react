import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaRedo,
  FaVolumeUp,
  FaVolumeMute,
  FaListUl,
  FaMusic,
  FaTimes,
  FaWaveSquare,
} from 'react-icons/fa'
import { useAudioPlayer } from './AudioPlayerContext'
import { getCoverUrl } from './api'
import { AudioVisualizer } from './AudioVisualizer'
import { AudioVisualizerModal } from './AudioVisualizerModal'
import styles from './AudioPlayerBar.module.css'

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function AudioPlayerBar() {
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
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeatMode,
    toggleShuffle,
    removeFromQueue,
    clearQueue,
    playTrack,
  } = useAudioPlayer()

  const [showQueue, setShowQueue] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(false)

  if (!currentTrack) {
    return null
  }

  const coverSrc = currentAlbum?.hasCover ? getCoverUrl(currentAlbum.id) : null

  return (
    <>
      <div className={styles.playerBar}>
        {/* Track info (Left) */}
        <div className={styles.trackInfo}>
          <div className={styles.coverThumb}>
            {coverSrc ? (
              <img src={coverSrc} alt={currentAlbum?.title || currentTrack.album} />
            ) : (
              <div className={styles.coverPlaceholder}>
                <FaMusic />
              </div>
            )}
          </div>
          <div className={styles.trackDetails}>
            <div className={styles.trackTitle} title={currentTrack.title}>
              {currentTrack.title}
            </div>
            {currentAlbum ? (
              <Link
                to={`/music/album/${encodeURIComponent(currentAlbum.id)}`}
                className={styles.trackArtist}
                title={`${currentTrack.artist} • ${currentAlbum.title}`}
              >
                {currentTrack.artist || currentAlbum.artist}
              </Link>
            ) : (
              <span
                className={styles.trackArtist}
                title={currentTrack.artist || currentTrack.album || ''}
              >
                {currentTrack.artist || currentTrack.album || 'Unknown Artist'}
              </span>
            )}
          </div>

          {/* Mini Live Visualizer */}
          <div
            className={styles.miniVisualizerWrap}
            onClick={() => setShowVisualizer(true)}
            title="Click to open full Visualizer"
          >
            <AudioVisualizer width={52} height={26} barCount={10} isPlaying={isPlaying} />
          </div>
        </div>

        {/* Center Controls & Seek */}
        <div className={styles.centerControls}>
          <div className={styles.btnRow}>
            <button
              className={`${styles.controlBtn} ${isShuffle ? styles.controlBtnActive : ''}`}
              onClick={toggleShuffle}
              title="Shuffle"
            >
              <FaRandom />
            </button>
            <button className={styles.controlBtn} onClick={prevTrack} title="Previous track">
              <FaStepBackward />
            </button>
            <button
              className={styles.playPauseBtn}
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 2 }} />}
            </button>
            <button className={styles.controlBtn} onClick={nextTrack} title="Next track">
              <FaStepForward />
            </button>
            <button
              className={`${styles.controlBtn} ${repeatMode !== 'off' ? styles.controlBtnActive : ''}`}
              onClick={toggleRepeatMode}
              title={`Repeat: ${repeatMode}`}
            >
              <FaRedo />
              {repeatMode === 'one' && (
                <span style={{ fontSize: 9, marginLeft: -4, fontWeight: 700 }}>1</span>
              )}
            </button>
          </div>

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
        </div>

        {/* Extras / Volume (Right) */}
        <div className={styles.rightControls}>
          <button
            className={`${styles.controlBtn} ${showVisualizer ? styles.controlBtnActive : ''}`}
            onClick={() => setShowVisualizer((prev) => !prev)}
            title="Audio Visualizer (Jumping Equalizer Bars)"
            style={{ color: showVisualizer ? 'var(--color-primary)' : undefined }}
          >
            <FaWaveSquare />
          </button>

          <button
            className={`${styles.controlBtn} ${showQueue ? styles.controlBtnActive : ''}`}
            onClick={() => setShowQueue((prev) => !prev)}
            title="Play queue"
          >
            <FaListUl />
          </button>

          <div className={styles.volumeRow}>
            <button className={styles.controlBtn} onClick={toggleMute} title="Volume">
              {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <input
              type="range"
              className={styles.volumeBar}
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Queue Drawer */}
      {showQueue && (
        <div className={styles.queueDrawer}>
          <div className={styles.queueHeader}>
            <span className={styles.queueTitle}>Queue ({queue.length})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className={styles.queueClearBtn} onClick={clearQueue}>
                Clear
              </button>
              <button
                className={styles.queueClearBtn}
                onClick={() => setShowQueue(false)}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>
          </div>
          <div className={styles.queueList}>
            {queue.map((trk, i) => {
              const isActive = i === queueIndex
              return (
                <div
                  key={`${trk.id}-${i}`}
                  className={`${styles.queueItem} ${isActive ? styles.queueItemActive : ''}`}
                  onClick={() => playTrack(trk, currentAlbum, queue)}
                >
                  <div className={styles.queueItemInfo}>
                    <span className={styles.queueItemTitle}>{trk.title}</span>
                    <span className={styles.queueItemArtist}>{trk.artist}</span>
                  </div>
                  <button
                    className={styles.queueRemoveBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromQueue(i)
                    }}
                    title="Remove from queue"
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showVisualizer && (
        <AudioVisualizerModal onClose={() => setShowVisualizer(false)} />
      )}
    </>
  )
}
