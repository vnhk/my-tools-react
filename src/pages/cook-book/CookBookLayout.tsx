import {FaBook, FaCarrot, FaChartBar, FaLeaf, FaSearch, FaShoppingCart} from 'react-icons/fa'
import {Outlet} from 'react-router-dom'
import {TabNav} from '../../components/layout/TabNav'

const TABS = [
    {path: '/cook-book/recipes', label: 'Recipes', icon: FaBook},
    {path: '/cook-book/search', label: 'Fridge Search', icon: FaSearch},
    {path: '/cook-book/shopping-cart', label: 'Shopping Cart', icon: FaShoppingCart},
    {path: '/cook-book/ingredients', label: 'Ingredients', icon: FaCarrot},
    {path: '/cook-book/diet', label: 'Diet', icon: FaLeaf},
    {path: '/cook-book/diet-dashboard', label: 'Dashboard', icon: FaChartBar},
]

export function CookBookLayout() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <TabNav tabs={TABS}/>
            <Outlet/>
        </div>
    )
}
