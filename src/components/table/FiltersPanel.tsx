import { useState } from 'react'
import styles from './FiltersPanel.module.css'

export interface CheckboxFilterGroup {
  key: string
  label: string
  options: string[]
}

export interface DateRangeFilter {
  key: string
  label: string
}

export interface FiltersState {
  search: string
  query: string
  checkboxes: Record<string, Record<string, boolean>>
  dateFrom: Record<string, string>
  dateTo: Record<string, string>
}

interface FiltersPanelProps {
  checkboxGroups?: CheckboxFilterGroup[]
  dateRanges?: DateRangeFilter[]
  onApply: (state: FiltersState) => void
  onReset: () => void
}

function buildInitialCheckboxes(groups: CheckboxFilterGroup[]): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {}
  for (const g of groups) {
    result[g.key] = {}
    for (const o of g.options) {
      result[g.key][o] = true
    }
  }
  return result
}

export function FiltersPanel({
  checkboxGroups = [],
  dateRanges = [],
  onApply,
  onReset,
}: FiltersPanelProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [checkboxes, setCheckboxes] = useState(() => buildInitialCheckboxes(checkboxGroups))
  const [dateFrom, setDateFrom] = useState<Record<string, string>>({})
  const [dateTo, setDateTo] = useState<Record<string, string>>({})

  const toggleCheckbox = (groupKey: string, option: string) => {
    setCheckboxes((prev) => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [option]: !prev[groupKey]?.[option],
      },
    }))
  }

  const reverseCheckboxes = () => {
    setCheckboxes((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = Object.fromEntries(
          Object.entries(next[key]).map(([k, v]) => [k, !v])
        )
      }
      return next
    })
  }

  const handleReset = () => {
    setSearch('')
    setQuery('')
    setCheckboxes(buildInitialCheckboxes(checkboxGroups))
    setDateFrom({})
    setDateTo({})
    onReset()
  }

  const handleApply = () => {
    onApply({ search, query, checkboxes, dateFrom, dateTo })
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${open ? styles.active : ''}`}
          onClick={() => setOpen((v) => !v)}
          title="Toggle filters"
        >
          ⚙ Filters
        </button>
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.row}>
            <div className={styles.section}>
              <span className={styles.sectionTitle}>All fields search</span>
              <input
                className={styles.textInput}
                type="text"
                placeholder="Search all fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              />
            </div>

            <div className={styles.section}>
              <span className={styles.sectionTitle}>Custom query (overrides other filters)</span>
              <input
                className={styles.textInput}
                type="text"
                placeholder="e.g. name ~ 'test' & status = 'active'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              />
            </div>
          </div>

          {checkboxGroups.length > 0 && (
            <div className={styles.filtersGrid}>
              {checkboxGroups.map((group) => (
                <div key={group.key} className={styles.section}>
                  <span className={styles.sectionTitle}>{group.label}</span>
                  <div className={styles.checkboxList}>
                    {group.options.map((opt) => (
                      <label key={opt} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={checkboxes[group.key]?.[opt] ?? true}
                          onChange={() => toggleCheckbox(group.key, opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {dateRanges.map((dr) => (
                <div key={dr.key} className={styles.section}>
                  <span className={styles.sectionTitle}>{dr.label}</span>
                  <div className={styles.dateRange}>
                    <input
                      className={styles.dateInput}
                      type="datetime-local"
                      placeholder="From"
                      value={dateFrom[dr.key] ?? ''}
                      onChange={(e) => setDateFrom((p) => ({ ...p, [dr.key]: e.target.value }))}
                    />
                    <input
                      className={styles.dateInput}
                      type="datetime-local"
                      placeholder="To"
                      value={dateTo[dr.key] ?? ''}
                      onChange={(e) => setDateTo((p) => ({ ...p, [dr.key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.applyBtn} onClick={handleApply}>
              Apply
            </button>
            <button type="button" className={styles.reverseBtn} onClick={reverseCheckboxes} title="Reverse checkboxes">
              ⇄ Reverse
            </button>
            <button type="button" className={styles.resetBtn} onClick={handleReset}>
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
