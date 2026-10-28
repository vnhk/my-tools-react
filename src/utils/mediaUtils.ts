import heic2any from 'heic2any'

// In-memory caches to prevent repeated conversions and memory bloat
const heicBlobUrlCache = new Map<string, string>()
const videoThumbnailCache = new Map<string, string>()
const pendingHeicConversions = new Map<string, Promise<string | null>>()
const pendingVideoCaptures = new Map<string, Promise<string>>()

export function isSafariOrApple(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return (
    (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')) ||
    (/macintosh|iphone|ipad|ipod/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
  )
}

export function isHeicFormat(filenameOrUrl?: string | null): boolean {
  if (!filenameOrUrl) return false
  const clean = filenameOrUrl.split('?')[0].toLowerCase()
  return clean.endsWith('.heic') || clean.endsWith('.heif')
}

export function isVideoFormat(filenameOrUrl?: string | null): boolean {
  if (!filenameOrUrl) return false
  const clean = filenameOrUrl.split('?')[0].toLowerCase()
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mkv') ||
    clean.endsWith('.avi') ||
    clean.endsWith('.m4v')
  )
}

/**
 * Converts a HEIC Blob to a JPEG Object URL using client-side WebAssembly heic2any.
 * If running on Safari (which supports HEIC natively) or if conversion fails, handles it gracefully.
 */
export async function convertHeicToJpegUrl(blob: Blob, cacheKey?: string): Promise<string | null> {
  const key = cacheKey || (blob instanceof File ? `${blob.name}_${blob.size}_${blob.lastModified}` : null)
  if (key && heicBlobUrlCache.has(key)) {
    return heicBlobUrlCache.get(key)!
  }

  if (key && pendingHeicConversions.has(key)) {
    return pendingHeicConversions.get(key)!
  }

  const promise = (async () => {
    try {
      const result = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.85,
      })
      const convertedBlob = Array.isArray(result) ? result[0] : result
      const url = URL.createObjectURL(convertedBlob)
      if (key) {
        heicBlobUrlCache.set(key, url)
      }
      return url
    } catch (err) {
      console.warn('HEIC conversion via libheif failed (e.g. newer Apple HDR format):', err)
      return null
    } finally {
      if (key) {
        pendingHeicConversions.delete(key)
      }
    }
  })()

  if (key) {
    pendingHeicConversions.set(key, promise)
  }

  return promise
}

/**
 * Captures a video frame (at seekTime seconds) as a JPEG data URL on an offscreen HTML5 <video> and <canvas>.
 * Works for any video format supported by the user's browser, including .mov and .mp4.
 */
export function captureVideoThumbnail(videoUrl: string, seekTime: number = 1): Promise<string> {
  if (videoThumbnailCache.has(videoUrl)) {
    return Promise.resolve(videoThumbnailCache.get(videoUrl)!)
  }

  if (pendingVideoCaptures.has(videoUrl)) {
    return pendingVideoCaptures.get(videoUrl)!
  }

  const promise = new Promise<string>((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = videoUrl

    let isDone = false

    const cleanup = () => {
      video.onloadeddata = null
      video.onseeked = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
    }

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true
        cleanup()
        reject(new Error('Video frame capture timeout'))
      }
    }, 8000)

    video.onerror = () => {
      if (!isDone) {
        isDone = true
        clearTimeout(timer)
        cleanup()
        reject(new Error('Video playback/load error'))
      }
    }

    video.onloadeddata = () => {
      video.currentTime = Math.min(seekTime, (video.duration || 1) / 4) || 0.1
    }

    video.onseeked = () => {
      if (isDone) return
      isDone = true
      clearTimeout(timer)
      try {
        const canvas = document.createElement('canvas')
        const width = video.videoWidth || 320
        const height = video.videoHeight || 240
        canvas.width = Math.min(width, 480)
        canvas.height = Math.round((canvas.width / width) * height) || 270

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          videoThumbnailCache.set(videoUrl, dataUrl)
          cleanup()
          resolve(dataUrl)
        } else {
          cleanup()
          reject(new Error('Canvas 2D context not available'))
        }
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    video.onerror = (e) => {
      if (isDone) return
      isDone = true
      clearTimeout(timer)
      cleanup()
      reject(e)
    }
  }).finally(() => {
    pendingVideoCaptures.delete(videoUrl)
  })

  pendingVideoCaptures.set(videoUrl, promise)
  return promise
}

/**
 * Asynchronously persists a client-captured thumbnail to the backend disk cache (.thumbnails/{id}.jpg).
 * Fire-and-forget: does not block the UI.
 */
export async function persistThumbnailToServer(photoId: string, dataUrl: string) {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const token = localStorage.getItem('token')
    await fetch(`/api/photos/${encodeURIComponent(photoId)}/thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: blob,
    })
  } catch {
    // Non-critical background save failure
  }
}
