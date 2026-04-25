import { InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  error?: string
  value?: number | ''
  onChange?: (value: number | '') => void
}

export function NumberField({ label, error, onChange, className = '', ...props }: NumberFieldProps) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type="number"
        className={`${styles.input} ${className}`}
        onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
