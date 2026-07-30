import {Outlet, useNavigate} from 'react-router-dom'
import {useEffect, useState} from 'react'
import styles from './StreamingLayout.module.css'
import RemoteControlProvider, {useRemoteControlContext} from './RemoteControlProvider'

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

function RoomBadge() {
    const {roomId} = useRemoteControlContext()
    const isMobile = useIsMobile()

    // The badge shows this device's own room ID for pairing a remote against
    // it — meaningless on a phone, which is never the "TV" being controlled.
    if (isMobile) return null

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
    const {subscribe} = useRemoteControlContext()

    useEffect(() => {
        return subscribe((cmd) => {
            if (cmd.action === 'NAVIGATE' && cmd.url) {
                console.log('Navigating to:', cmd.url)
                navigate(cmd.url)
            }
        })
    }, [subscribe, navigate])

    return null
}

export default function StreamingLayout() {
    return (
        <RemoteControlProvider>
            <Outlet/>
            <RoomBadge/>
            <NavigationListener/>
        </RemoteControlProvider>
    )
}
