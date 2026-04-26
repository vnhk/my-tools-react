import { useRef } from 'react'
import { ImageViewer } from './ImageViewer'
import { Button } from './Button'
import styles from './ImageEditor.module.css'

// React equivalent of BervanImageController
// ImageViewer + delete current + upload new

interface ImageEditorProps {
  images: string[]
  onChange: (images: string[]) => void
  readOnly?: boolean
  maxWidth?: string
  maxHeight?: string
}

export function ImageEditor({ images, onChange, readOnly = false, maxWidth, maxHeight }: ImageEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      onChange([...images, base64])
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={styles.editor}>
      <ImageViewer
        images={images}
        onChange={onChange}
        readOnly={readOnly}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
      {!readOnly && (
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Add image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  )
}
