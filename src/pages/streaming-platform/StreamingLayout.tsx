import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import styles from './StreamingLayout.module.css'
import RemoteControlProvider, { useRemoteControlContext } from './RemoteControlProvider'

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

function NavigationListener() {
  const navigate = useNavigate()
  const { subscribe } = useRemoteControlContext()

  useEffect(() => {
    return subscribe((cmd) => {
      if (cmd.action === 'NAVIGATE' && cmd.url) {
        navigate(cmd.url)
      }
    })
  }, [subscribe, navigate])

  return null
}

export default function StreamingLayout() {
  return (
    <RemoteControlProvider>
      <Outlet />
      <RoomBadge />
      <NavigationListener />
    </RemoteControlProvider>
  )
}
