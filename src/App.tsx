import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { AppLayout, NavItem } from './components/layout/AppLayout'
import { NotificationProvider } from './components/ui/Notification'
import { PocketListPage } from './pages/pocket/PocketListPage'
import { PocketItemsPage } from './pages/pocket/PocketItemsPage'

const NAV_ITEMS: NavItem[] = [
  { path: '/invest-track', label: 'Invest Track', icon: '📈' },
  { path: '/pocket', label: 'Pocket', icon: '📌' },
  { path: '/cook-book', label: 'Cook Book', icon: '🍳' },
  { path: '/learning', label: 'Learning', icon: '🗣' },
  { path: '/streaming', label: 'Streaming', icon: '🎬' },
  { path: '/canvas', label: 'Canvas', icon: '🎨' },
  { path: '/spreadsheet', label: 'Spreadsheet', icon: '📊' },
  { path: '/projects', label: 'Projects', icon: '🚩' },
  { path: '/interview', label: 'Interview', icon: '💼' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/shopping', label: 'Shopping', icon: '🛒' },
  { path: '/english', label: 'English Stats', icon: '📖' },
]

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div style={{ color: 'var(--color-text-secondary)' }}>
      {name} — coming soon
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout navItems={NAV_ITEMS} />}>
              <Route index element={<Navigate to="/pocket" replace />} />
              <Route path="/pocket" element={<PocketListPage />} />
              <Route path="/pocket/:pocketName" element={<PocketItemsPage />} />
              {NAV_ITEMS.filter((item) => item.path !== '/pocket').map((item) => (
                <Route
                  key={item.path}
                  path={`${item.path}/*`}
                  element={<PlaceholderPage name={item.label} />}
                />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  )
}
