import type { Column } from './DataTable'
import { getTableColumns } from '../../api/entityConfig'

function truncateHtml(html: string, n = 80) {
  const text = html.replace(/<[^>]+>/g, '')
  return text.length > n ? text.slice(0, n) + '…' : text
}

export function buildColumnsFromConfig<T>(
  entityName: string,
  overrides: Partial<Record<string, Partial<Column<T>>>> = {}
): Column<T>[] {
  return getTableColumns(entityName).map((f) => {
    const base: Column<T> = {
      key: f.field,
      header: f.displayName,
      sortable: f.sortable,
      render: f.wysiwyg
        ? (row: T) => <span>{truncateHtml(String((row as Record<string, unknown>)[f.field] ?? ''))}</span>
        : undefined,
    }
    return overrides[f.field] ? { ...base, ...overrides[f.field] } : base
  })
}
