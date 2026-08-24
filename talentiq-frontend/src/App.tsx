import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminThemeProvider } from './context/AdminThemeContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { JobsList } from './pages/JobsList';
import { Recommendations } from './pages/Recommendations';
import { MyApplications } from './pages/MyApplications';
import { PortfolioBuilder } from './pages/PortfolioBuilder';
import { HrCopilot } from './pages/HrCopilot';
import HrAnalytics from './pages/HrAnalytics';
import { HrApplications } from './pages/HrApplications';
import { AdminPortal } from './pages/AdminPortal';
import { ProfilePage } from './pages/ProfilePage';
import HrMessages from './pages/HrMessages';
import { CandidateProfile } from './pages/CandidateProfile';
import HrCalendar from './pages/HrCalendar';
import { UserMessages } from './pages/UserMessages';
import { GroupCollaborationChat } from './pages/GroupCollaborationChat';
import { CosmicQuotePopup } from './components/CosmicQuotePopup';
import { DrinkWaterReminder } from './components/DrinkWaterReminder';
import Contact from './pages/Contact';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { HrGlobalNotificationToast } from './components/HrGlobalNotificationToast';

// Wrapper that hides the global Navbar on the home page
// (Home.tsx has its own full custom navbar with dark/light toggle)
function AppLayout() {
  const location = useLocation();
  // Dashboard & chat pages have their own sidebar navbar — hide the global navbar
  const HIDE_NAV_ROUTES = ['/hr-analytics', '/hr-messages', '/messages', '/hr-calendar', '/hr-applications', '/hr-copilot', '/copilot', '/admin', '/team-chat'];
  const isHome = location.pathname === '/';
  const hideNavbar = isHome || HIDE_NAV_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideNavbar && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Navigate to="/user-login" replace />} />
          <Route path="/user-login" element={<Login initialRole="CANDIDATE" />} />
          <Route path="/hr-login" element={<Login initialRole="HR" />} />
          <Route path="/admin-login" element={<Login initialRole="ADMIN" />} />
          <Route path="/register" element={<Navigate to="/admin-login" replace />} />
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/portfolio" element={<PortfolioBuilder />} />
          <Route path="/messages" element={<UserMessages />} />
          <Route path="/team-chat" element={<GroupCollaborationChat />} />
          <Route path="/copilot" element={<HrCopilot />} />
          <Route path="/hr-analytics" element={<HrAnalytics />} />
          <Route path="/hr-applications" element={<HrApplications />} />
          <Route path="/hr-messages" element={<HrMessages />} />
          <Route path="/hr-calendar" element={<HrCalendar />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/admin-portal" element={<AdminPortal />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/candidate-profile/:id" element={<CandidateProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {/* ── 40-Minute Drink Water Hydration Reminder Toast ── */}
      <DrinkWaterReminder />
      {/* ── Galaxy / Celestial Facts & Quotes Toast (Refreshes on every reload & every 10 min) ── */}
      <CosmicQuotePopup />
      {/* ── HR Global 2-Sec Message Notification Toast ── */}
      <HrGlobalNotificationToast />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AdminThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AuthProvider>
      </AdminThemeProvider>
    </ThemeProvider>
  );
}

export default App;
