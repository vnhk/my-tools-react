import { useState, useRef } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { useNotification } from '../../components/ui/Notification'
import { uploadZip } from './api'
import type { AudioAlbum } from './types'

interface Props {
  onClose: () => void
  onUploaded: (album: AudioAlbum) => void
}

export function UploadZipDialog({ onClose, onUploaded }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)
  const [artist, setArtist] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      showNotification('Please select a ZIP file with audio tracks', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await uploadZip(
        file,
        artist.trim() || undefined,
        albumTitle.trim() || undefined
      )

      showNotification(`Album "${res.data.title}" (${res.data.trackCount} tracks) successfully imported`, 'success')
      onUploaded(res.data)
      onClose()
    } catch {
      showNotification('Failed to import ZIP archive', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DynamicFormDialog
      open
      title="Upload Album as ZIP Package"
      onClose={onClose}
      width="min(90vw, 540px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Extracting and analyzing…' : 'Upload and Import'}
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
        📦 The system will automatically unpack the archive, detect tracks and cover art,
        and use MP3 tags or AI for any missing metadata. You can optionally specify custom artist or album title.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          ZIP file with tracks *
        </label>
        <input ref={fileRef} type="file" accept=".zip,application/zip" autoFocus />
      </div>

      <TextField
        label="Artist (optional)"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        placeholder="leave empty for auto-detection"
      />

      <TextField
        label="Album Title (optional)"
        value={albumTitle}
        onChange={(e) => setAlbumTitle(e.target.value)}
        placeholder="leave empty for auto-detection"
      />
    </DynamicFormDialog>
  )
}
