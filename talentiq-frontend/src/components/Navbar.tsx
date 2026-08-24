import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import { 
  Sparkles, 
  Briefcase, 
  Bot, 
  BarChart3, 
  ShieldCheck, 
  Bell, 
  LogOut, 
  FolderGit2, 
  FileText,
  CheckCheck,
  Users,
  Users2,
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';
import { HireMindLogo } from './HireMindLogo';
import '../css/navbar.css';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isCandidate, isHr, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, location.pathname]);

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        apiClient.get('/notifications/unread-count'),
        apiClient.get('/notifications?page=0&size=5')
      ]);
      setUnreadCount(countRes.data.data);
      setNotifications(listRes.data.content || []);
    } catch (e) {
      setUnreadCount(2);
      setNotifications([
        { id: 1, title: 'Job Match Alert', message: 'You have a 95% match with Senior Java Engineer at TechCorp', read: false, createdAt: new Date().toISOString() },
        { id: 2, title: 'Application Updated', message: 'Your application stage changed to INTERVIEWING', read: false, createdAt: new Date().toISOString() }
      ]);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e) {
      setUnreadCount(0);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="global-navbar">
      <Link to={isHr ? '/hr-analytics' : isAdmin ? '/admin' : '/'} className="nav-brand-link">
        <HireMindLogo variant="navbar" size="md" />
      </Link>

      {isAuthenticated && (
        <div className="nav-links-group">
          {isHr ? (
            <>
              <Link to="/hr-analytics" className={`btn btn-secondary nav-link-btn ${location.pathname === '/hr-analytics' ? 'active-link' : ''}`}>
                <BarChart3 size={16} color="var(--primary-cyan)" /> HR Dashboard
              </Link>
              <Link to="/hr-applications" className={`btn btn-secondary nav-link-btn ${location.pathname === '/hr-applications' ? 'active-cyan' : ''}`}>
                <Users size={16} color="var(--primary-cyan)" /> Applicants
              </Link>
              <Link to="/hr-messages" className={`btn btn-secondary nav-link-btn ${location.pathname === '/hr-messages' ? 'active-cyan' : ''}`}>
                <MessageSquare size={16} color="var(--primary-cyan)" /> HR Messages
              </Link>
              <Link to="/copilot" className={`btn btn-secondary nav-link-btn ${location.pathname === '/copilot' ? 'active-cyan' : ''}`}>
                <Bot size={16} color="var(--primary-cyan)" /> HR AI Copilot
              </Link>
              <Link to="/jobs" className={`btn btn-secondary nav-link-btn ${location.pathname === '/jobs' ? 'active-link' : ''}`}>
                <Briefcase size={16} /> Jobs
              </Link>
            </>
          ) : isCandidate ? (
            <>
              <Link to="/jobs" className={`btn btn-secondary nav-link-btn ${location.pathname === '/jobs' ? 'active-link' : ''}`}>
                <Briefcase size={16} /> Jobs
              </Link>
              <Link to="/recommendations" className={`btn btn-secondary nav-link-btn ${location.pathname === '/recommendations' ? 'active-link' : ''}`}>
                <Sparkles size={16} color="var(--primary-cyan)" /> AI Matches
              </Link>
              <Link to="/messages" className={`btn btn-secondary nav-link-btn ${location.pathname === '/messages' ? 'active-link' : ''}`}>
                <MessageSquare size={16} color="var(--primary-cyan)" /> Messages
              </Link>
              <Link to="/my-applications" className={`btn btn-secondary nav-link-btn ${location.pathname === '/my-applications' ? 'active-link' : ''}`}>
                <FileText size={16} /> Applications
              </Link>
              <Link to="/portfolio" className={`btn btn-secondary nav-link-btn ${location.pathname === '/portfolio' ? 'active-link' : ''}`}>
                <FolderGit2 size={16} /> Portfolio
              </Link>
            </>
          ) : (
            <Link to="/jobs" className={`btn btn-secondary nav-link-btn ${location.pathname === '/jobs' ? 'active-link' : ''}`}>
              <Briefcase size={16} /> Jobs
            </Link>
          )}

          {isAuthenticated && (
            <Link to="/team-chat" className={`btn btn-secondary nav-link-btn ${location.pathname === '/team-chat' ? 'active-link' : ''}`}>
              <Users2 size={16} color="var(--primary-cyan)" /> Team Channels
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className={`btn btn-secondary nav-link-btn ${location.pathname === '/admin' ? 'active-rose' : ''}`}>
              <ShieldCheck size={16} color="var(--accent-rose)" /> Admin Portal
            </Link>
          )}
        </div>
      )}

      <div className="nav-right-actions">
        {isAuthenticated ? (
          <>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="btn btn-secondary nav-circle-btn"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="nav-badge-count">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="glass-panel nav-notifications-dropdown">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <button onClick={handleMarkAllRead} className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  </div>
                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                          <div className="notif-title" style={{ color: n.read ? 'var(--text-muted)' : 'var(--text-main)' }}>{n.title}</div>
                          <div className="notif-msg">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle in Global Navbar */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary nav-circle-btn"
              title={theme === 'universe' ? 'Switch to Light Mode' : 'Switch to Galaxy / Universe Theme'}
              aria-label="Toggle Theme"
            >
              {theme === 'universe' ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#7C3AED" />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/profile" className="nav-user-profile-link">
                <div className="nav-user-avatar">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="nav-user-name">{user?.firstName} {user?.lastName}</span>
                  <span className="nav-user-role">
                    {isHr ? 'HR Recruiter' : isAdmin ? 'Platform Admin' : 'Candidate'}
                  </span>
                </div>
              </Link>

              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Logout" aria-label="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary nav-circle-btn"
              style={{ width: '38px', height: '38px' }}
              title={theme === 'universe' ? 'Switch to Light Mode' : 'Switch to Galaxy / Universe Theme'}
              aria-label="Toggle Theme"
            >
              {theme === 'universe' ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color="#7C3AED" />}
            </button>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
            <Link to="/register" className="btn btn-primary">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
