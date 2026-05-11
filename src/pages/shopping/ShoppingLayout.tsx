import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

const TABS = [
  { path: '/shopping/products', label: 'Products', icon: '🛒' },
  { path: '/shopping/best-offers', label: 'Best Offers', icon: '🔥' },
  { path: '/shopping/alerts', label: 'Alerts', icon: '🔔' },
  { path: '/shopping/shop-config', label: 'Shops', icon: '🏪' },
  { path: '/shopping/product-config', label: 'Product Config', icon: '⚙️' },
  { path: '/shopping/scrap-audit', label: 'Scrap Audit', icon: '📋' },
]

export function ShoppingLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  )
}
