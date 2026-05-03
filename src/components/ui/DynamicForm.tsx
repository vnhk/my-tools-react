import {getEditFormFields, getSaveFormFields, validateFields} from '../../api/entityConfig'
import {TextField} from '../fields/TextField'
import {Checkbox} from '../fields/Checkbox'
import {SelectField} from '../fields/SelectField'
import {RichTextEditor} from './RichTextEditor'

interface DynamicFormProps {
    entityName: string
    mode: 'save' | 'edit'
    values: Record<string, unknown>
    onChange: (field: string, value: unknown) => void
    errors?: Record<string, string>
    skip?: string[]
    dynamicOptions?: Record<string, string[]>
}

export function DynamicForm({
                                entityName,
                                mode,
                                values,
                                onChange,
                                errors = {},
                                skip = [],
                                dynamicOptions = {}
                            }: DynamicFormProps) {
    const fields = mode === 'save'
        ? getSaveFormFields(entityName)
        : getEditFormFields(entityName)

    const visible = fields.filter((f) => !skip.includes(f.field))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {visible.map((f, i) => {
                const val = values[f.field]

                if (f.wysiwyg) {
                    return (
                        <div key={f.field}>
                            <RichTextEditor
                                value={String(val ?? '')}
                                onChange={(html) => onChange(f.field, html)}
                                height="300px"
                                placeholder={f.displayName}
                            />
                            {errors[f.field] && <span
                                style={{color: 'var(--color-danger, red)', fontSize: '0.8em'}}>{errors[f.field]}</span>}
                        </div>
                    )
                }

                // Dropdown — static options from YML
                if (f.strValues && f.strValues.length > 0) {
                    return (
                        <SelectField
                            key={f.field}
                            label={f.displayName}
                            value={String(val ?? '')}
                            options={f.strValues.map((o) => ({value: o, label: o}))}
                            placeholder="— Select —"
                            required={f.required}
                            error={errors[f.field]}
                            onChange={(e) => onChange(f.field, e.target.value)}
                        />
                    )
                }
                if (f.intValues && f.intValues.length > 0) {
                    return (
                        <SelectField
                            key={f.field}
                            label={f.displayName}
                            value={Number(val)}
                            options={f.intValues.map((o) => ({value: o, label: String(o)}))}
                            placeholder="— Select —"
                            required={f.required}
                            error={errors[f.field]}
                            onChange={(e) => onChange(f.field, e.target.value)}
                        />
                    )
                }

                // Dropdown — dynamic options
                if (f.dynamicStrValues) {
                    const opts = dynamicOptions[f.field] ?? []
                    return (
                        <SelectField
                            key={f.field}
                            label={f.displayName}
                            value={String(val ?? '')}
                            options={opts.map((o) => ({value: o, label: o}))}
                            placeholder="— Select —"
                            required={f.required}
                            error={errors[f.field]}
                            onChange={(e) => onChange(f.field, e.target.value)}
                        />
                    )
                }

                // Boolean checkbox — only when value is already boolean-typed in defaults
                if (typeof val === 'boolean') {
                    return (
                        <Checkbox
                            key={f.field}
                            label={f.displayName}
                            checked={val}
                            onChange={(e) => onChange(f.field, e.target.checked)}
                        />
                    )
                }

                // Date / DateTime field
                const dataType = f.dataType?.toUpperCase()
                if (dataType === 'DATE' || dataType === 'DATETIME') {
                    const isDateTime = dataType === 'DATETIME'
                    const inputVal = val ? String(val).slice(0, isDateTime ? 16 : 10) : ''
                    return (
                        <TextField
                            key={f.field}
                            label={f.displayName}
                            type={isDateTime ? 'datetime-local' : 'date'}
                            value={inputVal}
                            onChange={(e) => onChange(f.field, e.target.value)}
                            required={f.required}
                            autoFocus={i === 0}
                            error={errors[f.field]}
                        />
                    )
                }

                // Number field — when min/max are set and the value is numeric (not a text field)
                if (f.min != null && f.max != null && (f.dataType?.toLowerCase() == "number" || typeof val === 'number')) {
                    return (
                        <TextField
                            key={f.field}
                            label={f.displayName}
                            type="number"
                            value={val != null ? String(val) : ''}
                            onChange={(e) => onChange(f.field, e.target.value === '' ? null : Number(e.target.value))}
                            required={f.required}
                            autoFocus={i === 0}
                            error={errors[f.field]}
                        />
                    )
                }

                // Default: text field
                return (
                    <TextField
                        key={f.field}
                        label={f.displayName}
                        value={String(val ?? '')}
                        type="text"
                        onChange={(e) => onChange(f.field, e.target.value)}
                        required={f.required}
                        autoFocus={i === 0}
                        error={errors[f.field]}
                    />
                )
            })}
        </div>
    )
}

export {validateFields}
