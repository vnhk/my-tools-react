import { useState } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { TextArea } from '../../components/fields/TextArea'
import { useNotification } from '../../components/ui/Notification'
import { updateAlbum } from './api'
import type { AudioAlbum } from './types'

interface Props {
  album: AudioAlbum
  onClose: () => void
  onUpdated: (album: AudioAlbum) => void
}

export function EditAlbumDialog({ album, onClose, onUpdated }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState(album.title)
  const [artist, setArtist] = useState(album.artist)
  const [releaseYear, setReleaseYear] = useState<string>(
    album.releaseYear !== undefined ? String(album.releaseYear) : ''
  )
  const [genres, setGenres] = useState(album.genres ? album.genres.join(', ') : '')
  const [description, setDescription] = useState(album.description || '')

  const handleSubmit = async () => {
    if (!title.trim() || !artist.trim()) {
      showNotification('Title and artist are required', 'error')
      return
    }

    setBusy(true)
    try {
      const genreList = genres.trim()
        ? genres.split(',').map((g) => g.trim()).filter(Boolean)
        : ['Unknown']

      const updated = await updateAlbum(album.id, {
        title: title.trim(),
        artist: artist.trim(),
        releaseYear: releaseYear ? Number(releaseYear) : undefined,
        genres: genreList,
        description: description.trim(),
      })

      showNotification('Album and ID3 tags updated across all tracks', 'success')
      onUpdated(updated.data)
      onClose()
    } catch {
      showNotification('Failed to update album', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DynamicFormDialog
      open
      title={`Edit Album: ${album.title}`}
      onClose={onClose}
      width="min(90vw, 600px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div
        style={{
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          marginBottom: 14,
        }}
      >
        ℹ️ <strong>Cascading update:</strong> Changing the artist, album title, genre, or year
        will automatically update the ID3 tags in all MP3 files belonging to this album and rename
        the folder on disk.
      </div>

      <TextField
        label="Artist *"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
      />

      <TextField
        label="Album Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <NumberField
          label="Release Year"
          value={releaseYear === '' ? '' : Number(releaseYear)}
          min={1000}
          max={2100}
          onChange={(v) => setReleaseYear(v === '' ? '' : String(v))}
        />
        <TextField
          label="Genres (comma-separated)"
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
        />
      </div>

      <TextArea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
    </DynamicFormDialog>
  )
}
