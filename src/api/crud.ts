import client from './client'

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
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
