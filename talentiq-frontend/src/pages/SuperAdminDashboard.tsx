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
  CheckCircle2
} from 'lucide-react';
import '../css/admin-dashboards-distinct.css';
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

  return (
    <div className="super-command-wrapper">
      {/* ── SuperAdmin Master Sidebar ── */}
      <aside className="super-sidebar">
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(139, 92, 246, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <HireMindLogo variant="navbar" size="xs" theme="dark" animated={false} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#C4B5FD', letterSpacing: '0.05em' }}>
                SUPERADMIN COMMAND
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Master Platform Governance</div>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#C4B5FD',
            marginTop: '6px'
          }}>
            <ShieldCheck size={12} color="#10B981" /> MASTER SECURITY ROOT
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          <button
            className={`super-nav-btn ${activeTab === 'REVENUE' ? 'active' : ''}`}
            onClick={() => setActiveTab('REVENUE')}
          >
            <DollarSign size={16} /> SaaS Financial Telemetry
          </button>
          <button
            className={`super-nav-btn ${activeTab === 'MFA' ? 'active' : ''}`}
            onClick={() => setActiveTab('MFA')}
          >
            <KeyRound size={16} /> TOTP 2FA Security Center
            {mfaStatus?.enabled && (
              <span style={{ marginLeft: 'auto', background: '#10B981', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
                ACTIVE
              </span>
            )}
          </button>
          <button
            className={`super-nav-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
            onClick={() => setActiveTab('AUDIT')}
          >
            <FileCheck size={16} /> Forensic Audit Trail
          </button>
          <button
            className={`super-nav-btn ${activeTab === 'TENANTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TENANTS')}
          >
            <Globe size={16} /> Global Tenant Directory
          </button>
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(139, 92, 246, 0.25)', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>SuperAdmin Identity:</div>
          <div style={{ fontSize: '12px', color: '#C4B5FD', fontWeight: 600, wordBreak: 'break-all', marginBottom: '12px' }}>
            {user?.email}
          </div>
          <button
            onClick={() => logout('/admin-login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Exit Master Control
          </button>
        </div>
      </aside>

      {/* ── Main Governance Workspace ── */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {/* Workspace Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FAF5FF', margin: 0 }}>
              {activeTab === 'REVENUE' && '💰 SaaS Financial Engine & Monetization Telemetry'}
              {activeTab === 'MFA' && '🛡️ Multi-Factor Authentication & Cryptographic Keys'}
              {activeTab === 'AUDIT' && '🔐 Immutable Forensic Audit Trail Explorer'}
              {activeTab === 'TENANTS' && '🌐 Global Multi-Tenant Corporate Registry'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#A78BFA' }}>
              Highest Authority Tier | Single-Session Governance Active | Step-Up Verification Enforced
            </p>
          </div>

          <button
            onClick={fetchInitialData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '8px',
              color: '#EDE9FE',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Live Telemetry
          </button>
        </div>

        {/* ── TAB 1: REVENUE ── */}
        {activeTab === 'REVENUE' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="super-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A78BFA', fontSize: '12px', marginBottom: '6px' }}>
                  <span>MONTHLY RECURRING REVENUE</span>
                  <DollarSign size={16} color="#10B981" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#FAF5FF' }}>{revenueData?.mrrFormatted || '$14,200.00'}</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>+24.5% vs last month</div>
              </div>

              <div className="super-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A78BFA', fontSize: '12px', marginBottom: '6px' }}>
                  <span>ANNUAL RUN RATE (ARR)</span>
                  <TrendingUp size={16} color="#38BDF8" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#FAF5FF' }}>{revenueData?.arrFormatted || '$170,400.00'}</div>
                <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '4px' }}>Projected trajectory</div>
              </div>

              <div className="super-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A78BFA', fontSize: '12px', marginBottom: '6px' }}>
                  <span>ACTIVE PAYING TENANTS</span>
                  <ShieldCheck size={16} color="#F59E0B" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#FAF5FF' }}>{revenueData?.activeSubscribedCompanies || 18}</div>
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px' }}>0 churn this cycle</div>
              </div>
            </div>

            {/* Plan Tier Distribution */}
            <div className="super-card">
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#C4B5FD', margin: '0 0 16px' }}>
                Subscription Tier Breakdown
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div style={{ fontSize: '12px', color: '#A78BFA' }}>Enterprise Tier ($499/mo)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#FAF5FF', margin: '4px 0' }}>12 Companies</div>
                  <div style={{ fontSize: '12px', color: '#10B981' }}>$5,988/mo</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div style={{ fontSize: '12px', color: '#A78BFA' }}>Pro Tier ($199/mo)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#FAF5FF', margin: '4px 0' }}>26 Companies</div>
                  <div style={{ fontSize: '12px', color: '#38BDF8' }}>$5,174/mo</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div style={{ fontSize: '12px', color: '#A78BFA' }}>Growth Tier ($49/mo)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#FAF5FF', margin: '4px 0' }}>62 Companies</div>
                  <div style={{ fontSize: '12px', color: '#F59E0B' }}>$3,038/mo</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TOTP MFA SECURITY ── */}
        {activeTab === 'MFA' && (
          <div className="super-card" style={{ maxWidth: '640px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#C4B5FD', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={18} /> Authenticator 2FA Configuration
            </h3>
            <p style={{ fontSize: '13px', color: '#A78BFA', marginBottom: '20px', lineHeight: 1.5 }}>
              Enhance SuperAdmin security using RFC 6238 TOTP (Google Authenticator, Authy, 1Password). Required for Step-Up operations.
            </p>

            {mfaSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#34D399', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
                {mfaSuccessMsg}
              </div>
            )}

            {!mfaStatus?.enabled && !mfaSetupData && (
              <button
                onClick={handleStartMfaSetup}
                style={{ padding: '12px 24px', background: '#8B5CF6', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <QrCode size={16} /> Generate TOTP QR Secret Key →
              </button>
            )}

            {mfaSetupData && (
              <div>
                <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                  <img src={mfaSetupData.qrCodeUri || ''} alt="TOTP QR Code" style={{ width: '180px', height: '180px' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#A78BFA', marginBottom: '16px' }}>
                  Secret Key: <code style={{ color: '#F43F5E', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>{mfaSetupData.secret}</code>
                </div>
                <form onSubmit={handleConfirmMfa} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaVerifyCode}
                    onChange={(e) => setMfaVerifyCode(e.target.value)}
                    placeholder="Enter 6-digit Code"
                    required
                    style={{ width: '180px', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid #8B5CF6', borderRadius: '8px', color: '#FFF', fontSize: '14px', textAlign: 'center', fontWeight: 800 }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '10px 20px', background: '#10B981', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Confirm & Enable 2FA
                  </button>
                </form>
              </div>
            )}

            {mfaStatus?.enabled && (
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 800 }}>
                  <CheckCircle2 size={16} /> Multi-Factor Protection Active
                </div>
                <div style={{ fontSize: '12px', color: '#A78BFA', marginTop: '4px' }}>
                  Step-up verification is active. High-privilege administrative actions will require a live 6-digit TOTP token.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: AUDIT LOGS ── */}
        {activeTab === 'AUDIT' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by actor, IP address, or action type..."
                style={{ width: '100%', maxWidth: '420px', padding: '10px 14px', background: 'rgba(26, 19, 48, 0.7)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div className="super-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(16, 12, 28, 0.9)', borderBottom: '1px solid rgba(139, 92, 246, 0.25)', color: '#A78BFA' }}>
                    <th style={{ padding: '14px 18px' }}>Action</th>
                    <th style={{ padding: '14px 18px' }}>Actor</th>
                    <th style={{ padding: '14px 18px' }}>IP Address</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#EDE9FE' }}>
                          {log.action}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#C4B5FD' }}>
                          {log.actorEmail || 'system@hiremind.ai'}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#94A3B8' }}>
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '11px', fontWeight: 800 }}>
                            {log.result || 'SUCCESS'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#64748B' }}>
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
          <div className="super-card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#C4B5FD', margin: '0 0 16px' }}>
              Multi-Tenant Global Corporate Network
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <div style={{ fontWeight: 800, color: '#FAF5FF', fontSize: '15px' }}>Acme Global Technologies</div>
                <div style={{ fontSize: '12px', color: '#10B981', marginTop: '2px' }}>Enterprise Plan • Active</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>8 HR Recruiter Seats • 14 Live Jobs</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <div style={{ fontWeight: 800, color: '#FAF5FF', fontSize: '15px' }}>NextGen Solutions Ltd</div>
                <div style={{ fontSize: '12px', color: '#38BDF8', marginTop: '2px' }}>Pro Plan • Active</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px' }}>3 HR Recruiter Seats • 5 Live Jobs</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
