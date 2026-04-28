import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Hls from 'hls.js'
import styles from './VideoPlayer.module.css'

export interface SubtitleTrack {
  lang: string
  label: string
  url: string
}

export interface VideoPlayerHandle {
  play(): void
  pause(): void
  seek(delta: number): void
  setVolume(delta: number): void
  toggleFullscreen(): void
  getVideoElement(): HTMLVideoElement | null
}

interface Props {
  src: string
  format: 'HLS' | 'MP4'
  startTime?: number
  subtitles?: SubtitleTrack[]
  onProgress?: (time: number) => void
  onEnded?: () => void
  onNavigateNext?: () => void
  onNavigatePrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
}

function fmt(secs: number) {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({
  src, format, startTime = 0, subtitles = [],
  onProgress, onEnded, onNavigateNext, onNavigatePrev, hasNext, hasPrev,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [activeSub, setActiveSub] = useState<string | null>(null)
  const [showSubMenu, setShowSubMenu] = useState(false)

  const handleToggleFullscreen = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    if (!document.fullscreenElement) c.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }, [])

  useImperativeHandle(ref, () => ({
    play: () => void videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (delta) => {
      const v = videoRef.current
      if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta))
    },
    setVolume: (delta) => {
      const v = videoRef.current
      if (v) v.volume = Math.max(0, Math.min(1, v.volume + delta))
    },
    toggleFullscreen: handleToggleFullscreen,
    getVideoElement: () => videoRef.current,
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    hlsRef.current?.destroy()
    hlsRef.current = null
    video.removeAttribute('src')

    if (format === 'HLS' && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startTime > 5) video.currentTime = startTime
      })
    } else {
      video.src = src
      if (startTime > 5) {
        video.addEventListener('loadedmetadata', () => { video.currentTime = startTime }, { once: true })
      }
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null }
  }, [src, format])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1))
      onProgressRef.current?.(video.currentTime)
    }
    const onDurationChange = () => setDuration(isFinite(video.duration) ? video.duration : 0)
    const onVideoEnded = () => { setPlaying(false); onEnded?.() }
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted) }
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('ended', onVideoEnded)
    video.addEventListener('volumechange', onVolumeChange)
    document.addEventListener('fullscreenchange', onFsChange)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('ended', onVideoEnded)
      video.removeEventListener('volumechange', onVolumeChange)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  }, [onEnded])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    Array.from(video.textTracks).forEach((track) => {
      track.mode = track.language === activeSub ? 'showing' : 'hidden'
    })
  }, [activeSub])

  const cycleSub = useCallback(() => {
    if (!subtitles.length) return
    const langs = subtitles.map((s) => s.lang)
    setActiveSub((prev) => {
      if (!prev) return langs[0]
      const idx = langs.indexOf(prev)
      return idx >= langs.length - 1 ? null : langs[idx + 1]
    })
  }, [subtitles])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const v = videoRef.current
      if (!v) return
      switch (e.key) {
        case ' ': e.preventDefault(); v.paused ? void v.play() : v.pause(); break
        case 'ArrowLeft': e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); break
        case 'ArrowRight': e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); break
        case 'f': case 'F': handleToggleFullscreen(); break
        case 'b': case 'B': cycleSub(); break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [cycleSub, handleToggleFullscreen])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.paused ? void v.play() : v.pause()
  }, [])

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const bar = progressBarRef.current
    const v = videoRef.current
    if (!bar || !v || !duration) return
    const rect = bar.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }, [duration])

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={styles.video}
        crossOrigin="anonymous"
        onClick={togglePlay}
        onDoubleClick={handleToggleFullscreen}
      >
        {subtitles.map((sub) => (
          <track key={sub.lang} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.label} />
        ))}
      </video>

      <div
        className={`${styles.controls} ${showControls ? styles.visible : styles.hidden}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={progressBarRef} className={styles.progressBar} onClick={handleProgressClick}>
          <div className={styles.progressBuffered} style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }} />
          <div className={styles.progressFill} style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
        </div>

        <div className={styles.controlsRow}>
          {hasPrev && <button className={styles.epNavBtn} onClick={onNavigatePrev} title="Previous episode">⏮</button>}

          <button className={styles.ctrlBtn} onClick={togglePlay} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
            {playing ? '⏸' : '▶'}
          </button>

          {hasNext && <button className={styles.epNavBtn} onClick={onNavigateNext} title="Next episode">⏭</button>}

          <span className={styles.timeDisplay}>{fmt(currentTime)} / {fmt(duration)}</span>

          <div className={styles.controlsRight}>
            {subtitles.length > 0 && (
              <div className={styles.subtitleControl}>
                <button
                  className={`${styles.ctrlBtn} ${activeSub ? styles.active : ''}`}
                  onClick={() => setShowSubMenu((p) => !p)}
                  title="Subtitles (B)"
                >CC</button>
                {showSubMenu && (
                  <div className={styles.subtitleMenu}>
                    <button className={!activeSub ? styles.active : ''} onClick={() => { setActiveSub(null); setShowSubMenu(false) }}>Off</button>
                    {subtitles.map((sub) => (
                      <button key={sub.lang} className={activeSub === sub.lang ? styles.active : ''} onClick={() => { setActiveSub(sub.lang); setShowSubMenu(false) }}>
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              className={styles.volumeSlider}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (videoRef.current) videoRef.current.volume = val
                setVolume(val)
              }}
              title="Volume"
            />

            <button className={styles.ctrlBtn} onClick={handleToggleFullscreen} title="Fullscreen (F)">
              {isFullscreen ? '⊡' : '⊞'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
export default VideoPlayer
