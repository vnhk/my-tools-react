import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FaMusic,
  FaPlus,
  FaCloudUploadAlt,
  FaFileArchive,
  FaDownload,
  FaSync,
  FaPlay,
  FaExclamationTriangle,
  FaList,
} from 'react-icons/fa'
import {
  fetchAudioSummary,
  getCoverUrl,
  reloadAudioConfig,
  getLibraryZipDownloadUrl,
  getMasterPlaylistDownloadUrl,
} from './api'
import type { AudioLibrarySummary } from './types'
import { useAudioPlayer } from './AudioPlayerContext'
import { useNotification } from '../../components/ui/Notification'
import { AddAlbumDialog } from './AddAlbumDialog'
import { UploadTrackAutoDialog } from './UploadTrackAutoDialog'
import { UploadZipDialog } from './UploadZipDialog'
import styles from './MusicDashboardPage.module.css'

function formatTotalDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} hr ${m} min`
  return `${m} min`
}

export default function MusicDashboardPage() {
  const { playTrack } = useAudioPlayer()
  const { showNotification } = useNotification()

  const [summary, setSummary] = useState<AudioLibrarySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)

  const [showAddAlbum, setShowAddAlbum] = useState(false)
  const [showUploadTrack, setShowUploadTrack] = useState(false)
  const [showUploadZip, setShowUploadZip] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetchAudioSummary()
      setSummary(res.data)
    } catch {
      showNotification('Failed to load audio library', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleReload = async () => {
    try {
      await reloadAudioConfig()
      showNotification('Library reloaded from disk', 'success')
      await loadData()
    } catch {
      showNotification('Failed to reload library', 'error')
    }
  }

  // Filtered albums
  const filteredAlbums = useMemo(() => {
    if (!summary?.albums) return []
    return summary.albums.filter((album) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesAlbum =
          album.title.toLowerCase().includes(q) ||
          album.artist.toLowerCase().includes(q) ||
          album.genres?.some((g) => g.toLowerCase().includes(q))
        const matchesTrack = album.tracks.some(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.genres?.some((g) => g.toLowerCase().includes(q)) ||
            (t.genre && t.genre.toLowerCase().includes(q))
        )
        if (!matchesAlbum && !matchesTrack) return false
      }

      if (selectedGenre) {
        const genreTarget = selectedGenre.toLowerCase()
        const albumMatches = album.genres?.some((g) => g.toLowerCase() === genreTarget)
        const trackMatches = album.tracks?.some(
          (t) =>
            t.genres?.some((g) => g.toLowerCase() === genreTarget) ||
            (t.genre && t.genre.toLowerCase().includes(genreTarget))
        )
        if (!albumMatches && !trackMatches) {
          return false
        }
      }

      if (selectedArtist) {
        if (album.artist.toLowerCase() !== selectedArtist.toLowerCase()) {
          return false
        }
      }

      return true
    })
  }, [summary, search, selectedGenre, selectedArtist])

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <FaMusic style={{ color: 'var(--color-primary)' }} />
            My Music Library
          </h1>
          <p>Local file-based music collection without database • ID3 tags & VLC support</p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => setShowAddAlbum(true)}
          >
            <FaPlus /> Add album
          </button>
          <button className={styles.actionBtn} onClick={() => setShowUploadTrack(true)}>
            <FaCloudUploadAlt /> Upload track
          </button>
          <button className={styles.actionBtn} onClick={() => setShowUploadZip(true)}>
            <FaFileArchive /> Upload ZIP
          </button>
          <a
            href={getLibraryZipDownloadUrl()}
            className={styles.actionBtn}
            download="AudioLibrary_Full.zip"
            title="Download full library as ZIP (e.g. for phone)"
          >
            <FaDownload /> Download full library
          </a>
          <a
            href={getMasterPlaylistDownloadUrl()}
            className={styles.actionBtn}
            download="MasterLibrary.m3u8"
            title="Download master M3U8 playlist for VLC"
          >
            <FaList /> VLC Playlist (.m3u8)
          </a>
          <button className={styles.actionBtn} onClick={handleReload} title="Rescan files from disk">
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {summary && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{summary.totalAlbums}</span>
            <span className={styles.statLabel}>Albums</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{summary.totalTracks}</span>
            <span className={styles.statLabel}>Tracks</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{summary.totalArtists}</span>
            <span className={styles.statLabel}>Artists</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {formatTotalDuration(summary.totalDurationSeconds)}
            </span>
            <span className={styles.statLabel}>Total Duration</span>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className={styles.searchFilterArea}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by album, track or artist…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Genre chips */}
        {summary && summary.genres.length > 0 && (
          <div className={styles.filterChipsRow}>
            <span className={styles.filterLabel}>Genres:</span>
            <button
              className={`${styles.chip} ${selectedGenre === null ? styles.chipActive : ''}`}
              onClick={() => setSelectedGenre(null)}
            >
              All
            </button>
            {summary.genres.map((g) => (
              <button
                key={g}
                className={`${styles.chip} ${selectedGenre === g ? styles.chipActive : ''}`}
                onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Artist chips */}
        {summary && summary.artists.length > 0 && (
          <div className={styles.filterChipsRow}>
            <span className={styles.filterLabel}>Artists:</span>
            <button
              className={`${styles.chip} ${selectedArtist === null ? styles.chipActive : ''}`}
              onClick={() => setSelectedArtist(null)}
            >
              All
            </button>
            {summary.artists.slice(0, 15).map((a) => (
              <button
                key={a}
                className={`${styles.chip} ${selectedArtist === a ? styles.chipActive : ''}`}
                onClick={() => setSelectedArtist(selectedArtist === a ? null : a)}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Album Cards Grid */}
      {loading ? (
        <div className={styles.emptyState}>Loading library…</div>
      ) : filteredAlbums.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaMusic />
          </div>
          <h3>No albums found</h3>
          <p>
            {search || selectedGenre || selectedArtist
              ? 'No albums match the selected filters.'
              : 'Your library is empty. Add your first album or upload MP3 / ZIP files.'}
          </p>
        </div>
      ) : (
        <div className={styles.albumGrid}>
          {filteredAlbums.map((album) => {
            const coverSrc = album.hasCover ? getCoverUrl(album.id) : null
            return (
              <Link
                key={album.id}
                to={`/music/album/${encodeURIComponent(album.id)}`}
                className={styles.albumCard}
              >
                <div className={styles.coverContainer}>
                  {coverSrc ? (
                    <img src={coverSrc} alt={album.title} className={styles.coverImg} />
                  ) : (
                    <div className={styles.coverFallback}>
                      <FaMusic />
                    </div>
                  )}

                  {album.tracks && album.tracks.length > 0 && (
                    <div className={styles.playOverlay}>
                      <button
                        className={styles.playOverlayBtn}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          playTrack(album.tracks[0], album)
                        }}
                        title="Play album"
                      >
                        <FaPlay style={{ marginLeft: 2 }} />
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.albumMeta}>
                  <div className={styles.albumTitle} title={album.title}>
                    {album.title}
                  </div>
                  <div className={styles.albumArtist} title={album.artist}>
                    {album.artist}
                  </div>
                  <div className={styles.albumSub}>
                    <span>
                      {album.releaseYear ? `${album.releaseYear} • ` : ''}
                      {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
                    </span>
                    {album.hasTagMismatch && (
                      <span
                        className={styles.tagMismatchBadge}
                        title="MP3 tags mismatch with directory structure"
                      >
                        <FaExclamationTriangle /> Tags
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showAddAlbum && (
        <AddAlbumDialog
          onClose={() => setShowAddAlbum(false)}
          onCreated={() => loadData()}
        />
      )}

      {showUploadTrack && (
        <UploadTrackAutoDialog
          onClose={() => setShowUploadTrack(false)}
          onUploaded={() => loadData()}
        />
      )}

      {showUploadZip && (
        <UploadZipDialog
          onClose={() => setShowUploadZip(false)}
          onUploaded={() => loadData()}
        />
      )}
    </div>
  )
}
