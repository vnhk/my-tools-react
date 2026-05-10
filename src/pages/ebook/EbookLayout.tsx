import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

const TABS = [
  { path: '/ebook/words', label: 'Not Learned Words', icon: '📖' },
  { path: '/ebook/ebooks', label: 'Ebooks', icon: '📚' },
]

export function EbookLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  )
}
