import { ReactNode, useState } from 'react'
import { Button } from '../ui/Button'
import { CustomSelect } from '../fields/CustomSelect'
import styles from './DataTable.module.css'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  width?: string
}

export interface TableAction<T> {
  label: string
  icon?: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  onClick: (selectedRows: T[]) => void
  requiresSelection?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  actions?: TableAction<T>[]
  onRowClick?: (row: T) => void
  loading?: boolean
  // pagination
  page?: number
  pageSize?: number
  totalElements?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  // sort
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  // search
  searchValue?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  // add button
  onAdd?: () => void
  addLabel?: string
}

const PAGE_SIZES = [10, 25, 50, 100]

export function DataTable<T>({
  columns,
  rows: rowsProp,
  rowKey,
  actions = [],
  onRowClick,
  loading = false,
  page = 0,
  pageSize = 25,
  totalElements,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortDir,
  onSort,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  onAdd,
  addLabel = 'Add',
}: DataTableProps<T>) {
  const rows = Array.isArray(rowsProp) ? rowsProp : []
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map(rowKey)))
    }
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)))
  const totalPages = totalElements != null ? Math.ceil(totalElements / pageSize) : undefined

  return (
    <div className={styles.wrapper}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {onSearchChange && (
            <input
              className={styles.search}
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </div>
        <div className={styles.toolbarRight}>
          {actions
            .filter((a) => !a.requiresSelection || selected.size > 0)
            .map((a) => (
              <Button
                key={a.label}
                variant={a.variant ?? 'secondary'}
                size="sm"
                icon={a.icon}
                onClick={() => a.onClick(selectedRows)}
              >
                {a.label}
              </Button>
            ))}
          {onAdd && (
            <Button variant="primary" size="sm" onClick={onAdd}>
              + {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={col.sortable ? styles.sortable : ''}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  {col.header}
                  {sortBy === col.key && (
                    <span className={styles.sortIcon}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.empty}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.empty}>No data</td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = rowKey(row)
                return (
                  <tr
                    key={id}
                    className={`${styles.row} ${selected.has(id) ? styles.selectedRow : ''} ${onRowClick ? styles.clickable : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    <td className={styles.checkCell} onClick={(e) => { e.stopPropagation(); toggleRow(id) }}>
                      <input type="checkbox" checked={selected.has(id)} onChange={() => toggleRow(id)} />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {(onPageChange || onPageSizeChange) && (
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {selected.size > 0 && (
              <span className={styles.selectionInfo}>{selected.size} selected</span>
            )}
            {totalElements != null && (
              <span className={styles.totalInfo}>{totalElements} total</span>
            )}
          </div>
          <div className={styles.footerRight}>
            {onPageSizeChange && (
              <CustomSelect
                size="sm"
                placement="top"
                className={styles.pageSizeSelect}
                options={PAGE_SIZES.map((s) => ({ value: String(s), label: `${s} / page` }))}
                value={String(pageSize)}
                onChange={(v) => onPageSizeChange(Number(v))}
              />
            )}
            {onPageChange && totalPages != null && (
              <>
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => onPageChange(page - 1)}>‹</Button>
                <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
                <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>›</Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating toolbar for selected items */}
      {selected.size > 0 && actions.some((a) => a.requiresSelection) && (
        <div className={styles.floatingToolbar}>
          <span className={styles.floatingCount}>{selected.size}</span>
          {actions
            .filter((a) => a.requiresSelection)
            .map((a) => (
              <Button
                key={a.label}
                variant={a.variant ?? 'secondary'}
                size="sm"
                icon={a.icon}
                onClick={() => { a.onClick(selectedRows); setSelected(new Set()) }}
              >
                {a.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  )
}
