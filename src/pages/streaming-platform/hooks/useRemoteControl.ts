import { useCallback, useEffect, useRef, useState } from 'react'
import client from '../../../api/client'

export interface RemoteCommand {
  action: string
  relative?: number
  url?: string
  index?: number
  trackType?: string
}

async function fetchWsKey(roomId: string): Promise<string | null> {
  // Attempt to get a one-time WS key from the backend. The backend endpoint
  // is expected to verify the current session (via Authorization header or cookie)
  // and return a short-lived key that can be used during the websocket handshake.
  try {
    const res = await client.post<{ key: string }>('/streaming/remote-control/key', { roomId })
    return res.data?.key ?? null
  } catch (_e) {
    // Request failed (no backend support / auth missing) — fall back to token usage
    void _e
    return null
  }
}

function wsUrl(roomId: string, deviceType: 'TV' | 'REMOTE', keyOrToken?: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const authPart = keyOrToken ? `&key=${encodeURIComponent(keyOrToken)}` : ''
  return `${protocol}//${window.location.host}/ws/remote-control?roomId=${roomId}&deviceType=${deviceType}${authPart}`
}

export function useRemoteControlReceiver(onCommand: (cmd: RemoteCommand) => void) {
  const [roomId] = useState(() => {
    // Reuse the same room across streaming pages in the same tab
    const stored = sessionStorage.getItem('streaming.roomId')
    if (stored) return stored
    const id = String(Math.floor(10_000 + Math.random() * 90_000))
    sessionStorage.setItem('streaming.roomId', id)
    return id
  })
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const onCommandRef = useRef(onCommand)
  onCommandRef.current = onCommand
  const keyRef = useRef<string | null>(null)
  const retriesRef = useRef(0)

  useEffect(() => {
    let mounted = true
    const connect = async () => {
      if (!mounted) return
      if (!keyRef.current) {
        keyRef.current = await fetchWsKey(roomId)
      }
      if (!mounted) return
      const token = keyRef.current ?? localStorage.getItem('token') ?? undefined
      const ws = new WebSocket(wsUrl(roomId, 'TV', token))
      wsRef.current = ws
      ws.onmessage = (e) => {
        try {
          onCommandRef.current(JSON.parse(e.data) as RemoteCommand)
        } catch (_err) {
          void _err
        }
      }
      ws.onopen = () => { retriesRef.current = 0 }
      ws.onerror = () => { ws.close() }
      ws.onclose = () => {
        if (!mounted) return
        retriesRef.current++
        const delay = Math.min(30_000, 3_000 * Math.pow(2, retriesRef.current - 1))
        timerRef.current = setTimeout(connect, delay)
      }
    }
    void connect()
    return () => {
      mounted = false
      clearTimeout(timerRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  }, [roomId])

  return roomId
}

export function useRemoteControlSender(roomId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const keyRef = useRef<string | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const forceReconnectRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!roomId) return
    let mounted = true

    const connect = async () => {
      if (!keyRef.current) {
        keyRef.current = await fetchWsKey(roomId)
      }
      if (!mounted) return
      const token = keyRef.current ?? localStorage.getItem('token') ?? undefined
      const ws = new WebSocket(wsUrl(roomId, 'REMOTE', token))
      wsRef.current = ws
      ws.onopen = () => { setConnected(true); retriesRef.current = 0 }
      ws.onerror = () => { ws.close() }
      ws.onclose = () => {
        if (!mounted) return
        setConnected(false)
        wsRef.current = null
        retriesRef.current++
        const delay = Math.min(30_000, 3_000 * Math.pow(2, retriesRef.current - 1))
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
    }

    // Mobile browsers suspend the socket (and its timers) while the screen is
    // locked or the tab is backgrounded. On resume, reconnect immediately
    // instead of waiting out the backoff delay from before it was suspended.
    forceReconnectRef.current = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return
      clearTimeout(reconnectTimerRef.current)
      retriesRef.current = 0
      void connect()
    }

    const handleWake = () => {
      if (document.visibilityState === 'visible') forceReconnectRef.current()
    }

    void connect()
    document.addEventListener('visibilitychange', handleWake)
    window.addEventListener('focus', handleWake)
    window.addEventListener('online', handleWake)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleWake)
      window.removeEventListener('focus', handleWake)
      window.removeEventListener('online', handleWake)
      clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); setConnected(false) }
    }
  }, [roomId])

  const send = useCallback((action: string, data?: Partial<RemoteCommand>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...data }))
    }
  }, [])

  return { connected, send }
}
