import { InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function TextField({ label, error, className = '', id, ...props }: TextFieldProps) {
  const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)
  return (
    <div className={styles.group}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={`${styles.input} ${className}`} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
