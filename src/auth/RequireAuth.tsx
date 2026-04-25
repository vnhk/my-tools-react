import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) return null

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
