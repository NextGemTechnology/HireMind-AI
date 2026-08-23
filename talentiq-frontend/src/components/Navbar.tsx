import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isCandidate, isHr, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const [theme, setTheme] = useState<'light' | 'universe'>(() => {
    return (localStorage.getItem('hr_theme') as 'light' | 'universe') || 'universe';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'universe' : 'light';
    setTheme(next);
    localStorage.setItem('hr_theme', next);
    // Dispatch storage event or update body class
    document.body.className = next === 'light' ? 'theme-light' : 'theme-universe';
  };

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
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 24px',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Link to={isHr ? '/hr-analytics' : isAdmin ? '/admin' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'var(--gradient-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Sparkles size={24} color="#FFF" />
        </div>
        <div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFF' }}>
            Talent<span className="text-gradient">IQ</span>
          </span>
          <span style={{ display: 'block', fontSize: '10px', color: 'var(--primary-cyan)', fontWeight: 600, letterSpacing: '0.1em' }}>
            AI INTELLIGENCE
          </span>
        </div>
      </Link>

      {isAuthenticated && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isHr ? (
            <>
              <Link to="/hr-analytics" className="btn btn-secondary" style={{ border: location.pathname === '/hr-analytics' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <BarChart3 size={16} color="var(--primary-cyan)" /> HR Dashboard
              </Link>
              <Link to="/hr-applications" className="btn btn-secondary" style={{ border: location.pathname === '/hr-applications' ? '1px solid var(--primary-cyan)' : 'none' }}>
                <Users size={16} color="var(--primary-cyan)" /> Applicants
              </Link>
              <Link to="/hr-messages" className="btn btn-secondary" style={{ border: location.pathname === '/hr-messages' ? '1px solid var(--primary-cyan)' : 'none' }}>
                <MessageSquare size={16} color="var(--primary-cyan)" /> HR Messages
              </Link>
              <Link to="/copilot" className="btn btn-secondary" style={{ border: location.pathname === '/copilot' ? '1px solid var(--primary-cyan)' : 'none' }}>
                <Bot size={16} color="var(--primary-cyan)" /> HR AI Copilot
              </Link>
              <Link to="/jobs" className="btn btn-secondary" style={{ border: location.pathname === '/jobs' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <Briefcase size={16} /> Jobs
              </Link>
            </>
          ) : isCandidate ? (
            <>
              <Link to="/jobs" className="btn btn-secondary" style={{ border: location.pathname === '/jobs' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <Briefcase size={16} /> Jobs
              </Link>
              <Link to="/recommendations" className="btn btn-secondary" style={{ border: location.pathname === '/recommendations' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <Sparkles size={16} color="var(--primary-cyan)" /> AI Matches
              </Link>
              <Link to="/messages" className="btn btn-secondary" style={{ border: location.pathname === '/messages' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <MessageSquare size={16} color="var(--primary-cyan)" /> Messages
              </Link>
              <Link to="/my-applications" className="btn btn-secondary" style={{ border: location.pathname === '/my-applications' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <FileText size={16} /> Applications
              </Link>
              <Link to="/portfolio" className="btn btn-secondary" style={{ border: location.pathname === '/portfolio' ? '1px solid var(--primary-indigo)' : 'none' }}>
                <FolderGit2 size={16} /> Portfolio
              </Link>
            </>
          ) : (
            <Link to="/jobs" className="btn btn-secondary" style={{ border: location.pathname === '/jobs' ? '1px solid var(--primary-indigo)' : 'none' }}>
              <Briefcase size={16} /> Jobs
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="btn btn-secondary" style={{ border: location.pathname === '/admin' ? '1px solid var(--accent-rose)' : 'none' }}>
              <ShieldCheck size={16} color="var(--accent-rose)" /> Admin Portal
            </Link>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated ? (
          <>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="btn btn-secondary"
                style={{ position: 'relative', width: '42px', height: '42px', padding: 0, borderRadius: '50%' }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--accent-rose)',
                    color: '#FFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  right: 0,
                  top: '52px',
                  width: '360px',
                  padding: '16px',
                  zIndex: 200,
                  background: 'var(--bg-glass-heavy)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px' }}>Notifications</h4>
                    <button onClick={handleMarkAllRead} className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '10px',
                          borderRadius: '8px',
                          background: n.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: n.read ? 'var(--text-muted)' : 'var(--text-main)' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{n.message}</div>
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
              className="btn btn-secondary"
              style={{
                width: '42px',
                height: '42px',
                padding: 0,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title={theme === 'universe' ? 'Switch to Light Mode' : 'Switch to Galaxy / Universe Theme'}
            >
              {theme === 'universe' ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#7C3AED" />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-main)' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--gradient-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#FFF'
                }}>
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{user?.firstName} {user?.lastName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary-cyan)' }}>
                    {isHr ? 'HR Recruiter' : isAdmin ? 'Platform Admin' : 'Candidate'}
                  </span>
                </div>
              </Link>

              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
            <Link to="/register" className="btn btn-primary">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
};
