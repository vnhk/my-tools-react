import { useState } from 'react'
import type { PhotoItem } from './types'
import { getPhotoThumbnailUrl, getPhotoFileUrl } from './api'
import { isHeicFormat, convertHeicToJpegUrl, captureVideoThumbnail } from '../../utils/mediaUtils'
import { FaFileVideo, FaImage } from 'react-icons/fa'

interface Props {
  photo: PhotoItem
  className?: string
}

export function PhotoCardImage({ photo, className }: Props) {
  const [src, setSrc] = useState<string>(() => getPhotoThumbnailUrl(photo.id))
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  const isHeic = isHeicFormat(photo.filename)
  const isVideo = photo.mediaType === 'VIDEO'

  const handleFallback = async () => {
    if (loading) return
    setLoading(true)

    try {
      const fileUrl = getPhotoFileUrl(photo.id)
      if (isVideo) {
        // Extract frame from video on client
        const thumbUrl = await captureVideoThumbnail(fileUrl)
        setSrc(thumbUrl)
        setFailed(false)
      } else if (isHeic) {
        // Fetch HEIC blob and convert to JPEG on client via WebAssembly
        const token = localStorage.getItem('token')
        const res = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch photo file')
        const blob = await res.blob()
        const converted = await convertHeicToJpegUrl(blob, photo.id)
        setSrc(converted)
        setFailed(false)
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

  if (failed) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--color-text-tertiary, #9ca3af)',
        }}
      >
        {isVideo ? <FaFileVideo size={36} color="#ef4444" /> : <FaImage size={36} />}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={photo.filename}
      className={className}
      loading="lazy"
      onError={handleFallback}
    />
  )
}
