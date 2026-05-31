import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

import {
    FaChartLine,
    FaWallet,
    FaMoneyBillWave,
    FaTree,
    FaBell,
    FaFlag,
    FaScroll,
    FaDatabase
} from 'react-icons/fa'

const TABS = [
    { path: '/invest-track/dashboard', label: 'Dashboard', icon: FaChartLine },
    { path: '/invest-track/wallets', label: 'Wallets', icon: FaWallet },
    { path: '/invest-track/budget', label: 'Budget', icon: FaMoneyBillWave },
    { path: '/invest-track/budget-tree', label: 'Budget Tree', icon: FaTree },
    { path: '/invest-track/alerts', label: 'Stock Alerts', icon: FaBell },
    { path: '/invest-track/stock-report', label: 'Stock Report', icon: FaFlag },
    { path: '/invest-track/recommendations', label: 'Rec. History', icon: FaScroll },
    { path: '/invest-track/data-ie', label: 'Data IE', icon: FaDatabase },
]

export function InvestTrackLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabNav tabs={TABS} />
      <Outlet />
    </div>
  )
}
