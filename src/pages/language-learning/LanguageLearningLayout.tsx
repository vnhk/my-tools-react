import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { TabNav } from '../../components/layout/TabNav'

export function LanguageLearningLayout() {
    const { pathname } = useLocation()
    const base = pathname.startsWith('/english') ? '/english' : '/spanish'
    const lang = base === '/english' ? '🇺🇸 English' : '🇪🇸 Spanish'

    const TABS = [
        { path: `${base}/words`, label: 'Words', icon: '📚' },
        { path: `${base}/flashcards`, label: 'Flashcards', icon: '🃏' },
        { path: `${base}/quiz`, label: 'Quiz', icon: '📝' },
        { path: `${base}/crossword`, label: 'Crossword', icon: '🔤' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                {lang}
            </div>
            <TabNav tabs={TABS} />
            <Outlet />
        </div>
    )
}
