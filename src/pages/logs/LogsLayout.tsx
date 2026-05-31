import {Outlet} from 'react-router-dom'
import {TabNav} from '../../components/layout/TabNav'

import {FaBullseye, FaScroll} from 'react-icons/fa'

const TABS = [
    {path: '/logs/all', label: 'Logs', icon: FaScroll},
    {path: '/logs/trackers', label: 'Trackers', icon: FaBullseye},
]

export function LogsLayout() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <TabNav tabs={TABS}/>
            <Outlet/>
        </div>
    )
}
