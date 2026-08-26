import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
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

const BlockedRoute = () => (
  <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', background: '#0B0F19', color: '#F8FAFC' }}>
    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '50%', padding: '20px', marginBottom: '20px' }}>
      <ShieldAlert size={48} color="#EF4444" />
    </div>
    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px', color: '#F8FAFC' }}>404 — Route Disabled for Security</h1>
    <p style={{ color: '#94A3B8', fontSize: '14px', maxWidth: '440px', margin: '0 0 24px', lineHeight: 1.5 }}>
      Direct <code style={{ color: '#F43F5E', background: 'rgba(244,63,94,0.15)', padding: '2px 6px', borderRadius: '4px' }}>/login</code> and <code style={{ color: '#F43F5E', background: 'rgba(244,63,94,0.15)', padding: '2px 6px', borderRadius: '4px' }}>/register</code> endpoints are permanently blocked. Please use the official role portals.
    </p>
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <a href="/user-login" style={{ background: '#38BDF8', color: '#0F172A', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '13px' }}>Candidate Login</a>
      <a href="/hr-login" style={{ background: '#818CF8', color: '#0F172A', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '13px' }}>HR Login</a>
      <a href="/admin-login" style={{ background: '#FB7185', color: '#0F172A', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '13px' }}>Admin Login</a>
    </div>
  </div>
);

// Wrapper that hides the global Navbar on the home page
// (Home.tsx has its own full custom navbar with dark/light toggle)
function AppLayout() {
  const location = useLocation();
  // Dashboard & chat pages have their own sidebar navbar — hide the global navbar
  const HIDE_NAV_ROUTES = [
    '/hr-analytics', '/hr-messages', '/messages', '/hr-calendar', '/hr-applications',
    '/hr-copilot', '/copilot', '/admin', '/team-chat',
    '/admin-application-developere-suit', '/admin-application-developer-suit', '/admin-application-developer-suite',
    '/admin-Management-team', '/admin-management-team',
    '/admin-Register-Company', '/admin-register-company',
    '/admin-portal', '/Admin-', '/admin-'
  ];
  const isHome = location.pathname === '/';
  const hideNavbar = isHome || HIDE_NAV_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideNavbar && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<BlockedRoute />} />
          <Route path="/user-login" element={<Login initialRole="CANDIDATE" />} />
          <Route path="/hr-login" element={<Login initialRole="HR" />} />
          <Route path="/admin-login" element={<Login initialRole="ADMIN" />} />
          <Route path="/register" element={<BlockedRoute />} />
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
          {/* ── Dedicated Admin Portals ── */}
          <Route path="/admin-application-developere-suit" element={<AdminPortal mode="DEVELOPER" />} />
          <Route path="/admin-application-developer-suit" element={<AdminPortal mode="DEVELOPER" />} />
          <Route path="/admin-application-developer-suite" element={<AdminPortal mode="DEVELOPER" />} />
          <Route path="/admin-Management-team" element={<AdminPortal mode="MANAGEMENT" />} />
          <Route path="/admin-management-team" element={<AdminPortal mode="MANAGEMENT" />} />
          <Route path="/admin-Register-Company" element={<AdminPortal mode="COMPANY" />} />
          <Route path="/admin-register-company" element={<AdminPortal mode="COMPANY" />} />
          <Route path="/admin-portal/:companySlug" element={<AdminPortal mode="COMPANY" />} />
          <Route path="/Admin-:companySlug" element={<AdminPortal mode="COMPANY" />} />
          <Route path="/admin-:companySlug" element={<AdminPortal mode="COMPANY" />} />
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
