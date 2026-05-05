import { TextareaHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({ label, error, className = '', id, ...props }: TextAreaProps) {
  const textareaId = id ?? (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)
  return (
    <div className={styles.group}>
      {label && <label className={styles.label} htmlFor={textareaId}>{label}</label>}
      <textarea id={textareaId} className={`${styles.textarea} ${className}`} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
