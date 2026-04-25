import { ReactNode, FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import styles from './EntityForm.module.css'

export interface FormField {
  key: string
  label: string
  render: (value: unknown, onChange: (v: unknown) => void) => ReactNode
  required?: boolean
}

interface EntityFormProps<T extends Record<string, unknown>> {
  open: boolean
  title: string
  fields: FormField[]
  values: T
  onChange: (key: string, value: unknown) => void
  onSave: () => void
  onClose: () => void
  loading?: boolean
  mode?: 'create' | 'edit'
}

export function EntityForm<T extends Record<string, unknown>>({
  open,
  title,
  fields,
  values,
  onChange,
  onSave,
  onClose,
  loading = false,
  mode = 'edit',
}: EntityFormProps<T>) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSave()
  }

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={onSave}
      confirmLabel={loading ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {fields.map((field) => (
          <div key={field.key}>
            {field.render(values[field.key], (v) => onChange(field.key, v))}
          </div>
        ))}
      </form>
    </Dialog>
  )
}
