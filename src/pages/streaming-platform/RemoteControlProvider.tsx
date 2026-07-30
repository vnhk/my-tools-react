import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { useRemoteControlReceiver, type RemoteCommand } from './hooks/useRemoteControl'

type Subscriber = (cmd: RemoteCommand) => void

interface RemoteControlContextValue {
  roomId: string
  subscribe: (cb: Subscriber) => () => void
}

const RemoteControlContext = createContext<RemoteControlContextValue | null>(null)

export default function RemoteControlProvider({ children }: { children: React.ReactNode }) {
  const subsRef = useRef<Set<Subscriber>>(new Set())

  const onCommand = useCallback((cmd: RemoteCommand) => {
    // Fan-out to all active subscribers (e.g., player page)
    subsRef.current.forEach((cb) => {
      try { cb(cmd) } catch { /* ignore subscriber errors */ }
    })
  }, [])

  const roomId = useRemoteControlReceiver(onCommand)

  const value = useMemo<RemoteControlContextValue>(() => ({
    roomId,
    subscribe: (cb: Subscriber) => {
      subsRef.current.add(cb)
      return () => subsRef.current.delete(cb)
    },
  }), [roomId])

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
