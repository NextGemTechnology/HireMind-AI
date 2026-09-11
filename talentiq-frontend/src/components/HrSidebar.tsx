import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  LayoutDashboard, MessageSquare, Calendar, Briefcase,
  Users, Star, UserCircle2, BarChart2,
  Settings, LogOut, Sparkles, CreditCard, X
} from 'lucide-react';
import '../css/hr-sidebar.css';

export type HrNavKey =
  | 'Dashboard'
  | 'Subscription'
  | 'Message'
  | 'Calendar'
  | 'Jobs'
  | 'Candidates'
  | 'Copilot'
  | 'TeamChat'
  | 'Referrals'
  | 'Employee'
  | 'Report'
  | 'Settings';

interface HrSidebarProps {
  activeNav: HrNavKey | string;
  onSelectNav?: (nav: HrNavKey) => void;
  unreadCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const HrSidebar: React.FC<HrSidebarProps> = ({
  activeNav,
  onSelectNav,
  unreadCount = 0,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [hrProfile, setHrProfile] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/hr/me')
      .then(res => {
        if (res.data?.data) {
          setHrProfile(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleNavClick = (key: HrNavKey, directPath?: string) => {
    if (onSelectNav) {
      onSelectNav(key);
    }
    if (directPath) {
      navigate(directPath);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const hrName = user ? `${user.firstName || 'HR'} ${user.lastName || 'Recruiter'}`.trim() : 'HR Lead';
  const hrEmail = user?.email || 'hr.recruiter@hiremind.ai';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div 
        className={`hr-drawer-backdrop ${mobileOpen ? 'open' : ''}`} 
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`hr-sidebar-aside ${mobileOpen ? 'drawer-open' : ''}`}>
        {/* Brand Header */}
        <div className="hr-sidebar-brand" onClick={() => handleNavClick('Dashboard', '/hr-analytics')}>
          <div className="hr-sidebar-brand-icon">
            H
          </div>
          <div className="hr-sidebar-brand-text" style={{ flex: 1 }}>
            <div className="hr-sidebar-brand-title">HireMind AI</div>
            <div className="hr-sidebar-brand-sub">HR PORTAL</div>
          </div>
          {mobileOpen && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCloseMobile?.(); }}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
          {/* Main Menu */}
          <div style={{ marginBottom: '10px' }}>
            <div className="hr-sidebar-nav-section-title">Main Menu</div>

            <button
              onClick={() => handleNavClick('Dashboard', '/hr-analytics')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Dashboard' ? 'active' : ''}`}
              title="Dashboard"
            >
              <div className="hr-sidebar-nav-left">
                <LayoutDashboard size={18} />
                <span className="hr-sidebar-nav-label">Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('Message', '/hr-messages')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Message' ? 'active' : ''}`}
              title="Candidate Messages"
            >
              <div className="hr-sidebar-nav-left">
                <MessageSquare size={18} />
                <span className="hr-sidebar-nav-label">Candidate Messages</span>
              </div>
              {unreadCount > 0 && (
                <span className="hr-sidebar-badge">{unreadCount}</span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('Calendar', '/hr-calendar')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Calendar' ? 'active' : ''}`}
              title="Interviews & Calendar"
            >
              <div className="hr-sidebar-nav-left">
                <Calendar size={18} />
                <span className="hr-sidebar-nav-label">Interviews & Calendar</span>
              </div>
            </button>
          </div>

          {/* Recruitment & Talent */}
          <div style={{ marginBottom: '10px' }}>
            <div className="hr-sidebar-nav-section-title">Recruitment</div>

            <button
              onClick={() => handleNavClick('Jobs', '/jobs')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Jobs' ? 'active' : ''}`}
              title="Job Postings"
            >
              <div className="hr-sidebar-nav-left">
                <Briefcase size={18} />
                <span className="hr-sidebar-nav-label">Job Postings</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('Candidates', '/hr-applications')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Candidates' ? 'active' : ''}`}
              title="Applications & Pipeline"
            >
              <div className="hr-sidebar-nav-left">
                <Users size={18} />
                <span className="hr-sidebar-nav-label">Applications & Pipeline</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('Copilot', '/copilot')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Copilot' ? 'active' : ''}`}
              title="AI Copilot"
            >
              <div className="hr-sidebar-nav-left">
                <Sparkles size={18} />
                <span className="hr-sidebar-nav-label">AI Copilot</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('TeamChat', '/team-chat')}
              className={`hr-sidebar-nav-btn ${activeNav === 'TeamChat' ? 'active' : ''}`}
              title="Team Collaboration"
            >
              <div className="hr-sidebar-nav-left">
                <Sparkles size={18} />
                <span className="hr-sidebar-nav-label">Team Collaboration</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('Referrals', '/hr-analytics?tab=referrals')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Referrals' ? 'active' : ''}`}
              title="My Referrals"
            >
              <div className="hr-sidebar-nav-left">
                <Star size={18} />
                <span className="hr-sidebar-nav-label">My Referrals</span>
              </div>
            </button>
          </div>

          {/* Subscription & Plans */}
          <div style={{ marginBottom: '10px' }}>
            <div className="hr-sidebar-nav-section-title">Subscription</div>

            <button
              onClick={() => handleNavClick('Subscription', '/hr-analytics?tab=subscription')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Subscription' ? 'active' : ''}`}
              title="Subscription & Plans"
            >
              <div className="hr-sidebar-nav-left">
                <CreditCard size={18} />
                <span className="hr-sidebar-nav-label">Subscription & Plans</span>
              </div>
            </button>
          </div>

          {/* Organization */}
          <div style={{ marginBottom: '6px' }}>
            <div className="hr-sidebar-nav-section-title">Organization</div>

            <button
              onClick={() => handleNavClick('Employee', '/hr-analytics?tab=employee')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Employee' ? 'active' : ''}`}
              title="Verified Employees"
            >
              <div className="hr-sidebar-nav-left">
                <UserCircle2 size={18} />
                <span className="hr-sidebar-nav-label">Verified Employees</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('Report', '/hr-analytics?tab=report')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Report' ? 'active' : ''}`}
              title="Telemetry Reports"
            >
              <div className="hr-sidebar-nav-left">
                <BarChart2 size={18} />
                <span className="hr-sidebar-nav-label">Telemetry Reports</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('Settings', '/hr-analytics?tab=settings')}
              className={`hr-sidebar-nav-btn ${activeNav === 'Settings' ? 'active' : ''}`}
              title="Settings"
            >
              <div className="hr-sidebar-nav-left">
                <Settings size={18} />
                <span className="hr-sidebar-nav-label">Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
          <div className="hr-sidebar-user-card">
            <div className="hr-sidebar-avatar">
              {hrName.charAt(0).toUpperCase()}
            </div>
            <div className="hr-sidebar-user-details" style={{ flex: 1, minWidth: 0 }}>
              <div className="hr-sidebar-user-name">{hrName}</div>
              <div className="hr-sidebar-user-company">{hrProfile?.company?.name || hrEmail}</div>
            </div>
          </div>

          <button
            onClick={() => { logout('/hr-login'); }}
            className="hr-sidebar-signout-btn"
            title="Sign Out"
          >
            <LogOut size={16} />
            <span className="hr-sidebar-signout-text">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default HrSidebar;
