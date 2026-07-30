import { Outlet, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { useRemoteControlReceiver, type RemoteCommand } from './hooks/useRemoteControl'
import styles from './StreamingLayout.module.css'

export default function StreamingLayout() {
  const navigate = useNavigate()

  const handleCmd = useCallback((cmd: RemoteCommand) => {
    if (cmd.action === 'NAVIGATE' && cmd.url) {
      navigate(cmd.url)
    }
    // Other commands are relevant mainly on the player page
  }, [navigate])

  const roomId = useRemoteControlReceiver(handleCmd)
import { Outlet } from 'react-router-dom'
import RemoteControlProvider, { useRemoteControlContext } from './RemoteControlProvider'
import styles from './StreamingLayout.module.css'

function RoomBadge() {
  const { roomId } = useRemoteControlContext()
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.badge} title="Room ID — enter this in the Remote Control page">
        📱 {roomId}
      </div>
    </div>
  )
}

export default function StreamingLayout() {
  return (
    <RemoteControlProvider>
      <Outlet />
      <RoomBadge />
    </RemoteControlProvider>
  )
}
  return (
    <>
      <Outlet />
      <div className={styles.overlay} aria-hidden="true">
        <div className={styles.badge} title="Room ID — enter this in the Remote Control page">
          📱 {roomId}
        </div>
      </div>
    </>
  )
}
