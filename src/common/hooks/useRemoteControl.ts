import {useCallback, useEffect, useRef, useState} from 'react'
import client from '../../api/client'

// Generic room-id WebSocket relay pairing a phone ("remote"/pilot) to this
// browser tab (the "TV"). The backend is a dumb JSON relay (one TV session +
// one REMOTE session per roomId) — any app can define its own action/payload
// shapes on top without backend changes. Originally streaming-platform-only;
// promoted here so invest-track/files-storage can reuse the same pairing.

export interface AudioTrackInfo {
    index: number
    name: string
    lang?: string
}

export interface RemoteCommand {
    action: string
    relative?: number
    url?: string
    index?: number
    trackType?: string
    lang?: string | null
    // Invest-track remote-control payload fields
    key?: string
    months?: { key: string; label: string }[]
    expandedKeys?: string[]
    // Files-storage remote-control payload fields
    fileId?: string
    viewerType?: string
    filename?: string
    path?: string
    // STATUS payload fields (TV -> remote)
    playing?: boolean
    currentTime?: number
    duration?: number
    title?: string
    audioTracks?: AudioTrackInfo[]
    activeAudioTrack?: number
    subtitleLangs?: string[]
    activeSubtitle?: string | null
}

export interface RemoteStatus {
    playing: boolean
    currentTime: number
    duration: number
    title?: string
    audioTracks?: AudioTrackInfo[]
    activeAudioTrack?: number
    subtitleLangs?: string[]
    activeSubtitle?: string | null
}

// Room ID this browser tab (the "TV") is/would be reachable at. Generated once
// per tab and reused across the login and app pages so a QR login can
// pre-announce it to the server before the receiver mounts.
const TV_ROOM_ID_KEY = 'streaming.roomId'

export function getOrCreateRoomId(): string {
    const stored = sessionStorage.getItem(TV_ROOM_ID_KEY)
    if (stored) return stored
    const id = String(Math.floor(10_000 + Math.random() * 90_000))
    sessionStorage.setItem(TV_ROOM_ID_KEY, id)
    return id
}

// Room ID the remote (pilot) page last connected to — persisted so it can
// auto-reconnect after the browser is closed/reopened or paired via QR login.
export const REMOTE_LAST_ROOM_ID_KEY = 'remoteControl.lastRoomId'

async function fetchWsKey(roomId: string): Promise<string | null> {
    // Attempt to get a one-time WS key from the backend. The backend endpoint
    // is expected to verify the current session (via Authorization header or cookie)
    // and return a short-lived key that can be used during the websocket handshake.
    try {
        const res = await client.post<{ key: string }>('/streaming/remote-control/key', {roomId})
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
    const [roomId] = useState(getOrCreateRoomId)
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
            ws.onopen = () => {
                retriesRef.current = 0
            }
            ws.onerror = () => {
                ws.close()
            }
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
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close()
            }
        }
    }, [roomId])

    const send = useCallback((data: Partial<RemoteCommand> & { action: string }) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data))
        }
    }, [])

    return {roomId, send}
}

// onMessage fires for every TV -> remote payload (including STATUS) — lets a
// non-streaming tab (e.g. invest-track's month list) react to its own custom
// action types that don't fit the STATUS/RemoteStatus shape.
export function useRemoteControlSender(roomId: string | null, onMessage?: (cmd: RemoteCommand) => void) {
    const wsRef = useRef<WebSocket | null>(null)
    const [connected, setConnected] = useState(false)
    const [status, setStatus] = useState<RemoteStatus | null>(null)
    const keyRef = useRef<string | null>(null)
    const retriesRef = useRef(0)
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>()
    const forceReconnectRef = useRef<() => void>(() => {
    })
    const onMessageRef = useRef(onMessage)
    onMessageRef.current = onMessage

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
            ws.onopen = () => {
                setConnected(true);
                retriesRef.current = 0
            }
            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data) as RemoteCommand
                    onMessageRef.current?.(data)
                    if (data.action === 'STATUS') {
                        setStatus({
                            playing: !!data.playing,
                            currentTime: data.currentTime ?? 0,
                            duration: data.duration ?? 0,
                            title: data.title,
                            audioTracks: data.audioTracks,
                            activeAudioTrack: data.activeAudioTrack,
                            subtitleLangs: data.subtitleLangs,
                            activeSubtitle: data.activeSubtitle,
                        })
                    }
                } catch (_err) {
                    void _err
                }
            }
            ws.onerror = () => {
                ws.close()
            }
            ws.onclose = () => {
                if (!mounted) return
                setConnected(false)
                setStatus(null)
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
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                setConnected(false)
            }
        }
    }, [roomId])

    const send = useCallback((action: string, data?: Partial<RemoteCommand>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({action, ...data}))
        }
    }, [])

    return {connected, send, status}
}
