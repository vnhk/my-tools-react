import {Outlet} from 'react-router-dom'
import {TabNav} from '../../components/layout/TabNav'

import {FaClipboardList, FaCode, FaCog, FaPen, FaPlay, FaQuestionCircle} from 'react-icons/fa'

const TABS = [
    {path: '/interview/questions', label: 'Questions', icon: FaQuestionCircle},
    {path: '/interview/coding-tasks', label: 'Coding Tasks', icon: FaCode},
    {path: '/interview/configs', label: 'Configs', icon: FaCog},
    {path: '/interview/sessions', label: 'Sessions', icon: FaClipboardList},
    {path: '/interview/start', label: 'Start Interview', icon: FaPlay},
    {path: '/interview/plan', label: 'Interview Plan', icon: FaPen},
]

export function InterviewLayout() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <TabNav tabs={TABS}/>
            <Outlet/>
        </div>
    )
}
