import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {type RemoteCommand, type RemoteStatus, useRemoteControlReceiver} from '../../common/hooks/useRemoteControl'
import styles from './RemoteControlProvider.module.css'
import {useIsTv} from '../../common/hooks/useIsTv'

type Subscriber = (cmd: RemoteCommand) => void

interface RemoteControlContextValue {
    roomId: string
    subscribe: (cb: Subscriber) => () => void
    sendStatus: (status: RemoteStatus) => void
    // Generic TV -> remote push for app-specific payloads that don't fit the
    // streaming-shaped RemoteStatus (e.g. invest-track's month list).
    send: (action: string, data?: Partial<RemoteCommand>) => void
}

const RemoteControlContext = createContext<RemoteControlContextValue | null>(null)

// Mounted once, app-wide (in AppLayout) — the room/socket pairing and its
// roomId must survive navigation between /streaming, /invest-track, /files
// etc. so a single phone pairing can drive all of them without reconnecting.
export default function RemoteControlProvider({children}: { children: React.ReactNode }) {
    const subsRef = useRef<Set<Subscriber>>(new Set())

    const onCommand = useCallback((cmd: RemoteCommand) => {
        // Fan-out to all active subscribers (e.g., whichever page is currently mounted)
        subsRef.current.forEach((cb) => {
            try {
                cb(cmd)
            } catch { /* ignore subscriber errors */
            }
        })
    }, [])

    const {roomId, send} = useRemoteControlReceiver(onCommand)

    const value = useMemo<RemoteControlContextValue>(() => ({
        roomId,
        subscribe: (cb: Subscriber) => {
            subsRef.current.add(cb)
            return () => subsRef.current.delete(cb)
        },
        sendStatus: (status) => send({action: 'STATUS', ...status}),
        send: (action, data) => send({action, ...data}),
    }), [roomId, send])

    return (
        <RemoteControlContext.Provider value={value}>
            {children}
        </RemoteControlContext.Provider>
    )
}

export function useRemoteControlContext() {
    const ctx = useContext(RemoteControlContext)
    if (!ctx) throw new Error('useRemoteControlContext must be used within RemoteControlProvider')
    return ctx
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        () => window.matchMedia('(max-width: 768px)').matches
    )

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)')
        const handler = () => setIsMobile(mq.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    return isMobile
}

// Shows this device's own room ID for pairing a remote against it — meaningless
// on a phone, which is never the "TV" being controlled.
export function RoomBadge() {
    const {roomId} = useRemoteControlContext()
    const isMobile = useIsMobile()
    const isTv = useIsTv()

    if (isMobile) return null

    // We do not need 'Remote connection for non-tvs devices'
    // If needed, user can use /login-tv
    if(!isTv) return null

    return (
        <div className={styles.overlay} aria-hidden="true">
            <div className={styles.badge} title="Room ID — enter this in the Remote Control page">
                Remote: {roomId}
            </div>
        </div>
    )
}

// Generic cross-app navigation — the remote can send {action:'NAVIGATE', url}
// regardless of which app is currently showing on this TV, so it drives route
// switching (e.g. jumping from /streaming to /invest-track/dashboard).
export function NavigationListener() {
    const navigate = useNavigate()
    const {subscribe} = useRemoteControlContext()

    useEffect(() => {
        return subscribe((cmd) => {
            if (cmd.action === 'NAVIGATE' && cmd.url) {
                navigate(cmd.url)
            }
        })
    }, [subscribe, navigate])

    return null
}
