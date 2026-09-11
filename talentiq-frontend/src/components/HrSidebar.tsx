import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  LayoutDashboard, MessageSquare, Calendar, Briefcase,
  Users, Star, UserCircle2, BarChart2,
  Settings, LogOut, Sparkles, ChevronDown,
  UserPlus, DollarSign, AlertTriangle, ShieldCheck,
  CreditCard, X
} from 'lucide-react';
import { AiLogo } from './AiLogo';
import '../css/hr-sidebar.css';

export type HrNavKey =
  | 'Dashboard'
  | 'Message'
  | 'Calendar'
  | 'Jobs'
  | 'Candidates'
  | 'Copilot'
  | 'TeamChat'
  | 'Referrals'
  | 'Employee'
  | 'Report'
  | 'Settings'
  | 'Subscription';

interface HrSubmenuItem {
  id: string;
  label: string;
  navKey: HrNavKey;
  path: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface HrNavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultNavKey: HrNavKey;
  defaultPath: string;
  badge?: string | number;
  badgeColor?: string;
  submenus: HrSubmenuItem[];
}

interface HrSidebarProps {
  activeNav: HrNavKey | string;
  onSelectNav?: (nav: HrNavKey) => void;
  unreadCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const HrSidebar: React.FC<HrSidebarProps> = ({
  activeNav,
  onSelectNav,
  unreadCount = 0,
  isOpen = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const HR_NAV_GROUPS: HrNavGroup[] = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard & Analytics',
      icon: <LayoutDashboard size={17} />,
      defaultNavKey: 'Dashboard',
      defaultPath: '/hr-analytics',
      submenus: [
        { id: 'dash_overview', label: 'Executive Overview', navKey: 'Dashboard', path: '/hr-analytics', icon: <BarChart2 size={14} /> },
        { id: 'dash_referrals', label: 'Candidate Referrals', navKey: 'Referrals', path: '/hr-analytics?tab=referrals', icon: <Star size={14} /> },
        { id: 'dash_sub', label: 'Subscription & Billing', navKey: 'Subscription', path: '/hr-analytics?tab=subscription', icon: <CreditCard size={14} /> },
        { id: 'dash_telemetry', label: 'Telemetry Reports', navKey: 'Report', path: '/hr-analytics?tab=report', icon: <BarChart2 size={14} /> },
        { id: 'dash_settings', label: 'Workspace Settings', navKey: 'Settings', path: '/hr-analytics?tab=settings', icon: <Settings size={14} /> },
      ],
    },
    {
      id: 'RECRUITMENT',
      label: 'Recruitment & Jobs',
      icon: <Briefcase size={17} />,
      defaultNavKey: 'Jobs',
      defaultPath: '/jobs',
      submenus: [
        { id: 'rec_jobs', label: 'Active Job Postings', navKey: 'Jobs', path: '/jobs', icon: <Briefcase size={14} /> },
        { id: 'rec_candidates', label: 'Applications & Pipeline', navKey: 'Candidates', path: '/hr-applications', icon: <Users size={14} /> },
        { id: 'rec_copilot', label: 'AI Talent Copilot', navKey: 'Copilot', path: '/copilot', icon: <AiLogo size={14} /> },
      ],
    },
    {
      id: 'COMMUNICATIONS',
      label: 'Interviews & Comms',
      icon: <MessageSquare size={17} />,
      defaultNavKey: 'Message',
      defaultPath: '/hr-messages',
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: '#EF4444',
      submenus: [
        {
          id: 'comms_msg',
          label: 'Candidate Messages',
          navKey: 'Message',
          path: '/hr-messages',
          icon: <MessageSquare size={14} />,
          badge: unreadCount > 0 ? unreadCount : undefined,
          badgeColor: '#EF4444'
        },
        { id: 'comms_cal', label: 'Interview Calendar', navKey: 'Calendar', path: '/hr-calendar', icon: <Calendar size={14} /> },
        { id: 'comms_chat', label: 'Team Collaboration', navKey: 'TeamChat', path: '/team-chat', icon: <Sparkles size={14} /> },
      ],
    },
    {
      id: 'WORKFORCE',
      label: 'Verified Workforce',
      icon: <UserCircle2 size={17} />,
      defaultNavKey: 'Employee',
      defaultPath: '/hr-analytics?tab=employee',
      submenus: [
        { id: 'wf_dir', label: 'Verified Directory', navKey: 'Employee', path: '/hr-analytics?tab=employee', icon: <ShieldCheck size={14} /> },
        { id: 'wf_onboard', label: 'Onboard Candidate', navKey: 'Employee', path: '/hr-analytics?tab=employee&open=onboard', icon: <UserPlus size={14} /> },
        { id: 'wf_salary', label: 'Salary Disbursements', navKey: 'Employee', path: '/hr-analytics?tab=employee&filter=ACTIVE', icon: <DollarSign size={14} /> },
        { id: 'wf_notice', label: 'Separation & Notices', navKey: 'Employee', path: '/hr-analytics?tab=employee&filter=ON_NOTICE', icon: <AlertTriangle size={14} /> },
      ],
    },
  ];

  // Accordion open state per menu group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {
      DASHBOARD: true,
      RECRUITMENT: true,
      COMMUNICATIONS: true,
      WORKFORCE: false,
    };
    HR_NAV_GROUPS.forEach(grp => {
      if (grp.defaultNavKey === activeNav || grp.submenus.some(s => s.navKey === activeNav)) {
        init[grp.id] = true;
      }
    });
    return init;
  });

  const handleNavClick = (key: HrNavKey, directPath?: string) => {
    if (onSelectNav) {
      onSelectNav(key);
    }
    if (directPath) {
      navigate(directPath);
    }
    if (onClose) {
      onClose();
    }
  };

  const isGroupActive = (group: HrNavGroup) => {
    return group.defaultNavKey === activeNav || group.submenus.some(s => s.navKey === activeNav);
  };

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isSubmenuActive = (sub: HrSubmenuItem) => {
    const currentFullPath = location.pathname + location.search;
    if (sub.path.includes('?')) {
      return currentFullPath === sub.path || (location.pathname === sub.path.split('?')[0] && location.search.includes(sub.path.split('?')[1]));
    }
    return location.pathname === sub.path && !location.search;
  };

  const hrName = user ? `${user.firstName || 'HR'} ${user.lastName || 'Recruiter'}`.trim() : 'HR Lead';
  const hrEmail = user?.email || 'hr.recruiter@hiremind.ai';

  const sidebarContent = (
    <aside className={`hr-sidebar-aside ${isOpen ? 'mobile-open' : ''}`}>
      {/* ── Brand / Logo Header ── */}
      <div className="hr-sidebar-brand-container">
        <div
          onClick={() => handleNavClick('Dashboard', '/hr-analytics')}
          className="hr-sidebar-brand-link"
        >
          <div className="hr-sidebar-brand-icon">
            <Briefcase size={20} color="#FFFFFF" />
          </div>
          <div className="hr-sidebar-brand-text">
            <div className="hr-sidebar-brand-name">HireMind AI</div>
            <div className="hr-sidebar-brand-sub">HR Portal</div>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="hr-sidebar-close-btn" aria-label="Close sidebar">
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation Menu List with Collapsible Groups ── */}
      <div className="hr-sidebar-scroll-body">
        <div className="hr-sidebar-section-title">
          WORKSPACE NAVIGATION
        </div>

        {HR_NAV_GROUPS.map((group) => {
          const groupActive = isGroupActive(group);
          const isGroupExpanded = Boolean(openGroups[group.id]);

          return (
            <div key={group.id} className={`hr-menu-group ${groupActive ? 'active' : ''}`}>
              {/* Parent Group Accordion Button */}
              <button
                type="button"
                className={`hr-menu-header-btn ${groupActive ? 'active' : ''}`}
                onClick={(e) => toggleGroup(group.id, e)}
              >
                <div className="hr-menu-header-left">
                  <span className="hr-menu-icon">{group.icon}</span>
                  <span className="hr-menu-header-title">{group.label}</span>
                </div>

                <div className="hr-menu-header-right">
                  {group.badge !== undefined && (
                    <span
                      className="hr-menu-badge"
                      style={{ background: group.badgeColor || '#EF4444' }}
                    >
                      {group.badge}
                    </span>
                  )}
                  <ChevronDown
                    size={15}
                    className={`hr-chevron-icon ${isGroupExpanded ? 'open' : ''}`}
                  />
                </div>
              </button>

              {/* Submenu List */}
              {isGroupExpanded && (
                <div className="hr-submenu-list">
                  {group.submenus.map((sub) => {
                    const isSubActive = isSubmenuActive(sub);

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        className={`hr-submenu-item ${isSubActive ? 'active' : ''}`}
                        onClick={() => handleNavClick(sub.navKey, sub.path)}
                      >
                        <div className="hr-submenu-item-left">
                          <span className="hr-submenu-icon">{sub.icon}</span>
                          <span className="hr-submenu-label">{sub.label}</span>
                        </div>

                        {sub.badge !== undefined && (
                          <span
                            className="hr-submenu-badge"
                            style={{ background: sub.badgeColor || '#EF4444' }}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom HR User Profile & Logout ── */}
      <div className="hr-sidebar-footer">
        <div className="hr-sidebar-user-card">
          <div className="hr-sidebar-avatar">
            {hrName.charAt(0).toUpperCase()}
          </div>
          <div className="hr-sidebar-user-details">
            <div className="hr-sidebar-user-name" title={hrName}>
              {hrName}
            </div>
            <div className="hr-sidebar-user-email" title={hrEmail}>
              {hrEmail}
            </div>
            {hrProfile?.companyVerified ? (
              <div className="hr-sidebar-verified-tag" title={`Verified by ${hrProfile.company?.name || 'Company'}`}>
                <ShieldCheck size={11} color="#10B981" />
                <span>{hrProfile.company?.name || 'Verified HR'}</span>
              </div>
            ) : hrProfile ? (
              <div className="hr-sidebar-unverified-tag" title="Awaiting company verification">
                <AlertTriangle size={11} color="#F59E0B" />
                <span>Pending Verification</span>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className="hr-sidebar-signout-btn"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {isOpen && onClose && (
        <div className="hr-sidebar-overlay" onClick={onClose} />
      )}
      {sidebarContent}
    </>
  );
};

export default HrSidebar;
