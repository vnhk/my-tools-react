import { useState, useRef, useEffect } from 'react'
import { CustomSelect } from '../fields/CustomSelect'
import styles from './InlineEditableField.module.css'

type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'COMBOBOX' | 'MULTI_SELECT'

interface InlineEditableFieldProps {
  label: string
  value: string | number | string[] | null
  fieldType?: FieldType
  options?: string[]
  onSave: (value: string | number | string[] | null) => void
  readOnly?: boolean
}

function formatValue(value: string | number | string[] | null): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  if (value === '') return '—'
  return String(value)
}

export function InlineEditableField({
  label,
  value,
  fieldType = 'TEXT',
  options = [],
  onSave,
  readOnly = false,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(
    Array.isArray(value) ? value.join(', ') : value != null ? String(value) : ''
  )
  const [multiDraft, setMultiDraft] = useState<string[]>(
    Array.isArray(value) ? value : []
  )
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const startEdit = () => {
    if (readOnly) return
    setDraft(Array.isArray(value) ? value.join(', ') : value != null ? String(value) : '')
    setMultiDraft(Array.isArray(value) ? value : [])
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (fieldType === 'NUMBER') {
      const n = parseFloat(draft)
      onSave(isNaN(n) ? null : n)
    } else if (fieldType === 'MULTI_SELECT') {
      onSave(multiDraft)
    } else {
      onSave(draft || null)
    }
  }

  const cancel = () => setEditing(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') cancel()
  }

  const toggleMulti = (opt: string) => {
    setMultiDraft((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
    )
  }

  if (editing) {
    if (fieldType === 'COMBOBOX') {
      return (
        <div className={styles.field}>
          <span className={styles.label}>{label}</span>
          <CustomSelect
            autoOpen
            options={[{ value: '', label: '—' }, ...options.map((o) => ({ value: o, label: o }))]}
            value={draft}
            onChange={(v) => {
              setDraft(v)
              setEditing(false)
              onSave(v || null)
            }}
          />
        </div>
      )
    }

    if (fieldType === 'MULTI_SELECT') {
      return (
        <div className={styles.field}>
          <span className={styles.label}>{label}</span>
          <div className={styles.multiEditor}>
            {options.map((o) => (
              <label key={o} className={styles.multiOption}>
                <input
                  type="checkbox"
                  checked={multiDraft.includes(o)}
                  onChange={() => toggleMulti(o)}
                />
                {o}
              </label>
            ))}
          </div>
          <div className={styles.multiActions}>
            <button className={styles.saveBtn} onClick={commit}>Save</button>
            <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.field}>
        <span className={styles.label}>{label}</span>
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          className={styles.editor}
          type={fieldType === 'NUMBER' ? 'number' : fieldType === 'DATE' ? 'date' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      </div>
    )
  }

  return (
    <div className={`${styles.field} ${readOnly ? '' : styles.clickable}`} onClick={startEdit}>
      <span className={styles.label}>{label}</span>
      <div className={styles.display}>
        <span className={`${styles.value} ${!value || (Array.isArray(value) && value.length === 0) ? styles.empty : ''}`}>
          {formatValue(value)}
        </span>
        {!readOnly && <span className={styles.editIcon}>✎</span>}
      </div>
    </div>
  )
}
