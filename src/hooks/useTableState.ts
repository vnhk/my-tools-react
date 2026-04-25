import { useState, useCallback, useEffect } from 'react'

interface TableState {
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  search: string
  columnVisibility: Record<string, boolean>
}

function loadPersistedState(storageKey: string): Partial<TableState> | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function savePersistedState(storageKey: string, state: Partial<TableState>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function useTableState(defaults?: Partial<TableState>, storageKey?: string) {
  const persisted = storageKey ? loadPersistedState(storageKey) : null

  const [state, setState] = useState<TableState>({
    page: 0,
    pageSize: 25,
    sortBy: '',
    sortDir: 'asc',
    search: '',
    columnVisibility: {},
    ...defaults,
    ...(persisted ? { pageSize: persisted.pageSize, columnVisibility: persisted.columnVisibility ?? {} } : {}),
  })

  useEffect(() => {
    if (!storageKey) return
    savePersistedState(storageKey, {
      pageSize: state.pageSize,
      columnVisibility: state.columnVisibility,
    })
  }, [storageKey, state.pageSize, state.columnVisibility])

  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), [])
  const setPageSize = useCallback((pageSize: number) => setState((s) => ({ ...s, page: 0, pageSize })), [])
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, page: 0, search })), [])
  const toggleSort = useCallback(
    (key: string) =>
      setState((s) => ({
        ...s,
        sortBy: key,
        sortDir: s.sortBy === key && s.sortDir === 'asc' ? 'desc' : 'asc',
      })),
    []
  )
  const setColumnVisible = useCallback(
    (key: string, visible: boolean) =>
      setState((s) => ({
        ...s,
        columnVisibility: { ...s.columnVisibility, [key]: visible },
      })),
    []
  )
  const isColumnVisible = useCallback(
    (key: string) => state.columnVisibility[key] ?? true,
    [state.columnVisibility]
  )

  return { ...state, setPage, setPageSize, setSearch, toggleSort, setColumnVisible, isColumnVisible }
}
