import { useCallback, useEffect, useRef, useState } from 'react'

export interface RemoteCommand {
  action: string
  relative?: number
  url?: string
  index?: number
  trackType?: string
}

function wsUrl(roomId: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/remote-control?roomId=${roomId}`
}

export function useRemoteControlReceiver(onCommand: (cmd: RemoteCommand) => void) {
  const [roomId] = useState(() => String(Math.floor(10_000 + Math.random() * 90_000)))
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const onCommandRef = useRef(onCommand)
  onCommandRef.current = onCommand

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(wsUrl(roomId))
      wsRef.current = ws
      ws.onmessage = (e) => {
        try { onCommandRef.current(JSON.parse(e.data) as RemoteCommand) } catch {}
      }
      ws.onclose = () => { timerRef.current = setTimeout(connect, 3_000) }
    }
    connect()
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
    const ws = new WebSocket(wsUrl(roomId))
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => { setConnected(false); wsRef.current = null }
    return () => { ws.onclose = null; ws.close(); setConnected(false) }
  }, [roomId])

  const send = useCallback((action: string, data?: Partial<RemoteCommand>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...data }))
    }
  }, [])

  return { connected, send }
}
