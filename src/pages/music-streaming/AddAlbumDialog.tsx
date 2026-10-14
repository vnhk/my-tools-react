import { useState } from 'react'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/fields/TextField'
import { NumberField } from '../../components/fields/NumberField'
import { TextArea } from '../../components/fields/TextArea'
import { FileField } from '../../components/fields/FileField'
import { useNotification } from '../../components/ui/Notification'
import { createAlbum, enrichMetadataWithAi } from './api'
import type { AudioAlbum } from './types'
import { FaMagic } from 'react-icons/fa'

interface Props {
  onClose: () => void
  onCreated: (album: AudioAlbum) => void
}

export function AddAlbumDialog({ onClose, onCreated }: Props) {
  const { showNotification } = useNotification()
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [releaseYear, setReleaseYear] = useState<string>(String(new Date().getFullYear()))
  const [genres, setGenres] = useState('')
  const [description, setDescription] = useState('')
  const [isSingle, setIsSingle] = useState(false)
  const [cover, setCover] = useState<File | null>(null)

  const handleAiEnrich = async () => {
    if (!title.trim() && !artist.trim()) {
      showNotification('Enter at least the artist or album title so AI can look it up', 'warning')
      return
    }

    setAiBusy(true)
    try {
      const resp = await enrichMetadataWithAi({
        artist: artist.trim(),
        albumTitle: title.trim(),
      })
      const data = resp.data
      if (data.artist && !artist.trim()) setArtist(data.artist)
      if (data.albumTitle && !title.trim()) setTitle(data.albumTitle)
      if (data.releaseYear) setReleaseYear(String(data.releaseYear))
      if (data.genres && data.genres.length > 0) setGenres(data.genres.join(', '))
      if (data.description) setDescription(data.description)

      showNotification('Metadata enriched with AI!', 'success')
    } catch (e) {
      showNotification('Failed to retrieve data from AI', 'error')
    } finally {
      setAiBusy(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      showNotification('Album title is required', 'error')
      return
    }
    if (!artist.trim()) {
      showNotification('Artist is required', 'error')
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('artist', artist.trim())
      if (releaseYear) fd.append('releaseYear', releaseYear)
      if (genres.trim()) fd.append('genres', genres.trim())
      if (description.trim()) fd.append('description', description.trim())
      fd.append('isSingle', isSingle ? 'true' : 'false')

      if (cover) {
        fd.append('cover', cover)
      }

      const res = await createAlbum(fd)
      showNotification(`Album "${title}" created`, 'success')
      onCreated(res.data)
      onClose()
    } catch {
      showNotification('Failed to create album', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DynamicFormDialog
      open
      title="Add New Album"
      onClose={onClose}
      width="min(90vw, 600px)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy || aiBusy}>
            {busy ? 'Creating…' : 'Create Album'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button
          variant="secondary"
          onClick={handleAiEnrich}
          disabled={aiBusy || busy}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <FaMagic /> {aiBusy ? 'AI thinking…' : 'Enrich with AI'}
        </Button>
      </div>

      <TextField
        label="Artist / Band *"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        placeholder="e.g. Queen, Ludwig van Beethoven"
        autoFocus
      />

      <TextField
        label="Album Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. A Night at the Opera"
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
          placeholder="Rock, Progressive Rock"
        />
      </div>

      <TextArea
        label="Description / Notes"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional album description..."
      />

      <div style={{ margin: '10px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={isSingle}
            onChange={(e) => setIsSingle(e.target.checked)}
          />
          <span>This is a collection of singles / loose tracks (<code>Singles</code> directory)</span>
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <FileField
          label="Album Cover Image"
          accept="image/*,.jpg,.jpeg,.png,.webp"
          value={cover}
          onChange={setCover}
          placeholder="Click or drag & drop cover image here"
          subText="Optional: If no cover image is uploaded, the cover will be extracted from MP3 ID3 tags"
          showPreview
        />
      </div>
    </DynamicFormDialog>
  )
}
