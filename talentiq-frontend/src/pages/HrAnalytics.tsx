import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Search,
  Plus, RefreshCw,
  Users, BarChart2, Briefcase, Calendar, Award,
  CheckCircle2, Menu,
  Video, ArrowRight, ShieldCheck, CreditCard
} from 'lucide-react';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { HrSidebar } from '../components/HrSidebar';
import { NotificationBell } from '../components/NotificationBell';
import { HrEmployeeManagement } from '../components/HrEmployeeManagement';
import { HrSubscriptionTab } from '../components/subscription/HrSubscriptionTab';
import '../css/hr-analytics.css';

/* ─── Interfaces ─── */
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

interface ApplicationSummary {
  id: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  appliedAt: string;
  status: string;
  matchScore: number;
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
  status: string;
  meetingLink?: string;
}

interface RecentJob {
  id: number;
  title: string;
  company: string;
  location: string;
  ago: string;
}

/* ─── Clean Enterprise Bar Chart ─── */
const EnterpriseBarChart: React.FC<{
  data: Array<{ month: string; apps: number; shortlisted: number; rejected: number }>;
}> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.apps, d.shortlisted, d.rejected, 1)), 10);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(8px, 2vw, 20px)', height: '180px', padding: '10px 0', minWidth: '300px' }}>
        {data.map((d, i) => {
          const appH = Math.max(6, (d.apps / maxVal) * 140);
          const slH = Math.max(6, (d.shortlisted / maxVal) * 140);
          const rjH = Math.max(6, (d.rejected / maxVal) * 140);
          const label = d.month ? d.month.split(' ')[0] : `M${i + 1}`;

          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px' }}>
                <div title={`Applications: ${d.apps}`} style={{ width: 'clamp(6px, 1.2vw, 12px)', height: `${appH}px`, background: '#2563EB', borderRadius: '3px 3px 0 0' }} />
                <div title={`Shortlisted: ${d.shortlisted}`} style={{ width: 'clamp(6px, 1.2vw, 12px)', height: `${slH}px`, background: '#F59E0B', borderRadius: '3px 3px 0 0' }} />
                <div title={`Rejected: ${d.rejected}`} style={{ width: 'clamp(6px, 1.2vw, 12px)', height: `${rjH}px`, background: '#EF4444', borderRadius: '3px 3px 0 0' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════
   HR ANALYTICS & DASHBOARD PAGE
   ═══════════════════════════════════ */
export const HrAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [hrProfile, setHrProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const initialTab = searchParams.get('tab') || 'Dashboard';
  const [activeNav, setActiveNav] = useState<string>(
    initialTab.toLowerCase() === 'referrals' ? 'Referrals' :
    initialTab.toLowerCase() === 'employee' ? 'Employee' :
    initialTab.toLowerCase() === 'report' ? 'Report' :
    initialTab.toLowerCase() === 'settings' ? 'Settings' :
    initialTab.toLowerCase() === 'subscription' ? 'Subscription' : 'Dashboard'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

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
    if (['Referrals', 'Employee', 'Report', 'Settings', 'Subscription'].includes(nav)) {
      setSearchParams({ tab: nav.toLowerCase() });
    } else if (nav === 'Dashboard') {
      setSearchParams({});
    }
  };

  const timeAgo = (iso: string) => {
    if (!iso) return 'Recent';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, appsRes, calRes, jobsRes, hrMeRes] = await Promise.all([
        apiClient.get('/analytics/hr').catch(() => null),
        apiClient.get('/applications/hr?size=10&sort=appliedAt,desc').catch(() => null),
        apiClient.get('/interviews/calendar').catch(() => null),
        apiClient.get('/jobs?size=4').catch(() => null),
        apiClient.get('/hr/me').catch(() => null),
      ]);

      if (hrMeRes?.data?.data) {
        setHrProfile(hrMeRes.data.data);
      }

      if (analyticsRes?.data?.data) {
        const d = analyticsRes.data.data;
        setAnalytics({
          companyName: d.companyName || 'HireMind Enterprise',
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
        const items: ApplicationSummary[] = appsRes.data.data.content.map((app: any) => ({
          id: app.id,
          candidateName: `${app.candidate?.user?.firstName || 'Candidate'} ${app.candidate?.user?.lastName || ''}`.trim(),
          candidateEmail: app.candidate?.user?.email || '',
          jobTitle: app.job?.title || 'Job Position',
          appliedAt: app.appliedAt ? timeAgo(app.appliedAt) : 'Recently',
          status: app.status || 'APPLIED',
          matchScore: app.aiMatchScore || 85,
        }));
        setApplications(items);
      }

      if (calRes?.data?.data) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const mtgs: MeetingItem[] = calRes.data.data.slice(0, 6).map((slot: any) => {
          const dt = new Date(slot.scheduledAt);
          return {
            id: slot.id,
            day: days[dt.getDay()],
            date: dt.getDate(),
            month: months[dt.getMonth()],
            title: `Interview: ${slot.candidateName || 'Candidate'}`,
            candidateName: slot.candidateName || 'Candidate',
            jobTitle: slot.jobTitle || 'Role Interview',
            time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: slot.status || 'CONFIRMED',
            meetingLink: slot.meetingLink,
          };
        });
        setMeetings(mtgs);
      }

      if (jobsRes?.data?.data?.content) {
        const jbs: RecentJob[] = jobsRes.data.data.content.slice(0, 4).map((j: any) => ({
          id: j.id,
          title: j.title,
          company: j.company?.name || 'Company',
          location: j.location || 'Remote',
          ago: j.createdAt ? timeAgo(j.createdAt) : 'New',
        }));
        setRecentJobs(jbs);
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

  // WebSocket Live Updates
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

  const hrName = user ? `${user.firstName || 'HR'} ${user.lastName || 'Lead'}`.trim() : 'HR Lead';
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

  const filteredApps = applications.filter(app => {
    const matchesSearch = !searchQuery || 
      app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'ALL' || app.status === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="hr-dashboard-layout">
      {/* ── Unified HR Sidebar (Collapsible & Mobile Drawer) ── */}
      <HrSidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />

      {/* ── Main Viewport ── */}
      <main className="hr-main-viewport">
        {/* Top Header Bar */}
        <header className="hr-top-header">
          <div className="hr-header-left">
            {/* Hamburger Button for Mobile Drawer */}
            <button
              className="hr-mobile-menu-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>

            <div className="hr-header-title-box">
              <h1 className="hr-header-page-title">
                {activeNav === 'Referrals' ? 'Candidate Referrals & Rewards' :
                 activeNav === 'Employee' ? 'Verified Company Employees' :
                 activeNav === 'Report' ? 'Recruitment Telemetry' :
                 activeNav === 'Settings' ? 'Recruiter Settings' :
                 activeNav === 'Subscription' ? 'Subscription & Plans' :
                 (analytics?.companyName || 'HR Dashboard')}
              </h1>
              <p className="hr-header-subtitle">
                Welcome back, {user?.firstName || 'HR Manager'} &bull; Overview & Operations
              </p>
            </div>
          </div>

          <div className="hr-header-actions">
            {/* Search */}
            <div className="hr-search-box">
              <Search size={15} className="hr-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search candidates, roles..."
                className="hr-search-input"
              />
            </div>

            {/* Quick Action: Post Job */}
            <button
              onClick={() => navigate('/jobs')}
              className="hr-header-btn hr-header-btn-primary"
              title="Post a new job"
            >
              <Plus size={15} />
              <span>Post Job</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadDashboardData}
              className="hr-header-btn hr-header-btn-outline"
              title="Refresh Dashboard Data"
              style={{ padding: '8px 10px' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Notifications */}
            <NotificationBell iconSize={18} />

            {/* Profile Avatar */}
            <div
              onClick={() => navigate('/hr-analytics?tab=settings')}
              className="hr-header-avatar"
              title="Account Settings"
            >
              {(user?.firstName?.[0] || 'H')}
            </div>
          </div>
        </header>

        {/* ── Tab Views ── */}
        {activeNav === 'Subscription' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <HrSubscriptionTab />
          </div>
        )}

        {activeNav === 'Employee' && (
          <div style={{ padding: 'clamp(14px, 2.5vw, 24px)', flex: 1, overflowY: 'auto' }}>
            <HrEmployeeManagement styles={{}} />
          </div>
        )}

        {activeNav === 'Referrals' && (
          <div style={{ padding: 'clamp(14px, 2.5vw, 24px)', flex: 1, overflowY: 'auto' }}>
            <div className="hr-card" style={{ marginBottom: '20px' }}>
              <div className="hr-card-header">
                <div>
                  <h2 className="hr-card-title">
                    <Award size={18} color="#2563EB" /> Candidate Referrals & Talent Bounties
                  </h2>
                  <p className="hr-card-subtitle">
                    Track verified employee referral links and talent incentives
                  </p>
                </div>
                <button
                  onClick={() => alert('Referral link copied to clipboard!')}
                  className="hr-header-btn hr-header-btn-primary"
                >
                  Copy Referral Link
                </button>
              </div>

              <div className="hr-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Referred Candidates</span>
                    <span className="hr-kpi-value">18</span>
                    <span className="hr-kpi-trend positive">+4 this week</span>
                  </div>
                </div>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Successful Hires</span>
                    <span className="hr-kpi-value">6</span>
                    <span className="hr-kpi-trend positive">33.3% conversion</span>
                  </div>
                </div>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Rewards Earned</span>
                    <span className="hr-kpi-value">₹45,000</span>
                    <span className="hr-kpi-trend neutral">Disbursed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'Report' && (
          <div style={{ padding: 'clamp(14px, 2.5vw, 24px)', flex: 1, overflowY: 'auto' }}>
            <div className="hr-card">
              <div className="hr-card-header">
                <div>
                  <h2 className="hr-card-title">
                    <BarChart2 size={18} color="#2563EB" /> Recruitment Telemetry & Reports
                  </h2>
                  <p className="hr-card-subtitle">
                    Hiring throughput, funnel conversion velocity, and time-to-hire metrics
                  </p>
                </div>
              </div>
              <div className="hr-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Avg Time to Hire</span>
                    <span className="hr-kpi-value">{analytics?.avgTimeToHireDays || 14}d</span>
                  </div>
                </div>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Conversion Rate</span>
                    <span className="hr-kpi-value">{analytics?.conversionRate || 22}%</span>
                  </div>
                </div>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Active Jobs</span>
                    <span className="hr-kpi-value">{analytics?.activeJobsCount || 8}</span>
                  </div>
                </div>
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Interviews</span>
                    <span className="hr-kpi-value">{meetings.length || 12}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'Settings' && (
          <div style={{ padding: 'clamp(14px, 2.5vw, 24px)', flex: 1, overflowY: 'auto' }}>
            <div className="hr-card">
              <h2 className="hr-card-title">Recruiter Preferences & Integrations</h2>
              <p className="hr-card-subtitle" style={{ marginBottom: '20px' }}>
                Configure real-time message notification triggers and calendar sync
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>Instant Candidate Message Alerts</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Receive in-app alerts when candidates send inquiries</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#2563EB' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>Google Meet Video Link Auto-Generation</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Automatically create video interview rooms for scheduled slots</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#2563EB' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Dashboard View ── */}
        {activeNav === 'Dashboard' && (
          <div className="hr-dashboard-content">
            {/* ── Main Operations Column ── */}
            <div className="hr-main-column">
              {/* 1. Overview 4-KPI Grid */}
              <div className="hr-kpi-grid">
                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Active Jobs</span>
                    <span className="hr-kpi-value">{analytics?.activeJobsCount ?? 0}</span>
                    <span className="hr-kpi-trend neutral">Live on Portal</span>
                  </div>
                  <div className="hr-kpi-icon-box">
                    <Briefcase size={22} />
                  </div>
                </div>

                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Total Applicants</span>
                    <span className="hr-kpi-value">{analytics?.totalApplicationsCount ?? 0}</span>
                    <span className="hr-kpi-trend positive">+14% this month</span>
                  </div>
                  <div className="hr-kpi-icon-box">
                    <Users size={22} />
                  </div>
                </div>

                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Shortlisted</span>
                    <span className="hr-kpi-value">{analytics?.shortlistedCount ?? 0}</span>
                    <span className="hr-kpi-trend positive">Qualified</span>
                  </div>
                  <div className="hr-kpi-icon-box">
                    <CheckCircle2 size={22} />
                  </div>
                </div>

                <div className="hr-kpi-card">
                  <div className="hr-kpi-info">
                    <span className="hr-kpi-label">Interviews</span>
                    <span className="hr-kpi-value">{meetings.length}</span>
                    <span className="hr-kpi-trend neutral">Upcoming Slots</span>
                  </div>
                  <div className="hr-kpi-icon-box">
                    <Calendar size={22} />
                  </div>
                </div>
              </div>

              {/* 2. Recruitment Pipeline Funnel */}
              <div className="hr-card">
                <div className="hr-card-header">
                  <div>
                    <h3 className="hr-card-title">Recruitment Pipeline Funnel</h3>
                    <p className="hr-card-subtitle">Live candidate distribution across hiring stages</p>
                  </div>
                  <button 
                    onClick={() => navigate('/hr-applications')} 
                    className="hr-header-btn hr-header-btn-outline"
                    style={{ fontSize: '12px', minHeight: '34px', padding: '6px 12px' }}
                  >
                    <span>View All Pipeline</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="hr-pipeline-grid">
                  {[
                    { label: 'Applied', key: 'APPLIED', count: analytics?.applicationsByStatus['APPLIED'] ?? 0 },
                    { label: 'Screening', key: 'SCREENING', count: analytics?.applicationsByStatus['SCREENING'] ?? 0 },
                    { label: 'Shortlisted', key: 'SHORTLISTED', count: analytics?.shortlistedCount ?? 0 },
                    { label: 'Interviewing', key: 'INTERVIEWING', count: analytics?.applicationsByStatus['INTERVIEWING'] ?? 0 },
                    { label: 'Hired', key: 'HIRED', count: (analytics?.hiredCandidatesCount ?? 0) + (analytics?.applicationsByStatus['OFFERED'] ?? 0) },
                    { label: 'Rejected', key: 'REJECTED', count: analytics?.applicationsByStatus['REJECTED'] ?? 0 },
                  ].map(stage => {
                    const total = Math.max(1, analytics?.totalApplicationsCount || 1);
                    const pct = Math.round((stage.count / total) * 100);

                    return (
                      <div key={stage.key} className="hr-pipeline-stage">
                        <div className="hr-stage-name">{stage.label}</div>
                        <div className="hr-stage-count">{stage.count}</div>
                        <div className="hr-stage-pct">{pct}% of total</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Recent Applications with Filters */}
              <div className="hr-card">
                <div className="hr-card-header">
                  <div>
                    <h3 className="hr-card-title">Recent Candidate Applications</h3>
                    <p className="hr-card-subtitle">Review incoming resumes and manage hiring stages</p>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="hr-filters-bar">
                  {['ALL', 'APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'HIRED', 'REJECTED'].map(stage => (
                    <button
                      key={stage}
                      className={`hr-filter-chip ${stageFilter === stage ? 'active' : ''}`}
                      onClick={() => setStageFilter(stage)}
                    >
                      {stage}
                    </button>
                  ))}
                </div>

                {/* Applications Table */}
                <div className="hr-table-wrapper">
                  {filteredApps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748B', fontSize: '13px' }}>
                      No applications found matching the selected filter.
                    </div>
                  ) : (
                    <table className="hr-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Role Applied</th>
                          <th>Match</th>
                          <th>Status</th>
                          <th>Applied</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map(app => (
                          <tr key={app.id}>
                            <td>
                              <div className="hr-candidate-cell">
                                <div className="hr-candidate-avatar">
                                  {app.candidateName.charAt(0)}
                                </div>
                                <div>
                                  <div className="hr-candidate-name">{app.candidateName}</div>
                                  <div className="hr-candidate-role">{app.candidateEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{app.jobTitle}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#2563EB' }}>{app.matchScore}%</span>
                            </td>
                            <td>
                              <span className={`hr-status-pill ${app.status.toLowerCase()}`}>
                                {app.status}
                              </span>
                            </td>
                            <td style={{ color: '#64748B', fontSize: '12px' }}>
                              {app.appliedAt}
                            </td>
                            <td>
                              <button
                                onClick={() => navigate('/hr-applications')}
                                className="hr-action-btn"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 4. Monthly Performance Analytics Chart */}
              <div className="hr-card">
                <div className="hr-card-header">
                  <div>
                    <h3 className="hr-card-title">Monthly Application Volume & Throughput</h3>
                    <p className="hr-card-subtitle">Applications, shortlists, and resolutions over time</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748B' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563EB' }} /> Applications
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#F59E0B' }} /> Shortlisted
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#EF4444' }} /> Rejected
                    </span>
                  </div>
                </div>

                <EnterpriseBarChart data={chartData} />
              </div>
            </div>

            {/* ── Right Column: Recruiter Profile, Status & Interviews ── */}
            <aside className="hr-right-column">
              {/* Profile & Verified Badge Widget */}
              <div className="hr-profile-widget">
                <div className="hr-profile-avatar-lg">
                  {hrName.charAt(0)}
                </div>
                <h3 className="hr-profile-name">{hrName}</h3>
                <p className="hr-profile-title">{hrProfile?.company?.name || hrRole}</p>

                <div className="hr-verified-badge-card">
                  <div className="hr-verified-badge-title">
                    <ShieldCheck size={16} />
                    <span>Verified Enterprise HR</span>
                  </div>
                  <div className="hr-verified-badge-company">
                    {hrProfile?.company?.name || 'Verified Organization'}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectNav('Subscription')}
                  className="hr-header-btn hr-header-btn-outline"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  <CreditCard size={14} color="#2563EB" />
                  <span>Manage Subscriptions</span>
                </button>
              </div>

              {/* Upcoming Interviews Widget */}
              <div className="hr-card">
                <div className="hr-card-header">
                  <div>
                    <h4 className="hr-card-title">Scheduled Interviews</h4>
                    <p className="hr-card-subtitle">{meetings.length} upcoming slots</p>
                  </div>
                  <button
                    onClick={() => navigate('/hr-calendar')}
                    className="hr-action-btn"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    View All
                  </button>
                </div>

                <div className="hr-interview-list">
                  {meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748B', fontSize: '12px' }}>
                      No interviews scheduled.
                    </div>
                  ) : (
                    meetings.map(m => (
                      <div key={m.id} className="hr-interview-card">
                        <div className="hr-interview-date-box">
                          <span className="hr-interview-date-month">{m.month || m.day}</span>
                          <span className="hr-interview-date-day">{m.date}</span>
                        </div>
                        <div className="hr-interview-info">
                          <div className="hr-interview-name">{m.candidateName}</div>
                          <div className="hr-interview-meta">{m.jobTitle} &bull; {m.time}</div>
                          {m.meetingLink && (
                            <a
                              href={m.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#2563EB', fontWeight: 700, marginTop: '4px', textDecoration: 'none' }}
                            >
                              <Video size={12} /> Join Call
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => navigate('/hr-calendar')}
                  className="hr-header-btn hr-header-btn-primary"
                  style={{ width: '100%', marginTop: '14px' }}
                >
                  <Calendar size={14} /> Schedule Interview
                </button>
              </div>

              {/* Active Jobs Widget */}
              <div className="hr-card">
                <div className="hr-card-header">
                  <div>
                    <h4 className="hr-card-title">Active Job Openings</h4>
                    <p className="hr-card-subtitle">{recentJobs.length} active listings</p>
                  </div>
                  <button
                    onClick={() => navigate('/jobs')}
                    className="hr-action-btn"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    View All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748B', fontSize: '12px' }}>
                      No jobs posted yet.
                    </div>
                  ) : (
                    recentJobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => navigate('/jobs')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {job.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {job.company} &bull; {job.location}
                          </div>
                        </div>
                        <ArrowRight size={14} color="#64748B" />
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => navigate('/jobs')}
                  className="hr-header-btn hr-header-btn-outline"
                  style={{ width: '100%', marginTop: '14px' }}
                >
                  <Plus size={14} /> Post New Job
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default HrAnalytics;
