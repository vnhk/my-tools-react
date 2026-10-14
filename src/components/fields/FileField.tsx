import { useRef, useState, useEffect, DragEvent, ChangeEvent, KeyboardEvent } from 'react'
import {
  FaCloudUploadAlt,
  FaFileArchive,
  FaMusic,
  FaImage,
  FaFileAlt,
  FaTimes,
} from 'react-icons/fa'
import styles from './FileField.module.css'

export interface FileFieldProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  accept?: string
  value?: File | null
  onChange?: (file: File | null) => void
  placeholder?: string
  subText?: string
  disabled?: boolean
  id?: string
  className?: string
  showPreview?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function getFileIcon(filename: string, mimeType: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.zip') || lower.endsWith('.tar') || lower.endsWith('.gz') || lower.endsWith('.7z')) {
    return <FaFileArchive />
  }
  if (
    lower.endsWith('.mp3') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.ogg') ||
    mimeType.startsWith('audio/')
  ) {
    return <FaMusic />
  }
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    mimeType.startsWith('image/')
  ) {
    return <FaImage />
  }
  return <FaFileAlt />
}

export function FileField({
  label,
  required,
  error,
  hint,
  accept,
  value,
  onChange,
  placeholder = 'Click or drag & drop file here',
  subText,
  disabled = false,
  id,
  className = '',
  showPreview = true,
}: FileFieldProps) {
  const [internalFile, setInternalFile] = useState<File | null>(value ?? null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value !== undefined) {
      setInternalFile(value)
    }
  }, [value])

  const currentFile = value !== undefined ? value : internalFile

  useEffect(() => {
    if (currentFile && showPreview && currentFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(currentFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [currentFile, showPreview])

  const handleFile = (file: File | null) => {
    if (value === undefined) {
      setInternalFile(file)
    }
    onChange?.(file)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    handleFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const dropped = e.dataTransfer.files?.[0] ?? null
    if (dropped) {
      handleFile(dropped)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    handleFile(null)
  }

  const handleClickBrowse = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const fieldId = id ?? (label ? `file-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)

  return (
    <div className={`${styles.group} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={fieldId}>
          <span>{label}</span>
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        id={fieldId}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={disabled}
      />

      {currentFile ? (
        <div className={styles.fileCard}>
          <div className={styles.fileCardInfo}>
            {previewUrl ? (
              <img src={previewUrl} alt={currentFile.name} className={styles.fileThumbnail} />
            ) : (
              <div className={styles.fileIconWrapper}>
                {getFileIcon(currentFile.name, currentFile.type)}
              </div>
            )}
            <div className={styles.fileDetails}>
              <div className={styles.fileName} title={currentFile.name}>
                {currentFile.name}
              </div>
              <div className={styles.fileSize}>{formatFileSize(currentFile.size)}</div>
            </div>
          </div>

          <div className={styles.fileCardActions}>
            <button
              type="button"
              className={styles.changeBtn}
              onClick={handleClickBrowse}
              disabled={disabled}
              title="Select different file"
            >
              Change
            </button>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleClear}
              disabled={disabled}
              title="Remove file"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
          onClick={handleClickBrowse}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label={label || placeholder}
        >
          <div className={styles.uploadIcon}>
            <FaCloudUploadAlt />
          </div>
          <div className={styles.promptText}>
            {placeholder}
            <span className={styles.browseLink}>Browse</span>
          </div>
          {subText ? (
            <div className={styles.subText}>{subText}</div>
          ) : accept ? (
            <div className={styles.subText}>Accepted formats: {accept}</div>
          ) : null}
        </div>
      )}

      {error && <span className={styles.error}>{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
