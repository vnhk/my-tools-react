import { SelectHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

export function SelectField({ label, error, options, placeholder, className = '', ...props }: SelectFieldProps) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.select} ${className}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
