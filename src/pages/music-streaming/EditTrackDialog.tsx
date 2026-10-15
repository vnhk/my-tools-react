import { useState } from 'react'
import { FaMagic } from 'react-icons/fa'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { useNotification } from '../../components/ui/Notification'
import { updateTrack, aiEnrichTrack } from './api'
import type { AudioAlbum, AudioTrack } from './types'

interface Props {
  album: AudioAlbum
  track: AudioTrack
  onClose: () => void
  onUpdated: (track: AudioTrack) => void
}

export function EditTrackDialog({ album, track, onClose, onUpdated }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const [title, setTitle] = useState(track.title)
  const [artist, setArtist] = useState(track.artist || album.artist)
  const [trackNumber, setTrackNumber] = useState<string>(
    track.trackNumber !== undefined ? String(track.trackNumber) : '1'
  )
  const [year, setYear] = useState<string>(track.year !== undefined ? String(track.year) : '')
  const [genres, setGenres] = useState(
    track.genres && track.genres.length > 0
      ? track.genres.join(', ')
      : track.genre || ''
  )

  const handleAiAutoFill = async () => {
    setAiLoading(true)
    try {
      const res = await aiEnrichTrack(album.id, track.id)
      if (res.data.title) setTitle(res.data.title)
      if (res.data.artist) setArtist(res.data.artist)
      if (res.data.year) setYear(String(res.data.year))
      if (res.data.genres && res.data.genres.length > 0) {
        setGenres(res.data.genres.join(', '))
      } else if (res.data.genre) {
        setGenres(res.data.genre)
      }
      showNotification('Metadata auto-filled with AI! Click Save to apply.', 'success')
    } catch {
      showNotification('Failed to fetch AI suggestions for track', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      showNotification('Title is required', 'error')
      return
    }

    setBusy(true)
    try {
      const genresList = genres
        .split(/[,/]/)
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await updateTrack(album.id, track.id, {
        title: title.trim(),
        artist: artist.trim(),
        trackNumber: trackNumber ? Number(trackNumber) : undefined,
        year: year ? Number(year) : undefined,
        genres: genresList.length > 0 ? genresList : undefined,
        genre: genresList.length > 0 ? genresList.join(' / ') : undefined,
      })

      showNotification('Track updated and ID3 tags written to file', 'success')
      onUpdated(res.data)
      onClose()
    } catch {
      showNotification('Failed to update track', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DynamicFormDialog
      open
      title={`Edit Track: ${track.title}`}
      onClose={onClose}
      width="min(90vw, 540px)"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleAiAutoFill}
            disabled={busy || aiLoading}
            style={{ marginRight: 'auto', color: '#a855f7' }}
          >
            <FaMagic style={{ marginRight: 6 }} /> {aiLoading ? 'Querying AI…' : 'Auto-fill with AI'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy || aiLoading}>
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <TextField
        label="Track Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />

      <TextField
        label="Track Artist"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <NumberField
          label="Track Number"
          value={trackNumber === '' ? '' : Number(trackNumber)}
          min={1}
          max={999}
          onChange={(v) => setTrackNumber(v === '' ? '' : String(v))}
        />
        <NumberField
          label="Year"
          value={year === '' ? '' : Number(year)}
          min={1000}
          max={2100}
          onChange={(v) => setYear(v === '' ? '' : String(v))}
        />
      </div>

      <TextField
        label="Genres (comma-separated)"
        placeholder="e.g. Soundtrack, Classical, Instrumental"
        value={genres}
        onChange={(e) => setGenres(e.target.value)}
      />
    </DynamicFormDialog>
  )
}
