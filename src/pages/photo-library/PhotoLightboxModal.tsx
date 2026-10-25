import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaRegHeart,
  FaInfoCircle,
  FaSearchPlus,
  FaSearchMinus,
  FaRedo,
  FaPlay,
  FaPause,
  FaTrash,
  FaDownload,
  FaPlus,
} from 'react-icons/fa'
import type { PhotoItem } from './types'
import { getPhotoFileUrl, toggleFavorite, deletePhoto, updatePhotoTags } from './api'
import styles from './PhotoLightboxModal.module.css'

interface Props {
  items: PhotoItem[]
  initialIndex: number
  onClose: () => void
  onItemUpdated: (updated: PhotoItem) => void
  onItemDeleted: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function PhotoLightboxModal({
  items,
  initialIndex,
  onClose,
  onItemUpdated,
  onItemDeleted,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [isSlideshow, setIsSlideshow] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const slideshowTimerRef = useRef<number | null>(null)

  const currentItem = items[currentIndex]

  const handleNext = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setCurrentIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0))
  }, [items.length])

  const handlePrev = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1))
  }, [items.length])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInfo((prev) => !prev)
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsSlideshow((prev) => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleNext, handlePrev, onClose])

  // Slideshow interval
  useEffect(() => {
    if (isSlideshow) {
      slideshowTimerRef.current = window.setInterval(() => {
        handleNext()
      }, 3500)
    } else if (slideshowTimerRef.current) {
      clearInterval(slideshowTimerRef.current)
    }
    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current)
    }
  }, [isSlideshow, handleNext])

  if (!currentItem) return null

  const handleFavoriteToggle = async () => {
    try {
      const res = await toggleFavorite(currentItem.id)
      onItemUpdated(res.data)
    } catch (e) {
      console.error('Failed to toggle favorite', e)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${currentItem.filename}?`)) return
    try {
      await deletePhoto(currentItem.id)
      onItemDeleted(currentItem.id)
      if (items.length <= 1) {
        onClose()
      } else {
        handleNext()
      }
    } catch (e) {
      console.error('Failed to delete photo', e)
    }
  }

  const handleAddTag = async () => {
    const trimmed = newTagInput.trim()
    if (!trimmed) return
    const updatedTags = Array.from(new Set([...(currentItem.tags || []), trimmed]))
    try {
      const res = await updatePhotoTags(currentItem.id, updatedTags)
      onItemUpdated(res.data)
      setNewTagInput('')
    } catch (e) {
      console.error('Failed to add tag', e)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = (currentItem.tags || []).filter((t) => t !== tagToRemove)
    try {
      const res = await updatePhotoTags(currentItem.id, updatedTags)
      onItemUpdated(res.data)
    } catch (e) {
      console.error('Failed to remove tag', e)
    }
  }

  const fileUrl = getPhotoFileUrl(currentItem.id)

  return (
    <div className={styles.overlay} onClick={onClose}>
      {/* Top Bar */}
      <div className={styles.topBar} onClick={(e) => e.stopPropagation()}>
        <span className={styles.counter}>
          {currentIndex + 1} / {items.length} • {currentItem.filename}
        </span>

        <div className={styles.actions}>
          <button
            className={`${styles.toolBtn} ${isSlideshow ? styles.toolBtnActive : ''}`}
            onClick={() => setIsSlideshow((prev) => !prev)}
            title={isSlideshow ? 'Pause Slideshow' : 'Start Slideshow'}
          >
            {isSlideshow ? <FaPause /> : <FaPlay />}
          </button>

          {currentItem.mediaType === 'PHOTO' && (
            <>
              <button
                className={styles.toolBtn}
                onClick={() => setZoom((z) => Math.min(3, z + 0.3))}
                title="Zoom in"
              >
                <FaSearchPlus />
              </button>
              <button
                className={styles.toolBtn}
                onClick={() => setZoom((z) => Math.max(1, z - 0.3))}
                title="Zoom out"
              >
                <FaSearchMinus />
              </button>
              <button
                className={styles.toolBtn}
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
              >
                <FaRedo />
              </button>
            </>
          )}

          <button
            className={styles.toolBtn}
            onClick={handleFavoriteToggle}
            title={currentItem.favorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{ color: currentItem.favorite ? '#ef4444' : undefined }}
          >
            {currentItem.favorite ? <FaHeart /> : <FaRegHeart />}
          </button>

          <a
            href={fileUrl}
            download={currentItem.filename}
            className={styles.toolBtn}
            title="Download file"
          >
            <FaDownload />
          </a>

          <button
            className={`${styles.toolBtn} ${showInfo ? styles.toolBtnActive : ''}`}
            onClick={() => setShowInfo((prev) => !prev)}
            title="Toggle Info"
          >
            <FaInfoCircle />
          </button>

          <button
            className={`${styles.toolBtn} ${styles.toolBtnDanger}`}
            onClick={handleDelete}
            title="Delete photo"
          >
            <FaTrash />
          </button>

          <button className={styles.toolBtn} onClick={onClose} title="Close (Esc)">
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div className={styles.stage} onClick={(e) => e.stopPropagation()}>
        {items.length > 1 && (
          <>
            <button
              className={`${styles.navBtn} ${styles.prevBtn}`}
              onClick={handlePrev}
              title="Previous (Left Arrow)"
            >
              <FaChevronLeft />
            </button>
            <button
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={handleNext}
              title="Next (Right Arrow)"
            >
              <FaChevronRight />
            </button>
          </>
        )}

        <div
          className={styles.mediaWrapper}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          {currentItem.mediaType === 'VIDEO' ? (
            <video
              className={styles.video}
              src={fileUrl}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              className={styles.image}
              src={fileUrl}
              alt={currentItem.filename}
            />
          )}
        </div>

        {/* Info Drawer */}
        {showInfo && (
          <div className={styles.infoDrawer} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.infoTitle}>Details</h3>

            <div className={styles.infoSection}>
              <span className={styles.infoLabel}>Filename</span>
              <span className={styles.infoValue}>{currentItem.filename}</span>
            </div>

            <div className={styles.infoSection}>
              <span className={styles.infoLabel}>Date Taken</span>
              <span className={styles.infoValue}>{formatDate(currentItem.dateTaken)}</span>
            </div>

            {currentItem.cameraModel && (
              <div className={styles.infoSection}>
                <span className={styles.infoLabel}>Camera</span>
                <span className={styles.infoValue}>{currentItem.cameraModel}</span>
              </div>
            )}

            <div className={styles.infoSection}>
              <span className={styles.infoLabel}>File Info</span>
              <span className={styles.infoValue}>
                {currentItem.width && currentItem.height
                  ? `${currentItem.width} × ${currentItem.height} • `
                  : ''}
                {formatBytes(currentItem.fileSize)}
              </span>
            </div>

            <div className={styles.infoSection}>
              <span className={styles.infoLabel}>Storage Path</span>
              <span className={styles.infoValue}>{currentItem.path}</span>
            </div>

            <div className={styles.infoSection}>
              <span className={styles.infoLabel}>Tags</span>
              <div className={styles.tagsContainer}>
                {currentItem.tags && currentItem.tags.length > 0 ? (
                  currentItem.tags.map((tag) => (
                    <span key={tag} className={styles.tagPill}>
                      #{tag}
                      <button
                        className={styles.removeTagBtn}
                        onClick={() => handleRemoveTag(tag)}
                        title="Remove tag"
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    No tags yet
                  </span>
                )}
              </div>

              <div className={styles.addTagRow}>
                <input
                  type="text"
                  placeholder="Add tag (e.g. ślub, wakacje)..."
                  className={styles.tagInput}
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <button className={styles.addTagBtn} onClick={handleAddTag}>
                  <FaPlus size={10} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
