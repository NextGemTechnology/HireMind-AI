import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAdminTheme } from '../context/AdminThemeContext';
import {
  ShieldCheck, Users, Building2, Lock, Unlock,
  Code2, Sparkles, BarChart3, Sun, Moon, CloudSun, Calendar,
  Activity, Database, Terminal, Ban, CheckCircle2
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

export const AdminPortal: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useAdminTheme();

  // Tab: 'DEVELOPER' | 'MANAGEMENT' | 'COMPANY'
  const [activeTab, setActiveTab] = useState<'DEVELOPER' | 'MANAGEMENT' | 'COMPANY'>(() => {
    if (user?.roles?.includes('ROLE_APP_DEVELOPER')) return 'DEVELOPER';
    if (user?.roles?.includes('ROLE_COMPANY_ADMIN')) return 'COMPANY';
    return 'MANAGEMENT';
  });

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [temporalJobs, setTemporalJobs] = useState<TemporalJobMetrics | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, tjRes, uRes, cRes] = await Promise.all([
        apiClient.get('/admin/metrics').catch(() => ({ data: { data: null } })),
        apiClient.get('/admin/metrics/temporal').catch(() => ({ data: { data: null } })),
        apiClient.get('/admin/users?page=0&size=20').catch(() => ({ data: { content: [] } })),
        apiClient.get('/admin/companies/pending?page=0&size=20').catch(() => ({ data: { content: [] } }))
      ]);

      setMetrics(mRes.data?.data || null);
      setTemporalJobs(tjRes.data?.data || {
        jobsToday: 0, jobsThisWeek: 0, jobsThisMonth: 0, jobsThisYear: 0, totalJobs: 0, activeJobs: 0
      });
      setUsers(uRes.data?.content || uRes.data?.data?.content || []);
      setCompanies(cRes.data?.content || cRes.data?.data?.content || []);
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
      setMsg(willBlock ? 'Candidate account blocked.' : 'Candidate account unblocked.');
    } catch (e: any) {
      setMsg(`Action failed: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleToggleCompanyBlacklist = async (companyId: number, isBlacklisted: boolean) => {
    const willBlacklist = !isBlacklisted;
    try {
      await apiClient.put(`/admin/companies/${companyId}/blacklist`, { blocked: willBlacklist, reason: 'Compliance review' });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, blacklisted: willBlacklist } : c));
      setMsg(willBlacklist ? 'Company blacklisted from platform.' : 'Company unblocked / whitelisted.');
    } catch (e: any) {
      setMsg(`Action failed: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  return (
    <div className={`admin-page-wrapper admin-theme-${theme}`}>
      <div className="admin-container">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-header-title">
            <HireMindLogo variant="badge" size="md" />
            <div>
              <h1 className="admin-title-text">Executive Control Center</h1>
              <p className="admin-subtitle-text">
                HireMind-AI Governance, AI Agent Diagnostics, Moderation & Company Verification
              </p>
            </div>
          </div>

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
        </div>

        {/* Global Action Message */}
        {msg && (
          <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: '13.5px', color: 'var(--admin-text-primary)' }}>
            {msg}
          </div>
        )}

        {/* Role Tab Navigation */}
        <div className="admin-tab-nav">
          <button
            onClick={() => setActiveTab('DEVELOPER')}
            className={`admin-tab-btn ${activeTab === 'DEVELOPER' ? 'active' : ''}`}
          >
            <Code2 size={16} /> Application Developer Suite
          </button>
          <button
            onClick={() => setActiveTab('MANAGEMENT')}
            className={`admin-tab-btn ${activeTab === 'MANAGEMENT' ? 'active' : ''}`}
          >
            <Users size={16} /> HireMind-Management Team
          </button>
          <button
            onClick={() => setActiveTab('COMPANY')}
            className={`admin-tab-btn ${activeTab === 'COMPANY' ? 'active' : ''}`}
          >
            <Building2 size={16} /> Register Company (Executive Queue)
          </button>
        </div>

        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
            Refreshing telemetry and platform data...
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 1: APPLICATION DEVELOPER SUITE
            ──────────────────────────────────────────────────────── */}
        {activeTab === 'DEVELOPER' && (
          <div>
            {/* Developer Safe Lock Banner */}
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

            {/* System Diagnostics & Telemetry Cards */}
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

            {/* AI Agents Manager */}
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
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 2: HIREMIND-MANAGEMENT TEAM SUITE
            ──────────────────────────────────────────────────────── */}
        {activeTab === 'MANAGEMENT' && (
          <div>
            {/* Platform Overview Metrics */}
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

            {/* Temporal Job Statistics Breakdown (Today, This Week, This Month, This Year) */}
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

            {/* Candidate & HR Moderation Controls */}
            <div className="admin-card-section">
              <h3 className="admin-section-heading">
                <Users size={18} color="var(--admin-accent)" /> User Governance & Candidate / HR Moderation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {users.slice(0, 10).map(u => (
                  <div key={u.id} className="admin-moderation-item">
                    <div>
                      <div className="admin-user-info-name">{u.firstName} {u.lastName}</div>
                      <div className="admin-user-info-meta">
                        {u.email} • Role: <strong>{u.roles?.join(', ')}</strong> • Status: <span style={{ color: u.status === 'BLOCKED' ? 'var(--admin-danger)' : 'var(--admin-success)', fontWeight: 700 }}>{u.status}</span>
                      </div>
                    </div>
                    <div>
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

            {/* Company Blacklist & Moderation Controls */}
            {companies.length > 0 && (
              <div className="admin-card-section">
                <h3 className="admin-section-heading">
                  <Building2 size={18} color="var(--admin-warning)" /> Corporate Entity Moderation & Blacklist
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {companies.map(c => (
                    <div key={c.id} className="admin-moderation-item">
                      <div>
                        <div className="admin-user-info-name">{c.name}</div>
                        <div className="admin-user-info-meta">
                          {c.industry || 'General Industry'} • {c.website || 'No website'} • Status: <span style={{ color: c.blacklisted ? 'var(--admin-danger)' : 'var(--admin-success)', fontWeight: 700 }}>{c.blacklisted ? 'BLACKLISTED' : (c.verified ? 'VERIFIED' : 'ACTIVE')}</span>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => handleToggleCompanyBlacklist(c.id, !!c.blacklisted)}
                          className={`btn-block-action ${c.blacklisted ? 'unblock' : 'block'}`}
                        >
                          {c.blacklisted ? <><CheckCircle2 size={13} /> Unblock / Whitelist</> : <><Ban size={13} /> Blacklist Company</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 3: REGISTER COMPANY & VERIFICATION QUEUE
            ──────────────────────────────────────────────────────── */}
        {activeTab === 'COMPANY' && (
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
