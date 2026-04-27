import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { AppLayout, NavItem } from './components/layout/AppLayout'
import { NotificationProvider } from './components/ui/Notification'
import { PocketListPage } from './pages/pocket/PocketListPage'
import { PocketItemsPage } from './pages/pocket/PocketItemsPage'
import { InvestTrackLayout } from './pages/invest-track/InvestTrackLayout'
import { DashboardPage } from './pages/invest-track/DashboardPage'
import { WalletListPage } from './pages/invest-track/WalletListPage'
import { WalletDetailPage } from './pages/invest-track/WalletDetailPage'
import { BudgetEntriesPage } from './pages/invest-track/BudgetEntriesPage'
import { StockAlertsPage } from './pages/invest-track/StockAlertsPage'
import { RecommendationsPage } from './pages/invest-track/RecommendationsPage'
import { StockReportPage } from './pages/invest-track/StockReportPage'
import { DataIEPage } from './pages/invest-track/DataIEPage'
import { CookBookLayout } from './pages/cook-book/CookBookLayout'
import { RecipeListPage } from './pages/cook-book/RecipeListPage'
import { RecipeDetailPage } from './pages/cook-book/RecipeDetailPage'
import { FridgeSearchPage } from './pages/cook-book/FridgeSearchPage'
import { ShoppingCartPage } from './pages/cook-book/ShoppingCartPage'
import { IngredientsPage } from './pages/cook-book/IngredientsPage'
import { DietPage } from './pages/cook-book/DietPage'
import { DietDashboardPage } from './pages/cook-book/DietDashboardPage'

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
              <Route path="/invest-track" element={<InvestTrackLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="wallets" element={<WalletListPage />} />
                <Route path="wallets/:walletId" element={<WalletDetailPage />} />
                <Route path="budget" element={<BudgetEntriesPage />} />
                <Route path="alerts" element={<StockAlertsPage />} />
                <Route path="stock-report" element={<StockReportPage />} />
                <Route path="recommendations" element={<RecommendationsPage />} />
                <Route path="data-ie" element={<DataIEPage />} />
              </Route>
              <Route path="/cook-book" element={<CookBookLayout />}>
                <Route index element={<Navigate to="recipes" replace />} />
                <Route path="recipes" element={<RecipeListPage />} />
                <Route path="recipes/:id" element={<RecipeDetailPage />} />
                <Route path="search" element={<FridgeSearchPage />} />
                <Route path="shopping-cart" element={<ShoppingCartPage />} />
                <Route path="ingredients" element={<IngredientsPage />} />
                <Route path="diet" element={<DietPage />} />
                <Route path="diet-dashboard" element={<DietDashboardPage />} />
              </Route>
              {NAV_ITEMS.filter((item) => item.path !== '/pocket' && item.path !== '/invest-track' && item.path !== '/cook-book').map((item) => (
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
