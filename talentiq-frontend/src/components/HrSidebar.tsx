import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import {
  LayoutDashboard, MessageSquare, Calendar, Briefcase,
  Users, Star, UserCircle2, BarChart2,
  Settings, LogOut, Sparkles, ChevronDown, Pin,
  UserPlus, DollarSign, AlertTriangle, ShieldCheck
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
  | 'Settings';

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
}

export const HrSidebar: React.FC<HrSidebarProps> = ({
  activeNav,
  onSelectNav,
  unreadCount = 0,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isUniverse } = useTheme();
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
      icon: <LayoutDashboard size={16} />,
      defaultNavKey: 'Dashboard',
      defaultPath: '/hr-analytics',
      submenus: [
        { id: 'dash_overview', label: 'Executive Overview', navKey: 'Dashboard', path: '/hr-analytics', icon: <BarChart2 size={13} /> },
        { id: 'dash_referrals', label: 'Candidate Referrals', navKey: 'Referrals', path: '/hr-analytics?tab=referrals', icon: <Star size={13} /> },
        { id: 'dash_telemetry', label: 'Telemetry Reports', navKey: 'Report', path: '/hr-analytics?tab=report', icon: <BarChart2 size={13} /> },
        { id: 'dash_settings', label: 'Workspace Settings', navKey: 'Settings', path: '/hr-analytics?tab=settings', icon: <Settings size={13} /> },
      ],
    },
    {
      id: 'RECRUITMENT',
      label: 'Recruitment & Jobs',
      icon: <Briefcase size={16} />,
      defaultNavKey: 'Jobs',
      defaultPath: '/jobs',
      submenus: [
        { id: 'rec_jobs', label: 'Active Job Postings', navKey: 'Jobs', path: '/jobs', icon: <Briefcase size={13} /> },
        { id: 'rec_candidates', label: 'Applications & Pipeline', navKey: 'Candidates', path: '/hr-applications', icon: <Users size={13} /> },
        { id: 'rec_copilot', label: 'AI Talent Copilot', navKey: 'Copilot', path: '/copilot', icon: <AiLogo size={13} /> },
      ],
    },
    {
      id: 'COMMUNICATIONS',
      label: 'Interviews & Comms',
      icon: <MessageSquare size={16} />,
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
          icon: <MessageSquare size={13} />,
          badge: unreadCount > 0 ? unreadCount : undefined,
          badgeColor: '#EF4444'
        },
        { id: 'comms_cal', label: 'Interview Calendar', navKey: 'Calendar', path: '/hr-calendar', icon: <Calendar size={13} /> },
        { id: 'comms_chat', label: 'Team Collaboration', navKey: 'TeamChat', path: '/team-chat', icon: <Sparkles size={13} /> },
      ],
    },
    {
      id: 'WORKFORCE',
      label: 'Verified Workforce',
      icon: <UserCircle2 size={16} />,
      defaultNavKey: 'Employee',
      defaultPath: '/hr-analytics?tab=employee',
      submenus: [
        { id: 'wf_dir', label: 'Verified Directory', navKey: 'Employee', path: '/hr-analytics?tab=employee', icon: <ShieldCheck size={13} /> },
        { id: 'wf_onboard', label: 'Onboard Candidate', navKey: 'Employee', path: '/hr-analytics?tab=employee&open=onboard', icon: <UserPlus size={13} /> },
        { id: 'wf_salary', label: 'Salary Disbursements', navKey: 'Employee', path: '/hr-analytics?tab=employee&filter=ACTIVE', icon: <DollarSign size={13} /> },
        { id: 'wf_notice', label: 'Separation & Notices', navKey: 'Employee', path: '/hr-analytics?tab=employee&filter=ON_NOTICE', icon: <AlertTriangle size={13} /> },
      ],
    },
  ];

  // Track hover and pinned (stable) states per menu group
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [pinnedGroups, setPinnedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
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
  };

  const isGroupActive = (group: HrNavGroup) => {
    return group.defaultNavKey === activeNav || group.submenus.some(s => s.navKey === activeNav);
  };

  const isGroupOpen = (groupId: string) => {
    return Boolean(pinnedGroups[groupId] || hoveredGroupId === groupId);
  };

  const togglePin = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const hrName = user ? `${user.firstName || 'HR'} ${user.lastName || 'Recruiter'}`.trim() : 'HR Lead';
  const hrEmail = user?.email || 'hr.recruiter@hiremind.ai';

  return (
    <aside className="hr-sidebar-aside" style={{
      background: isUniverse ? '#0F172A' : '#FFFFFF',
      borderRight: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
    }}>
      {/* ── Brand / Logo ── */}
      <div
        onClick={() => navigate('/hr-analytics')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px 18px',
          cursor: 'pointer',
          borderBottom: isUniverse ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
          marginBottom: '14px'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isUniverse ? '0 4px 14px rgba(99,102,241,0.4)' : '0 4px 12px rgba(37,99,235,0.3)'
        }}>
          <span style={{ fontSize: '17px' }}>🌌</span>
        </div>
        <div className="hr-sidebar-brand-text">
          <div style={{ fontWeight: 800, fontSize: '15px', color: isUniverse ? '#F8FAFC' : '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            HireMind AI
          </div>
          <div style={{ fontSize: '10.5px', color: '#818CF8', fontWeight: 600, letterSpacing: '0.04em' }}>
            HR EXECUTIVE PORTAL
          </div>
        </div>
      </div>

      {/* ── Scrollable Nav Menu List with Dropdowns ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
        <p style={{
          fontSize: '10px',
          fontWeight: 700,
          color: isUniverse ? '#64748B' : '#94A3B8',
          letterSpacing: '0.08em',
          padding: '0 10px',
          margin: '0 0 8px 0',
          textTransform: 'uppercase'
        }}>
          NAVIGATION PANELS
        </p>

        {HR_NAV_GROUPS.map((group) => {
          const groupActive = isGroupActive(group);
          const groupOpen = isGroupOpen(group.id);
          const isPinned = Boolean(pinnedGroups[group.id]);

          return (
            <div
              key={group.id}
              className="hr-menu-group"
              onMouseEnter={() => setHoveredGroupId(group.id)}
              onMouseLeave={() => {
                if (hoveredGroupId === group.id) {
                  setHoveredGroupId(null);
                }
              }}
            >
              {/* Parent Group Header Button */}
              <button
                className="hr-menu-header-btn"
                onClick={() => {
                  // Clicking header toggles stable pin and triggers primary navigation
                  togglePin(group.id);
                  handleNavClick(group.defaultNavKey, group.defaultPath);
                }}
                style={{
                  background: groupActive
                    ? (isUniverse ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))' : 'rgba(37,99,235,0.12)')
                    : (groupOpen ? (isUniverse ? 'rgba(255,255,255,0.04)' : '#F8FAFC') : 'transparent'),
                  color: groupActive
                    ? (isUniverse ? '#A5B4FC' : '#2563EB')
                    : (isUniverse ? '#CBD5E1' : '#475569'),
                  fontWeight: groupActive ? 700 : 600,
                  border: groupActive
                    ? (isUniverse ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(37,99,235,0.2)')
                    : '1px solid transparent',
                }}
                title={isPinned ? 'Menu is Stable (Pinned). Click to unpin.' : 'Hover opens submenus. Click to pin open (Stable).'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {group.icon}
                  <span className="hr-menu-header-title">{group.label}</span>
                </div>

                <div className="hr-menu-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {group.badge !== undefined && (
                    <span style={{
                      background: group.badgeColor || '#EF4444',
                      color: '#FFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      minWidth: '16px',
                      textAlign: 'center'
                    }}>
                      {group.badge}
                    </span>
                  )}

                  {/* Pin / Stability Toggle Button */}
                  <span
                    className={`hr-pin-btn ${isPinned ? 'pinned' : ''}`}
                    onClick={(e) => togglePin(group.id, e)}
                    title={isPinned ? 'Pinned Open (Stable). Click to unpin.' : 'Click to pin menu open (Stable).'}
                    style={{
                      color: isPinned ? '#818CF8' : (isUniverse ? '#64748B' : '#94A3B8'),
                    }}
                  >
                    <Pin size={12} style={{ transform: isPinned ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                  </span>

                  {/* Rotating Chevron */}
                  <ChevronDown
                    size={14}
                    style={{
                      transform: groupOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.22s ease',
                      opacity: 0.8
                    }}
                  />
                </div>
              </button>

              {/* Submenu Panel (Expands on hover, collapses on hover-out unless pinned/stable) */}
              {groupOpen && (
                <div className="hr-submenu-list">
                  {group.submenus.map((sub) => {
                    const isSubActive = activeNav === sub.navKey;

                    return (
                      <button
                        key={sub.id}
                        className="hr-submenu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Keep parent group stable/pinned when navigating into a child
                          setPinnedGroups(prev => ({ ...prev, [group.id]: true }));
                          handleNavClick(sub.navKey, sub.path);
                        }}
                        style={{
                          background: isSubActive
                            ? (isUniverse ? 'rgba(99,102,241,0.2)' : 'rgba(37,99,235,0.1)')
                            : 'transparent',
                          color: isSubActive
                            ? (isUniverse ? '#818CF8' : '#2563EB')
                            : (isUniverse ? '#94A3B8' : '#64748B'),
                          fontWeight: isSubActive ? 700 : 500,
                          borderLeft: isSubActive ? '2px solid #818CF8' : '2px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {sub.icon}
                          <span>{sub.label}</span>
                        </div>

                        {sub.badge !== undefined && (
                          <span style={{
                            background: sub.badgeColor || '#EF4444',
                            color: '#FFF',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '999px',
                          }}>
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

      {/* ── Bottom User Profile Card & Logout ── */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '12px',
        borderTop: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
      }}>
        <div className="hr-sidebar-user-badge" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 10px',
          borderRadius: '10px',
          background: isUniverse ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#FFFFFF',
            flexShrink: 0
          }}>
            {hrName.charAt(0).toUpperCase()}
          </div>
          <div className="hr-sidebar-user-details" style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: isUniverse ? '#F8FAFC' : '#1E293B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {hrName}
            </div>
            <div style={{
              fontSize: '10.5px',
              color: isUniverse ? '#94A3B8' : '#64748B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {hrEmail}
            </div>
            {hrProfile?.companyVerified ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '3px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10B981',
                fontSize: '9.5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }} title={`Verified by ${hrProfile.company?.name || 'Company'}`}>
                <ShieldCheck size={10} color="#10B981" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hrProfile.company?.name ? `${hrProfile.company.name}` : 'Verified'}
                </span>
              </div>
            ) : hrProfile ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '3px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                fontSize: '9.5px',
                fontWeight: 600
              }} title="Unverified HR: Awaiting company badge authorization">
                <AlertTriangle size={10} color="#EF4444" />
                <span>Unverified</span>
              </div>
            ) : null}
          </div>
        </div>

        <button
          onClick={() => { logout('/hr-login'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#FB7185',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251, 113, 133, 0.12)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut size={15} />
          <span className="hr-sidebar-signout-text">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default HrSidebar;
