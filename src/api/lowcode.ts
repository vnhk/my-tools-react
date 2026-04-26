import client from './client'
import type { Page, SearchParams } from './crud'

export interface LowCodeClassDetails {
  id: string
  field: string
  displayName: string
  type: string
  defaultValue: string | null
  inSaveForm: boolean
  inEditForm: boolean
  inTable: boolean
  required: boolean
  min: number | null
  max: number | null
}

export interface LowCodeClass {
  id: string
  moduleName: string
  packageName: string
  routeName: string
  status: string
  historyEnabled: boolean
  className: string
  lowCodeClassDetails: LowCodeClassDetails[]
}

export const lowcodeApi = {
  getAll: (params?: SearchParams) =>
    client.get<Page<LowCodeClass>>('/lowcode-generator', { params }),

  getById: (id: string) =>
    client.get<LowCodeClass>(`/lowcode-generator/${id}`),

  create: (data: Partial<LowCodeClass>) =>
    client.post<LowCodeClass>('/lowcode-generator', data),

  update: (id: string, data: Partial<LowCodeClass>) =>
    client.put<LowCodeClass>(`/lowcode-generator/${id}`, data),

  delete: (id: string) =>
    client.delete(`/lowcode-generator/${id}`),

  runGenerator: (id: string) =>
    client.post<void>(`/lowcode-generator/${id}/generate`),
}
