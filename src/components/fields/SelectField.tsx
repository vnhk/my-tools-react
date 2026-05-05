import styles from './Field.module.css'
import {CustomSelect} from './CustomSelect'

interface Option {
    value: string | number
    label: string
}

interface SelectFieldProps {
    label?: string
    error?: string
    options: Option[]
    placeholder?: string | number
    value?: string | number
    onChange?: (e: { target: { value: string | number } }) => void
    required?: boolean
    disabled?: boolean
    className?: string
    id?: string
}

export function SelectField({
                                label,
                                error,
                                options,
                                placeholder,
                                value,
                                onChange,
                                required,
                                disabled,
                                className = '',
                                id
                            }: SelectFieldProps) {
    const fieldId = id ?? (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)
    return (
        <div className={styles.group}>
            {label &&
                <label className={styles.label} htmlFor={fieldId}>{label}{required && <span className={styles.required}>*</span>}</label>}
            <CustomSelect
                id={fieldId}
                options={placeholder ? [{value: '', label: String(placeholder)}, ...options] : options}
                value={value ?? ''}
                onChange={(v) => onChange?.({target: {value: v}})}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
            />
            {error && <span className={styles.error}>{error}</span>}
        </div>
    )
}
