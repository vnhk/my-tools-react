import type { ColumnConfig, FilterType } from '../components/table/tableConfig'

// React/TS equivalent of TableClassUtils
// Instead of Java reflection, filter fields are defined explicitly from ColumnConfig

export interface FilterFieldDef {
  key: string
  label: string
  type: FilterType
  options?: string[]
}

export interface RangeFilterValue {
  from?: string | number
  to?: string | number
}

export type FilterValues = Record<string, string | RangeFilterValue | boolean | string[]>

export function buildFilterFields(columns: ColumnConfig[]): FilterFieldDef[] {
  return columns
    .filter((col) => col.filterable)
    .map((col) => ({
      key: col.key,
      label: col.header,
      type: col.filterType ?? 'TEXT',
    }))
}

export function isRangeFilter(type: FilterType): boolean {
  return type === 'NUMBER' || type === 'DATE' || type === 'DATETIME' || type === 'TIME'
}

export function getVisibleColumns(columns: ColumnConfig[]): ColumnConfig[] {
  return [...columns]
    .filter((col) => col.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function applyColumnVisibility(
  columns: ColumnConfig[],
  visibility: Record<string, boolean>
): ColumnConfig[] {
  return columns.map((col) => ({
    ...col,
    visible: visibility[col.key] ?? col.visible ?? true,
  }))
}

export function getSelectedObjects(
  filterMap: Record<string, Record<string, boolean>>,
  key: string
): string[] {
  const options = filterMap[key]
  if (!options) return []
  return Object.entries(options)
    .filter(([, selected]) => selected)
    .map(([value]) => value)
}
