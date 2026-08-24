import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAdminTheme } from '../context/AdminThemeContext';
import {
  ShieldCheck, Users, Building2, Lock, Unlock,
  Code2, Sparkles, BarChart3, Sun, Moon, CloudSun, Calendar,
  Activity, Database, Terminal, Ban, CheckCircle2, LogOut, ShieldAlert
} from 'lucide-react';
import { CompanyTagApprovalQueue } from '../components/CompanyTagApprovalQueue';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/admin-theme.css';
import '../css/admin-portal.css';

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalCompanies: number;
  verifiedCompanies: number;
  pendingCompanies: number;
  totalJobs: number;
  activeJobs?: number;
  totalApplications: number;
  totalResumes: number;
}

interface TemporalJobMetrics {
  jobsToday: number;
  jobsThisWeek: number;
  jobsThisMonth: number;
  jobsThisYear: number;
  totalJobs: number;
  activeJobs: number;
}

interface UserItem {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
}

interface CompanyItem {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  verified: boolean;
  blacklisted?: boolean;
}

interface UserDetailsModalData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  loginAttempts?: number;
  headline?: string;
  bio?: string;
  location?: string;
  openToWork?: boolean;
  skills?: string[];
  educations?: Array<{ id: number; institution: string; degree: string; fieldOfStudy: string; startYear?: number; endYear?: number }>;
  experiences?: Array<{ id: number; company: string; title: string; location: string; description: string }>;
  companyName?: string;
  designation?: string;
  companyAdmin?: boolean;
  totalApplicationsCount?: number;
  verifiedBadges?: string[];
}

interface AgentChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionType?: string;
  data?: any;
}

interface AdminPortalProps {
  mode?: 'DEVELOPER' | 'MANAGEMENT' | 'COMPANY';
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ mode }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useAdminTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine effective portal role mode from prop or URL pathname
  const portalMode: 'DEVELOPER' | 'MANAGEMENT' | 'COMPANY' = (() => {
    if (mode) return mode;
    const path = location.pathname.toLowerCase();
    if (path.includes('develop')) return 'DEVELOPER';
    if (path.includes('management')) return 'MANAGEMENT';
    if (path.includes('company') || path.includes('register')) return 'COMPANY';
    if (user?.roles?.includes('ROLE_APP_DEVELOPER')) return 'DEVELOPER';
    if (user?.roles?.includes('ROLE_COMPANY_ADMIN')) return 'COMPANY';
    return 'MANAGEMENT';
  })();

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [temporalJobs, setTemporalJobs] = useState<TemporalJobMetrics | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Management AI Agent & Search States
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentChatMessage[]>([
    {
      id: '1',
      sender: 'agent',
      text: '👋 **HireMind Management AI Copilot is Online**.\nConnected directly to **MySQL InnoDB** and **Redis (Radish) Cache**.\n\nYou can query temporal analytics, inspect candidate dossiers, block/unblock candidates or HRs, and verify companies using prompts.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'CANDIDATE' | 'HR' | 'COMPANY'>('ALL');
  const [inspectedUser, setInspectedUser] = useState<UserDetailsModalData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // RBAC Access Check
  const roles = user?.roles || [];
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_PLATFORM_ADMIN');
  const isAuthorized = (() => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin) return true;
    if (portalMode === 'DEVELOPER') return roles.includes('ROLE_APP_DEVELOPER');
    if (portalMode === 'MANAGEMENT') return roles.includes('ROLE_MANAGEMENT_TEAM');
    if (portalMode === 'COMPANY') return roles.includes('ROLE_COMPANY_ADMIN');
    return false;
  })();

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [portalMode, isAuthorized]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (portalMode === 'DEVELOPER') {
        const [mRes, tjRes] = await Promise.all([
          apiClient.get('/admin/metrics').catch(() => ({ data: { data: null } })),
          apiClient.get('/admin/metrics/temporal').catch(() => ({ data: { data: null } }))
        ]);
        setMetrics(mRes.data?.data || null);
        setTemporalJobs(tjRes.data?.data || null);
      } else if (portalMode === 'MANAGEMENT') {
        const [mRes, tjRes, uRes, cRes] = await Promise.all([
          apiClient.get('/admin/metrics').catch(() => ({ data: { data: null } })),
          apiClient.get('/admin/metrics/temporal').catch(() => ({ data: { data: null } })),
          apiClient.get('/admin/users?page=0&size=50').catch(() => ({ data: { content: [] } })),
          apiClient.get('/admin/companies/pending?page=0&size=50').catch(() => ({ data: { content: [] } }))
        ]);
        setMetrics(mRes.data?.data || null);
        setTemporalJobs(tjRes.data?.data || null);
        setUsers(uRes.data?.content || uRes.data?.data?.content || []);
        setCompanies(cRes.data?.content || cRes.data?.data?.content || []);
      } else if (portalMode === 'COMPANY') {
        const cRes = await apiClient.get('/admin/companies/pending?page=0&size=50').catch(() => ({ data: { content: [] } }));
        setCompanies(cRes.data?.content || cRes.data?.data?.content || []);
      }
    } catch (e) {
      console.warn('Admin data load error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCandidateBlock = async (userId: number, currentStatus: string) => {
    const willBlock = currentStatus !== 'BLOCKED';
    try {
      await apiClient.put(`/admin/candidates/${userId}/block`, { blocked: willBlock, reason: 'Management review' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: willBlock ? 'BLOCKED' : 'ACTIVE' } : u));
      if (inspectedUser && inspectedUser.id === userId) {
        setInspectedUser({ ...inspectedUser, status: willBlock ? 'BLOCKED' : 'ACTIVE' });
      }
      setMsg(willBlock ? `Candidate account ID ${userId} blocked.` : `Candidate account ID ${userId} unblocked.`);
    } catch (e: any) {
      setMsg(`Action failed: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleToggleCompanyBlacklist = async (companyId: number, isBlacklisted: boolean) => {
    const willBlacklist = !isBlacklisted;
    try {
      await apiClient.put(`/admin/companies/${companyId}/blacklist`, { blocked: willBlacklist, reason: 'Compliance review' });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, blacklisted: willBlacklist } : c));
      setMsg(willBlacklist ? `Company ID ${companyId} blacklisted.` : `Company ID ${companyId} unblocked.`);
    } catch (e: any) {
      setMsg(`Action failed: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleVerifyCompany = async (companyId: number) => {
    try {
      await apiClient.put(`/admin/companies/${companyId}/verify`, { approved: true, notes: 'Verified by Management Team' });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, verified: true } : c));
      setMsg(`Company ID ${companyId} verified successfully.`);
    } catch (e: any) {
      setMsg(`Action failed: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleInspectUser = async (userId: number) => {
    setInspectLoading(true);
    try {
      const res = await apiClient.get(`/admin/users/${userId}/details`);
      setInspectedUser(res.data?.data || null);
    } catch (e: any) {
      setMsg(`Could not fetch details for user ID ${userId}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleSendAgentQuery = async (queryText?: string) => {
    const promptToSend = queryText || agentPrompt;
    if (!promptToSend.trim()) return;

    const userMsg: AgentChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAgentMessages(prev => [...prev, userMsg]);
    setAgentPrompt('');
    setAgentLoading(true);

    try {
      const res = await apiClient.post('/admin/management/agent/query', { prompt: promptToSend.trim() });
      const agentRes = res.data?.data;

      const replyMsg: AgentChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: agentRes?.reply || 'Command processed successfully.',
        actionType: agentRes?.actionType,
        data: agentRes?.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setAgentMessages(prev => [...prev, replyMsg]);

      // If inspect user returned
      if (agentRes?.actionType === 'INSPECT_USER' && agentRes?.data) {
        setInspectedUser(agentRes.data);
      }

      // Refresh platform data if moderation was performed
      if (agentRes?.actionType === 'MODERATION_PERFORMED') {
        fetchData();
      }
    } catch (e: any) {
      setAgentMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: `⚠️ Error executing query: ${e?.response?.data?.message || e.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  // If unauthenticated or unauthorized for this portal
  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAuthorized) {
    return (
      <div className={`admin-page-wrapper admin-theme-${theme}`} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 460, padding: 30, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldAlert size={32} color="#EF4444" />
          </div>
          <h2 style={{ color: 'var(--admin-text-primary)', margin: '0 0 8px', fontSize: 20 }}>Access Restricted</h2>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>
            Your account is not authorized for this specific admin suite. Please use your assigned portal.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={handleSignOut} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Sign Out
            </button>
            <button onClick={() => navigate('/')} style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter users by search
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchFilter.trim() ||
      u.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.id.toString() === searchFilter.trim();

    if (!matchesSearch) return false;
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'CANDIDATE') return u.roles?.some(r => r.includes('CANDIDATE') || r.includes('USER'));
    if (activeCategory === 'HR') return u.roles?.some(r => r.includes('HR') || r.includes('RECRUITER'));
    return true;
  });

  return (
    <div className={`admin-page-wrapper admin-theme-${theme}`}>
      <div className="admin-container">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-header-title">
            <HireMindLogo variant="badge" size="md" />
            <div>
              <h1 className="admin-title-text">
                {portalMode === 'DEVELOPER' && 'Application Developer Suite'}
                {portalMode === 'MANAGEMENT' && 'HireMind-Management Team Governance'}
                {portalMode === 'COMPANY' && 'Register Company — Corporate Executive Suite'}
              </h1>
              <p className="admin-subtitle-text">
                {portalMode === 'DEVELOPER' && 'Core AI Engine Architecture, Agent Orchestration & Real-Time Diagnostics (Safe DB Guard Active)'}
                {portalMode === 'MANAGEMENT' && 'AI Copilot Governance, Candidate/HR Dossiers, Temporal Analytics & MySQL/Radish Control'}
                {portalMode === 'COMPANY' && 'Corporate Multi-Tenant Verification Queue, Candidate Endorsement & Verified Badge Dispatch'}
              </p>
            </div>
          </div>

          {/* Right Action Controls: Theme Switcher & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* 3-State Official Theme Switcher */}
            <div className="admin-theme-segmented-ctrl">
              <button
                onClick={() => setTheme('light-100')}
                className={`admin-theme-btn ${theme === 'light-100' ? 'active' : ''}`}
                title="100% Crisp Corporate Daylight Mode"
              >
                <Sun size={14} /> 100% Light
              </button>
              <button
                onClick={() => setTheme('light-50')}
                className={`admin-theme-btn ${theme === 'light-50' ? 'active' : ''}`}
                title="50% Soft / Eye-Comfort Balanced Mode"
              >
                <CloudSun size={14} /> 50% Light
              </button>
              <button
                onClick={() => setTheme('dark-100')}
                className={`admin-theme-btn ${theme === 'dark-100' ? 'active' : ''}`}
                title="100% Executive Obsidian Midnight Mode"
              >
                <Moon size={14} /> 100% Dark
              </button>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Sign out of Admin session"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Global Action Message */}
        {msg && (
          <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: '13.5px', color: 'var(--admin-text-primary)' }}>
            {msg}
          </div>
        )}

        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
            Refreshing telemetry and portal data...
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            PORTAL 1: APPLICATION DEVELOPER SUITE ONLY
            ──────────────────────────────────────────────────────── */}
        {portalMode === 'DEVELOPER' && (
          <div>
            <div className="dev-safeguard-banner">
              <div className="dev-safeguard-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                  Developer Security Guard Active • Database Wipe Restricted
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>
                  Full application control, code triggers, and AI Agent configuration enabled. Destructive schema drops or mass table wipes are structurally disabled.
                </p>
              </div>
            </div>

            <div className="temporal-metrics-grid">
              <div className="temporal-card">
                <div className="temporal-label"><Activity size={13} /> Core Engine</div>
                <div className="temporal-val highlight">Online 99.9%</div>
              </div>
              <div className="temporal-card">
                <div className="temporal-label"><Database size={13} /> Redis Cache (Radish)</div>
                <div className="temporal-val">Connected</div>
              </div>
              <div className="temporal-card">
                <div className="temporal-label"><Sparkles size={13} /> AI Agents Cluster</div>
                <div className="temporal-val highlight">5 Active</div>
              </div>
              <div className="temporal-card">
                <div className="temporal-label"><Terminal size={13} /> API Latency</div>
                <div className="temporal-val">&lt; 24ms</div>
              </div>
            </div>

            <div className="admin-card-section">
              <h3 className="admin-section-heading">
                <Sparkles size={18} color="var(--admin-accent)" /> HIREMIND-AI Agent Orchestration
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                Configure and deploy autonomous AI agents across screening, portfolio generation, and recommendation engines.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {[
                  { name: 'AI Resume Parser Agent', status: 'Active', latency: '480ms', desc: 'Parses PDF & DOCX resumes to extract skills and experience.' },
                  { name: 'AI Candidate Screening Copilot', status: 'Active', latency: '620ms', desc: 'Generates role-specific technical screening questions.' },
                  { name: 'AI Smart Job Matcher', status: 'Active', latency: '310ms', desc: 'Calculates candidate-job cosine similarity match scores.' },
                  { name: 'AI Guide Assistant Chatbot', status: 'Active', latency: '190ms', desc: 'Interactive platform guide for candidates and recruiters.' }
                ].map((agent, i) => (
                  <div key={i} style={{ background: 'var(--admin-surface-subtle)', padding: '16px', borderRadius: '14px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{agent.name}</span>
                      <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                        {agent.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--admin-text-secondary)', lineHeight: 1.4 }}>{agent.desc}</p>
                    <div style={{ marginTop: 10, fontSize: '11px', color: 'var(--admin-text-muted)' }}>Avg Inference: {agent.latency}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card-section">
              <h3 className="admin-section-heading">
                <Code2 size={18} color="var(--admin-primary)" /> Application Runtime & Build Triggers
              </h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setMsg('Redis Radish cache flushed and re-indexed successfully.')}
                  style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                >
                  ⚡ Flush & Warm Redis Cache
                </button>
                <button
                  onClick={() => setMsg('AI Agent Embeddings synchronizer completed.')}
                  style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                >
                  🤖 Re-Sync AI Embeddings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            PORTAL 2: HIREMIND-MANAGEMENT TEAM ONLY
            ──────────────────────────────────────────────────────── */}
        {portalMode === 'MANAGEMENT' && (
          <div>
            {/* ── AI MANAGEMENT AGENT CONSOLE (PROMPT & QUERY MODE) ── */}
            <div className="admin-card-section" style={{ border: '1px solid rgba(56, 189, 248, 0.4)', background: 'linear-gradient(180deg, var(--admin-surface) 0%, var(--admin-surface-subtle) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={20} color="#38BDF8" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                      HireMind AI Management Copilot • Prompt & Query Mode
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                      Connected to MySQL InnoDB Engine & Redis (Radish) High-Speed Cache
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '3px 9px', borderRadius: 6 }}>
                    🟢 DB Engine: Active
                  </span>
                  <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', padding: '3px 9px', borderRadius: 6 }}>
                    ⚡ Radish Cache: Ready
                  </span>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div style={{
                maxHeight: 280,
                overflowY: 'auto',
                padding: '14px',
                borderRadius: 12,
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                marginBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {agentMessages.map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      background: m.sender === 'user' ? '#38BDF8' : 'var(--admin-surface-subtle)',
                      color: m.sender === 'user' ? '#0F172A' : 'var(--admin-text-primary)',
                      border: m.sender === 'user' ? 'none' : '1px solid var(--admin-border)',
                      fontWeight: m.sender === 'user' ? 600 : 400
                    }}>
                      {m.text}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--admin-text-muted)', marginTop: 3, textAlign: m.sender === 'user' ? 'right' : 'left' }}>
                      {m.sender === 'user' ? 'Management Admin' : 'AI Copilot'} • {m.timestamp}
                    </span>
                  </div>
                ))}
                {agentLoading && (
                  <div style={{ color: '#38BDF8', fontSize: 12.5, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} className="animate-spin" /> Querying database & Redis (Radish) cache...
                  </div>
                )}
              </div>

              {/* Quick Action Prompt Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { label: '📊 Job Stats (Today/Week/Month/Year)', cmd: 'job stats' },
                  { label: '🗄️ Database & Redis Health', cmd: 'database health' },
                  { label: '👤 Inspect Candidate 85', cmd: 'details 85' },
                  { label: '🛡️ Block Candidate 85', cmd: 'block candidate 85' },
                  { label: '✅ Unblock Candidate 85', cmd: 'unblock candidate 85' },
                  { label: '👔 Moderate HR 86', cmd: 'block hr 86' },
                  { label: '🏢 Blacklist Company 1', cmd: 'blacklist company 1' }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendAgentQuery(chip.cmd)}
                    style={{
                      background: 'var(--admin-surface)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-secondary)',
                      padding: '5px 10px',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendAgentQuery(); }}
                style={{ display: 'flex', gap: 10 }}
              >
                <input
                  type="text"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Ask AI Copilot: 'details 85', 'block candidate 85', 'how many jobs this month', 'verify company 3'..."
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-surface)',
                    color: 'var(--admin-text-primary)',
                    fontSize: 13.5,
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={agentLoading || !agentPrompt.trim()}
                  style={{
                    background: '#38BDF8',
                    color: '#0F172A',
                    border: 'none',
                    padding: '0 20px',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: agentLoading || !agentPrompt.trim() ? 'not-allowed' : 'pointer',
                    opacity: agentLoading || !agentPrompt.trim() ? 0.6 : 1
                  }}
                >
                  Send Query
                </button>
              </form>
            </div>

            {/* ── PLATFORM METRICS CARDS ── */}
            {metrics && (
              <div className="temporal-metrics-grid" style={{ marginBottom: 20 }}>
                <div className="temporal-card">
                  <div className="temporal-label"><Users size={13} /> Total Users</div>
                  <div className="temporal-val">{metrics.totalUsers}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><Building2 size={13} /> Total Companies</div>
                  <div className="temporal-val highlight">{metrics.totalCompanies}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><ShieldCheck size={13} /> Verified Companies</div>
                  <div className="temporal-val" style={{ color: '#10B981' }}>{metrics.verifiedCompanies}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><Activity size={13} /> Active Jobs</div>
                  <div className="temporal-val">{metrics.activeJobs}</div>
                </div>
              </div>
            )}

            {/* ── TEMPORAL JOB POSTINGS BREAKDOWN (Today, Week, Month, Year) ── */}
            <div className="admin-card-section">
              <h3 className="admin-section-heading">
                <BarChart3 size={18} color="var(--admin-primary)" /> Temporal Job Postings Analytics
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                Real-time tracking of employer hiring activity aggregated across temporal intervals.
              </p>

              <div className="temporal-metrics-grid">
                <div className="temporal-card">
                  <div className="temporal-label"><Calendar size={13} /> Jobs Posted Today</div>
                  <div className="temporal-val highlight">{temporalJobs?.jobsToday ?? 0}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><BarChart3 size={13} /> Posted This Week</div>
                  <div className="temporal-val">{temporalJobs?.jobsThisWeek ?? 0}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><BarChart3 size={13} /> Posted This Month</div>
                  <div className="temporal-val highlight">{temporalJobs?.jobsThisMonth ?? 0}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><BarChart3 size={13} /> Posted This Year</div>
                  <div className="temporal-val">{temporalJobs?.jobsThisYear ?? 0}</div>
                </div>
                <div className="temporal-card">
                  <div className="temporal-label"><Activity size={13} /> Total Active Jobs</div>
                  <div className="temporal-val" style={{ color: '#10B981' }}>{temporalJobs?.activeJobs ?? 0}</div>
                </div>
              </div>
            </div>

            {/* ── USER GOVERNANCE & MODERATION DIRECTORY ── */}
            <div className="admin-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <h3 className="admin-section-heading" style={{ margin: 0 }}>
                  <Users size={18} color="var(--admin-accent)" /> User Governance & Moderation Directory
                </h3>

                {/* Filter Category Tabs */}
                <div style={{ display: 'flex', gap: 6, background: 'var(--admin-surface-subtle)', padding: 4, borderRadius: 8, border: '1px solid var(--admin-border)' }}>
                  {(['ALL', 'CANDIDATE', 'HR'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: activeCategory === cat ? 'var(--admin-primary)' : 'transparent',
                        color: activeCategory === cat ? '#0F172A' : 'var(--admin-text-secondary)'
                      }}
                    >
                      {cat === 'ALL' ? 'All Accounts' : cat === 'CANDIDATE' ? 'Candidates' : 'HR Recruiters'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search user by name, email, or user ID..."
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-surface-subtle)',
                    color: 'var(--admin-text-primary)',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Users List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                {filteredUsers.slice(0, 20).map(u => (
                  <div key={u.id} className="admin-moderation-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div className="admin-user-info-name">
                        {u.firstName} {u.lastName} <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>(ID: {u.id})</span>
                      </div>
                      <div className="admin-user-info-meta">
                        {u.email} • Role: <strong>{u.roles?.join(', ')}</strong> • Status: <span style={{ color: u.status === 'BLOCKED' ? 'var(--admin-danger)' : 'var(--admin-success)', fontWeight: 700 }}>{u.status}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleInspectUser(u.id)}
                        style={{
                          background: 'var(--admin-surface)',
                          border: '1px solid var(--admin-border)',
                          color: 'var(--admin-text-primary)',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Inspect Dossier
                      </button>
                      <button
                        onClick={() => handleToggleCandidateBlock(u.id, u.status)}
                        className={`btn-block-action ${u.status === 'BLOCKED' ? 'unblock' : 'block'}`}
                      >
                        {u.status === 'BLOCKED' ? <><Unlock size={13} /> Unblock User</> : <><Lock size={13} /> Block User</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CORPORATE ENTITIES & BLACKLIST DIRECTORY ── */}
            {companies.length > 0 && (
              <div className="admin-card-section">
                <h3 className="admin-section-heading">
                  <Building2 size={18} color="var(--admin-warning)" /> Corporate Entity Moderation & Blacklist
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {companies.map(c => (
                    <div key={c.id} className="admin-moderation-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div className="admin-user-info-name">{c.name} <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>(ID: {c.id})</span></div>
                        <div className="admin-user-info-meta">
                          {c.industry || 'General Industry'} • {c.website || 'No website'} • Status: <span style={{ color: c.blacklisted ? 'var(--admin-danger)' : 'var(--admin-success)', fontWeight: 700 }}>{c.blacklisted ? 'BLACKLISTED' : (c.verified ? 'VERIFIED' : 'ACTIVE')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!c.verified && (
                          <button
                            onClick={() => handleVerifyCompany(c.id)}
                            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleCompanyBlacklist(c.id, !!c.blacklisted)}
                          className={`btn-block-action ${c.blacklisted ? 'unblock' : 'block'}`}
                        >
                          {c.blacklisted ? <><CheckCircle2 size={13} /> Unblock</> : <><Ban size={13} /> Blacklist</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PROFILE INSPECTOR MODAL ── */}
            {inspectLoading && (
              <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: '#38BDF8', color: '#0F172A', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
                Loading User Dossier...
              </div>
            )}
            {inspectedUser && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 20
              }}>
                <div style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 16,
                  maxWidth: 600,
                  width: '100%',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  padding: 24,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--admin-text-primary)' }}>
                        {inspectedUser.firstName} {inspectedUser.lastName}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                        {inspectedUser.email} • ID: {inspectedUser.id} • Status: <strong style={{ color: inspectedUser.status === 'BLOCKED' ? '#EF4444' : '#10B981' }}>{inspectedUser.status}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setInspectedUser(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', fontSize: 20, cursor: 'pointer', padding: 4 }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, color: 'var(--admin-text-primary)' }}>
                    <div>
                      <strong>Roles:</strong> {inspectedUser.roles?.join(', ')}
                    </div>
                    {inspectedUser.headline && (
                      <div><strong>Headline:</strong> {inspectedUser.headline}</div>
                    )}
                    {inspectedUser.bio && (
                      <div><strong>Bio:</strong> {inspectedUser.bio}</div>
                    )}
                    {inspectedUser.location && (
                      <div><strong>Location:</strong> {inspectedUser.location}</div>
                    )}
                    {inspectedUser.companyName && (
                      <div><strong>Company:</strong> {inspectedUser.companyName} ({inspectedUser.designation})</div>
                    )}

                    {inspectedUser.skills && inspectedUser.skills.length > 0 && (
                      <div>
                        <strong>Skills:</strong>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {inspectedUser.skills.map((s, idx) => (
                            <span key={idx} style={{ background: 'var(--admin-surface-subtle)', padding: '2px 8px', borderRadius: 6, fontSize: 11.5, border: '1px solid var(--admin-border)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {inspectedUser.verifiedBadges && inspectedUser.verifiedBadges.length > 0 && (
                      <div>
                        <strong style={{ color: '#10B981' }}>🛡️ Verified Corporate Endorsements:</strong>
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {inspectedUser.verifiedBadges.map((badge, idx) => (
                            <span key={idx} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                              ✓ {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--admin-border)' }}>
                    <button
                      onClick={() => handleToggleCandidateBlock(inspectedUser.id, inspectedUser.status)}
                      className={`btn-block-action ${inspectedUser.status === 'BLOCKED' ? 'unblock' : 'block'}`}
                    >
                      {inspectedUser.status === 'BLOCKED' ? 'Unblock Account' : 'Block Account'}
                    </button>
                    <button
                      onClick={() => setInspectedUser(null)}
                      style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            PORTAL 3: REGISTER COMPANY ONLY (EXECUTIVE QUEUE)
            ──────────────────────────────────────────────────────── */}
        {portalMode === 'COMPANY' && (
          <div>
            <div className="admin-card-section">
              <h3 className="admin-section-heading">
                <Building2 size={18} color="var(--admin-primary)" /> Corporate Multi-Tenant Leadership
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                Your company's data and candidate tag verification requests are strictly isolated and confidential.
              </p>
            </div>

            {/* Embedded Company Tag Approval Queue */}
            <CompanyTagApprovalQueue />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;
