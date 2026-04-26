import client from './client'

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

// Normalizes a raw API response that may be a Page object or a plain array
export function toPage<T>(data: Page<T> | T[]): Page<T> {
  if (Array.isArray(data)) {
    return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length }
  }
  return { ...data, content: data.content ?? [] }
}

export interface SearchParams {
  page?: number
  size?: number
  sort?: string
  direction?: 'asc' | 'desc'
  search?: string
}

export function createCrudApi<T>(basePath: string) {
  return {
    getAll: (params?: SearchParams) =>
      client.get<Page<T>>(basePath, { params }),

    getById: (id: string) =>
      client.get<T>(`${basePath}/${id}`),

    create: (data: Partial<T>) =>
      client.post<T>(basePath, data),

    update: (id: string, data: Partial<T>) =>
      client.put<T>(`${basePath}/${id}`, data),

    delete: (id: string) =>
      client.delete(`${basePath}/${id}`),

    deleteMany: (ids: string[]) =>
      client.post(`${basePath}/delete-many`, ids),
  }
}
