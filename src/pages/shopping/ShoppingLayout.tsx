import {Outlet} from 'react-router-dom'
import {TabNav} from '../../components/layout/TabNav'
import {FaBell, FaClipboardList, FaCog, FaFire, FaShoppingCart, FaStore} from 'react-icons/fa'

const TABS = [
    {path: '/shopping/products', label: 'Products', icon: FaShoppingCart},
    {path: '/shopping/best-offers', label: 'Best Offers', icon: FaFire},
    {path: '/shopping/alerts', label: 'Alerts', icon: FaBell},
    {path: '/shopping/shop-config', label: 'Shops', icon: FaStore},
    {path: '/shopping/product-config', label: 'Product Config', icon: FaCog},
    {path: '/shopping/scrap-audit', label: 'Scrap Audit', icon: FaClipboardList},
]

export function ShoppingLayout() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <TabNav tabs={TABS}/>
            <Outlet/>
        </div>
    )
}
