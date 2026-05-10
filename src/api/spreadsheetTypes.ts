export type CellType = 'TEXT' | 'NUMBER' | 'FORMULA' | 'DATE' | 'BOOLEAN' | 'ERROR' | 'EMPTY'

export interface SpreadsheetCell {
  cellId: string
  rowNumber: number
  columnNumber: number
  value: any
  formula: string | null
  cellType: CellType
}

export interface SpreadsheetRow {
  rowNumber: number
  rowId: string
  cells: SpreadsheetCell[]
}

export function getColumnHeader(n: number): string {
  let result = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

export function detectCellType(value: string): CellType {
  if (value === null || value === undefined || value === '') return 'EMPTY'
  if (String(value).startsWith('=')) return 'FORMULA'
  if (!isNaN(Number(value)) && value !== '') return 'NUMBER'
  return 'TEXT'
}

export function serializeRows(rows: SpreadsheetRow[]): string {
  return JSON.stringify(rows)
}
