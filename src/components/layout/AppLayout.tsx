import {ReactNode, useEffect, useState} from 'react'
import {NavLink, Outlet, useNavigate} from 'react-router-dom'
import {useAuth} from '../../auth/AuthContext'
import {PocketSidePanel} from './PocketSidePanel'
import {useIsTv} from '../../common/hooks/useIsTv'
import RemoteControlProvider, {NavigationListener, RoomBadge} from './RemoteControlProvider'
import styles from './AppLayout.module.css'

export interface NavItem {
    path: string
    label: string
    icon: ReactNode
}

interface AppLayoutProps {
    navItems: NavItem[]
}

export function AppLayout({navItems}: AppLayoutProps) {
    const {user, logout} = useAuth()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const isTv = useIsTv()

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth <= 768
            setIsMobile(mobile)
            if (mobile) setCollapsed(true)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (isTv) {
            setCollapsed(true)
            document.body.classList.add('tv-client')
        } else {
            document.body.classList.remove('tv-client')
        }
    }, [isTv])

    const handleLogout = async () => {
        await logout()
        isTv ? navigate('/login-tv') : navigate('/login')
    }

    const handleToggleCollapse = () => {
        if (!isMobile) {
            setCollapsed(!collapsed)
        }
    }

    return (
        <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.logo}>{collapsed ? '🛠' : '🛠 My Tools'}</span>
                    {!isMobile && !isTv && (
                        <button className={styles.collapseBtn} onClick={handleToggleCollapse}>
                            {collapsed ? '›' : '‹'}
                        </button>
                    )}
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({isActive}) =>
                                `${styles.navItem} ${isActive ? styles.active : ''}`
                            }
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    {!collapsed && <span className={styles.username}>{user?.username}</span>}
                    <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">⏻</button>
                </div>
            </aside>

            <main className={styles.main}>
                <RemoteControlProvider>
                    <Outlet/>
                    <RoomBadge/>
                    <NavigationListener/>
                </RemoteControlProvider>
            </main>

            <PocketSidePanel/>
        </div>
    )
}
