import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Briefcase, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  FolderGit2, 
  FileText,
  Users,
  MessageSquare,
  Sun,
  Moon,
  User,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Code2
} from 'lucide-react';
import { apiClient } from '../api/client';
import { HireMindLogo } from './HireMindLogo';
import { AiLogo } from './AiLogo';
import { NotificationBell } from './NotificationBell';
import { getAdminDashboardRoute } from '../utils/roleRoutes';
import '../css/navbar.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isCandidate, isHr, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [devWorkspaceEligible, setDevWorkspaceEligible] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && isCandidate) {
      apiClient.get('/developer-workspace/eligibility')
        .then(res => {
          if (isMounted) setDevWorkspaceEligible(!!res.data?.data?.eligible);
        })
        .catch(() => {
          if (isMounted) setDevWorkspaceEligible(false);
        });
    } else {
      setDevWorkspaceEligible(false);
    }
    return () => { isMounted = false; };
  }, [isAuthenticated, isCandidate]);

  const profileRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout('/');
  };

  const adminHomePath = getAdminDashboardRoute(user?.roles || []);

  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <nav className="global-navbar">
      {/* Brand Logo */}
      <Link to={isHr ? '/hr-analytics' : isAdmin ? adminHomePath : isCandidate ? '/dashboard' : '/'} className="nav-brand-link">
        <HireMindLogo variant="navbar" size="md" />
      </Link>

      {/* Navigation Links (Desktop) */}
      {isAuthenticated && (
        <div className={`nav-links-group ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {isHr ? (
            <>
              <Link to="/hr-analytics" className={`btn btn-secondary nav-link-btn ${location.pathname === '/hr-analytics' ? 'active-link' : ''}`}>
                <BarChart3 size={15} color="var(--primary-cyan)" /> HR Dashboard
              </Link>
              <Link to="/hr-applications" className={`btn btn-secondary nav-link-btn ${location.pathname === '/hr-applications' ? 'active-cyan' : ''}`}>
                <Users size={15} color="var(--primary-cyan)" /> Applicants
              </Link>
              <Link to="/hr-messages" className={`btn btn-secondary nav-link-btn ${location.pathname === '/hr-messages' ? 'active-cyan' : ''}`}>
                <MessageSquare size={15} color="var(--primary-cyan)" /> HR Messages
              </Link>
              <Link to="/copilot" className={`btn btn-secondary nav-link-btn ${location.pathname === '/copilot' ? 'active-cyan' : ''}`}>
                <AiLogo size={16} /> HR AI Copilot
              </Link>
              <Link to="/jobs" className={`btn btn-secondary nav-link-btn ${location.pathname === '/jobs' ? 'active-link' : ''}`}>
                <Briefcase size={15} /> Jobs
              </Link>
            </>
          ) : isCandidate ? (
            <>
              <Link to="/dashboard" className={`btn btn-secondary nav-link-btn ${location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/candidate') ? 'active-link' : ''}`}>
                <LayoutDashboard size={15} color="var(--primary-cyan)" /> Dashboard
              </Link>
              {devWorkspaceEligible && (
                <Link
                  to="/developer-workspace"
                  className="btn btn-secondary nav-link-btn"
                  style={{
                    background: 'rgba(37, 99, 235, 0.15)',
                    border: '1px solid rgba(37, 99, 235, 0.4)',
                    color: '#38BDF8',
                    fontWeight: 700
                  }}
                  title="Switch to Developer Workspace"
                >
                  <Code2 size={15} color="#38BDF8" /> Dev Workspace
                </Link>
              )}
            </>
          ) : (
            <Link to="/jobs" className={`btn btn-secondary nav-link-btn ${location.pathname === '/jobs' ? 'active-link' : ''}`}>
              <Briefcase size={15} /> Jobs
            </Link>
          )}

          {isAdmin && (
            <Link to={adminHomePath} className={`btn btn-secondary nav-link-btn ${location.pathname.startsWith('/admin') ? 'active-rose' : ''}`}>
              <ShieldCheck size={15} color="var(--accent-rose)" /> Admin Portal
            </Link>
          )}
        </div>
      )}

      {/* Right Action Icons & Profile Dropdown */}
      <div className="nav-right-actions">
        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <NotificationBell />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary nav-circle-btn"
              title={theme === 'universe' ? 'Switch to Light Mode' : 'Switch to Galaxy / Universe Theme'}
              aria-label="Toggle Theme"
            >
              {theme === 'universe' ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color="#7C3AED" />}
            </button>

            {/* Compact Profile Avatar Button with Dropdown (NO name in main bar) */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                }}
                className="nav-profile-avatar-btn"
                title="Open User Profile"
                aria-label="User Profile"
              >
                <div className="nav-user-avatar">
                  {userInitial}
                </div>
                <ChevronDown size={12} className={`nav-avatar-chevron ${showProfileMenu ? 'open' : ''}`} />
              </button>

              {/* Profile Dropdown (Name, Role, Email appear HERE when opened) */}
              {showProfileMenu && (
                <div className="glass-panel nav-profile-dropdown">
                  <div className="nav-profile-dropdown-header">
                    <div className="nav-profile-avatar-large">
                      {userInitial}
                    </div>
                    <div className="nav-profile-user-info">
                      <span className="nav-profile-name">
                        {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User Profile'}
                      </span>
                      <span className="nav-profile-role">
                        {isHr ? 'HR Recruiter' : isAdmin ? 'Platform Admin' : 'Candidate'}
                      </span>
                      {user?.email && (
                        <span className="nav-profile-email">{user.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="nav-profile-dropdown-divider" />

                  <div className="nav-profile-dropdown-menu">
                    {isCandidate ? (
                      <>
                        <Link 
                          to="/dashboard?tab=overview" 
                          onClick={() => setShowProfileMenu(false)} 
                          className="nav-profile-menu-item"
                        >
                          <LayoutDashboard size={15} /> Dashboard
                        </Link>
                        {devWorkspaceEligible && (
                          <Link 
                            to="/developer-workspace" 
                            onClick={() => setShowProfileMenu(false)} 
                            className="nav-profile-menu-item"
                            style={{ color: '#38BDF8', fontWeight: 600 }}
                          >
                            <Code2 size={15} color="#38BDF8" /> Switch to Dev Workspace
                          </Link>
                        )}
                        <Link 
                          to="/dashboard?tab=portfolio" 
                          onClick={() => setShowProfileMenu(false)} 
                          className="nav-profile-menu-item"
                        >
                          <FolderGit2 size={15} /> Portfolio & Resumes
                        </Link>
                        <Link 
                          to="/dashboard?tab=applications" 
                          onClick={() => setShowProfileMenu(false)} 
                          className="nav-profile-menu-item"
                        >
                          <FileText size={15} /> My Applications
                        </Link>
                      </>
                    ) : (
                      <Link 
                        to="/profile" 
                        onClick={() => setShowProfileMenu(false)} 
                        className="nav-profile-menu-item"
                      >
                        <User size={15} /> My Profile Center
                      </Link>
                    )}

                    <button 
                      onClick={handleLogout} 
                      className="nav-profile-menu-item logout"
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-secondary nav-circle-btn nav-mobile-toggle"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </>
        ) : (
          <div className="nav-unauth-actions">
            <button
              onClick={toggleTheme}
              className="btn btn-secondary nav-circle-btn"
              title={theme === 'universe' ? 'Switch to Light Mode' : 'Switch to Galaxy / Universe Theme'}
              aria-label="Toggle Theme"
            >
              {theme === 'universe' ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color="#7C3AED" />}
            </button>
            <Link to="/user-login" className="btn btn-secondary btn-sm">Sign In</Link>
            <Link to="/user-login" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
