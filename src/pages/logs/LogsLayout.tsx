import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

const TABS = [
  { path: '/logs/all', label: 'Logs', icon: '📜' },
  { path: '/logs/trackers', label: 'Trackers', icon: '🎯' },
]

export function LogsLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  )
}
