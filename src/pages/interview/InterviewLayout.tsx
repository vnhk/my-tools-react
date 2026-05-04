import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

const TABS = [
    { path: '/interview/questions', label: 'Questions', icon: '❓' },
    { path: '/interview/coding-tasks', label: 'Coding Tasks', icon: '💻' },
    { path: '/interview/configs', label: 'Configs', icon: '⚙️' },
    { path: '/interview/sessions', label: 'Sessions', icon: '📋' },
    { path: '/interview/start', label: 'Start Interview', icon: '▶️' },
    { path: '/interview/plan', label: 'Interview Plan', icon: '📝' },
]

export function InterviewLayout() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TabNav tabs={TABS} />
            <Outlet />
        </div>
    )
}
