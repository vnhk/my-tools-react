import { useCallback, useMemo, useState } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useCallback, useMemo, useState } from 'react'

export function useSelection(initialIds: Array<string | number> = []) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialIds.map(String)),
  )

  const isSelected = useCallback((id: string | number) => selected.has(String(id)), [selected])

  const toggle = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: Array<string | number>) => {
    setSelected(new Set(ids.map(String)))
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const size = selected.size
  const selectedIds = useMemo(() => Array.from(selected), [selected])

  return { selected, selectedIds, size, isSelected, toggle, selectAll, clear }
}
export function useSelection(initialIds: Array<string | number> = []) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialIds.map(String)),
  )

  const isSelected = useCallback((id: string | number) => selected.has(String(id)), [selected])

  const toggle = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: Array<string | number>) => {
    setSelected(new Set(ids.map(String)))
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const size = selected.size
  const selectedIds = useMemo(() => Array.from(selected), [selected])

  return { selected, selectedIds, size, isSelected, toggle, selectAll, clear }
}
export function useSelection(initialIds: Array<string | number> = []) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialIds.map(String)),
  )
import { useCallback, useMemo, useState } from 'react'

export function useSelection(initialIds: Array<string | number> = []) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialIds.map(String)),
  )

  const isSelected = useCallback((id: string | number) => selected.has(String(id)), [selected])

  const toggle = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: Array<string | number>) => {
    setSelected(new Set(ids.map(String)))
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const size = selected.size
  const selectedIds = useMemo(() => Array.from(selected), [selected])

  return { selected, selectedIds, size, isSelected, toggle, selectAll, clear }
}
  const isSelected = useCallback((id: string | number) => selected.has(String(id)), [selected])

  const toggle = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: Array<string | number>) => {
    setSelected(new Set(ids.map(String)))
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const size = selected.size
  const selectedIds = useMemo(() => Array.from(selected), [selected])

  return { selected, selectedIds, size, isSelected, toggle, selectAll, clear }
}
