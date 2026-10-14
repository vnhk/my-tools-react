import { useState, useMemo } from 'react'
import {
  FaPlay,
  FaEdit,
  FaTrash,
  FaDownload,
  FaList,
  FaPlus,
  FaMusic,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa'
import type { AudioPlaylist, AudioTrack } from './types'
import { deletePlaylist, getPlaylistM3u8Url } from './api'
import { useAudioPlayer } from './AudioPlayerContext'
import { useNotification } from '../../components/ui/Notification'
import { CreatePlaylistDialog } from './CreatePlaylistDialog'
import styles from './PlaylistsTabView.module.css'

interface Props {
  playlists: AudioPlaylist[]
  allTracks: AudioTrack[]
  availableGenres: string[]
  onRefresh: () => Promise<void>
}

function formatDuration(secs?: number): string {
  if (!secs || isNaN(secs) || secs <= 0) return '0 min'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const remM = m % 60
    return `${h}h ${remM}m`
  }
  return `${m}m ${s < 10 ? '0' : ''}${s}s`
}

function formatShortDuration(secs?: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function PlaylistsTabView({
  playlists,
  allTracks,
  availableGenres,
  onRefresh,
}: Props) {
  const { playTrack } = useAudioPlayer()
  const { showNotification } = useNotification()

  const [search, setSearch] = useState('')
  const [editingPlaylist, setEditingPlaylist] = useState<AudioPlaylist | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null)

  const filteredPlaylists = useMemo(() => {
    if (!search.trim()) return playlists
    const q = search.toLowerCase().trim()
    return playlists.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q)
      const matchDesc = p.description?.toLowerCase().includes(q)
      const matchGenre = p.filters?.genres?.some((g) => g.toLowerCase().includes(q))
      const matchTrack = p.tracks?.some(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      )
      return matchName || matchDesc || matchGenre || matchTrack
    })
  }, [playlists, search])

  const handleDelete = async (playlist: AudioPlaylist) => {
    if (
      !window.confirm(
        `Are you sure you want to delete playlist "${playlist.name}"? This only removes the playlist definition, not your audio files.`
      )
    ) {
      return
    }

    try {
      await deletePlaylist(playlist.id)
      showNotification(`Playlist "${playlist.name}" deleted`, 'success')
      await onRefresh()
    } catch {
      showNotification('Failed to delete playlist', 'error')
    }
  }

  const handlePlayPlaylist = (playlist: AudioPlaylist) => {
    if (!playlist.tracks || playlist.tracks.length === 0) {
      showNotification('This playlist has no tracks to play', 'warning')
      return
    }
    playTrack(playlist.tracks[0], null, playlist.tracks)
  }

  const handlePlayTrackFromPlaylist = (track: AudioTrack, playlist: AudioPlaylist) => {
    playTrack(track, null, playlist.tracks)
  }

  const toggleExpand = (id: string) => {
    setExpandedPlaylistId((prev) => (prev === id ? null : id))
  }

  return (
    <div className={styles.container}>
      {/* Top search and create button */}
      <div className={styles.topBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Filter playlists by name, genre or track…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          className={styles.createBtn}
          onClick={() => {
            setEditingPlaylist(null)
            setShowCreateModal(true)
          }}
        >
          <FaPlus /> Create Playlist from Search / Filters
        </button>
      </div>

      {/* Playlists grid */}
      {filteredPlaylists.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaList />
          </div>
          <h3>{search ? 'No playlists match your search' : 'No playlists yet'}</h3>
          <p>
            {search
              ? 'Try changing your search term.'
              : 'Create a playlist by filtering by genres with checkboxes, searching tracks, and curating your selection!'}
          </p>
          {!search && (
            <button
              className={styles.createBtn}
              onClick={() => {
                setEditingPlaylist(null)
                setShowCreateModal(true)
              }}
              style={{ marginTop: 8 }}
            >
              <FaPlus /> Create First Playlist
            </button>
          )}
        </div>
      ) : (
        <div className={styles.playlistGrid}>
          {filteredPlaylists.map((playlist) => {
            const isExpanded = expandedPlaylistId === playlist.id
            const tracks = playlist.tracks || []
            const validTracksCount = tracks.length

            return (
              <div key={playlist.id} className={styles.playlistCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.titleArea}>
                    <div className={styles.playlistName}>
                      <FaMusic style={{ color: 'var(--color-primary)' }} />
                      <span>{playlist.name}</span>
                    </div>
                    {playlist.description && (
                      <div className={styles.playlistDesc}>{playlist.description}</div>
                    )}

                    {/* Filter tags preview */}
                    {playlist.filters &&
                      ((playlist.filters.genres && playlist.filters.genres.length > 0) ||
                        playlist.filters.query) && (
                        <div className={styles.filterBadgesRow}>
                          {playlist.filters.query && (
                            <span className={styles.filterBadge}>
                              Search: {playlist.filters.query}
                            </span>
                          )}
                          {playlist.filters.genres?.map((g) => (
                            <span key={g} className={styles.filterBadge}>
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                <div className={styles.cardStats}>
                  <span>
                    {validTracksCount} {validTracksCount === 1 ? 'track' : 'tracks'}
                  </span>
                  <span>•</span>
                  <span>{formatDuration(playlist.totalDurationSeconds)}</span>
                  {playlist.trackMetadataIds &&
                    playlist.trackMetadataIds.length > validTracksCount && (
                      <>
                        <span>•</span>
                        <span
                          title="Some tracks were omitted because their files are no longer on disk"
                          style={{ color: '#f59e0b' }}
                        >
                          {playlist.trackMetadataIds.length - validTracksCount} missing
                        </span>
                      </>
                    )}
                </div>

                {/* Tracklist expandable drawer */}
                {isExpanded && (
                  <div className={styles.tracklistDrawer}>
                    {tracks.length === 0 ? (
                      <div style={{ padding: '8px', color: 'var(--color-text-tertiary)' }}>
                        No tracks available.
                      </div>
                    ) : (
                      tracks.map((track, i) => (
                        <div
                          key={`${track.id}-${i}`}
                          className={styles.trackItem}
                          onClick={() => handlePlayTrackFromPlaylist(track, playlist)}
                          title={`Click to play: ${track.title}`}
                        >
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-tertiary)', width: 18 }}>
                              {i + 1}.
                            </span>
                            <span className={styles.trackTitle}>{track.title}</span>
                            <span className={styles.trackArtist}>- {track.artist}</span>
                          </div>
                          <span style={{ color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatShortDuration(track.durationSeconds)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Card actions */}
                <div className={styles.cardActions}>
                  <div className={styles.actionBtnGroup}>
                    <button
                      className={styles.playBtn}
                      onClick={() => handlePlayPlaylist(playlist)}
                      title="Play playlist"
                    >
                      <FaPlay size={11} /> Play
                    </button>
                    <button
                      className={styles.iconBtn}
                      onClick={() => toggleExpand(playlist.id)}
                      title={isExpanded ? 'Hide tracklist' : 'Show tracklist'}
                    >
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>

                  <div className={styles.actionBtnGroup}>
                    <a
                      href={getPlaylistM3u8Url(playlist.id)}
                      download={`${playlist.name}.m3u8`}
                      className={styles.iconBtn}
                      title="Download M3U8 stream playlist (VLC)"
                    >
                      <FaDownload />
                    </a>
                    <button
                      className={styles.iconBtn}
                      onClick={() => {
                        setEditingPlaylist(playlist)
                        setShowCreateModal(true)
                      }}
                      title="Edit playlist filters & tracks"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => handleDelete(playlist)}
                      title="Delete playlist"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {showCreateModal && (
        <CreatePlaylistDialog
          onClose={() => {
            setShowCreateModal(false)
            setEditingPlaylist(null)
          }}
          onSaved={async () => {
            await onRefresh()
          }}
          allTracks={allTracks}
          availableGenres={availableGenres}
          initialPlaylist={editingPlaylist}
        />
      )}
    </div>
  )
}
