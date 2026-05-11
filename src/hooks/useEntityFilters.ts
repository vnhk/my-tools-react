import { useState } from 'react'

export type FilterValue = string | string[] | undefined
export type FilterValues = Record<string, FilterValue>

export function useEntityFilters() {
  const [filters, setFilters] = useState<FilterValues>({})

  const setFilter = (key: string, value: FilterValue) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  const clearFilters = () => setFilters({})

  const hasFilters = Object.keys(filters).length > 0

  return { filters, setFilter, clearFilters, hasFilters }
}
