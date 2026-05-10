import client from './client'

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
  list: () => client.get<CanvasItem[]>('/api/canvas'),
  getCategories: () => client.get<string[]>('/api/canvas/categories'),
  get: (id: string) => client.get<CanvasDetail>(`/api/canvas/${id}`),
  create: (name: string, category?: string) =>
    client.post<CanvasItem>('/api/canvas', { name, category }),
  update: (id: string, req: { name?: string; category?: string; content?: string }) =>
    client.put<CanvasDetail>(`/api/canvas/${id}`, req),
  delete: (id: string) => client.delete(`/api/canvas/${id}`),
}
