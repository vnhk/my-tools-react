import { NavLink } from 'react-router-dom'
import styles from './TabNav.module.css'

export interface TabNavItem {
  path: string
  label: string
  icon?: string
}

interface TabNavProps {
  tabs: TabNavItem[]
}

// React equivalent of MenuNavigationComponent / MenuButtonsRow / AsyncTaskLayout / EmptyLayout
export function TabNav({ tabs }: TabNavProps) {
  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
