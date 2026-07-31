import { useCallback, useEffect, useRef, useState } from 'react'

// Shared polling mechanism: re-runs `fetcher` on an interval so a page reflects
// whatever the backend has without the user reloading. No backend push channel
// (SSE/WebSocket) exists for this data yet, so this deliberately polls — swap
// the internals here later if a push channel is added, callers won't need to change.
export interface UseAutoRefreshOptions {
  intervalMs?: number
  enabled?: boolean
  pauseWhenHidden?: boolean
}

export interface UseAutoRefreshResult<T> {
  data: T | null
  loading: boolean
  error: unknown
  lastUpdated: Date | null
  refresh: () => void
}

export function useAutoRefresh<T>(
  fetcher: () => Promise<T>,
  { intervalMs = 5000, enabled = true, pauseWhenHidden = true }: UseAutoRefreshOptions = {}
): UseAutoRefreshResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const tick = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetcherRef.current()
      setData(result)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const isPageVisible = () => !pauseWhenHidden || document.visibilityState === 'visible'
    const run = () => { if (!cancelled && isPageVisible()) void tick() }

    run()
    const timer = setInterval(run, intervalMs)

    // Tabs suspend timers in the background; catch up immediately on return
    // instead of waiting out whatever's left of the interval.
    const onVisibilityChange = () => { if (isPageVisible()) run() }
    if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      clearInterval(timer)
      if (pauseWhenHidden) document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, intervalMs, pauseWhenHidden, tick])

  return { data, loading, error, lastUpdated, refresh: tick }
}
