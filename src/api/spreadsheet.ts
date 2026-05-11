import client from './client'
import type { SpreadsheetRow } from './spreadsheetTypes'

export type { SpreadsheetRow }

export interface SpreadsheetItem {
  id: string
  name: string
  description: string
  modificationDate: string
}

export interface SpreadsheetData {
  id: string
  name: string
  description: string
  rows: SpreadsheetRow[]
  columnWidths: Record<number, number>
}

export const spreadsheetApi = {
  list: () => client.get<SpreadsheetItem[]>('/spreadsheet'),
  create: (name: string, description?: string) =>
    client.post<SpreadsheetItem>('/spreadsheet', { name, description }),
  delete: (id: string) => client.delete(`/spreadsheet/${id}`),
  updateMeta: (id: string, name: string, description?: string) =>
    client.put<SpreadsheetItem>(`/spreadsheet/${id}`, { name, description }),
  getData: (id: string) => client.get<SpreadsheetData>(`/spreadsheet/${id}/data`),
  saveData: (id: string, body: string, columnWidthsBody: string) =>
    client.put<SpreadsheetData>(`/spreadsheet/${id}/data`, { body, columnWidthsBody }),
  evaluate: (id: string, body: string) =>
    client.post<SpreadsheetRow[]>(`/spreadsheet/${id}/evaluate`, { body }),
  rowOperation: (id: string, body: string, action: string, rowNumber: number) =>
    client.post<SpreadsheetRow[]>(`/spreadsheet/${id}/row`, { body, action, rowNumber }),
  columnOperation: (id: string, body: string, action: string, columnNumber: number) =>
    client.post<SpreadsheetRow[]>(`/spreadsheet/${id}/column`, { body, action, columnNumber }),
}
