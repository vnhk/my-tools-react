import { useState } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { FileField } from '../../components/fields/FileField'
import { useNotification } from '../../components/ui/Notification'
import { uploadZip } from './api'
import type { AudioAlbum } from './types'

interface Props {
  onClose: () => void
  onUploaded: (album?: AudioAlbum) => void
}

export function UploadZipDialog({ onClose, onUploaded }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)
  const [autoSort, setAutoSort] = useState(true)
  const [artist, setArtist] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!file) {
      showNotification('Please select a ZIP file with audio tracks', 'error')
      return
    }

    setBusy(true)
    try {
      const res = await uploadZip(
        file,
        artist.trim() || undefined,
        albumTitle.trim() || undefined,
        autoSort
      )

      const msg = autoSort
        ? `Successfully imported ${res.data.importedTracksCount} track(s) across ${res.data.albumsCount} album(s)!`
        : `Album "${res.data.primaryAlbum?.title || 'Imported Album'}" (${res.data.importedTracksCount} tracks) imported!`

      showNotification(msg, 'success')
      onUploaded(res.data.primaryAlbum)
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
      title="Upload Audio as ZIP Package"
      onClose={onClose}
      width="min(90vw, 560px)"
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
        📦 The system unpacks the archive, detects audio tracks and covers, and reads ID3 tags
        to place each track in your library without needing a database.
      </div>

      <div style={{ marginBottom: 14 }}>
        <FileField
          label="ZIP File with Tracks"
          required
          accept=".zip,application/zip"
          value={file}
          onChange={setFile}
          placeholder="Click or drag & drop ZIP archive here"
          subText="Supported format: .zip archive containing MP3, FLAC, WAV, M4A or OGG tracks"
        />
      </div>

      {/* Auto-sort toggle */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            padding: '12px 14px',
            background: autoSort ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${autoSort ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={autoSort}
            onChange={(e) => setAutoSort(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
              Auto-sort tracks by ID3 tags (Organize mixed tracks)
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>
              Inspects each audio file and routes it to its respective artist and album directory based on its ID3 tags (or to Singles if no album tag is set).
              Uncheck only if all tracks belong to a single specific album.
            </div>
          </div>
        </label>
      </div>

      <TextField
        label={autoSort ? 'Fallback Artist (optional if ID3 tag missing)' : 'Artist (optional - auto-detected)'}
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        placeholder={autoSort ? 'e.g. Various Artists' : 'leave empty for auto-detection'}
      />

      <TextField
        label={autoSort ? "Fallback Album Title (optional - defaults to 'Singles')" : 'Album Title (optional - auto-detected)'}
        value={albumTitle}
        onChange={(e) => setAlbumTitle(e.target.value)}
        placeholder={autoSort ? 'Singles' : 'leave empty for auto-detection'}
      />
    </DynamicFormDialog>
  )
}
