import { useEffect, useMemo, useState } from 'react'
import type { RemoteStatus } from '../../common/hooks/useRemoteControl'
import { fetchAlbums, getCoverUrl } from '../music-streaming/api'
import type { AudioAlbum } from '../music-streaming/types'
import styles from './RemoteControlPage.module.css'

function fmtTime(secs: number) {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface Props {
  connected: boolean
  send: (action: string, data?: Record<string, unknown>) => void
  status: RemoteStatus | null
}

export function MusicRemoteTab({ connected, send, status }: Props) {
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [albums, setAlbums] = useState<AudioAlbum[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(false)
  const [query, setQuery] = useState('')
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoadingAlbums(true)
    fetchAlbums()
      .then((res) => {
        if (mounted) {
          setAlbums(res.data)
          // Preload album covers into phone browser memory cache
          res.data.forEach((alb) => {
            if (alb.hasCover) {
              const img = new Image()
              img.src = getCoverUrl(alb.id)
            }
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingAlbums(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredAlbums = useMemo(() => {
    if (!normalizedQuery) return albums.slice(0, 15)

    return albums
      .filter((alb) => {
        const matchTitle = alb.title.toLowerCase().includes(normalizedQuery)
        const matchArtist = alb.artist.toLowerCase().includes(normalizedQuery)
        const matchGenre = alb.genres?.some((g) => g.toLowerCase().includes(normalizedQuery))
        const matchTracks = alb.tracks?.some((t) => t.title.toLowerCase().includes(normalizedQuery))
        return matchTitle || matchArtist || matchGenre || matchTracks
      })
      .slice(0, 20)
  }, [albums, normalizedQuery])

  const seekTo = (time: number) => {
    if (!connected) return
    send('SEEK_TO', { currentTime: time })
  }

  const playAlbumOnTv = (albumId: string) => {
    if (!connected) return
    send('MUSIC_PLAY_ALBUM', { albumId })
  }

  const playTrackOnTv = (albumId: string, trackId: string) => {
    if (!connected) return
    send('MUSIC_PLAY_TRACK', { albumId, trackId })
  }

  const btn = (
    label: string,
    action: string,
    data?: Record<string, unknown>,
    large = false
  ) => (
    <button
      className={large ? styles.remoteBtnLg : styles.remoteBtn}
      disabled={!connected}
      onClick={() => send(action, data)}
    >
      {label}
    </button>
  )

  const coverSrc = status?.coverUrl || (status?.albumId ? getCoverUrl(status.albumId) : null)

  return (
    <>
      {/* ══ Now Playing Card ══════════════════════════════════════ */}
      {status && (
        <div className={styles.nowPlaying}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {coverSrc ? (
              <img
                src={coverSrc}
                alt="Album Cover"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  objectFit: 'cover',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                🎵
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.nowPlayingTitle}>
                <span>{status.playing ? '▶' : '⏸'}</span>
                <span className={styles.nowPlayingName}>
                  {status.title || 'No track playing'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 2,
                }}
              >
                {status.artist || 'Unknown Artist'}
                {status.albumTitle && ` • ${status.albumTitle}`}
              </div>
            </div>
          </div>

          <input
            type="range"
            className={styles.seekBar}
            min={0}
            max={Math.max(status.duration || 1, 1)}
            step={1}
            disabled={!connected}
            value={scrubTime ?? (status.currentTime || 0)}
            onChange={(e) => setScrubTime(Number(e.target.value))}
            onMouseUp={() => {
              if (scrubTime != null) {
                seekTo(scrubTime)
                setScrubTime(null)
              }
            }}
            onTouchEnd={() => {
              if (scrubTime != null) {
                seekTo(scrubTime)
                setScrubTime(null)
              }
            }}
          />

          <div className={styles.seekTimes}>
            <span>{fmtTime(scrubTime ?? (status.currentTime || 0))}</span>
            <span>{fmtTime(status.duration || 0)}</span>
          </div>
        </div>
      )}

      {/* ══ Remote Playback Controls ══════════════════════════════ */}
      <div className={styles.controls}>
        {/* Row 1: Track Navigation & Play/Pause */}
        <div className={styles.section}>
          <div className={styles.row}>
            {btn('⏮ Prev', 'PREV_TRACK')}
            {btn(status?.playing ? '⏸ Pause' : '▶ Play', 'TOGGLE_PLAY', undefined, true)}
            {btn('Next ⏭', 'NEXT_TRACK')}
          </div>
        </div>

        {/* Row 2: Seek Jump Buttons */}
        <div className={styles.section}>
          <div className={styles.row}>
            {btn('⏪ −10s', 'SEEK', { relative: -10 })}
            {btn('+10s ⏩', 'SEEK', { relative: 10 })}
          </div>
        </div>

        {/* Row 3: Volume Controls */}
        <div className={styles.section}>
          <div className={styles.row}>
            {btn('🔉 Vol −', 'VOLUME', { relative: -0.1 })}
            {btn('Vol + 🔊', 'VOLUME', { relative: 0.1 })}
            {btn('🔇 Mute', 'TOGGLE_MUTE')}
          </div>
        </div>

        {/* Row 4: Modes (Shuffle, Repeat) */}
        <div className={styles.section}>
          <div className={styles.row}>
            <button
              className={`${styles.remoteBtn} ${status?.isShuffle ? styles.chipActive : ''}`}
              disabled={!connected}
              onClick={() => send('TOGGLE_SHUFFLE')}
            >
              🔀 Shuffle {status?.isShuffle ? 'ON' : 'OFF'}
            </button>

            <button
              className={`${styles.remoteBtn} ${status?.repeatMode && status.repeatMode !== 'off' ? styles.chipActive : ''}`}
              disabled={!connected}
              onClick={() => send('TOGGLE_REPEAT')}
            >
              🔁 Repeat: {status?.repeatMode?.toUpperCase() || 'OFF'}
            </button>
          </div>
        </div>

        {/* Row 5: TV Screen & Visualizer Options */}
        <div className={styles.section}>
          <div className={styles.searchLabel}>TV Screen Display</div>
          <div className={styles.row} style={{ marginTop: 6 }}>
            <button
              className={`${styles.remoteBtn} ${status?.showTvView ? styles.chipActive : ''}`}
              disabled={!connected}
              onClick={() => send('TOGGLE_TV_VIEW')}
            >
              {status?.showTvView ? '⤓ Close TV View' : '⛶ Fullscreen on TV'}
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className={styles.searchLabel}>Visualizer Mode</div>
            <div className={styles.filterChips} style={{ marginTop: 4 }}>
              {(['bars', 'mirror', 'wave'] as const).map((m) => (
                <button
                  key={m}
                  className={status?.visualizerMode === m ? styles.chipActive : styles.chip}
                  disabled={!connected}
                  onClick={() => send('SET_VISUALIZER_MODE', { visualizerMode: m })}
                >
                  {m === 'bars' ? 'Equalizer' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Search & Browse Library on TV ═════════════════════════ */}
      <div className={styles.searchSection} style={{ marginTop: 16 }}>
        <div className={styles.searchHeader}>
          <label className={styles.searchLabel}>Browse & Play on TV</label>
        </div>

        <input
          type="search"
          className={styles.searchInput}
          placeholder={loadingAlbums ? 'Loading library…' : 'Search albums, songs, artists…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className={styles.results} style={{ marginTop: 8 }}>
          {filteredAlbums.length === 0 && !loadingAlbums && (
            <div className={styles.noResults}>No albums found</div>
          )}

          {filteredAlbums.map((alb) => {
            const isExpanded = expandedAlbumId === alb.id
            const albCover = alb.hasCover ? getCoverUrl(alb.id) : null

            return (
              <div key={alb.id} className={styles.resultItem}>
                <div className={styles.resultRow}>
                  {albCover ? (
                    <img
                      src={albCover}
                      alt={alb.title}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        objectFit: 'cover',
                        marginRight: 10,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        background: '#312e81',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        marginRight: 10,
                        flexShrink: 0,
                      }}
                    >
                      💿
                    </div>
                  )}

                  <div className={styles.resultInfo}>
                    <div className={styles.resultTitle}>{alb.title}</div>
                    <div className={styles.resultMeta}>
                      {alb.artist} {alb.releaseYear ? `· ${alb.releaseYear}` : ''} · {alb.trackCount} tracks
                    </div>
                  </div>

                  <div className={styles.resultActions}>
                    <button
                      className={`${styles.resultBtn} ${styles.playBtn}`}
                      disabled={!connected}
                      onClick={() => playAlbumOnTv(alb.id)}
                      title="Play entire album on TV"
                    >
                      ▶ Play
                    </button>
                    {alb.tracks && alb.tracks.length > 0 && (
                      <button
                        className={isExpanded ? styles.resultBtnActive : styles.resultBtn}
                        onClick={() =>
                          setExpandedAlbumId(isExpanded ? null : alb.id)
                        }
                        title="Show tracks"
                      >
                        {isExpanded ? '▲' : 'Tracks ▾'}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && alb.tracks && (
                  <div className={styles.episodesPanel}>
                    <div className={styles.episodeList}>
                      {alb.tracks.map((trk, idx) => (
                        <button
                          key={trk.id}
                          className={styles.episodeItem}
                          disabled={!connected}
                          onClick={() => playTrackOnTv(alb.id, trk.id)}
                        >
                          <span className={styles.epName}>
                            {idx + 1}. {trk.title}
                          </span>
                          <span>▶</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
