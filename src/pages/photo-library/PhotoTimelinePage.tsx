import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  FaSearch,
  FaHeart,
  FaRegHeart,
  FaPlay,
  FaImages,
  FaTag,
  FaTrash,
  FaTimes,
  FaDownload,
  FaCloudUploadAlt,
} from 'react-icons/fa'
import type { PhotoItem } from './types'
import {
  fetchPhotos,
  fetchTags,
  toggleFavorite,
  deletePhoto,
  batchUpdateTags,
  downloadPhotosZip,
  uploadPhoto,
} from './api'
import { PhotoLightboxModal } from './PhotoLightboxModal'
import { PhotoCardImage } from './PhotoCardImage'
import styles from './PhotoTimelinePage.module.css'

interface Props {
  favoriteOnly?: boolean
  videoOnly?: boolean
  albumId?: string
}

export function PhotoTimelinePage({ favoriteOnly, videoOnly, albumId }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [tagsMap, setTagsMap] = useState<Record<string, number>>({})
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return
    try {
      await downloadPhotosZip(Array.from(selectedIds))
    } catch (e) {
      console.error('Failed to download ZIP:', e)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadPhoto(files[i])
      } catch (err) {
        console.error('Failed to upload dropped file:', files[i].name, err)
      }
    }
    loadData()
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [photosRes, tagsRes] = await Promise.all([
        fetchPhotos({
          albumId,
          tag: selectedTag || undefined,
          mediaType: videoOnly ? 'VIDEO' : undefined,
          favorite: favoriteOnly ? true : undefined,
          query: searchQuery || undefined,
        }),
        fetchTags(),
      ])
      setPhotos(photosRes.data)
      setTagsMap(tagsRes.data)
    } catch (e) {
      console.error('Failed to load photos:', e)
    } finally {
      setIsLoading(false)
    }
  }, [albumId, selectedTag, videoOnly, favoriteOnly, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleUpdate = () => loadData()
    window.addEventListener('photos-updated', handleUpdate)
    return () => window.removeEventListener('photos-updated', handleUpdate)
  }, [loadData])

  const INITIAL_CHUNK_SIZE = 24
  const CHUNK_STEP = 24
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHUNK_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(INITIAL_CHUNK_SIZE)
  }, [albumId, selectedTag, videoOnly, favoriteOnly, searchQuery])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK_STEP, photos.length))
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [photos.length])

  // Group photos by Month / Year (only up to visibleCount to prevent flooding backend)
  const groupedPhotos = useMemo(() => {
    const groups: { [key: string]: PhotoItem[] } = {}
    const visiblePhotos = photos.slice(0, visibleCount)
    visiblePhotos.forEach((photo) => {
      let groupKey = 'Undated'
      if (photo.dateTaken) {
        try {
          const d = new Date(photo.dateTaken)
          groupKey = d.toLocaleString('pl-PL', { year: 'numeric', month: 'long' })
          groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1)
        } catch {
          groupKey = 'Undated'
        }
      }
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(photo)
    })
    return groups
  }, [photos, visibleCount])

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleFavorite = async (photo: PhotoItem, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await toggleFavorite(photo.id)
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? res.data : p)))
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const handleBatchAddTag = async () => {
    const tag = window.prompt('Enter tag to add to selected photos (e.g. ślub, wakacje):')
    if (!tag || !tag.trim()) return
    try {
      await batchUpdateTags(Array.from(selectedIds), [tag.trim()], [])
      setSelectedIds(new Set())
      loadData()
    } catch (err) {
      console.error('Failed to add tags:', err)
    }
  }

  const handleBatchDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected photos?`)) return
    try {
      for (const id of Array.from(selectedIds)) {
        await deletePhoto(id)
      }
      setSelectedIds(new Set())
      loadData()
    } catch (err) {
      console.error('Failed to delete photos:', err)
    }
  }

  const handleCardClick = (photo: PhotoItem) => {
    const idx = photos.findIndex((p) => p.id === photo.id)
    if (idx >= 0) setLightboxIndex(idx)
  }

  const sortedTags = useMemo(() => {
    return Object.entries(tagsMap).sort((a, b) => b[1] - a[1])
  }, [tagsMap])

  return (
    <div
      className={styles.pageContainer}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {isDragOver && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(99, 102, 241, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        >
          <FaCloudUploadAlt size={64} />
          <h2 style={{ margin: '16px 0 0 0', fontSize: '24px' }}>Drop photos or videos to upload</h2>
        </div>
      )}
      {/* Search & Tag Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchRow}>
          <FaSearch color="var(--color-text-tertiary)" />
          <input
            type="text"
            placeholder="Search by filename or tag..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {sortedTags.length > 0 && (
          <div className={styles.tagCloud}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Tags:
            </span>
            {sortedTags.map(([tag, count]) => {
              const active = selectedTag === tag
              return (
                <button
                  key={tag}
                  className={`${styles.tagFilterPill} ${active ? styles.tagFilterPillActive : ''}`}
                  onClick={() => setSelectedTag(active ? null : tag)}
                >
                  <FaTag size={10} />
                  <span>{tag}</span>
                  <span className={styles.tagCount}>{count}</span>
                </button>
              )
            })}
            {selectedTag && (
              <button
                className={styles.tagFilterPill}
                onClick={() => setSelectedTag(null)}
                title="Clear tag filter"
              >
                <FaTimes size={10} />
                <span>Clear filter</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && photos.length === 0 ? (
        <div className={styles.emptyState}>
          <FaImages className={styles.emptyIcon} />
          <span>Loading photos...</span>
        </div>
      ) : photos.length === 0 ? (
        <div className={styles.emptyState}>
          <FaImages className={styles.emptyIcon} />
          <h3>No photos found</h3>
          <p>Upload photos using the button above or check your filter criteria.</p>
        </div>
      ) : (
        Object.entries(groupedPhotos).map(([groupTitle, groupItems]) => (
          <section key={groupTitle} className={styles.groupSection}>
            <div className={styles.groupHeader}>
              <span>{groupTitle}</span>
              <span className={styles.groupCount}>({groupItems.length})</span>
            </div>

            <div className={styles.grid}>
              {groupItems.map((photo) => {
                const isSelected = selectedIds.has(photo.id)
                return (
                  <div
                    key={photo.id}
                    className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                    onClick={() => handleCardClick(photo)}
                  >
                    <PhotoCardImage
                      photo={photo}
                      className={styles.thumbImg}
                    />

                    <div className={styles.overlayTop}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => handleToggleSelect(photo.id, e)}
                        className={styles.checkbox}
                        title="Select photo"
                      />
                      <button
                        className={`${styles.favBtn} ${photo.favorite ? styles.favBtnActive : ''}`}
                        onClick={(e) => handleToggleFavorite(photo, e)}
                        title="Toggle favorite"
                      >
                        {photo.favorite ? <FaHeart /> : <FaRegHeart />}
                      </button>
                    </div>

                    {photo.mediaType === 'VIDEO' && (
                      <div className={styles.videoBadge}>
                        <FaPlay size={9} />
                        <span>VIDEO</span>
                      </div>
                    )}

                    {photo.tags && photo.tags.length > 0 && (
                      <div className={styles.tagsBadge}>
                        <span className={styles.singleTagPill}>#{photo.tags[0]}</span>
                        {photo.tags.length > 1 && (
                          <span className={styles.singleTagPill}>+{photo.tags.length - 1}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      {/* Infinite scroll sentinel */}
      {visibleCount < photos.length && (
        <div
          ref={sentinelRef}
          style={{
            height: 40,
            margin: '24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-tertiary, #9ca3af)',
            fontSize: 'var(--font-size-sm, 13px)',
          }}
        >
          Loading more photos ({visibleCount} of {photos.length})…
        </div>
      )}

      {/* Floating Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className={styles.floatingBar}>
          <span className={styles.batchCount}>Selected: {selectedIds.size}</span>
          <button className={styles.batchBtn} onClick={handleBatchDownload} title="Download selected photos as ZIP archive">
            <FaDownload />
            <span>Download ZIP</span>
          </button>
          <button className={styles.batchBtn} onClick={handleBatchAddTag}>
            <FaTag />
            <span>Add Tag</span>
          </button>
          <button className={styles.batchBtn} onClick={handleBatchDelete}>
            <FaTrash />
            <span>Delete</span>
          </button>
          <button className={styles.batchBtn} onClick={() => setSelectedIds(new Set())}>
            <FaTimes />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <PhotoLightboxModal
          items={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onItemUpdated={(updated) => {
            setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }}
          onItemDeleted={(deletedId) => {
            setPhotos((prev) => prev.filter((p) => p.id !== deletedId))
          }}
        />
      )}
    </div>
  )
}
