import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

const TABS = [
  { path: '/cook-book/recipes', label: 'Recipes', icon: '📖' },
  { path: '/cook-book/search', label: 'Fridge Search', icon: '🔍' },
  { path: '/cook-book/shopping-cart', label: 'Shopping Cart', icon: '🛒' },
  { path: '/cook-book/ingredients', label: 'Ingredients', icon: '🧂' },
  { path: '/cook-book/diet', label: 'Diet', icon: '🥗' },
  { path: '/cook-book/diet-dashboard', label: 'Dashboard', icon: '📊' },
]

export function CookBookLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  )
}
