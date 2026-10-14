import { useState, useRef } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { useNotification } from '../../components/ui/Notification'
import { uploadTrackAuto } from './api'
import type { AudioTrack } from './types'

interface Props {
  onClose: () => void
  onUploaded: (track: AudioTrack) => void
}

export function UploadTrackAutoDialog({ onClose, onUploaded }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [genre, setGenre] = useState('')
  const [trackNumber, setTrackNumber] = useState<string>('')
  const [isSingle, setIsSingle] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      showNotification('Please select an audio file (.mp3, .flac, etc.)', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await uploadTrackAuto(
        file,
        title.trim() || undefined,
        artist.trim() || undefined,
        album.trim() || undefined,
        genre.trim() || undefined,
        trackNumber ? Number(trackNumber) : undefined,
        isSingle
      )

      showNotification(`Track "${res.data.title}" successfully added`, 'success')
      onUploaded(res.data)
      onClose()
    } catch {
      showNotification('Failed to upload track', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DynamicFormDialog
      open
      title="Quick Track Upload (Auto-detect)"
      onClose={onClose}
      width="min(90vw, 560px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload Track'}
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
        🎵 Just select an MP3 file! If fields are left empty, the artist, album, and title will be
        automatically read from the file's ID3 tags, and the system will assign it to the matching album
        on disk. Any entered fields will overwrite the file's ID3 tags.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Select audio file *
        </label>
        <input ref={fileRef} type="file" accept="audio/*" autoFocus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TextField
          label="Artist (optional)"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="from file tags"
        />
        <TextField
          label="Album (optional)"
          value={album}
          onChange={(e) => setAlbum(e.target.value)}
          placeholder="from file tags"
          disabled={isSingle}
        />
      </div>

      <div style={{ margin: '8px 0 12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isSingle}
            onChange={(e) => setIsSingle(e.target.checked)}
          />
          <span>This is a single / loose track (assign to <code>Singles</code> directory)</span>
        </label>
      </div>

      <TextField
        label="Track Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="from tags or filename"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <TextField
          label="Genre (optional)"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
        <NumberField
          label="Track Number"
          value={trackNumber === '' ? '' : Number(trackNumber)}
          min={1}
          max={999}
          onChange={(v) => setTrackNumber(v === '' ? '' : String(v))}
        />
      </div>
    </DynamicFormDialog>
  )
}
