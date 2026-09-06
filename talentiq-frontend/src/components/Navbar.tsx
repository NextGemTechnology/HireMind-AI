import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sparkles, 
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
  ChevronDown
} from 'lucide-react';
import { HireMindLogo } from './HireMindLogo';
import { AiLogo } from './AiLogo';
import { NotificationBell } from './NotificationBell';
import { getAdminDashboardRoute } from '../utils/roleRoutes';
import '../css/navbar.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isCandidate, isHr, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
    logout();
    navigate('/');
  };

  const adminHomePath = getAdminDashboardRoute(user?.roles || []);

  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <nav className="global-navbar">
      {/* Brand Logo */}
      <Link to={isHr ? '/hr-analytics' : isAdmin ? adminHomePath : '/'} className="nav-brand-link">
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
              <Link to="/jobs" className={`btn btn-secondary nav-link-btn ${location.pathname === '/jobs' ? 'active-link' : ''}`}>
                <Briefcase size={15} /> Jobs
              </Link>
              <Link to="/recommendations" className={`btn btn-secondary nav-link-btn ${location.pathname === '/recommendations' ? 'active-link' : ''}`}>
                <Sparkles size={15} color="var(--primary-cyan)" /> AI Matches
              </Link>
              <Link to="/messages" className={`btn btn-secondary nav-link-btn ${location.pathname === '/messages' ? 'active-link' : ''}`}>
                <MessageSquare size={15} color="var(--primary-cyan)" /> Messages
              </Link>
              <Link to="/my-applications" className={`btn btn-secondary nav-link-btn ${location.pathname === '/my-applications' ? 'active-link' : ''}`}>
                <FileText size={15} /> Applications
              </Link>
              <Link to="/portfolio" className={`btn btn-secondary nav-link-btn ${location.pathname === '/portfolio' ? 'active-link' : ''}`}>
                <FolderGit2 size={15} /> Portfolio
              </Link>
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
                    <Link 
                      to="/profile" 
                      onClick={() => setShowProfileMenu(false)} 
                      className="nav-profile-menu-item"
                    >
                      <User size={15} /> My Profile Center
                    </Link>

                    {isCandidate && (
                      <Link 
                        to="/portfolio" 
                        onClick={() => setShowProfileMenu(false)} 
                        className="nav-profile-menu-item"
                      >
                        <FolderGit2 size={15} /> Portfolio & Resumes
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
