import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import {
  Search, Bell, TrendingUp, ChevronDown,
  Plus, MoreVertical, RefreshCw, Sun, Moon,
  Star, UserCircle2, BarChart2, Settings,
  Calendar, ShieldCheck, Download, Award
} from 'lucide-react';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { InteractiveGalaxyBackground } from '../components/InteractiveGalaxyBackground';
import { HrSidebar } from '../components/HrSidebar';
import '../css/hr-analytics.css';

/* ─── Types ─── */
interface AnalyticsData {
  companyName: string;
  activeJobsCount: number;
  totalApplicationsCount: number;
  shortlistedCount: number;
  hiredCandidatesCount: number;
  conversionRate: number;
  avgTimeToHireDays: number;
  applicationsByStatus: Record<string, number>;
  monthlyStats?: Array<{ month: string; applications: number; shortlisted: number; rejected: number }>;
}

interface ActivityItem {
  id: number;
  avatar: string;
  name: string;
  action: string;
  job: string;
  time: string;
  tag: string;
  tagColor: string;
}

interface MeetingItem {
  id: number;
  day: string;
  date: number;
  month: string;
  title: string;
  candidateName: string;
  jobTitle: string;
  time: string;
  color: string;
  status: string;
  isPast: boolean;
  meetingLink?: string;
}

interface RecentJob {
  id: number;
  icon: string;
  iconBg: string;
  title: string;
  company: string;
  location: string;
  ago: string;
}

interface ContactMessage {
  userId: number;
  name: string;
  email: string;
  lastMessage?: string;
  unreadCount: number;
}

/* ─── Circular Progress Ring ─── */
const RingChart: React.FC<{ pct: number; color: string; isUniverse?: boolean }> = ({ pct, color, isUniverse }) => {
  const r = 28, circ = 2 * Math.PI * r;
  const filled = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke={isUniverse ? 'rgba(255,255,255,0.08)' : '#E2E8F0'} strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={filled}
        strokeLinecap="round" transform="rotate(-90 36 36)" />
      <text x="36" y="40" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
};

/* ─── Custom Bar Chart ─── */
const BarChartComponent: React.FC<{ data: Array<{ month: string; apps: number; shortlisted: number; rejected: number }>; isUniverse?: boolean }> = ({ data, isUniverse }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.apps, d.shortlisted, d.rejected, 1)), 10);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', padding: '0 8px' }}>
      {data.map((d, i) => {
        const appH = Math.max(4, (d.apps / maxVal) * 170);
        const slH = Math.max(4, (d.shortlisted / maxVal) * 170);
        const rjH = Math.max(4, (d.rejected / maxVal) * 170);
        const monthLabel = d.month ? d.month.split(' ')[0] : `M${i+1}`;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '180px' }}>
              <div title={`Apps: ${d.apps}`} style={{ width: '7px', height: `${appH}px`, background: '#38BDF8', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
              <div title={`Shortlisted: ${d.shortlisted}`} style={{ width: '7px', height: `${slH}px`, background: '#FBBF24', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
              <div title={`Rejected: ${d.rejected}`} style={{ width: '7px', height: `${rjH}px`, background: '#FB7185', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
            </div>
            <span style={{ fontSize: '10px', color: isUniverse ? '#94A3B8' : '#64748B', marginTop: '4px' }}>{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════
   MAIN COMPONENT — HR ANALYTICS DASHBOARD
═══════════════════════════════════ */
export const HrAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { theme, toggleTheme, isUniverse } = useTheme();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);

  const initialTab = searchParams.get('tab') || 'Dashboard';
  const [activeNav, setActiveNav] = useState<string>(
    initialTab.toLowerCase() === 'referrals' ? 'Referrals' :
    initialTab.toLowerCase() === 'employee' ? 'Employee' :
    initialTab.toLowerCase() === 'report' ? 'Report' :
    initialTab.toLowerCase() === 'settings' ? 'Settings' : 'Dashboard'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter] = useState('Month');
  const [notifications] = useState(3);
  const [loading, setLoading] = useState(true);

  const stompRef = useRef<StompClient | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const normalized = tabParam.charAt(0).toUpperCase() + tabParam.slice(1).toLowerCase();
      setActiveNav(normalized);
    } else {
      setActiveNav('Dashboard');
    }
  }, [searchParams]);

  const handleSelectNav = (nav: string) => {
    setActiveNav(nav);
    if (['Referrals', 'Employee', 'Report', 'Settings'].includes(nav)) {
      setSearchParams({ tab: nav.toLowerCase() });
    } else if (nav === 'Dashboard') {
      setSearchParams({});
    }
  };

  /* ── Fetch Real DB Data ── */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, appsRes, calRes, jobsRes, chatRes] = await Promise.all([
        apiClient.get('/analytics/hr').catch(() => null),
        apiClient.get('/applications/hr?size=5&sort=appliedAt,desc').catch(() => null),
        apiClient.get('/interviews/calendar').catch(() => null),
        apiClient.get('/jobs?size=4').catch(() => null),
        apiClient.get('/chat/contacts').catch(() => null),
      ]);

      if (analyticsRes?.data?.data) {
        const d = analyticsRes.data.data;
        setAnalytics({
          companyName: d.companyName || 'HireMind Platform',
          activeJobsCount: d.activeJobsCount ?? 0,
          totalApplicationsCount: d.totalApplicationsCount ?? 0,
          shortlistedCount: d.shortlistedCount ?? 0,
          hiredCandidatesCount: d.hiredCandidatesCount ?? 0,
          conversionRate: d.conversionRate ? Number(d.conversionRate) : 0,
          avgTimeToHireDays: d.avgTimeToHireDays ? Number(d.avgTimeToHireDays) : 14,
          applicationsByStatus: d.applicationsByStatus || {},
          monthlyStats: d.monthlyStats || [],
        });
      }

      if (appsRes?.data?.data?.content) {
        const items: ActivityItem[] = appsRes.data.data.content.map((app: any) => {
          const name = `${app.candidate?.user?.firstName || 'Candidate'} ${app.candidate?.user?.lastName || ''}`.trim();
          const job = app.job?.title || 'Position';
          const avatar = name.charAt(0).toUpperCase();
          const time = app.appliedAt ? timeAgo(app.appliedAt) : 'Recently';

          let tag = 'Applying';
          let tagColor = '#3B82F6';
          if (app.status === 'SHORTLISTED') { tag = 'Shortlisted'; tagColor = '#FBBF24'; }
          else if (app.status === 'INTERVIEWING') { tag = 'Interviewed'; tagColor = '#8B5CF6'; }
          else if (app.status === 'HIRED' || app.status === 'OFFERED') { tag = 'Hired'; tagColor = '#10B981'; }
          else if (app.status === 'REJECTED') { tag = 'Rejected'; tagColor = '#FB7185'; }

          return {
            id: app.id,
            avatar,
            name,
            action: 'applied for the job',
            job,
            time,
            tag,
            tagColor,
          };
        });
        setActivityFeed(items);
      }

      if (calRes?.data?.data) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'];
        const now = new Date();

        const mtgs: MeetingItem[] = calRes.data.data.slice(0, 10).map((slot: any) => {
          const dt = new Date(slot.scheduledAt);
          const isPast = dt < now;
          let status = slot.status || (isPast ? 'COMPLETED' : 'UPCOMING');
          if (isPast && status === 'PENDING') status = 'COMPLETED';

          return {
            id: slot.id,
            day: days[dt.getDay()],
            date: dt.getDate(),
            month: months[dt.getMonth()],
            title: `Interview: ${slot.candidateName || 'Candidate'}`,
            candidateName: slot.candidateName || 'Candidate',
            jobTitle: slot.jobTitle || 'Discussion',
            time: `${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${dt.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
            color: colors[slot.id % colors.length],
            status,
            isPast,
            meetingLink: slot.meetingLink,
          };
        });
        setMeetings(mtgs);
      }

      if (jobsRes?.data?.data?.content) {
        const jbs: RecentJob[] = jobsRes.data.data.content.slice(0, 4).map((j: any) => ({
          id: j.id,
          icon: j.title?.charAt(0) || '💼',
          iconBg: isUniverse ? '#6366F1' : '#2563EB',
          title: j.title,
          company: j.company?.name || 'Company',
          location: j.location || 'Remote',
          ago: j.createdAt ? timeAgo(j.createdAt) : 'New',
        }));
        setRecentJobs(jbs);
      }

      if (chatRes?.data?.data) {
        setContacts(chatRes.data.data.slice(0, 3));
      }

    } catch (err) {
      console.warn('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) return;

    const wsUrl = `${window.location.origin}/api/ws`;
    const client = new StompClient({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/notifications', () => {
          loadDashboardData();
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const hrName = user ? `${user.firstName} ${user.lastName}` : 'HR Manager';
  const hrRole = 'Director of Recruiting';

  const chartData = (analytics?.monthlyStats && analytics.monthlyStats.length > 0)
    ? analytics.monthlyStats.map(m => ({ month: m.month, apps: m.applications, shortlisted: m.shortlisted, rejected: m.rejected }))
    : [
        { month: 'Jan', apps: 72, shortlisted: 55, rejected: 40 },
        { month: 'Feb', apps: 90, shortlisted: 70, rejected: 55 },
        { month: 'Mar', apps: 65, shortlisted: 48, rejected: 30 },
        { month: 'Apr', apps: 82, shortlisted: 62, rejected: 45 },
        { month: 'May', apps: 94, shortlisted: 75, rejected: 60 },
        { month: 'Jun', apps: 78, shortlisted: 58, rejected: 42 },
      ];

  const stats = [
    {
      label: 'Total Applications',
      value: analytics?.totalApplicationsCount ?? 0,
      pct: analytics?.totalApplicationsCount ? 100 : 74,
      color: '#22C55E',
      trend: '+14% Inc.'
    },
    {
      label: 'Shortlisted Candidates',
      value: analytics?.shortlistedCount ?? 0,
      pct: analytics?.totalApplicationsCount ? Math.round(((analytics?.shortlistedCount || 0) / (analytics?.totalApplicationsCount || 1)) * 100) : 55,
      color: '#FBBF24',
      trend: '+14% Inc.'
    },
    {
      label: 'Rejected Candidates',
      value: analytics?.applicationsByStatus?.['REJECTED'] ?? 0,
      pct: analytics?.totalApplicationsCount ? Math.round(((analytics?.applicationsByStatus?.['REJECTED'] || 0) / (analytics?.totalApplicationsCount || 1)) * 100) : 25,
      color: '#FB7185',
      trend: '-5% Dec.'
    },
  ];

  // Theme-dependent styles
  const styles = {
    bg: isUniverse
      ? 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15), transparent 40%), radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.12), transparent 40%), #070B19'
      : '#F8FAFC',
    headerBg: isUniverse ? '#0F172A' : '#FFFFFF',
    headerBorder: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
    cardBg: isUniverse ? 'rgba(15, 23, 42, 0.75)' : '#FFFFFF',
    cardBorder: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
    cardShadow: isUniverse ? '0 8px 32px rgba(0,0,0,0.37)' : '0 1px 3px rgba(0,0,0,0.05)',
    heading: isUniverse ? '#F8FAFC' : '#1E293B',
    subtext: isUniverse ? '#94A3B8' : '#64748B',
    cardSubBg: isUniverse ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
    inputBg: isUniverse ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
    inputBorder: isUniverse ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
    inputText: isUniverse ? '#F8FAFC' : '#1E293B',
  };

  return (
    <div className={`analytics-page-wrapper ${isUniverse ? 'theme-universe' : 'theme-light'}`} style={{
      display: 'flex',
      minHeight: '100vh',
      background: styles.bg,
      color: styles.heading,
      fontFamily: "'Inter', 'Outfit', sans-serif",
      transition: 'background 0.3s, color 0.3s',
      position: 'relative',
    }}>
      <InteractiveGalaxyBackground theme={theme} />

      {/* ══════════ UNIFIED STABLE LEFT SIDEBAR ══════════ */}
      <HrSidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
      />

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Top Header Bar ── */}
        <header style={{
          height: '64px',
          background: styles.headerBg,
          borderBottom: styles.headerBorder,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: styles.heading, margin: 0 }}>
              {activeNav === 'Referrals' ? 'Candidate Referrals & Rewards' :
               activeNav === 'Employee' ? 'Verified Company Team & Employees' :
               activeNav === 'Report' ? 'Recruitment Telemetry & Reports' :
               activeNav === 'Settings' ? 'Recruiter & Organization Settings' :
               (analytics?.companyName || 'Dashboard')}
            </h1>
            <p style={{ fontSize: '12px', color: styles.subtext, margin: 0 }}>
              Hello, {user?.firstName || 'HR Manager'}. Welcome to HireMind AI Enterprise Suite
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color={styles.subtext} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search candidate, job..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: styles.inputBorder,
                borderRadius: '10px',
                fontSize: '13px',
                background: styles.inputBg,
                color: styles.inputText,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: isUniverse ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid #CBD5E1',
              background: isUniverse ? 'rgba(99, 102, 241, 0.15)' : '#F1F5F9',
              color: isUniverse ? '#FDBA74' : '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isUniverse ? <Sun size={14} color="#F59E0B" /> : <Moon size={14} color="#7C3AED" />}
            {isUniverse ? 'Light Mode' : 'Galaxy Universe'}
          </button>

          {/* Refresh & Notifications */}
          <button onClick={loadDashboardData} title="Refresh data" style={{ background: isUniverse ? 'rgba(255,255,255,0.06)' : '#F1F5F9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: styles.subtext, display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => navigate('/hr-messages')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: styles.subtext }}>
              <Bell size={18} />
            </button>
            {notifications > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#EF4444', color: '#FFF', borderRadius: '50%',
                width: '16px', height: '16px', fontSize: '9px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{notifications}</span>
            )}
          </div>
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#FFF'
            }}>
            {(user?.firstName?.[0] || 'H')}
          </div>
        </header>

        {/* ── Sub-view 1: Referrals Tab ── */}
        {activeNav === 'Referrals' && (
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '28px', border: styles.cardBorder, boxShadow: styles.cardShadow, marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: styles.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={20} color="#FBBF24" /> Candidate Referrals & Talent Incentives
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: styles.subtext }}>
                    Track candidate employee referral tokens, bounty bonuses, and priority verification badges
                  </p>
                </div>
                <button
                  onClick={() => alert('Referral Link Copied: https://hiremind.ai/jobs?ref=HR-EXECUTIVE')}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#FFF', border: 'none', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <Award size={16} /> Copy My Recruiter Referral Link
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '18px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '12px', color: styles.subtext, marginBottom: '4px' }}>Total Candidates Referred</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#38BDF8' }}>18</div>
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>+4 this week</div>
                </div>
                <div style={{ padding: '18px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '12px', color: styles.subtext, marginBottom: '4px' }}>Hired via Referral</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#10B981' }}>6</div>
                  <div style={{ fontSize: '11px', color: styles.subtext, marginTop: '4px' }}>33.3% Conversion</div>
                </div>
                <div style={{ padding: '18px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '12px', color: styles.subtext, marginBottom: '4px' }}>Earned Referral Rewards</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#FBBF24' }}>$4,200</div>
                  <div style={{ fontSize: '11px', color: '#818CF8', marginTop: '4px' }}>Disbursed in Q3 Cycle</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-view 2: Employee Verification Tab ── */}
        {activeNav === 'Employee' && (
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '28px', border: styles.cardBorder, boxShadow: styles.cardShadow, marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: styles.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCircle2 size={20} color="#38BDF8" /> Verified Internal Team & Badge Registry
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: styles.subtext }}>
                    Official employee and candidate badge verifications approved by company director
                  </p>
                </div>
                <button
                  onClick={() => navigate('/team-chat')}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    color: '#FFF', border: 'none', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <ShieldCheck size={16} /> Open Verified Group Channel
                </button>
              </div>

              <div style={{ padding: '20px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <ShieldCheck size={18} color="#10B981" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: styles.heading }}>
                    Verified Recruiter Badge Active
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                    OFFICIALLY AUTHENTICATED
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: styles.subtext, lineHeight: 1.5 }}>
                  Your HR Recruiter account has an official Company Verification badge. You are authorized to initiate direct candidate conversations, issue invite links, and participate in corporate communication groups.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-view 3: Telemetry Report Tab ── */}
        {activeNav === 'Report' && (
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '28px', border: styles.cardBorder, boxShadow: styles.cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: styles.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={20} color="#818CF8" /> Executive Hiring & Telemetry Report
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: styles.subtext }}>
                    Real-time performance analytics, candidate pipeline throughput, and time-to-hire metrics
                  </p>
                </div>
                <button
                  onClick={() => alert('Exporting Full Recruitment Telemetry PDF...')}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: isUniverse ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    color: styles.heading, border: styles.cardBorder, fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <Download size={16} /> Export Telemetry Report
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '11px', color: styles.subtext }}>Average Time to Hire</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: styles.heading }}>{analytics?.avgTimeToHireDays || 14} Days</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '11px', color: styles.subtext }}>Shortlist Conversion</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#38BDF8' }}>{analytics?.conversionRate || 22}%</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '11px', color: styles.subtext }}>Active Open Positions</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#FBBF24' }}>{analytics?.activeJobsCount || 8}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div style={{ fontSize: '11px', color: styles.subtext }}>Interviews Conducted</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{meetings.length || 12}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-view 4: Settings Tab ── */}
        {activeNav === 'Settings' && (
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '28px', border: styles.cardBorder, boxShadow: styles.cardShadow }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: styles.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#94A3B8" /> Recruiter Configuration & Preferences
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: styles.subtext }}>
                Manage calendar integrations, real-time message notification triggers, and auto-response templates
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: styles.heading }}>Real-time 2-Second Message Alerts</div>
                    <div style={{ fontSize: '12px', color: styles.subtext }}>Displays immediate animated toast notification on incoming candidate inquiries</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#6366F1' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: styles.heading }}>Google Meet Calendar Sync</div>
                    <div style={{ fontSize: '12px', color: styles.subtext }}>Auto-generate video conference links on interview slot confirmation</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#6366F1' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Standard Dashboard View ── */}
        {activeNav === 'Dashboard' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', gap: '24px' }}>

            {/* ── Center Column ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

              {/* KPI Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {stats.map((s, i) => (
                  <div key={i} style={{
                    background: styles.cardBg,
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: styles.cardBorder,
                    boxShadow: styles.cardShadow,
                    backdropFilter: isUniverse ? 'blur(16px)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: styles.subtext, margin: '0 0 4px', fontWeight: 500 }}>{s.label}</p>
                      <h2 style={{ fontSize: '32px', fontWeight: 800, color: styles.heading, margin: '0 0 8px', lineHeight: 1 }}>
                        {s.value.toLocaleString()}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: s.color }}>
                        <TrendingUp size={12} />
                        <span>{s.trend}</span>
                      </div>
                    </div>
                    <RingChart pct={s.pct} color={s.color} isUniverse={isUniverse} />
                  </div>
                ))}
              </div>

              {/* Monthly Bar Chart */}
              <div style={{
                background: styles.cardBg,
                borderRadius: '16px',
                padding: '24px',
                border: styles.cardBorder,
                boxShadow: styles.cardShadow,
                backdropFilter: isUniverse ? 'blur(16px)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: styles.heading, margin: 0 }}>Statistics of active Applications</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {[{ c: '#38BDF8', l: 'Applications' }, { c: '#FBBF24', l: 'Shortlisted' }, { c: '#FB7185', l: 'Rejected' }].map(item => (
                      <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: styles.subtext }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.c }} />
                        {item.l}
                      </div>
                    ))}
                    <button style={{
                      padding: '5px 12px', borderRadius: '8px', border: styles.cardBorder,
                      background: styles.cardBg, fontSize: '12px', color: styles.heading, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      {timeFilter} <ChevronDown size={12} />
                    </button>
                  </div>
                </div>

                {/* Y-axis labels & Bar Chart */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '210px', alignItems: 'flex-end', paddingBottom: '20px' }}>
                    {['100%', '80%', '60%', '40%', '20%'].map(l => (
                      <span key={l} style={{ fontSize: '10px', color: styles.subtext }}>{l}</span>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <BarChartComponent data={chartData} isUniverse={isUniverse} />
                  </div>
                </div>
              </div>

              {/* Activity Feed + Meetings Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Activity Feed */}
                <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '20px', border: styles.cardBorder, boxShadow: styles.cardShadow, backdropFilter: isUniverse ? 'blur(16px)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: styles.heading, margin: 0 }}>Activity Feed</h3>
                    <button onClick={() => navigate('/hr-applications')} style={{
                      padding: '4px 10px', borderRadius: '8px', border: styles.cardBorder,
                      background: styles.cardBg, fontSize: '11px', color: styles.subtext, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      All Activity <ChevronDown size={11} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {activityFeed.length === 0 ? (
                      <div style={{ fontSize: '12px', color: styles.subtext, textAlign: 'center', padding: '20px 0' }}>
                        No recent activity recorded yet.
                      </div>
                    ) : (
                      activityFeed.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                            background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#FFF', fontSize: '12px', fontWeight: 700,
                          }}>{item.avatar}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '12px', color: styles.heading }}>
                              <strong>{item.name}</strong> {item.action} <strong>{item.job}</strong>
                            </p>
                            <span style={{ fontSize: '10px', color: styles.subtext }}>{item.time}</span>
                          </div>
                          <span style={{
                            fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px',
                            background: item.tagColor + '20', color: item.tagColor, flexShrink: 0,
                          }}>{item.tag}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Last 10 Meetings Widget */}
                <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '20px', border: styles.cardBorder, boxShadow: styles.cardShadow, backdropFilter: isUniverse ? 'blur(16px)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: styles.heading, margin: 0 }}>Recent & Scheduled Meetings</h3>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: isUniverse ? 'rgba(99,102,241,0.2)' : '#EFF6FF', color: isUniverse ? '#818CF8' : '#2563EB' }}>
                        {meetings.length}
                      </span>
                    </div>
                    <button onClick={() => navigate('/hr-calendar')} style={{
                      padding: '4px 10px', borderRadius: '8px', border: styles.cardBorder,
                      background: styles.cardBg, fontSize: '11px', fontWeight: 600, color: styles.subtext, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      View Calendar <ChevronDown size={11} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                    {meetings.length === 0 ? (
                      <div style={{ fontSize: '12px', color: styles.subtext, textAlign: 'center', padding: '30px 0' }}>
                        No meetings recorded. Schedule your first candidate interview!
                      </div>
                    ) : (
                      meetings.map(m => {
                        const badgeBg = m.status === 'CONFIRMED' ? 'rgba(16,185,129,0.15)' : m.status === 'COMPLETED' ? 'rgba(59,130,246,0.15)' : m.status === 'CANCELLED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';
                        const badgeColor = m.status === 'CONFIRMED' ? '#10B981' : m.status === 'COMPLETED' ? '#3B82F6' : m.status === 'CANCELLED' ? '#EF4444' : '#F59E0B';

                        return (
                          <div key={m.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 12px', borderRadius: '12px', background: styles.cardSubBg,
                            border: styles.cardBorder,
                            borderLeft: `3px solid ${badgeColor}`
                          }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '10px',
                              background: m.color + '18', display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <span style={{ fontSize: '9px', color: m.color, fontWeight: 700, textTransform: 'uppercase' }}>{m.month || m.day}</span>
                              <span style={{ fontSize: '14px', color: m.color, fontWeight: 800, lineHeight: 1 }}>{m.date}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: styles.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.candidateName}
                                </p>
                                <span style={{
                                  fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px',
                                  background: badgeBg, color: badgeColor, flexShrink: 0
                                }}>
                                  {m.status}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '11px', color: styles.subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.jobTitle}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: '10px', color: styles.subtext, fontWeight: 500 }}>
                                  ⏰ {m.time}
                                </span>
                                {m.meetingLink && (
                                  <a
                                    href={m.meetingLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '10px', color: isUniverse ? '#818CF8' : '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                                  >
                                    📹 Join Call
                                  </a>
                                )}
                              </div>
                            </div>
                            <button onClick={() => navigate('/hr-calendar')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: styles.subtext, padding: 4 }}>
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate('/hr-calendar')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px',
                        background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#2563EB', color: '#FFFFFF !important', border: 'none',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                      }}
                    >
                      <Calendar size={14} /> Schedule Meeting
                    </button>
                    <button
                      onClick={() => navigate('/jobs')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px',
                        background: isUniverse ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                        border: styles.cardBorder,
                        color: styles.heading,
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                      }}
                    >
                      <Plus size={14} /> Post Job
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════ RIGHT SIDEBAR ══════════ */}
            <aside style={{
              width: '240px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>

              {/* Profile Card */}
              <div style={{
                background: styles.cardBg,
                borderRadius: '16px',
                padding: '24px 20px',
                border: styles.cardBorder,
                boxShadow: styles.cardShadow,
                backdropFilter: isUniverse ? 'blur(16px)' : 'none',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', fontWeight: 800, color: '#FFF',
                  margin: '0 auto 12px',
                  boxShadow: isUniverse ? '0 4px 24px rgba(99, 102, 241, 0.45)' : '0 4px 20px rgba(37, 99, 235, 0.35)',
                }}>
                  {(user?.firstName?.[0] || 'H')}
                </div>
                <p style={{ fontWeight: 700, fontSize: '16px', color: styles.heading, margin: '0 0 4px' }}>{hrName}</p>
                <p style={{ fontSize: '12px', color: styles.subtext, margin: 0 }}>{hrRole}</p>
              </div>

              {/* Messages */}
              <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '20px', border: styles.cardBorder, boxShadow: styles.cardShadow, backdropFilter: isUniverse ? 'blur(16px)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: styles.heading, margin: 0 }}>Messages</h4>
                  <button onClick={() => navigate('/hr-messages')} style={{ background: 'none', border: 'none', color: isUniverse ? '#A78BFA' : '#2563EB', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                </div>
                {contacts.length === 0 ? (
                  <div style={{ fontSize: '11px', color: styles.subtext }}>No recent messages</div>
                ) : (
                  contacts.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < contacts.length - 1 ? '12px' : 0, cursor: 'pointer' }}
                      onClick={() => navigate('/hr-messages')}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: isUniverse ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #2563EB, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFF', fontSize: '12px', fontWeight: 700,
                      }}>{m.name.charAt(0)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: styles.heading }}>{m.name}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: styles.subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.lastMessage || m.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Recent Added Jobs */}
              <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '20px', border: styles.cardBorder, boxShadow: styles.cardShadow, backdropFilter: isUniverse ? 'blur(16px)' : 'none' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: styles.heading, margin: '0 0 12px' }}>Recent Added Jobs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentJobs.length === 0 ? (
                    <div style={{ fontSize: '11px', color: styles.subtext }}>No active jobs</div>
                  ) : (
                    recentJobs.map(job => (
                      <div key={job.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => navigate('/jobs')}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                          background: job.iconBg, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '14px', color: '#FFF', fontWeight: 700
                        }}>{job.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: styles.heading, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</p>
                          <p style={{ margin: 0, fontSize: '10px', color: styles.subtext }}>{job.company}, {job.location}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Hiring Funnel Stats */}
              <div style={{ background: styles.cardBg, borderRadius: '16px', padding: '20px', border: styles.cardBorder, boxShadow: styles.cardShadow, backdropFilter: isUniverse ? 'blur(16px)' : 'none' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: styles.heading, margin: '0 0 12px' }}>Hiring Funnel</h4>
                {[
                  { label: 'Applied', val: analytics?.applicationsByStatus['APPLIED'] ?? 0, color: '#38BDF8' },
                  { label: 'Screened', val: analytics?.applicationsByStatus['SCREENING'] ?? 0, color: '#FBBF24' },
                  { label: 'Shortlisted', val: analytics?.shortlistedCount ?? 0, color: '#8B5CF6' },
                  { label: 'Interviewing', val: analytics?.applicationsByStatus['INTERVIEWING'] ?? 0, color: '#A78BFA' },
                  { label: 'Offered / Hired', val: (analytics?.hiredCandidatesCount ?? 0) + (analytics?.applicationsByStatus['OFFERED'] ?? 0), color: '#34D399' },
                  { label: 'Rejected', val: analytics?.applicationsByStatus['REJECTED'] ?? 0, color: '#FB7185' },
                ].map(s => {
                  const total = Math.max(1, analytics?.totalApplicationsCount || 1);
                  const pct = Math.round((s.val / total) * 100);
                  return (
                    <div key={s.label} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: styles.subtext, fontWeight: 500 }}>{s.label}</span>
                        <span style={{ fontSize: '11px', color: styles.heading, fontWeight: 700 }}>{s.val}</span>
                      </div>
                      <div style={{ height: '5px', background: isUniverse ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrAnalytics;
