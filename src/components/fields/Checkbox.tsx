import { InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className={styles.checkboxGroup}>
      <input type="checkbox" {...props} />
      {label && <span className={styles.label} style={{ marginBottom: 0 }}>{label}</span>}
    </label>
  )
}
