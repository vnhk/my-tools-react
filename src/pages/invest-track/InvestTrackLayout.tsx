import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

const TABS = [
  { path: '/invest-track/dashboard', label: 'Dashboard', icon: '📈' },
  { path: '/invest-track/wallets', label: 'Wallets', icon: '💼' },
  { path: '/invest-track/budget', label: 'Budget', icon: '💰' },
  { path: '/invest-track/alerts', label: 'Stock Alerts', icon: '🔔' },
  { path: '/invest-track/recommendations', label: 'Recommendations', icon: '📊' },
]

export function InvestTrackLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  )
}
