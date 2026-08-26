import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, MessageSquare, Calendar, Briefcase,
  Users, Star, UserCircle2, BarChart2,
  Settings, LogOut, Bot, Sparkles
} from 'lucide-react';

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

  const handleNavClick = (key: HrNavKey, directPath?: string) => {
    if (onSelectNav) {
      onSelectNav(key);
    }
    if (directPath) {
      navigate(directPath);
    }
  };

  const navItemStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: isActive ? 600 : 500,
    background: isActive
      ? (isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#2563EB')
      : 'transparent',
    color: isActive ? '#FFFFFF' : (isUniverse ? '#94A3B8' : '#64748B'),
    transition: 'all 0.18s ease',
    textAlign: 'left' as const,
    marginBottom: '2px',
  });

  const hrName = user ? `${user.firstName || 'HR'} ${user.lastName || 'Recruiter'}`.trim() : 'HR Lead';
  const hrEmail = user?.email || 'hr.recruiter@hiremind.ai';

  return (
    <aside style={{
      width: '230px',
      minWidth: '230px',
      height: '100vh',
      background: isUniverse ? '#0F172A' : '#FFFFFF',
      borderRight: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px 14px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxSizing: 'border-box',
      userSelect: 'none',
    }}>
      {/* ── Brand / Logo ── */}
      <div
        onClick={() => navigate('/hr-analytics')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px 20px',
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
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: isUniverse ? '#F8FAFC' : '#1E293B', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            HireMind AI
          </div>
          <div style={{ fontSize: '10.5px', color: '#818CF8', fontWeight: 600, letterSpacing: '0.04em' }}>
            HR EXECUTIVE PORTAL
          </div>
        </div>
      </div>

      {/* ── Scrollable Nav Menu List ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
        {/* MENU */}
        <div style={{ marginBottom: '14px' }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: isUniverse ? '#64748B' : '#94A3B8',
            letterSpacing: '0.08em',
            padding: '0 12px',
            margin: '0 0 6px 0',
            textTransform: 'uppercase'
          }}>
            MAIN MENU
          </p>

          <button
            onClick={() => handleNavClick('Dashboard', '/hr-analytics')}
            style={navItemStyle(activeNav === 'Dashboard')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('Message', '/hr-messages')}
            style={navItemStyle(activeNav === 'Message')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={16} />
              <span>Candidate Messages</span>
            </div>
            {unreadCount > 0 && (
              <span style={{
                background: '#EF4444',
                color: '#FFF',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '999px',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('Calendar', '/hr-calendar')}
            style={navItemStyle(activeNav === 'Calendar')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} />
              <span>Interviews & Calendar</span>
            </div>
          </button>
        </div>

        {/* RECRUITMENT */}
        <div style={{ marginBottom: '14px' }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: isUniverse ? '#64748B' : '#94A3B8',
            letterSpacing: '0.08em',
            padding: '0 12px',
            margin: '0 0 6px 0',
            textTransform: 'uppercase'
          }}>
            RECRUITMENT & TALENT
          </p>

          <button
            onClick={() => handleNavClick('Jobs', '/jobs')}
            style={navItemStyle(activeNav === 'Jobs')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={16} />
              <span>Job Postings</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('Candidates', '/hr-applications')}
            style={navItemStyle(activeNav === 'Candidates')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={16} />
              <span>Applications & Pipeline</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('Copilot', '/copilot')}
            style={navItemStyle(activeNav === 'Copilot')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={16} />
              <span>AI Copilot</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('TeamChat', '/team-chat')}
            style={navItemStyle(activeNav === 'TeamChat')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={16} />
              <span>Team Collaboration</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('Referrals', '/hr-analytics?tab=referrals')}
            style={navItemStyle(activeNav === 'Referrals')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star size={16} />
              <span>My Referrals</span>
            </div>
          </button>
        </div>

        {/* ORGANIZATION */}
        <div style={{ marginBottom: '8px' }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 700,
            color: isUniverse ? '#64748B' : '#94A3B8',
            letterSpacing: '0.08em',
            padding: '0 12px',
            margin: '0 0 6px 0',
            textTransform: 'uppercase'
          }}>
            ORGANIZATION & GOVERNANCE
          </p>

          <button
            onClick={() => handleNavClick('Employee', '/hr-analytics?tab=employee')}
            style={navItemStyle(activeNav === 'Employee')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCircle2 size={16} />
              <span>Verified Employees</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('Report', '/hr-analytics?tab=report')}
            style={navItemStyle(activeNav === 'Report')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={16} />
              <span>Telemetry Reports</span>
            </div>
          </button>

          <button
            onClick={() => handleNavClick('Settings', '/hr-analytics?tab=settings')}
            style={navItemStyle(activeNav === 'Settings')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={16} />
              <span>Settings</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Bottom User Profile Card & Logout ── */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '12px',
        borderTop: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
      }}>
        <div style={{
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
          <div style={{ flex: 1, minWidth: 0 }}>
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
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/'); }}
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
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default HrSidebar;
