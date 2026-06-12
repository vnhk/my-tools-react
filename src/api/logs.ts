import client from './client'
import type { Page } from './crud'

export interface LogEntry {
  id: number
  applicationName: string
  logLevel: string
  className: string
  methodName: string
  processName: string
  moduleName: string
  packageName: string
  route: string
  timestamp: string
  message: string
  fullLog: string
  lineNumber: number
}

export interface LogParams {
  appName: string
  fromTime?: string
  toTime?: string
  logLevel?: string
  processName?: string
  moduleName?: string
  page?: number
  size?: number
  sort?: string
  direction?: string
}

export interface TrackerParams {
  appName: string
  processName?: string
  moduleName?: string
  className?: string
  methodName?: string
  message?: string
  page?: number
  size?: number
  sort?: string
  direction?: string
}

export const logsApi = {
  getAll: (params?: Record<string, unknown>) =>
    client.get<Page<LogEntry>>('/logs', { params }),

  getTrackers: (params: TrackerParams) =>
    client.get<Page<LogEntry>>('/logs/trackers', { params }),

  getAppNames: () =>
    client.get<string[]>('/logs/app-names'),

  getProcessNames: () =>
    client.get<string[]>('/logs/process-names'),

  getModuleNames: () =>
    client.get<string[]>('/logs/module-names'),

  getExportUrl: (params: LogParams): string => {
    const p = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
    })
    return `/api/logs/export?${p.toString()}`
  },
}
