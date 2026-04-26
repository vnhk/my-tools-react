import { SelectHTMLAttributes } from 'react'
import styles from './Field.module.css'

// React equivalent of BervanDynamicDropdownController
// A select field that takes a dynamic list of options and an identifying key

interface DynamicSelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  fieldKey: string
  label?: string
  options: string[]
  error?: string
  required?: boolean
}

export function DynamicSelectField({
  fieldKey: _fieldKey,
  label,
  options,
  error,
  required,
  className = '',
  ...props
}: DynamicSelectFieldProps) {
  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
        </label>
      )}
      <select className={`${styles.select} ${className}`} required={required} {...props}>
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
