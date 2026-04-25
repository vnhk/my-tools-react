import { InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface TimeFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

export function TimeField({ label, error, required, className = '', ...props }: TimeFieldProps) {
  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
        </label>
      )}
      <input
        type="time"
        className={`${styles.input} ${className}`}
        required={required}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
