import { useState } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { FileField } from '../../components/fields/FileField'
import { useNotification } from '../../components/ui/Notification'
import { addTrackToAlbum } from './api'
import type { AudioAlbum, AudioTrack } from './types'

interface Props {
  album: AudioAlbum
  onClose: () => void
  onAdded: (track: AudioTrack) => void
}

export function AddTrackDialog({ album, onClose, onAdded }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState(album.artist)
  const [trackNumber, setTrackNumber] = useState<string>(String(album.tracks.length + 1))
  const [genres, setGenres] = useState(album.genres ? album.genres.join(', ') : '')
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!file) {
      showNotification('Please select an audio file (.mp3, .flac, .wav, etc.)', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await addTrackToAlbum(
        album.id,
        file,
        title.trim() || undefined,
        artist.trim() || undefined,
        trackNumber ? Number(trackNumber) : undefined,
        genres.trim() || undefined
      )

      showNotification(`Track "${res.data.title}" added`, 'success')
      onAdded(res.data)
      onClose()
    } catch {
      showNotification('Failed to add track', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DynamicFormDialog
      open
      title={`Add Track to: ${album.title}`}
      onClose={onClose}
      width="min(90vw, 540px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Adding…' : 'Add Track'}
          </Button>
        </>
      }
    >
      <div
        style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          marginBottom: 14,
        }}
      >
        💡 <strong>Tip:</strong> If you leave the fields empty, title and artist will be automatically read
        from the file's ID3 tags. If filled manually, the system will <strong>update the ID3 tags in the MP3 file</strong>.
      </div>

      <div style={{ marginBottom: 14 }}>
        <FileField
          label="Audio File"
          required
          accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg"
          value={file}
          onChange={setFile}
          placeholder="Click or drag & drop audio track here"
          subText="Supported formats: MP3, FLAC, WAV, M4A, OGG"
        />
      </div>

      <TextField
        label="Track Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Bohemian Rhapsody"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <TextField
          label="Track Artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <NumberField
          label="Track Number"
          value={trackNumber === '' ? '' : Number(trackNumber)}
          min={1}
          max={999}
          onChange={(v) => setTrackNumber(v === '' ? '' : String(v))}
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
