import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaFolder, FaPlus, FaImages, FaTrash } from 'react-icons/fa'
import type { PhotoAlbum } from './types'
import { fetchAlbums, saveAlbum, deleteAlbum, getPhotoThumbnailUrl } from './api'
import styles from './AlbumsPage.module.css'

export function AlbumsPage() {
  const [albums, setAlbums] = useState<PhotoAlbum[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const loadAlbums = async () => {
    try {
      const res = await fetchAlbums()
      setAlbums(res.data)
    } catch (e) {
      console.error('Failed to load albums:', e)
    }
  }

  useEffect(() => {
    loadAlbums()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    try {
      await saveAlbum({
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
      })
      setName('')
      setDescription('')
      setTagsInput('')
      setShowCreateModal(false)
      loadAlbums()
    } catch (err) {
      console.error('Failed to create album:', err)
    }
  }

  const handleDeleteAlbum = async (id: string, albumName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Delete album "${albumName}"? (Photos inside won't be deleted)`)) return

    try {
      await deleteAlbum(id)
      loadAlbums()
    } catch (err) {
      console.error('Failed to delete album:', err)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <h2 className={styles.title}>Albums ({albums.length})</h2>
        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
          <FaPlus />
          <span>New Album</span>
        </button>
      </div>

      <div className={styles.grid}>
        {albums.map((album) => {
          const coverUrl = album.coverPhotoId ? getPhotoThumbnailUrl(album.coverPhotoId) : null
          return (
            <Link key={album.id} to={`/photos/albums/${album.id}`} className={styles.albumCard}>
              <div className={styles.coverWrap}>
                {coverUrl ? (
                  <img src={coverUrl} alt={album.name} className={styles.coverImg} loading="lazy" />
                ) : (
                  <FaFolder className={styles.coverPlaceholder} />
                )}
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.albumName}>{album.name}</h3>
                {album.description && <p className={styles.albumDesc}>{album.description}</p>}

                <div className={styles.cardFooter}>
                  <span>
                    <FaImages style={{ marginRight: 4 }} />
                    {album.photoCount} photos
                  </span>

                  {album.tags && album.tags.length > 0 && (
                    <div className={styles.tagPills}>
                      {album.tags.slice(0, 3).map((t) => (
                        <span key={t} className={styles.tagPill}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={(e) => handleDeleteAlbum(album.id, album.name, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
                    title="Delete album"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <form className={styles.modalContent} onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h3 className={styles.modalTitle}>Create Album</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Album Name *</label>
              <input
                type="text"
                required
                className={styles.input}
                placeholder="e.g. Nasz Ślub, Wakacje Grecja 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Optional album description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Auto-Matching Tags (comma-separated)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. ślub, wesele, grecja"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                Photos with any of these tags will automatically appear in this album!
              </span>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn}>
                Create Album
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
