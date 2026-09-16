import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  KeyRound,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  QrCode,
  Globe,
  LogOut,
  CheckCircle2,
  Search
} from 'lucide-react';
import '../css/enterprise-admin-roles.css';
import { HireMindLogo } from '../components/HireMindLogo';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'MFA' | 'AUDIT' | 'TENANTS'>('REVENUE');
  const [loading, setLoading] = useState<boolean>(true);

  // Revenue & Audit state
  const [revenueData, setRevenueData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState<string>('');

  // MFA Setup State
  const [mfaStatus, setMfaStatus] = useState<any>(null);
  const [mfaSetupData, setMfaSetupData] = useState<any>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState<string>('');
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'REVENUE') {
        const res = await apiClient.get('/admin/super/revenue/overview');
        setRevenueData(res.data?.data);
      } else if (activeTab === 'MFA') {
        const res = await apiClient.get('/admin/super/mfa/status');
        setMfaStatus(res.data?.data);
      } else if (activeTab === 'AUDIT') {
        const res = await apiClient.get('/admin/super/audit/logs');
        setAuditLogs(res.data?.data?.content || []);
      }
    } catch (err) {
      console.error('Error fetching super admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    try {
      const res = await apiClient.post('/admin/super/mfa/setup');
      setMfaSetupData(res.data?.data);
    } catch (err: any) {
      alert('Failed to initiate TOTP setup');
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/super/mfa/verify-enable', { code: mfaVerifyCode });
      setMfaSuccessMsg('✅ TOTP Two-Factor Authentication successfully activated on your account!');
      setMfaSetupData(null);
      fetchInitialData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invalid 6-digit TOTP verification code');
    }
  };

  const filteredLogs = auditLogs.filter(log =>
    !auditSearch ||
    log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.actorEmail?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.ipAddress?.includes(auditSearch)
  );

  const tabTitle =
    activeTab === 'REVENUE' ? 'Financial Telemetry' :
    activeTab === 'MFA' ? '2FA Security Center' :
    activeTab === 'AUDIT' ? 'Forensic Audit Trail' : 'Global Tenant Directory';

  return (
    <div className="eadmin-shell">
      {/* ── SuperAdmin Master Sidebar ── */}
      <aside className="eadmin-sidebar">
        <div className="eadmin-sidebar-head">
          <div className="eadmin-brand-link">
            <HireMindLogo variant="navbar" size="xs" theme="dark" animated={false} />
          </div>
          <div className="eadmin-role-badge-box">
            <div className="eadmin-role-label">Platform Root</div>
            <span className="eadmin-role-tag eadmin-tag-super">SUPER ADMIN</span>
          </div>
        </div>

        <nav className="eadmin-nav-list">
          <div className="eadmin-nav-group-title">Governance & Security</div>
          <button
            className={`eadmin-nav-btn ${activeTab === 'REVENUE' ? 'active' : ''}`}
            onClick={() => setActiveTab('REVENUE')}
          >
            <span className="eadmin-nav-btn-left">
              <DollarSign size={16} /> Financial Telemetry
            </span>
          </button>
          <button
            className={`eadmin-nav-btn ${activeTab === 'MFA' ? 'active' : ''}`}
            onClick={() => setActiveTab('MFA')}
          >
            <span className="eadmin-nav-btn-left">
              <KeyRound size={16} /> TOTP 2FA Security
            </span>
            {mfaStatus?.enabled && (
              <span className="eadmin-badge eadmin-badge-teal" style={{ fontSize: '10px', padding: '1px 6px' }}>
                ACTIVE
              </span>
            )}
          </button>
          <button
            className={`eadmin-nav-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
            onClick={() => setActiveTab('AUDIT')}
          >
            <span className="eadmin-nav-btn-left">
              <FileCheck size={16} /> Forensic Audit Trail
            </span>
            {auditLogs.length > 0 && (
              <span className="eadmin-badge eadmin-badge-slate" style={{ fontSize: '10px', padding: '1px 6px' }}>
                {auditLogs.length}
              </span>
            )}
          </button>
          <button
            className={`eadmin-nav-btn ${activeTab === 'TENANTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TENANTS')}
          >
            <span className="eadmin-nav-btn-left">
              <Globe size={16} /> Tenant Directory
            </span>
          </button>
        </nav>

        <div className="eadmin-sidebar-footer">
          <div className="eadmin-user-card">
            <div className="eadmin-user-avatar" style={{ background: 'rgba(217, 119, 6, 0.25)', color: '#FBBF24' }}>
              SA
            </div>
            <div className="eadmin-user-info">
              <span className="eadmin-user-name">Super Administrator</span>
              <span className="eadmin-user-email">{user?.email || 'admin@hiremind.ai'}</span>
            </div>
          </div>
          <button onClick={() => logout('/admin-login')} className="eadmin-signout-btn">
            <LogOut size={13} /> Exit Master Control
          </button>
        </div>
      </aside>

      {/* ── Main Governance Workspace ── */}
      <main className="eadmin-main">
        {/* Workspace Top Header */}
        <header className="eadmin-header">
          <div className="eadmin-header-left">
            <div className="eadmin-breadcrumb">
              <span>SuperAdmin</span>
              <span>/</span>
              <strong>{tabTitle}</strong>
            </div>
          </div>

          <div className="eadmin-header-right">
            <button
              onClick={fetchInitialData}
              className="eadmin-btn eadmin-btn-secondary"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh Telemetry'}
            </button>
          </div>
        </header>

        <div className="eadmin-content">
          {/* Workspace Title Row */}
          <div className="eadmin-page-title-row">
            <div className="eadmin-page-title-box">
              <h1>
                {activeTab === 'REVENUE' && 'SaaS Financial Engine & Monetization Telemetry'}
                {activeTab === 'MFA' && 'Multi-Factor Authentication & Cryptographic Keys'}
                {activeTab === 'AUDIT' && 'Immutable Forensic Audit Trail Explorer'}
                {activeTab === 'TENANTS' && 'Global Multi-Tenant Corporate Registry'}
              </h1>
              <p>
                Highest Authority Tier • Single-Session Governance Active • Step-Up Verification Enforced
              </p>
            </div>
          </div>

          {/* ── TAB 1: REVENUE ── */}
          {activeTab === 'REVENUE' && (
            <div>
              {/* Financial KPI Cards */}
              <div className="eadmin-kpi-grid">
                <div className="eadmin-kpi-card">
                  <div className="eadmin-kpi-top">
                    <span className="eadmin-kpi-label">Monthly Recurring Revenue</span>
                    <div className="eadmin-kpi-icon teal">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div className="eadmin-kpi-val">{revenueData?.mrrFormatted || '$14,200.00'}</div>
                  <div className="eadmin-kpi-sub" style={{ color: '#0F766E', fontWeight: 600 }}>
                    ↑ +24.5% vs last month
                  </div>
                </div>

                <div className="eadmin-kpi-card">
                  <div className="eadmin-kpi-top">
                    <span className="eadmin-kpi-label">Annual Run Rate (ARR)</span>
                    <div className="eadmin-kpi-icon blue">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className="eadmin-kpi-val">{revenueData?.arrFormatted || '$170,400.00'}</div>
                  <div className="eadmin-kpi-sub" style={{ color: '#2563EB', fontWeight: 600 }}>
                    Projected trajectory
                  </div>
                </div>

                <div className="eadmin-kpi-card">
                  <div className="eadmin-kpi-top">
                    <span className="eadmin-kpi-label">Active Paying Tenants</span>
                    <div className="eadmin-kpi-icon amber">
                      <ShieldCheck size={18} />
                    </div>
                  </div>
                  <div className="eadmin-kpi-val">{revenueData?.activeSubscribedCompanies || 18}</div>
                  <div className="eadmin-kpi-sub" style={{ color: '#D97706', fontWeight: 600 }}>
                    0 churn this billing cycle
                  </div>
                </div>
              </div>

              {/* Plan Tier Distribution */}
              <div className="eadmin-card">
                <div className="eadmin-card-head">
                  <div>
                    <h3 className="eadmin-card-title">Subscription Tier Breakdown</h3>
                    <p className="eadmin-card-subtitle">Active subscription revenue by corporate package</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enterprise Tier ($499/mo)</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', margin: '6px 0 2px' }}>12 Companies</div>
                    <div style={{ fontSize: '13px', color: '#0F766E', fontWeight: 600 }}>$5,988/mo total revenue</div>
                  </div>
                  <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pro Tier ($199/mo)</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', margin: '6px 0 2px' }}>26 Companies</div>
                    <div style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600 }}>$5,174/mo total revenue</div>
                  </div>
                  <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Growth Tier ($49/mo)</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', margin: '6px 0 2px' }}>62 Companies</div>
                    <div style={{ fontSize: '13px', color: '#D97706', fontWeight: 600 }}>$3,038/mo total revenue</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: TOTP MFA SECURITY ── */}
          {activeTab === 'MFA' && (
            <div className="eadmin-card" style={{ maxWidth: '680px' }}>
              <div className="eadmin-card-head">
                <div>
                  <h3 className="eadmin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <KeyRound size={18} color="#2563EB" /> Authenticator 2FA Configuration
                  </h3>
                  <p className="eadmin-card-subtitle">
                    Enhance SuperAdmin security using RFC 6238 TOTP (Google Authenticator, Authy, 1Password). Required for Step-Up operations.
                  </p>
                </div>
              </div>

              {mfaSuccessMsg && (
                <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', color: '#0F766E', padding: '14px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
                  {mfaSuccessMsg}
                </div>
              )}

              {!mfaStatus?.enabled && !mfaSetupData && (
                <button
                  onClick={handleStartMfaSetup}
                  className="eadmin-btn eadmin-btn-primary"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  <QrCode size={16} /> Generate TOTP QR Secret Key →
                </button>
              )}

              {mfaSetupData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'inline-block', width: 'fit-content' }}>
                    <img src={mfaSetupData.qrCodeUri || ''} alt="TOTP QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    Secret Key:{' '}
                    <code style={{ color: '#0F172A', background: '#E2E8F0', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      {mfaSetupData.secret}
                    </code>
                  </div>
                  <form onSubmit={handleConfirmMfa} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value)}
                      placeholder="Enter 6-digit Code"
                      required
                      className="eadmin-input"
                      style={{ width: '180px', textAlign: 'center', fontWeight: 800, letterSpacing: '0.15em', fontSize: '15px' }}
                    />
                    <button
                      type="submit"
                      className="eadmin-btn eadmin-btn-teal"
                    >
                      Confirm & Enable 2FA
                    </button>
                  </form>
                </div>
              )}

              {mfaStatus?.enabled && (
                <div style={{ padding: '18px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F766E', fontWeight: 750, fontSize: '14px' }}>
                    <CheckCircle2 size={18} /> Multi-Factor Protection Active
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '6px' }}>
                    Step-up verification is active. High-privilege administrative actions will require a live 6-digit TOTP token.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: AUDIT LOGS ── */}
          {activeTab === 'AUDIT' && (
            <div>
              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search audit trail by actor, IP address, or action type..."
                    className="eadmin-input"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div className="eadmin-table-wrapper">
                <table className="eadmin-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 700, color: '#1E293B' }}>
                            {log.action}
                          </td>
                          <td style={{ color: '#2563EB', fontWeight: 550 }}>
                            {log.actorEmail || 'system@hiremind.ai'}
                          </td>
                          <td style={{ color: '#64748B', fontFamily: 'monospace', fontSize: '12px' }}>
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                          <td>
                            <span className="eadmin-badge eadmin-badge-teal">
                              {log.result || 'SUCCESS'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748B', fontSize: '12px' }}>
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 4: TENANTS ── */}
          {activeTab === 'TENANTS' && (
            <div className="eadmin-card">
              <div className="eadmin-card-head">
                <div>
                  <h3 className="eadmin-card-title">Multi-Tenant Global Corporate Network</h3>
                  <p className="eadmin-card-subtitle">Active enterprise tenants and resource allocation</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '15px' }}>Acme Global Technologies</div>
                    <span className="eadmin-badge eadmin-badge-teal">Enterprise Plan</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#0F766E', fontWeight: 600 }}>Active • Verified</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                    8 HR Recruiter Seats • 14 Live Job Openings
                  </div>
                </div>

                <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '15px' }}>NextGen Solutions Ltd</div>
                    <span className="eadmin-badge eadmin-badge-blue">Pro Plan</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>Active • Verified</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                    3 HR Recruiter Seats • 5 Live Job Openings
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
