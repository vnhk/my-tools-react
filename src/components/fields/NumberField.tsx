import React, { InputHTMLAttributes, useEffect, useState } from 'react'
import styles from './Field.module.css'

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string
  error?: string
  value?: number | string | null
  onChange?: (value: number | '') => void
}

export function NumberField({
  label,
  error,
  value,
  onChange,
  className = '',
  onBlur,
  id,
  ...props
}: NumberFieldProps) {
  const [text, setText] = useState<string>(() => (value != null && value !== '' ? String(value) : ''))

  useEffect(() => {
    setText((prev) => {
      if (value == null || value === '') {
        return prev === '-' || prev === '.' ? prev : ''
      }
      const parsed = Number(prev)
      if (isNaN(parsed) || Number(value) !== parsed) {
        return String(value)
      }
      return prev
    })
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.')

    const allowNegative = props.min === undefined || Number(props.min) < 0
    const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/

    if (val === '' || regex.test(val)) {
      setText(val)
      if (val === '' || val === '-' || val === '.' || val === '-.') {
        onChange?.('')
      } else {
        const num = Number(val)
        if (!isNaN(num)) {
          onChange?.(num)
        }
      }
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (text === '-' || text === '.' || text === '-.') {
      setText('')
      onChange?.('')
    } else if (text.endsWith('.')) {
      const trimmed = text.slice(0, -1)
      setText(trimmed)
    }
    onBlur?.(e)
  }

  const inputId = id ?? (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)

  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        className={`${styles.input} ${className}`}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
