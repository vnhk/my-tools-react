import {NavLink} from 'react-router-dom'
import styles from './TabNav.module.css'
import {IconType} from "react-icons";

export interface TabNavItem {
    path: string
    label: string
    icon?: IconType
}

interface TabNavProps {
    tabs: TabNavItem[]
}

// React equivalent of MenuNavigationComponent / MenuButtonsRow / AsyncTaskLayout / EmptyLayout
export function TabNav({tabs}: TabNavProps) {
    return (
        <nav className={styles.nav}>
            {tabs.map((tab) => {
                const Icon = tab.icon

                return (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end
                        className={({isActive}) =>
                            `${styles.tab} ${isActive ? styles.active : ''}`
                        }
                    >
                        {Icon && (
                            <span className={styles.icon}>
                <Icon/>
              </span>
                        )}
                        {tab.label}
                    </NavLink>
                )
            })}
        </nav>
    )
}