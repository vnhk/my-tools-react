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

function wsUrl(roomId: string, keyOrToken?: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const authPart = keyOrToken ? `&key=${encodeURIComponent(keyOrToken)}` : ''
  return `${protocol}//${window.location.host}/ws/remote-control?roomId=${roomId}${authPart}`
}

export function useRemoteControlReceiver(onCommand: (cmd: RemoteCommand) => void) {
  const [roomId] = useState(() => String(Math.floor(10_000 + Math.random() * 90_000)))
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const onCommandRef = useRef(onCommand)
  onCommandRef.current = onCommand

  useEffect(() => {
    const connect = async () => {
      // Try backend-issued one-time key first; if unavailable, fall back to raw JWT token.
      const key = await fetchWsKey(roomId)
      const token = key ?? localStorage.getItem('token') ?? undefined
      const ws = new WebSocket(wsUrl(roomId, token))
      wsRef.current = ws
      ws.onmessage = (e) => {
        try {
          onCommandRef.current(JSON.parse(e.data) as RemoteCommand)
        } catch (_err) {
          // ignore malformed messages
          void _err
        }
      }
      ws.onclose = () => { timerRef.current = setTimeout(connect, 3_000) }
    }
    void connect()
    return () => {
      clearTimeout(timerRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  }, [roomId])

  return roomId
}

export function useRemoteControlSender(roomId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!roomId) return
    let mounted = true
    const connect = async () => {
      const key = await fetchWsKey(roomId)
      const token = key ?? localStorage.getItem('token') ?? undefined
      if (!mounted) return
      const ws = new WebSocket(wsUrl(roomId, token))
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onclose = () => { setConnected(false); wsRef.current = null }
    }
    void connect()
    return () => { mounted = false; if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); setConnected(false) } }
  }, [roomId])

  const send = useCallback((action: string, data?: Partial<RemoteCommand>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...data }))
    }
  }, [])

  return { connected, send }
}
