import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaPlay,
  FaPause,
  FaPlus,
  FaEdit,
  FaTrash,
  FaDownload,
  FaList,
  FaExclamationTriangle,
  FaCamera,
  FaMusic,
  FaMagic,
} from 'react-icons/fa'
import {
  fetchAlbum,
  getCoverUrl,
  deleteAlbum,
  deleteTrack,
  synchronizeTags,
  uploadAlbumCover,
  getAlbumZipDownloadUrl,
  getAlbumPlaylistDownloadUrl,
  getTrackDownloadUrl,
  aiEnrichAlbum,
  aiEnrichTrack,
} from './api'
import type { AudioAlbum, AudioTrack } from './types'
import { useAudioPlayer } from './AudioPlayerContext'
import { useNotification } from '../../components/ui/Notification'
import { EditAlbumDialog } from './EditAlbumDialog'
import { AddTrackDialog } from './AddTrackDialog'
import { EditTrackDialog } from './EditTrackDialog'
import styles from './AlbumDetailPage.module.css'

function formatDuration(secs?: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function formatAlbumTotal(secs?: number): string {
  if (!secs || isNaN(secs) || secs <= 0) return '0 min'
  const m = Math.round(secs / 60)
  return `${m} min`
}

export default function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>()
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer()

  const [album, setAlbum] = useState<AudioAlbum | null>(null)
  const [loading, setLoading] = useState(true)

  const [showEditAlbum, setShowEditAlbum] = useState(false)
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [enrichingAi, setEnrichingAi] = useState(false)
  const [enrichingTrackId, setEnrichingTrackId] = useState<string | null>(null)

  const coverInputRef = useRef<HTMLInputElement>(null)

  const loadAlbumData = async () => {
    if (!albumId) return
    try {
      setLoading(true)
      const res = await fetchAlbum(albumId)
      setAlbum(res.data)
    } catch {
      showNotification('Album not found', 'error')
      navigate('/music')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlbumData()
  }, [albumId])

  const handleDeleteAlbum = async () => {
    if (!album) return
    if (!window.confirm(`Are you sure you want to delete album "${album.title}" and all its files from disk?`)) {
      return
    }

    try {
      await deleteAlbum(album.id)
      showNotification(`Album "${album.title}" deleted`, 'success')
      navigate('/music')
    } catch {
      showNotification('Failed to delete album', 'error')
    }
  }

  const handleDeleteTrack = async (track: AudioTrack) => {
    if (!album) return
    if (!window.confirm(`Are you sure you want to delete track "${track.title}" from disk?`)) {
      return
    }

    try {
      await deleteTrack(album.id, track.id)
      showNotification(`Track "${track.title}" deleted`, 'success')
      await loadAlbumData()
    } catch {
      showNotification('Failed to delete track', 'error')
    }
  }

  const handleSyncTags = async () => {
    if (!album) return
    try {
      await synchronizeTags(album.id)
      showNotification('ID3 tags synchronized across all tracks', 'success')
      await loadAlbumData()
    } catch {
      showNotification('Failed to synchronize tags', 'error')
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !album) return

    try {
      await uploadAlbumCover(album.id, file)
      showNotification('Album cover updated', 'success')
      await loadAlbumData()
    } catch {
      showNotification('Failed to upload cover', 'error')
    }
  }

  const handleAiEnrich = async () => {
    if (!album) return
    setEnrichingAi(true)
    try {
      const res = await aiEnrichAlbum(album.id)
      setAlbum(res.data)
      showNotification('Album metadata successfully enriched with AI!', 'success')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to enrich album with AI'
      showNotification(msg, 'error')
    } finally {
      setEnrichingAi(false)
    }
  }

  const handleAiEnrichTrack = async (track: AudioTrack) => {
    if (!album) return
    setEnrichingTrackId(track.id)
    try {
      const res = await aiEnrichTrack(album.id, track.id)
      setAlbum({
        ...album,
        tracks: album.tracks.map((t) => (t.id === track.id ? res.data : t)),
      })
      showNotification(`Track "${res.data.title}" enriched with AI!`, 'success')
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Failed to enrich track with AI', 'error')
    } finally {
      setEnrichingTrackId(null)
    }
  }

  if (loading) {
    return <div className={styles.page}>Loading album…</div>
  }

  if (!album) {
    return <div className={styles.page}>Album not found.</div>
  }

  const isCurrentAlbumPlaying =
    currentTrack && album.tracks.some((t) => t.id === currentTrack.id) && isPlaying

  return (
    <div className={styles.page}>
      <Link to="/music" className={styles.backBtn}>
        <FaArrowLeft /> Back to library
      </Link>

      {/* Hero Banner */}
      <div className={styles.albumBanner}>
        <div className={styles.coverWrapper}>
          {album.hasCover ? (
            <img src={getCoverUrl(album.id)} alt={album.title} className={styles.coverImage} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <FaMusic />
            </div>
          )}

          <div
            className={styles.changeCoverOverlay}
            onClick={() => coverInputRef.current?.click()}
            title="Click to change cover"
          >
            <FaCamera style={{ marginRight: 6 }} /> Change cover
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverChange}
          />
        </div>

        <div className={styles.bannerDetails}>
          <span className={styles.albumTypeBadge}>
            {album.isSingle ? 'Single / Tracks Collection' : 'Album'}
          </span>
          <h1 className={styles.albumTitle}>{album.title}</h1>
          <div className={styles.albumArtist}>{album.artist}</div>

          <div className={styles.albumMetadataRow}>
            {album.releaseYear && <span>{album.releaseYear}</span>}
            <span>•</span>
            <span>
              {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
            </span>
            <span>•</span>
            <span>{formatAlbumTotal(album.totalDurationSeconds)}</span>

            {album.genres && album.genres.length > 0 && (
              <div className={styles.genreChips}>
                {album.genres.map((g) => (
                  <span key={g} className={styles.genreChip}>
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {album.description && (
            <div className={styles.albumDescription}>{album.description}</div>
          )}

          {/* Action buttons */}
          <div className={styles.actionsRow}>
            {album.tracks.length > 0 && (
              <button
                className={styles.mainPlayBtn}
                onClick={() => {
                  if (isCurrentAlbumPlaying) {
                    togglePlayPause()
                  } else {
                    playTrack(album.tracks[0], album)
                  }
                }}
                title={isCurrentAlbumPlaying ? 'Pause' : 'Play album'}
              >
                {isCurrentAlbumPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 3 }} />}
              </button>
            )}

            <button className={styles.actionButton} onClick={() => setShowAddTrack(true)}>
              <FaPlus /> Add track
            </button>
            <button className={styles.actionButton} onClick={() => setShowEditAlbum(true)}>
              <FaEdit /> Edit album
            </button>
            <button
              className={styles.actionButton}
              onClick={handleAiEnrich}
              disabled={enrichingAi}
              title="Detect genres, release year, and description with AI"
            >
              <FaMagic /> {enrichingAi ? 'Enriching with AI…' : 'AI Enrich'}
            </button>
            <a
              href={getAlbumZipDownloadUrl(album.id)}
              className={styles.actionButton}
              download={`${album.artist} - ${album.title}.zip`}
              title="Download entire album as ZIP archive (tracks + cover + playlist)"
            >
              <FaDownload /> Download ZIP
            </a>
            <a
              href={getAlbumPlaylistDownloadUrl(album.id)}
              className={styles.actionButton}
              download={`${album.title}.m3u8`}
              title="Download VLC playlist (.m3u8)"
            >
              <FaList /> VLC Playlist
            </a>
            <button
              className={`${styles.actionButton}`}
              onClick={handleDeleteAlbum}
              title="Delete album and files from disk"
              style={{ color: '#ef4444' }}
            >
              <FaTrash /> Delete album
            </button>
          </div>
        </div>
      </div>

      {/* Mismatch Alert Banner */}
      {album.hasTagMismatch && (
        <div className={styles.mismatchAlert}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaExclamationTriangle size={18} />
            <span>
              <strong>ID3 tag mismatch detected:</strong> Some tracks on disk have different artist or
              album tags in their MP3 files than the current directory structure.
            </span>
          </div>
          <button className={styles.syncBtn} onClick={handleSyncTags}>
            Synchronize tags now
          </button>
        </div>
      )}

      {/* Tracks Table */}
      <table className={styles.trackTable}>
        <thead>
          <tr>
            <th style={{ width: 44, textAlign: 'center' }}>#</th>
            <th>Title</th>
            <th>Artist</th>
            <th style={{ width: 80 }}>Time</th>
            <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {album.tracks.map((track, i) => {
            const isPlayingThis = currentTrack?.id === track.id && isPlaying
            const isHovered = hoveredRow === track.id

            return (
              <tr
                key={track.id}
                className={`${styles.trackRow} ${currentTrack?.id === track.id ? styles.trackRowActive : ''}`}
                onMouseEnter={() => setHoveredRow(track.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className={styles.trackCell} style={{ textAlign: 'center' }}>
                  {isHovered || isPlayingThis ? (
                    <button
                      className={styles.rowPlayBtn}
                      onClick={() => {
                        if (isPlayingThis) togglePlayPause()
                        else playTrack(track, album)
                      }}
                      title={isPlayingThis ? 'Pause' : 'Play'}
                    >
                      {isPlayingThis ? <FaPause /> : <FaPlay />}
                    </button>
                  ) : (
                    track.trackNumber || i + 1
                  )}
                </td>

                <td className={styles.trackCell}>
                  <div className={styles.trackTitleArea}>
                    <span className={styles.trackTitleText}>
                      {track.title}
                      {track.hasTagMismatch && (
                        <span
                          className={styles.trackWarning}
                          title={track.tagMismatchDetails || 'MP3 file tag mismatch'}
                        >
                          <FaExclamationTriangle />
                        </span>
                      )}
                    </span>
                    {((track.genres && track.genres.length > 0) || track.genre) && (
                      <div className={styles.trackGenresList}>
                        {(track.genres && track.genres.length > 0
                          ? track.genres
                          : track.genre!.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
                        ).map((g) => (
                          <span key={g} className={styles.trackGenreBadge}>
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className={styles.trackCell}>
                  <span className={styles.trackArtistText}>{track.artist || album.artist}</span>
                </td>

                <td className={styles.trackCell}>
                  {formatDuration(track.durationSeconds)}
                </td>

                <td className={styles.trackCell}>
                  <div className={styles.trackActions}>
                    <a
                      href={getTrackDownloadUrl(track.id)}
                      className={styles.iconActionBtn}
                      download={track.filename}
                      title="Download audio file"
                    >
                      <FaDownload size={12} />
                    </a>
                    <button
                      className={styles.iconActionBtn}
                      onClick={() => handleAiEnrichTrack(track)}
                      disabled={enrichingTrackId === track.id}
                      title="Enrich track metadata & genres with AI"
                      style={{ color: '#a855f7' }}
                    >
                      <FaMagic size={11} />
                    </button>
                    <button
                      className={styles.iconActionBtn}
                      onClick={() => setEditingTrack(track)}
                      title="Edit track metadata"
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      className={`${styles.iconActionBtn} ${styles.iconActionBtnDanger}`}
                      onClick={() => handleDeleteTrack(track)}
                      title="Delete track"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Dialogs */}
      {showEditAlbum && (
        <EditAlbumDialog
          album={album}
          onClose={() => setShowEditAlbum(false)}
          onUpdated={() => loadAlbumData()}
        />
      )}

      {showAddTrack && (
        <AddTrackDialog
          album={album}
          onClose={() => setShowAddTrack(false)}
          onAdded={() => loadAlbumData()}
        />
      )}

      {editingTrack && (
        <EditTrackDialog
          album={album}
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onUpdated={() => loadAlbumData()}
        />
      )}
    </div>
  )
}
