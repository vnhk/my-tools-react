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
  list: () => client.get<CanvasItem[]>('/canvas'),
  getCategories: () => client.get<string[]>('/canvas/categories'),
  get: (id: string) => client.get<CanvasDetail>(`/canvas/${id}`),
  create: (name: string, category?: string) =>
    client.post<CanvasItem>('/canvas', { name, category }),
  update: (id: string, req: { name?: string; category?: string; content?: string }) =>
    client.put<CanvasDetail>(`/canvas/${id}`, req),
  delete: (id: string) => client.delete(`/canvas/${id}`),
}
