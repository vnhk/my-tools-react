import {Outlet, useLocation} from 'react-router-dom'
import {TabNav} from '../../components/layout/TabNav'
import {FaBook, FaClone, FaPen, FaPuzzlePiece} from 'react-icons/fa'

export function LanguageLearningLayout() {
    const {pathname} = useLocation()
    const base = pathname.startsWith('/english') ? '/english' : '/spanish'
    const lang = base === '/english' ? '🇺🇸 English' : '🇪🇸 Spanish'


    const TABS = [
        {path: `${base}/words`, label: 'Words', icon: FaBook},
        {path: `${base}/flashcards`, label: 'Flashcards', icon: FaClone},
        {path: `${base}/quiz`, label: 'Quiz', icon: FaPen},
        {path: `${base}/crossword`, label: 'Crossword', icon: FaPuzzlePiece},
    ]

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div style={{padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px'}}>
                {lang}
            </div>
            <TabNav tabs={TABS}/>
            <Outlet/>
        </div>
    )
}
