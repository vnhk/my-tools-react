import { useEffect, useRef, useState } from 'react'
import styles from './CustomSelect.module.css'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  size?: 'sm'
  className?: string
  id?: string
  placement?: 'bottom' | 'top'
  autoOpen?: boolean
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = '— Select —',
  disabled = false,
  size,
  className = '',
  id,
  placement = 'bottom',
  autoOpen = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(autoOpen)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const idx = options.findIndex((o) => o.value === value)
    setFocusedIndex(idx >= 0 ? idx : 0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        onChange?.(options[focusedIndex].value)
        setOpen(false)
      }
    }
  }

  useEffect(() => {
    if (!open || focusedIndex < 0) return
    const list = listRef.current
    if (!list) return
    const item = list.children[focusedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, open])

  const select = (optValue: string) => {
    onChange?.(optValue)
    setOpen(false)
  }

  const dropdownClass = `${styles.dropdown} ${placement === 'top' ? styles.dropdownTop : ''}`

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${size === 'sm' ? styles.sm : ''} ${className}`}
    >
      <button
        id={id}
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`${styles.triggerLabel} ${!selectedOption ? styles.placeholder : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.chevron}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className={dropdownClass} role="listbox">
          <div ref={listRef} className={styles.optionsList}>
            {options.map((opt, i) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`${styles.option} ${opt.value === value ? styles.selected : ''} ${i === focusedIndex ? styles.focused : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(opt.value)}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                {opt.label}
                {opt.value === value && (
                  <span className={styles.checkIcon}>✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
