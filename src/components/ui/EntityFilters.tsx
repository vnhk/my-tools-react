import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { getFilterableFields } from '../../api/entityConfig'
import type { FilterValues } from '../../hooks/useEntityFilters'
import styles from './EntityFilters.module.css'
import { FaFilter, FaTimes } from 'react-icons/fa'

interface EntityFiltersProps {
    entityName: string
    filters: FilterValues
    onFiltersChange: (key: string, value: string | string[] | undefined) => void
    onClear: () => void
    extraFilters?: Record<string, { label: string; strValues?: string[] }>
    extraFilterValues?: FilterValues
    onExtraFilterChange?: (key: string, value: string | string[] | undefined) => void
}

export function EntityFilters({
                                  entityName,
                                  filters,
                                  onFiltersChange,
                                  onClear,
                              }: EntityFiltersProps) {
    const [open, setOpen] = useState(false)
    const [draftFilters, setDraftFilters] = useState<FilterValues>(filters)
    const fields = getFilterableFields(entityName)
    const rootRef = useRef<HTMLDivElement>(null)

    // Panel floats as a dropdown, so a click outside (not just the toggle) closes it —
    // same pattern as CustomSelect/JsonFieldsMenu elsewhere in this app.
    useEffect(() => {
        if (!open) return
        const handleClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    useEffect(() => { setDraftFilters(filters) }, [filters])

    const updateDraftFilter = (key: string, value: string | string[] | undefined) => {
        setDraftFilters(prev => ({ ...prev, [key]: value }))
    }

    const commitFilters = () => {
        Object.entries(draftFilters).forEach(([key, value]) => {
            if (JSON.stringify(filters[key]) !== JSON.stringify(value)) {
                onFiltersChange(key, value)
            }
        })
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            const textFields = fields.filter(f => !f.strValues?.length && !f.intValues?.length && !f.dynamicStrValues && (f.dataType === 'TEXT' || !f.dataType || f.dataType === ''))
            const numberFields = fields.filter(f => f.dataType === 'NUMBER' && !f.strValues?.length && !f.intValues?.length)
            const debouncedKeys = new Set([...textFields.map(f => f.field), ...numberFields.map(f => f.field)])
            Object.entries(draftFilters).forEach(([key, value]) => {
                if (debouncedKeys.has(key) && JSON.stringify(filters[key]) !== JSON.stringify(value)) {
                    onFiltersChange(key, value)
                }
            })
        }, 3000)
        return () => clearTimeout(timer)
    }, [draftFilters])

    const inputEvents = {
        onBlur: commitFilters,
        onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') commitFilters()
        }
    }

    const hasActiveFilters = Object.keys(filters).length > 0
    if (fields.length === 0) return null

    const textFields = fields.filter(
        f => !f.strValues?.length && !f.intValues?.length && !f.dynamicStrValues && (f.dataType === 'TEXT' || !f.dataType || f.dataType === '')
    )
    const selectFields = fields.filter(
        f => (f.strValues && f.strValues.length > 0) || (f.intValues && f.intValues.length > 0) || f.dynamicStrValues || (f.dynamicStrValuesList && f.dynamicStrValuesList.length > 0)
    )
    const dateFields = fields.filter(f => f.dataType === 'DATE' || f.dataType === 'DATETIME')
    const numberFields = fields.filter(f => f.dataType === 'NUMBER' && !f.strValues?.length && !f.intValues?.length)

    return (
        <div className={styles.root} ref={rootRef}>
            <button className={`${styles.toggleBtn} ${hasActiveFilters ? styles.active : ''}`} onClick={() => setOpen(o => !o)} title="Toggle Filters">
                <FaFilter />
                {hasActiveFilters && <span className={styles.badge} />}
            </button>
            {hasActiveFilters && (
                <button className={styles.clearBtn} onClick={onClear} title="Clear all filters">
                    <FaTimes /> Clear
                </button>
            )}

            {open && (
                <div className={styles.panel}>
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Search all fields</label>
                        <input
                            className={styles.textInput}
                            type="text"
                            placeholder="Type to search..."
                            value={(draftFilters['filter'] as string) ?? ''}
                            onChange={(e) => updateDraftFilter('filter', e.target.value || undefined)}
                            {...inputEvents}
                        />
                    </div>

                    {selectFields.map((f) => {
                        let options: string[]
                        if (f.strValues?.length) options = f.strValues
                        else if (f.intValues?.length) options = (f.intValues ?? []).map(String)
                        else if (f.dynamicStrValuesList?.length) options = f.dynamicStrValuesList
                        else options = []
                        const selected = (draftFilters[f.field] as string[]) ?? []
                        return (
                            <div key={f.field} className={styles.filterGroup}>
                                <label className={styles.label}>{f.displayName}</label>
                                <div className={styles.checkboxRow}>
                                    {options.map((opt) => {
                                        const checked = selected.includes(opt)
                                        return (
                                            <label key={opt} className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        const next = checked ? selected.filter((v) => v !== opt) : [...selected, opt]
                                                        updateDraftFilter(f.field, next.length ? next : undefined)
                                                        // checkbox commits immediately
                                                        const nextFilters = { ...filters, [f.field]: next.length ? next : undefined }
                                                        Object.entries(nextFilters).forEach(([k, v]) => {
                                                            if (JSON.stringify(filters[k]) !== JSON.stringify(v)) onFiltersChange(k, v)
                                                        })
                                                    }}
                                                />
                                                {opt}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}

                    {textFields.map((f) => (
                        <div key={f.field} className={styles.filterGroup}>
                            <label className={styles.label}>{f.displayName}</label>
                            <input
                                className={styles.textInput}
                                type="text"
                                value={(draftFilters[f.field] as string) ?? ''}
                                onChange={(e) => updateDraftFilter(f.field, e.target.value || undefined)}
                                {...inputEvents}
                            />
                        </div>
                    ))}

                    {dateFields.map((f) => (
                        <div key={f.field} className={styles.filterGroup}>
                            <label className={styles.label}>{f.displayName}</label>
                            <div className={styles.rangeRow}>
                                <input
                                    className={styles.dateInput}
                                    type={f.dataType === 'DATETIME' ? 'datetime-local' : 'date'}
                                    value={(draftFilters[`${f.field}_from`] as string) ?? ''}
                                    onChange={(e) => {
                                        updateDraftFilter(`${f.field}_from`, e.target.value || undefined)
                                        // dates commit immediately
                                        const val = e.target.value || undefined
                                        if (JSON.stringify(filters[`${f.field}_from`]) !== JSON.stringify(val)) onFiltersChange(`${f.field}_from`, val)
                                    }}
                                    {...inputEvents}
                                />
                                <span className={styles.rangeSep}>–</span>
                                <input
                                    className={styles.dateInput}
                                    type={f.dataType === 'DATETIME' ? 'datetime-local' : 'date'}
                                    value={(draftFilters[`${f.field}_to`] as string) ?? ''}
                                    onChange={(e) => {
                                        updateDraftFilter(`${f.field}_to`, e.target.value || undefined)
                                        const val = e.target.value || undefined
                                        if (JSON.stringify(filters[`${f.field}_to`]) !== JSON.stringify(val)) onFiltersChange(`${f.field}_to`, val)
                                    }}
                                    {...inputEvents}
                                />
                            </div>
                        </div>
                    ))}

                    {numberFields.map((f) => (
                        <div key={f.field} className={styles.filterGroup}>
                            <label className={styles.label}>{f.displayName}</label>
                            <div className={styles.rangeRow}>
                                <input
                                    className={styles.numberInput}
                                    type="number"
                                    placeholder="Min"
                                    value={(draftFilters[`${f.field}_from`] as string) ?? ''}
                                    onChange={(e) => {
                                        updateDraftFilter(`${f.field}_from`, e.target.value || undefined)
                                        const val = e.target.value || undefined
                                        if (JSON.stringify(filters[`${f.field}_from`]) !== JSON.stringify(val)) onFiltersChange(`${f.field}_from`, val)
                                    }}
                                    {...inputEvents}
                                />
                                <span className={styles.rangeSep}>–</span>
                                <input
                                    className={styles.numberInput}
                                    type="number"
                                    placeholder="Max"
                                    value={(draftFilters[`${f.field}_to`] as string) ?? ''}
                                    onChange={(e) => {
                                        updateDraftFilter(`${f.field}_to`, e.target.value || undefined)
                                        const val = e.target.value || undefined
                                        if (JSON.stringify(filters[`${f.field}_to`]) !== JSON.stringify(val)) onFiltersChange(`${f.field}_to`, val)
                                    }}
                                    {...inputEvents}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
