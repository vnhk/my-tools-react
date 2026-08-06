import client from './client'
import { type Page } from './crud'

export interface CanvasItem {
  id: string
  name: string
  category: string | null
  creationDate: string
  modificationDate: string
}

export interface CanvasDetail extends CanvasItem {
  content: string
}

export const canvasApi = {
  list: () => client.get<Page<CanvasItem>>('/canvas', { params: { size: 1000 } }),
  getCategories: () => client.get<string[]>('/canvas/categories'),
  get: (id: string) => client.get<CanvasDetail>(`/canvas/${id}`),
  create: (name: string, category?: string) =>
    client.post<CanvasItem>('/canvas', { name, category }),
  update: (id: string, req: { name?: string; category?: string; content?: string }) =>
    client.put<CanvasDetail>(`/canvas/${id}`, req),
  delete: (id: string) => client.delete(`/canvas/${id}`),
}
