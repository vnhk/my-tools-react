import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchVideoInfo } from './api'
import VideoPlayer, { type VideoPlayerHandle } from './VideoPlayer'
import { useRemoteControlReceiver, type RemoteCommand } from './hooks/useRemoteControl'
import { useWatchProgress } from './hooks/useWatchProgress'
import type { VideoInfo } from './types'
import styles from './VideoPlayerPage.module.css'

export default function VideoPlayerPage() {
  const { productionName, videoFolderId } = useParams<{
    productionName: string
    videoFolderId: string
  }>()
  const navigate = useNavigate()
  const playerRef = useRef<VideoPlayerHandle>(null)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const reportProgress = useWatchProgress(videoFolderId ?? null)

  const videoInfoRef = useRef(videoInfo)
  videoInfoRef.current = videoInfo

  const goNext = useCallback(() => {
    const info = videoInfoRef.current
    if (info?.nextEpisodeId && productionName) {
      navigate(`/streaming/player/${encodeURIComponent(productionName)}/${info.nextEpisodeId}`)
    }
  }, [productionName, navigate])

  const goPrev = useCallback(() => {
    const info = videoInfoRef.current
    if (info?.prevEpisodeId && productionName) {
      navigate(`/streaming/player/${encodeURIComponent(productionName)}/${info.prevEpisodeId}`)
    }
  }, [productionName, navigate])

  const handleRemoteCommand = useCallback(
    (cmd: RemoteCommand) => {
      const player = playerRef.current
      if (!player) return
      switch (cmd.action) {
        case 'PLAY': player.play(); break
        case 'PAUSE': player.pause(); break
        case 'TOGGLE_PLAY': {
          const v = player.getVideoElement()
          v?.paused ? void v.play() : v?.pause()
          break
        }
        case 'SEEK': player.seek(cmd.relative ?? 0); break
        case 'VOLUME': player.setVolume(cmd.relative ?? 0); break
        case 'FULLSCREEN':
        case 'FULLSCREEN_PROMPT': player.toggleFullscreen(); break
        case 'NAVIGATE': if (cmd.url) navigate(cmd.url); break
        case 'NEXT_EPISODE': goNext(); break
        case 'PREV_EPISODE': goPrev(); break
      }
    },
    // goNext/goPrev read from refs internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const roomId = useRemoteControlReceiver(handleRemoteCommand)

  useEffect(() => {
    if (!productionName || !videoFolderId) return
    setLoading(true)
    setVideoInfo(null)
    fetchVideoInfo(productionName, videoFolderId)
      .then((res) => setVideoInfo(res.data))
      .catch(() => navigate('/streaming'))
      .finally(() => setLoading(false))
  }, [productionName, videoFolderId, navigate])

  if (loading) return <div className={styles.loading}>Loading…</div>
  if (!videoInfo) return null

  const subtitles = Object.entries(videoInfo.subtitleUrls ?? {}).map(([lang, url]) => ({
    lang,
    label: lang.toUpperCase(),
    url,
  }))

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link
          to={`/streaming/production/${encodeURIComponent(productionName ?? '')}`}
          className={styles.backBtn}
        >
          ←
        </Link>

        <div className={styles.title}>
          <span className={styles.productionName}>{productionName}</span>
          <span className={styles.episodeName}>{videoInfo.videoName}</span>
        </div>

        <div className={styles.roomBadge} title="Room ID — enter this in the Remote Control page">
          📱 {roomId}
        </div>
      </div>

      <div className={styles.playerWrapper}>
        <VideoPlayer
          ref={playerRef}
          src={videoInfo.videoUrl}
          format={videoInfo.videoFormat}
          startTime={videoInfo.watchProgress}
          subtitles={subtitles}
          onProgress={reportProgress}
          onEnded={goNext}
          onNavigateNext={videoInfo.nextEpisodeId ? goNext : undefined}
          onNavigatePrev={videoInfo.prevEpisodeId ? goPrev : undefined}
          hasNext={!!videoInfo.nextEpisodeId}
          hasPrev={!!videoInfo.prevEpisodeId}
        />
      </div>
    </div>
  )
}
