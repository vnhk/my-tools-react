import {useEffect, useState} from 'react'

// Dispatched by LoginTvPage/LoginPage right after writing localStorage.isTv so
// same-tab listeners update immediately — the native 'storage' event only fires
// in *other* tabs/windows, never the one that made the change.
export const IS_TV_CHANGED_EVENT = 'isTvChanged'

export function readIsTv(): boolean {
    return localStorage.getItem('isTv') === 'true'
}

export function setIsTv(value: boolean) {
    localStorage.setItem('isTv', value ? 'true' : 'false')
    window.dispatchEvent(new Event(IS_TV_CHANGED_EVENT))
}

// Reactive read of the isTv flag — updates when LoginTvPage/LoginPage change it
// (same tab) or another tab changes it (native storage event).
export function useIsTv(): boolean {
    const [isTv, setIsTvState] = useState(readIsTv)

    useEffect(() => {
        const sync = () => setIsTvState(readIsTv())
        window.addEventListener(IS_TV_CHANGED_EVENT, sync)
        window.addEventListener('storage', sync)
        return () => {
            window.removeEventListener(IS_TV_CHANGED_EVENT, sync)
            window.removeEventListener('storage', sync)
        }
    }, [])

    return isTv
}
