import { useState } from 'react'
import styles from './ImageViewer.module.css'
import { Button } from './Button'

interface ImageViewerProps {
  images: string[]
  maxWidth?: string
  maxHeight?: string
  readOnly?: boolean
  onChange?: (images: string[]) => void
}

export function ImageViewer({ images: initialImages, maxWidth = '500px', maxHeight, readOnly = false, onChange }: ImageViewerProps) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [index, setIndex] = useState(0)

  const update = (next: string[]) => {
    setImages(next)
    onChange?.(next)
  }

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  const next = () => setIndex((i) => (i < images.length - 1 ? i + 1 : 0))

  const removeCurrent = () => {
    if (readOnly) return
    const next = images.filter((_, i) => i !== index)
    setIndex((i) => Math.min(i, next.length - 1))
    update(next)
  }

  if (images.length === 0) {
    return <div className={styles.empty}>No images</div>
  }

  const src = images[index].startsWith('http')
    ? images[index]
    : `data:image/png;base64,${images[index]}`

  return (
    <div className={styles.viewer}>
      <div className={styles.nav}>
        <Button variant="ghost" size="sm" onClick={prev} disabled={images.length <= 1}>◀</Button>
        <span className={styles.counter}>{index + 1} / {images.length}</span>
        <Button variant="ghost" size="sm" onClick={next} disabled={images.length <= 1}>▶</Button>
        {!readOnly && (
          <Button variant="danger" size="sm" onClick={removeCurrent}>✕</Button>
        )}
      </div>
      <img
        src={src}
        alt={`Image ${index + 1}`}
        className={styles.image}
        style={{ maxWidth, maxHeight: maxHeight ?? 'none' }}
      />
    </div>
  )
}
