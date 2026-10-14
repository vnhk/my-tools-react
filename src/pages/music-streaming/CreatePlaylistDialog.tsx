import { useState, useMemo } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { TextField } from '../../components/fields/TextField'
import { TextArea } from '../../components/fields/TextArea'
import { useNotification } from '../../components/ui/Notification'
import { savePlaylist } from './api'
import type { AudioPlaylist, AudioTrack } from './types'
import { FaTrash, FaUndo, FaFilter } from 'react-icons/fa'
import styles from './CreatePlaylistDialog.module.css'

interface Props {
  onClose: () => void
  onSaved: (playlist: AudioPlaylist) => void
  allTracks: AudioTrack[]
  availableGenres: string[]
  initialPlaylist?: AudioPlaylist | null
}

function formatDuration(secs?: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function CreatePlaylistDialog({
  onClose,
  onSaved,
  allTracks,
  availableGenres,
  initialPlaylist,
}: Props) {
  const { showNotification } = useNotification()
  const [saving, setSaving] = useState(false)

  // Basic metadata
  const [name, setName] = useState(initialPlaylist?.name || '')
  const [description, setDescription] = useState(initialPlaylist?.description || '')

  // Filter criteria
  const [searchQuery, setSearchQuery] = useState(initialPlaylist?.filters?.query || '')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialPlaylist?.filters?.genres || []
  )

  // Track curation: set of excluded metadataIds
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => {
    // If editing existing playlist, exclude tracks that match filters but were not in the saved trackMetadataIds
    if (initialPlaylist && initialPlaylist.trackMetadataIds) {
      const savedSet = new Set(initialPlaylist.trackMetadataIds)
      const initialExcluded = new Set<string>()
      for (const track of allTracks) {
        const metaId = track.metadataId || track.id
        if (!savedSet.has(metaId)) {
          initialExcluded.add(metaId)
        }
      }
      return initialExcluded
    }
    return new Set<string>()
  })

  const [activeTab, setActiveTab] = useState<'included' | 'excluded'>('included')

  // Genre selection toggles
  const handleToggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  const handleSelectAllGenres = () => {
    setSelectedGenres([...availableGenres])
  }

  const handleClearAllGenres = () => {
    setSelectedGenres([])
  }

  // Filter evaluation with OR condition on genres
  const filteredCandidates = useMemo(() => {
    return allTracks.filter((track) => {
      // 1. Text search query match (title, artist, album)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = track.title.toLowerCase().includes(q)
        const matchArtist =
          track.artist.toLowerCase().includes(q) ||
          track.artists?.some((a) => a.toLowerCase().includes(q))
        const matchAlbum = track.album.toLowerCase().includes(q)
        if (!matchTitle && !matchArtist && !matchAlbum) {
          return false
        }
      }

      // 2. Genre filter with OR logic: if at least one selected genre matches, include the track
      if (selectedGenres.length > 0) {
        const lowerSelected = selectedGenres.map((g) => g.toLowerCase())
        const trackGenreList = [
          ...(track.genres || []),
          ...(track.genre ? [track.genre] : []),
        ].map((g) => g.toLowerCase())

        const hasAnyMatchingGenre = lowerSelected.some((sg) =>
          trackGenreList.some((tg) => tg === sg || tg.includes(sg))
        )

        if (!hasAnyMatchingGenre) {
          return false
        }
      }

      return true
    })
  }, [allTracks, searchQuery, selectedGenres])

  // Partition candidates into included and excluded
  const { includedTracks, excludedTracks } = useMemo(() => {
    const included: AudioTrack[] = []
    const excluded: AudioTrack[] = []

    for (const track of filteredCandidates) {
      const key = track.metadataId || track.id
      if (excludedIds.has(key)) {
        excluded.push(track)
      } else {
        included.push(track)
      }
    }

    return { includedTracks: included, excludedTracks: excluded }
  }, [filteredCandidates, excludedIds])

  const handleExcludeTrack = (track: AudioTrack) => {
    const key = track.metadataId || track.id
    setExcludedIds((prev) => new Set(prev).add(key))
  }

  const handleRestoreTrack = (track: AudioTrack) => {
    const key = track.metadataId || track.id
    setExcludedIds((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const handleExcludeAll = () => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      for (const t of filteredCandidates) {
        next.add(t.metadataId || t.id)
      }
      return next
    })
  }

  const handleIncludeAll = () => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      for (const t of filteredCandidates) {
        next.delete(t.metadataId || t.id)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      showNotification('Please enter a playlist name', 'warning')
      return
    }

    if (includedTracks.length === 0) {
      showNotification('Playlist must contain at least one track', 'warning')
      return
    }

    const metadataIds = includedTracks
      .map((t) => t.metadataId || t.id)
      .filter((id): id is string => Boolean(id))

    setSaving(true)
    try {
      const res = await savePlaylist({
        id: initialPlaylist?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        filters: {
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          query: searchQuery.trim() || undefined,
        },
        trackMetadataIds: metadataIds,
      })

      showNotification(
        initialPlaylist ? 'Playlist updated successfully!' : 'Playlist created successfully!',
        'success'
      )
      onSaved(res.data)
      onClose()
    } catch {
      showNotification('Failed to save playlist', 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalDuration = includedTracks.reduce((acc, t) => acc + (t.durationSeconds || 0), 0)

  return (
    <DynamicFormDialog
      open={true}
      title={initialPlaylist ? 'Edit Playlist' : 'Create Playlist from Search / Filters'}
      onClose={onClose}
      onConfirm={handleSave}
      confirmLabel={saving ? 'Saving…' : initialPlaylist ? 'Save Changes' : 'Create Playlist'}
      width="min(94vw, 880px)"
    >
      <div className={styles.container}>
        {/* Playlist metadata */}
        <div className={styles.section}>
          <TextField
            label="Playlist Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 80s Rock & Pop Favorites"
            autoFocus
          />
          <TextArea
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this playlist..."
          />
        </div>

        {/* Filter criteria */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>
              <FaFilter style={{ marginRight: 6 }} /> Search & Genre Filters
            </span>
          </div>

          <div className={styles.filterPanel}>
            {/* Search query input */}
            <div style={{ position: 'relative' }}>
              <TextField
                label="Search by Track, Artist or Album"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Queen, Highway, Live..."
              />
            </div>

            {/* Genre checkboxes (OR condition) */}
            <div className={styles.section}>
              <div className={styles.filterControlsRow}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Genres (Match if at least one selected genre matches):
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className={styles.linkBtn} onClick={handleSelectAllGenres}>
                    Select All
                  </button>
                  <button type="button" className={styles.linkBtn} onClick={handleClearAllGenres}>
                    Clear All
                  </button>
                </div>
              </div>

              {availableGenres.length === 0 ? (
                <div className={styles.hint}>No genres available in library.</div>
              ) : (
                <div className={styles.genreGrid}>
                  {availableGenres.map((genre) => {
                    const isChecked = selectedGenres.includes(genre)
                    return (
                      <label key={genre} className={styles.genreCheckboxLabel} title={genre}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleGenre(genre)}
                        />
                        <span>{genre}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              <div className={styles.hint}>
                {selectedGenres.length === 0
                  ? 'No genres selected: all library genres are matched.'
                  : `Filtered by ${selectedGenres.length} genre(s): tracks with at least one matching genre are included.`}
              </div>
            </div>
          </div>
        </div>

        {/* Curation & Results List */}
        <div className={styles.section}>
          <div className={styles.resultsHeader}>
            <div className={styles.pillTabs}>
              <button
                type="button"
                className={`${styles.pillTab} ${activeTab === 'included' ? styles.pillTabActive : ''}`}
                onClick={() => setActiveTab('included')}
              >
                Included ({includedTracks.length}) • {formatDuration(totalDuration)}
              </button>
              <button
                type="button"
                className={`${styles.pillTab} ${activeTab === 'excluded' ? styles.pillTabActive : ''}`}
                onClick={() => setActiveTab('excluded')}
              >
                Excluded / Removed ({excludedTracks.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {activeTab === 'included' && includedTracks.length > 0 && (
                <button type="button" className={styles.linkBtn} onClick={handleExcludeAll}>
                  Exclude All
                </button>
              )}
              {activeTab === 'excluded' && excludedTracks.length > 0 && (
                <button type="button" className={styles.linkBtn} onClick={handleIncludeAll}>
                  Restore All
                </button>
              )}
            </div>
          </div>

          <div className={styles.tracksListContainer}>
            {activeTab === 'included' ? (
              includedTracks.length === 0 ? (
                <div className={styles.emptyState}>
                  No tracks match your current filters, or all matched tracks were excluded.
                </div>
              ) : (
                <table className={styles.tracksTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Track Title & Artist</th>
                      <th>Album</th>
                      <th>Genre</th>
                      <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
                      <th style={{ width: 80, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {includedTracks.map((track, idx) => (
                      <tr key={track.id} className={styles.trackRow}>
                        <td style={{ color: 'var(--color-text-tertiary)' }}>{idx + 1}</td>
                        <td>
                          <div className={styles.trackTitleCell} title={track.title}>
                            {track.title}
                          </div>
                          <div className={styles.trackSubText} title={track.artist}>
                            {track.artist}
                          </div>
                        </td>
                        <td>
                          <div className={styles.trackSubText} title={track.album}>
                            {track.album}
                          </div>
                        </td>
                        <td>
                          {track.genres && track.genres.length > 0 ? (
                            track.genres.slice(0, 2).map((g) => (
                              <span key={g} className={styles.genreBadge}>
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className={styles.trackSubText}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {formatDuration(track.durationSeconds)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.removeTrackBtn}
                            onClick={() => handleExcludeTrack(track)}
                            title="Exclude this track from playlist"
                          >
                            <FaTrash size={10} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : excludedTracks.length === 0 ? (
              <div className={styles.emptyState}>No excluded tracks.</div>
            ) : (
              <table className={styles.tracksTable}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Track Title & Artist</th>
                    <th>Album</th>
                    <th>Genre</th>
                    <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {excludedTracks.map((track, idx) => (
                    <tr key={track.id} className={styles.trackRow}>
                      <td style={{ color: 'var(--color-text-tertiary)' }}>{idx + 1}</td>
                      <td>
                        <div className={styles.trackTitleCell} title={track.title}>
                          {track.title}
                        </div>
                        <div className={styles.trackSubText} title={track.artist}>
                          {track.artist}
                        </div>
                      </td>
                      <td>
                        <div className={styles.trackSubText} title={track.album}>
                          {track.album}
                        </div>
                      </td>
                      <td>
                        {track.genres && track.genres.length > 0 ? (
                          track.genres.slice(0, 2).map((g) => (
                            <span key={g} className={styles.genreBadge}>
                              {g}
                            </span>
                          ))
                        ) : (
                          <span className={styles.trackSubText}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDuration(track.durationSeconds)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={styles.restoreTrackBtn}
                          onClick={() => handleRestoreTrack(track)}
                          title="Restore track back into playlist"
                        >
                          <FaUndo size={10} /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DynamicFormDialog>
  )
}
