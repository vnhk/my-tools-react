import styles from './Field.module.css'
import { CustomSelect } from './CustomSelect'

interface DynamicSelectFieldProps {
  fieldKey: string
  label?: string
  options: string[]
  error?: string
  required?: boolean
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  disabled?: boolean
  className?: string
}

export function DynamicSelectField({
  fieldKey: _fieldKey,
  label,
  options,
  error,
  required,
  value,
  onChange,
  disabled,
  className = '',
}: DynamicSelectFieldProps) {
  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}> *</span>}
        </label>
      )}
      <CustomSelect
        options={[{ value: '', label: '—' }, ...options.map((o) => ({ value: o, label: o }))]}
        value={value ?? ''}
        onChange={(v) => onChange?.({ target: { value: v } })}
        disabled={disabled}
        className={className}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
