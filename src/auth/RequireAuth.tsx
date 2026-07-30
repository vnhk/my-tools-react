import {Navigate, Outlet} from 'react-router-dom'
import {useAuth} from './AuthContext'

export function RequireAuth() {
    const {user, loading} = useAuth()

    if (loading)
        return null

    if (localStorage.getItem('isTv') === 'true') {
        return user ? <Outlet/> : <Navigate to="/login-tv" replace/>
    }


    return user ? <Outlet/> : <Navigate to="/login" replace/>
}
