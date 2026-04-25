import { InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function TextField({ label, error, className = '', ...props }: TextFieldProps) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={`${styles.input} ${className}`} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
