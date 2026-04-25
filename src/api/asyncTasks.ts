import client from './client'
import type { Page, SearchParams } from './crud'

export interface AsyncTask {
  id: string
  status: string
  message: string | null
  creationDate: string | null
  modificationDate: string | null
  startDate: string | null
  endDate: string | null
  notified: boolean
  notifyOnSuccess: boolean
  timeoutInMin: number
  deleted: boolean
}

export interface AsyncTaskHistory {
  id: string
  asyncTaskId: string
  modificationDate: string | null
  status: string
  message: string | null
}

export const asyncTasksApi = {
  getAll: (params?: SearchParams) =>
    client.get<Page<AsyncTask>>('/async/async-tasks', { params }),

  getById: (id: string) =>
    client.get<AsyncTask>(`/async/async-tasks/${id}`),

  getHistory: (taskId: string, params?: SearchParams) =>
    client.get<Page<AsyncTaskHistory>>(`/async/async-tasks/${taskId}/history`, { params }),
}
