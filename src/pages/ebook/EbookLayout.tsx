import {Outlet} from 'react-router-dom'
import {TabNav} from '../../components/layout/TabNav'

import {FaBook, FaRegBookmark} from 'react-icons/fa'

const TABS = [
    {path: '/ebook/words', label: 'Not Learned Words', icon: FaRegBookmark},
    {path: '/ebook/ebooks', label: 'Ebooks', icon: FaBook},
]

export function EbookLayout() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <TabNav tabs={TABS}/>
            <Outlet/>
        </div>
    )
}
