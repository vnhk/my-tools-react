import { useState, useCallback } from 'react'

interface TableState {
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  search: string
}

export function useTableState(defaults?: Partial<TableState>) {
  const [state, setState] = useState<TableState>({
    page: 0,
    pageSize: 25,
    sortBy: '',
    sortDir: 'asc',
    search: '',
    ...defaults,
  })

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

  return { ...state, setPage, setPageSize, setSearch, toggleSort }
}
