import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom'
import {AuthProvider} from './auth/AuthContext'
import {RequireAuth} from './auth/RequireAuth'
import {LoginPage} from './pages/LoginPage'
import {AppLayout, NavItem} from './components/layout/AppLayout'
import {NotificationProvider} from './components/ui/Notification'
import {PocketListPage} from './pages/pocket/PocketListPage'
import {PocketItemsPage} from './pages/pocket/PocketItemsPage'
import {InvestTrackLayout} from './pages/invest-track/InvestTrackLayout'
import {DashboardPage} from './pages/invest-track/DashboardPage'
import {WalletListPage} from './pages/invest-track/WalletListPage'
import {WalletDetailPage} from './pages/invest-track/WalletDetailPage'
import {BudgetEntriesPage} from './pages/invest-track/BudgetEntriesPage'
import {StockAlertsPage} from './pages/invest-track/StockAlertsPage'
import {RecommendationsPage} from './pages/invest-track/RecommendationsPage'
import {StockReportPage} from './pages/invest-track/StockReportPage'
import {DataIEPage} from './pages/invest-track/DataIEPage'
import {CookBookLayout} from './pages/cook-book/CookBookLayout'
import {RecipeListPage} from './pages/cook-book/RecipeListPage'
import {RecipeDetailPage} from './pages/cook-book/RecipeDetailPage'
import {FridgeSearchPage} from './pages/cook-book/FridgeSearchPage'
import {ShoppingCartPage} from './pages/cook-book/ShoppingCartPage'
import {IngredientsPage} from './pages/cook-book/IngredientsPage'
import {DietPage} from './pages/cook-book/DietPage'
import {DietDashboardPage} from './pages/cook-book/DietDashboardPage'
import ProductionListPage from './pages/streaming-platform/ProductionListPage'
import ProductionDetailsPage from './pages/streaming-platform/ProductionDetailsPage'
import VideoPlayerPage from './pages/streaming-platform/VideoPlayerPage'
import RemoteControlPage from './pages/streaming-platform/RemoteControlPage'
import TvPairingPage from './pages/streaming-platform/TvPairingPage'
import { FilesPage } from './pages/files/FilesPage'
import { ProjectListPage } from './pages/projects/ProjectListPage'
import { ProjectDetailsPage } from './pages/projects/ProjectDetailsPage'
import { AllTasksPage } from './pages/projects/AllTasksPage'
import { TaskDetailsPage } from './pages/projects/TaskDetailsPage'
import {HomePage, HomePageCard} from "./components/layout/HomePage.tsx";
import {
    FaBarcode,
    FaBook, FaBookOpen, FaChartLine,
    FaCloudUploadAlt,
    FaCog,
    FaDatabase,
    FaDesktop,
    FaEdit,
    FaFilm, FaFlag, FaFolder, FaHome, FaMicrophone,
    FaMoneyBill, FaPaintBrush,
    FaPlane,
    FaShoppingCart,
    FaTable,
    FaTasks, FaUserTie
} from "react-icons/fa";

import {MdOutlineAddBox} from "react-icons/md";
import {QuestionListPage} from "./pages/interview/QuestionListPage.tsx";

const cards: HomePageCard[] = [
    {
        title: "OTP",
        description: "Generate one-time passwords.",
        icon: <FaBarcode/>,
        route: "/otp"
    },
    {
        title: "Interview",
        description: "Prepare for interviews.",
        icon: <FaDesktop/>,
        route: "/interview"
    },
    {
        title: "Pocket",
        description: "Manage your saved content.",
        icon: <MdOutlineAddBox/>,
        route: "/pocket"
    },
    {
        title: "Ebook English Words",
        description: "Review English words from ebooks.",
        icon: <FaBook/>,
        route: "/ebook"
    },
    {
        title: "English Learning 🇺🇸",
        description: "Explore English learning tools.",
        icon: <FaBook/>,
        route: "/english"
    },
    {
        title: "Spanish Learning 🇪🇸",
        description: "Start learning Spanish.",
        icon: <FaBook/>,
        route: "/spanish"
    },
    {
        title: "Project Management",
        description: "Track your projects.",
        icon: <FaTasks/>,
        route: "/projects"
    },
    {
        title: "File Storage",
        description: "Upload and manage files.",
        icon: <FaCloudUploadAlt/>,
        route: "/files"
    },
    {
        title: "Spreadsheets",
        description: "Work with spreadsheets.",
        icon: <FaTable/>,
        route: "/spreadsheets"
    },
    {
        title: "Investments",
        description: "Monitor your investments.",
        icon: <FaMoneyBill/>,
        route: "/investments"
    },
    {
        title: "Notepad",
        description: "Write and draw freely.",
        icon: <FaEdit/>,
        route: "/notepad"
    },
    {
        title: "Streaming",
        description: "Manage video streaming content.",
        icon: <FaFilm/>,
        route: "/streaming"
    },
    {
        title: "Shopping",
        description: "Shop and manage your products.",
        icon: <FaShoppingCart/>,
        route: "/shopping"
    },
    {
        title: "Logs",
        description: "View system logs.",
        icon: <FaDatabase/>,
        route: "/logs"
    },
    {
        title: "Async Tasks",
        description: "Track background processes.",
        icon: <FaPlane/>,
        route: "/async"
    },
    {
        title: "Settings",
        description: "Configure application settings.",
        icon: <FaCog/>,
        route: "/settings"
    }
];

const NAV_ITEMS: NavItem[] = [
    { path: "/home", label: "Home", icon: <FaHome /> },
    { path: "/pocket", label: "Pocket", icon: <FaFolder /> },
    { path: "/cook-book", label: "Cook Book", icon: <FaBook /> },
    { path: "/learning", label: "Learning", icon: <FaMicrophone /> },
    { path: "/streaming", label: "Streaming", icon: <FaFilm /> },
    { path: "/canvas", label: "Canvas", icon: <FaPaintBrush /> },
    { path: "/invest-track", label: "Invest Track", icon: <FaChartLine /> },
    { path: "/spreadsheet", label: "Spreadsheet", icon: <FaTable /> },
    { path: "/projects", label: "Projects", icon: <FaTasks /> },
    { path: "/interview", label: "Interview", icon: <FaUserTie /> },
    { path: "/files", label: "Files", icon: <FaCloudUploadAlt /> },
    { path: "/shopping", label: "Shopping", icon: <FaShoppingCart /> },
    { path: "/english", label: "English Stats", icon: <FaBookOpen /> }
];

function PlaceholderPage({name}: { name: string }) {
    return (
        <div style={{color: 'var(--color-text-secondary)'}}>
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
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route element={<RequireAuth/>}>
                            <Route element={<AppLayout navItems={NAV_ITEMS}/>}>
                                <Route index element={<Navigate to="/home" replace/>}/>
                                <Route path="/home" element={<HomePage welcomeText={"Hi Good to see ya!"} cards={
                                    cards
                                }/>}/>
                                <Route path="/pocket" element={<PocketListPage/>}/>
                                <Route path="/pocket/:pocketName" element={<PocketItemsPage/>}/>
                                <Route path="/invest-track" element={<InvestTrackLayout/>}>
                                    <Route index element={<Navigate to="dashboard" replace/>}/>
                                    <Route path="dashboard" element={<DashboardPage/>}/>
                                    <Route path="wallets" element={<WalletListPage/>}/>
                                    <Route path="wallets/:walletId" element={<WalletDetailPage/>}/>
                                    <Route path="budget" element={<BudgetEntriesPage/>}/>
                                    <Route path="alerts" element={<StockAlertsPage/>}/>
                                    <Route path="stock-report" element={<StockReportPage/>}/>
                                    <Route path="recommendations" element={<RecommendationsPage/>}/>
                                    <Route path="data-ie" element={<DataIEPage/>}/>
                                </Route>
                                <Route path="/cook-book" element={<CookBookLayout/>}>
                                    <Route index element={<Navigate to="recipes" replace/>}/>
                                    <Route path="recipes" element={<RecipeListPage/>}/>
                                    <Route path="recipes/:id" element={<RecipeDetailPage/>}/>
                                    <Route path="search" element={<FridgeSearchPage/>}/>
                                    <Route path="shopping-cart" element={<ShoppingCartPage/>}/>
                                    <Route path="ingredients" element={<IngredientsPage/>}/>
                                    <Route path="diet" element={<DietPage/>}/>
                                    <Route path="diet-dashboard" element={<DietDashboardPage/>}/>
                                </Route>
                                <Route path="/interview" element={<QuestionListPage/>}/>
                                <Route path="/streaming" element={<ProductionListPage/>}/>
                                <Route path="/streaming/production/:name" element={<ProductionDetailsPage/>}/>
                                <Route path="/streaming/player/:productionName/:videoFolderId"
                                       element={<VideoPlayerPage/>}/>
                                <Route path="/streaming/remote" element={<RemoteControlPage/>}/>
                                <Route path="/streaming/tv-pairing" element={<TvPairingPage/>}/>
                                <Route path="/files" element={<FilesPage/>}/>
                                <Route path="/projects" element={<ProjectListPage/>}/>
                                <Route path="/projects/all-tasks" element={<AllTasksPage/>}/>
                                <Route path="/projects/:projectId" element={<ProjectDetailsPage/>}/>
                                <Route path="/projects/tasks/:taskId" element={<TaskDetailsPage/>}/>
                                {NAV_ITEMS.filter((item) => item.path !== '/pocket' && item.path !== '/invest-track' && item.path !== '/cook-book' && item.path !== '/streaming' && item.path !== '/projects').map((item) => (
                                    <Route
                                        key={item.path}
                                        path={`${item.path}/*`}
                                        element={<PlaceholderPage name={item.label}/>}
                                    />
                                ))}
                            </Route>
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace/>}/>
                    </Routes>
                </AuthProvider>
            </NotificationProvider>
        </BrowserRouter>
    )
}
