import client from './client'
import type { Page, SearchParams } from './crud'

export interface Pocket {
  id: string
  name: string
  creationDate: string | null
  modificationDate: string | null
  deleted: boolean
  pocketSize: number
}

export interface PocketItem {
  id: string
  summary: string
  content: string
  orderInPocket: number | null
  encrypted: boolean
  deleted: boolean
  creationDate: string | null
  modificationDate: string | null
  pocketName?: string
}

export const pocketsApi = {
  getAll: (params?: SearchParams) =>
    client.get<Page<Pocket>>('/pocket-app/pockets', { params }),

  getById: (id: string) =>
    client.get<Pocket>(`/pocket-app/pockets/${id}`),

  create: (data: Partial<Pocket>) =>
    client.post<Pocket>('/pocket-app/pockets', data),

  update: (id: string, data: Partial<Pocket>) =>
    client.put<Pocket>(`/pocket-app/pockets/${id}`, data),

  delete: (id: string) =>
    client.delete(`/pocket-app/pockets/${id}`),
}

export const pocketItemsApi = {
  getByPocket: (pocketName: string, params?: SearchParams) =>
    client.get<Page<PocketItem>>('/pocket-app/all-pocket-items', {
      params: { 'pocket-name': pocketName, ...params },
    }),

  getById: (id: string) =>
    client.get<PocketItem>(`/pocket-app/all-pocket-items/${id}`),

  create: (data: Partial<PocketItem> & { pocketName: string }) =>
    client.post<PocketItem>('/pocket-app/all-pocket-items', data),

  update: (id: string, data: Partial<PocketItem>) =>
    client.put<PocketItem>(`/pocket-app/all-pocket-items/${id}`, data),

  delete: (id: string) =>
    client.delete(`/pocket-app/all-pocket-items/${id}`),

  decrypt: (id: string, password: string) =>
    client.post<{ content: string }>(`/pocket-app/all-pocket-items/${id}/decrypt`, { password }),
}
