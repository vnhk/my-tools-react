import {useState} from 'react'
import {getFilterableFields} from '../../api/entityConfig'
import type {FilterValues} from '../../hooks/useEntityFilters'
import styles from './EntityFilters.module.css'
import {FaFilter, FaTimes} from 'react-icons/fa'

interface EntityFiltersProps {
    entityName: string
    filters: FilterValues
    onFiltersChange: (key: string, value: string | string[] | undefined) => void
    onClear: () => void
    // Extra filter params not covered by entity config (e.g. custom endpoints)
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
    const fields = getFilterableFields(entityName)

    const hasActiveFilters = Object.keys(filters).length > 0

    if (fields.length === 0) return null

    const textFields = fields.filter(
        (f) =>
            !f.strValues?.length && !f.intValues?.length && !f.dynamicStrValues &&
            (f.dataType === 'TEXT' || !f.dataType || f.dataType === '')
    )
    const selectFields = fields.filter(
        (f) => (f.strValues && f.strValues.length > 0)
            || (f.intValues && f.intValues.length > 0) || f.dynamicStrValues ||
            (f.dynamicStrValuesList && f.dynamicStrValuesList.length > 0)
    )
    const dateFields = fields.filter(
        (f) => f.dataType === 'DATE' || f.dataType === 'DATETIME'
    )
    const numberFields = fields.filter(
        (f) =>
            f.dataType === 'NUMBER' &&
            !f.strValues?.length && !f.intValues?.length
    )

    return (
        <div className={styles.root}>
            <div className={styles.toolbar}>
                <button
                    className={`${styles.toggleBtn} ${hasActiveFilters ? styles.active : ''}`}
                    onClick={() => setOpen((o) => !o)}
                    title="Toggle Filters"
                >
                    <FaFilter/>
                    {hasActiveFilters && <span className={styles.badge}/>}
                </button>
                {hasActiveFilters && (
                    <button className={styles.clearBtn} onClick={onClear} title="Clear all filters">
                        <FaTimes/> Clear
                    </button>
                )}
            </div>

            {open && (
                <div className={styles.panel}>
                    {/* Global text search */}
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Search all fields</label>
                        <input
                            className={styles.textInput}
                            type="text"
                            placeholder="Type to search..."
                            value={(filters['filter'] as string) ?? ''}
                            onChange={(e) => onFiltersChange('filter', e.target.value || undefined)}
                        />
                    </div>

                    {/* Select (checkbox) filters */}
                    {selectFields.map((f) => {
                        let options: string[];
                        if (f.strValues?.length) {
                            options = f.strValues;
                        } else if (f.intValues?.length) {
                            options = (f.intValues ?? []).map(String);
                        } else if (f.dynamicStrValuesList?.length) {
                            options = f.dynamicStrValuesList;
                        } else {
                            options = [];
                        }
                        const selected = (filters[f.field] as string[]) ?? []
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
                                                        const next = checked
                                                            ? selected.filter((v) => v !== opt)
                                                            : [...selected, opt]
                                                        onFiltersChange(f.field, next.length ? next : undefined)
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

                    {/* Individual text filters */}
                    {textFields.map((f) => (
                        <div key={f.field} className={styles.filterGroup}>
                            <label className={styles.label}>{f.displayName}</label>
                            <input
                                className={styles.textInput}
                                type="text"
                                placeholder={`Filter by ${f.displayName}...`}
                                value={(filters[f.field] as string) ?? ''}
                                onChange={(e) => onFiltersChange(f.field, e.target.value || undefined)}
                            />
                        </div>
                    ))}

                    {/* Date range filters */}
                    {dateFields.map((f) => (
                        <div key={f.field} className={styles.filterGroup}>
                            <label className={styles.label}>{f.displayName}</label>
                            <div className={styles.rangeRow}>
                                <input
                                    className={styles.dateInput}
                                    type={f.dataType === 'DATETIME' ? 'datetime-local' : 'date'}
                                    value={(filters[`${f.field}_from`] as string) ?? ''}
                                    onChange={(e) => {
                                        onFiltersChange(`${f.field}_from`, e.target.value || undefined)
                                        console.log(e.target.value)
                                    }
                                    }
                                />
                                <span className={styles.rangeSep}>–</span>
                                <input
                                    className={styles.dateInput}
                                    type={f.dataType === 'DATETIME' ? 'datetime-local' : 'date'}
                                    value={(filters[`${f.field}_to`] as string) ?? ''}
                                    onChange={(e) => onFiltersChange(`${f.field}_to`, e.target.value || undefined)}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Number range filters */}
                    {numberFields.map((f) => (
                        <div key={f.field} className={styles.filterGroup}>
                            <label className={styles.label}>{f.displayName}</label>
                            <div className={styles.rangeRow}>
                                <input
                                    className={styles.numberInput}
                                    type="number"
                                    placeholder="Min"
                                    value={(filters[`${f.field}_from`] as string) ?? ''}
                                    onChange={(e) => onFiltersChange(`${f.field}_from`, e.target.value || undefined)}
                                />
                                <span className={styles.rangeSep}>–</span>
                                <input
                                    className={styles.numberInput}
                                    type="number"
                                    placeholder="Max"
                                    value={(filters[`${f.field}_to`] as string) ?? ''}
                                    onChange={(e) => onFiltersChange(`${f.field}_to`, e.target.value || undefined)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
