import { getSaveFormFields, getEditFormFields, validateFields } from '../../api/entityConfig'
import { TextField } from '../fields/TextField'
import { RichTextEditor } from './RichTextEditor'

interface DynamicFormProps {
  entityName: string
  mode: 'save' | 'edit'
  values: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  errors?: Record<string, string>
  skip?: string[]
}

export function DynamicForm({ entityName, mode, values, onChange, errors = {}, skip = [] }: DynamicFormProps) {
  const fields = mode === 'save'
    ? getSaveFormFields(entityName)
    : getEditFormFields(entityName)

  const visible = fields.filter((f) => !skip.includes(f.field))

  return (
    <>
      {visible.map((f, i) =>
        f.wysiwyg ? (
          <div key={f.field}>
            <RichTextEditor
              value={String(values[f.field] ?? '')}
              onChange={(html) => onChange(f.field, html)}
              height="300px"
              placeholder={f.displayName}
            />
            {errors[f.field] && <span style={{ color: 'var(--color-danger, red)', fontSize: '0.8em' }}>{errors[f.field]}</span>}
          </div>
        ) : (
          <TextField
            key={f.field}
            label={f.displayName}
            value={String(values[f.field] ?? '')}
            onChange={(e) => onChange(f.field, e.target.value)}
            required={f.required}
            autoFocus={i === 0}
            error={errors[f.field]}
          />
        )
      )}
    </>
  )
}

export { validateFields }
