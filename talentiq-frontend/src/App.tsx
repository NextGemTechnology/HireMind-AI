import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminThemeProvider } from './context/AdminThemeContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public & Auth Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { JobsList } from './pages/JobsList';
import Contact from './pages/Contact';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { CandidateProfile } from './pages/CandidateProfile';

// Candidate Protected Pages
import { CandidateDashboard } from './pages/CandidateDashboard';
import { DeveloperWorkspace } from './pages/DeveloperWorkspace';
import { GroupCollaborationChat } from './pages/GroupCollaborationChat';
import { ProfilePage } from './pages/ProfilePage';

// HR Protected Pages
import { HrCopilot } from './pages/HrCopilot';
import HrAnalytics from './pages/HrAnalytics';
import { HrApplications } from './pages/HrApplications';
import HrMessages from './pages/HrMessages';
import HrCalendar from './pages/HrCalendar';
import { HrGlobalNotificationToast } from './components/HrGlobalNotificationToast';
import { AiGuideChatbot } from './components/AiGuideChatbot';

// 4 Dedicated Admin Dashboards
import { AppDeveloperDashboard } from './pages/AppDeveloperDashboard';
import { ServiceTeamDashboard } from './pages/ServiceTeamDashboard';
import { CompanyManagerDashboard } from './pages/CompanyManagerDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

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

const CandidateMessagesRoute: React.FC = () => {
  const location = useLocation();
  const { isHr } = useAuth();
  if (isHr) {
    return <Navigate to={`/hr-messages${location.search}`} replace />;
  }
  const search = location.search;
  const target = search
    ? `/dashboard${search.includes('tab=') ? search : `${search}&tab=messages`}`
    : '/dashboard?tab=messages';
  return <Navigate to={target} replace />;
};

function AppLayout() {
  const location = useLocation();
  const { isHr } = useAuth();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // If page was loaded from bfcache (Back/Forward navigation) without valid token
      const token = localStorage.getItem('accessToken');
      if (event.persisted && !token) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const HIDE_NAV_ROUTES = [
    '/hr-analytics', '/hr-messages', '/messages', '/hr-calendar', '/hr-applications',
    '/hr-copilot', '/copilot', '/team-chat', '/admin', '/dashboard', '/candidate',
    '/developer-workspace'
  ];
  const isHome = location.pathname === '/';
  const hideNavbar = isHome || (location.pathname === '/jobs' && isHr) || HIDE_NAV_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideNavbar && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<BlockedRoute />} />
          <Route path="/register" element={<BlockedRoute />} />
          <Route path="/user-login" element={<Login initialRole="CANDIDATE" />} />
          <Route path="/hr-login" element={<Login initialRole="HR" />} />
          <Route path="/admin-login" element={<Login initialRole="ADMIN" />} />
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/candidate-profile/:id" element={<CandidateProfile />} />

          {/* ── Single Unified Candidate / User Dashboard ── */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['ROLE_CANDIDATE']}>
              <CandidateDashboard />
            </ProtectedRoute>
          } />
          <Route path="/candidate/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/candidate" element={<Navigate to="/dashboard" replace />} />

          {/* ── Protected Developer Workspace for Verified Candidates ── */}
          <Route path="/developer-workspace" element={
            <ProtectedRoute roles={['ROLE_CANDIDATE']}>
              <DeveloperWorkspace />
            </ProtectedRoute>
          } />

          {/* Candidate Legacy Sub-Routes (Consolidated & Seamlessly Redirected) */}
          <Route path="/recommendations" element={
            <ProtectedRoute roles={['ROLE_CANDIDATE']}>
              <Navigate to="/dashboard?tab=ai-matches" replace />
            </ProtectedRoute>
          } />
          <Route path="/my-applications" element={
            <ProtectedRoute roles={['ROLE_CANDIDATE']}>
              <Navigate to="/dashboard?tab=applications" replace />
            </ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <ProtectedRoute roles={['ROLE_CANDIDATE']}>
              <Navigate to="/dashboard?tab=portfolio" replace />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute roles={['ROLE_CANDIDATE', 'ROLE_HR']}>
              <CandidateMessagesRoute />
            </ProtectedRoute>
          } />
          <Route path="/team-chat" element={
            <ProtectedRoute>
              <GroupCollaborationChat />
            </ProtectedRoute>
          } />

          {/* HR Protected Routes */}
          <Route path="/copilot" element={
            <ProtectedRoute roles={['ROLE_HR']}>
              <HrCopilot />
            </ProtectedRoute>
          } />
          <Route path="/hr-analytics" element={
            <ProtectedRoute roles={['ROLE_HR']}>
              <HrAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/hr-applications" element={
            <ProtectedRoute roles={['ROLE_HR']}>
              <HrApplications />
            </ProtectedRoute>
          } />
          <Route path="/hr-messages" element={
            <ProtectedRoute roles={['ROLE_HR']}>
              <HrMessages />
            </ProtectedRoute>
          } />
          <Route path="/hr-calendar" element={
            <ProtectedRoute roles={['ROLE_HR']}>
              <HrCalendar />
            </ProtectedRoute>
          } />

          {/* ── 4 Dedicated Admin Dashboards with Strict RBAC Isolation ── */}
          {/* Role 1: Application Developer */}
          <Route path="/admin/developer" element={
            <ProtectedRoute roles={['ROLE_APP_DEVELOPER']}>
              <AppDeveloperDashboard />
            </ProtectedRoute>
          } />

          {/* Role 2: Service Team */}
          <Route path="/admin/service-team" element={
            <ProtectedRoute roles={['ROLE_SERVICE_TEAM', 'ROLE_MANAGEMENT_TEAM']}>
              <ServiceTeamDashboard />
            </ProtectedRoute>
          } />

          {/* Role 3: Company Manager */}
          <Route path="/admin/company" element={
            <ProtectedRoute roles={['ROLE_COMPANY_ADMIN']}>
              <CompanyManagerDashboard />
            </ProtectedRoute>
          } />

          {/* Role 4: Super Admin */}
          <Route path="/admin/super-admin" element={
            <ProtectedRoute roles={['ROLE_SUPER_ADMIN', 'ROLE_PLATFORM_ADMIN']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />

          {/* User Profile */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <HrGlobalNotificationToast />
      <AiGuideChatbot />
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
