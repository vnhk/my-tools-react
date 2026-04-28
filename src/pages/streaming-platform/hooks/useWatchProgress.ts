import { useCallback, useEffect, useRef } from 'react'
import { saveWatchProgress } from '../api'

export function useWatchProgress(videoId: string | null) {
  const currentTimeRef = useRef(0)

  const reportTime = useCallback((time: number) => {
    currentTimeRef.current = time
  }, [])

  useEffect(() => {
    if (!videoId) return
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) {
        saveWatchProgress(videoId, currentTimeRef.current).catch(() => {})
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [videoId])

  return reportTime
}
