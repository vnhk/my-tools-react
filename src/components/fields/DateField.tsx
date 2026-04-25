import { InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface DateFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  withTime?: boolean
}

export function DateField({ label, error, withTime = false, className = '', ...props }: DateFieldProps) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type={withTime ? 'datetime-local' : 'date'}
        className={`${styles.input} ${className}`}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
