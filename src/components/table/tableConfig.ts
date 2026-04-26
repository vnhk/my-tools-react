export type PinPosition = 'LEFT' | 'RIGHT' | 'NONE'

export type FilterType = 'TEXT' | 'NUMBER' | 'DATE' | 'DATETIME' | 'TIME' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT'

export interface ColumnConfig {
  key: string
  header: string
  visible?: boolean
  sortable?: boolean
  filterable?: boolean
  resizable?: boolean
  width?: number
  minWidth?: string
  maxWidth?: string
  pinPosition?: PinPosition
  order?: number
  frozen?: boolean
  filterType?: FilterType
}

export interface TableConfig {
  floatingToolbar?: boolean
  columnToggle?: boolean
  keyboardNavigation?: boolean
  pageSizeSelector?: boolean
  pageSizeOptions?: number[]
  defaultPageSize?: number
  stateKey?: string
}

export const defaultTableConfig: TableConfig = {
  floatingToolbar: true,
  columnToggle: true,
  keyboardNavigation: true,
  pageSizeSelector: true,
  pageSizeOptions: [10, 25, 50, 100],
  defaultPageSize: 25,
}

// DefaultFilterValuesContainer equivalent: map of field key → option key → selected
export type FilterDefaultValues = Record<string, Record<string, boolean>>
