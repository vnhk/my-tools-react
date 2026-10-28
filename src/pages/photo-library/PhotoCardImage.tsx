import { useState, useEffect, useRef, useCallback } from 'react'
import type { PhotoItem } from './types'
import { getPhotoThumbnailUrl, getPhotoFileUrl } from './api'
import { thumbnailQueue } from './thumbnailQueue'
import {
  isHeicFormat,
  isSafariOrApple,
  convertHeicToJpegUrl,
  captureVideoThumbnail,
  persistThumbnailToServer,
} from '../../utils/mediaUtils'
import { FaFileVideo, FaImage } from 'react-icons/fa'

interface Props {
  photo: PhotoItem
  className?: string
}

export function PhotoCardImage({ photo, className }: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const slotAcquired = useRef(false)
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isHeic = isHeicFormat(photo.filename)
  const isVideo = photo.mediaType === 'VIDEO'
  const isSafari = isSafariOrApple()

  const releaseSlot = useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
    if (slotAcquired.current) {
      slotAcquired.current = false
      thumbnailQueue.release()
    }
  }, [])

  // Only request resources when the card actually enters the viewport (rootMargin 200px)
  // Loads via concurrency queue (max 6 parallel requests) to avoid flooding backend
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelQueue: (() => void) | null = null

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
          cancelQueue = thumbnailQueue.enqueue(photo.id, () => {
            slotAcquired.current = true
            setSrc(getPhotoThumbnailUrl(photo.id))
            safetyTimeoutRef.current = setTimeout(() => {
              releaseSlot()
            }, 8000)
          })
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (cancelQueue) cancelQueue()
      releaseSlot()
    }
  }, [photo.id, releaseSlot])

  const handleLoad = () => {
    releaseSlot()
  }

  const handleFallback = async () => {
    releaseSlot()
    if (loading) return
    setLoading(true)

    try {
      const fileUrl = getPhotoFileUrl(photo.id)
      if (isVideo) {
        // Extract 1st frame from video on client
        const thumbUrl = await captureVideoThumbnail(fileUrl)
        setSrc(thumbUrl)
        setFailed(false)
        // Persist thumbnail on server so it is generated only once ever
        persistThumbnailToServer(photo.id, thumbUrl)
      } else if (isHeic) {
        if (isSafari) {
          // Safari has native HEIC decoding built-in
          setSrc(fileUrl)
          setFailed(false)
          return
        }
        // Non-Safari browsers: try WASM conversion
        const token = localStorage.getItem('token')
        const res = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch photo file')
        const blob = await res.blob()
        const converted = await convertHeicToJpegUrl(blob, photo.id)
        if (converted) {
          setSrc(converted)
          setFailed(false)
          persistThumbnailToServer(photo.id, converted)
        } else {
          setFailed(true)
        }
      } else {
        setFailed(true)
      }
    } catch (e) {
      console.warn('Fallback thumbnail failed for:', photo.filename, e)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.03)',
      }}
    >
      {!isVisible || !src ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isVideo ? (
            <FaFileVideo size={28} color="#ef4444" opacity={0.35} />
          ) : (
            <FaImage size={28} opacity={0.2} />
          )}
        </div>
      ) : failed ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-text-tertiary, #9ca3af)',
          }}
        >
          {isVideo ? <FaFileVideo size={36} color="#ef4444" /> : <FaImage size={36} />}
        </div>
      ) : (
        <img
          src={src}
          alt={photo.filename}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleFallback}
        />
      )}
    </div>
  )
}
