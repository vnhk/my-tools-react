import { TextareaHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      <textarea className={`${styles.textarea} ${className}`} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
