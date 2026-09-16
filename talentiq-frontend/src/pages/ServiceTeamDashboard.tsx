import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  RefreshCw,
  Eye,
  Ticket,
  Users,
  Building2,
  LogOut,
  Send,
  ShieldCheck,
  ChevronRight,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import '../css/enterprise-admin-roles.css';
import { HireMindLogo } from '../components/HireMindLogo';

export const ServiceTeamDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'VERIFICATIONS' | 'USERS' | 'TICKETS'>('VERIFICATIONS');
  const [loading, setLoading] = useState<boolean>(true);

  // Data state
  const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);

  // Mock support tickets for customer SLA tracking
  const [tickets, setTickets] = useState<any[]>([
    { id: 'TICK-1082', customer: 'Acme Corp (HR Dept)', subject: 'Unable to verify candidate badge certificate', priority: 'HIGH', status: 'OPEN', timeAgo: '18m ago' },
    { id: 'TICK-1081', customer: 'Priya Sharma (Candidate)', subject: 'Resume parsing formatting issue on PDF upload', priority: 'MEDIUM', status: 'IN_PROGRESS', timeAgo: '42m ago' },
    { id: 'TICK-1079', customer: 'NextGen Tech (CEO)', subject: 'Billing cycle update to Annual Enterprise tier', priority: 'LOW', status: 'RESOLVED', timeAgo: '2h ago' }
  ]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReply, setTicketReply] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'VERIFICATIONS') {
        const res = await apiClient.get('/admin/service/companies/pending');
        setPendingCompanies(res.data?.content || []);
      } else if (activeTab === 'USERS') {
        const res = await apiClient.get(`/admin/service/users?search=${encodeURIComponent(userSearch)}`);
        setUsersList(res.data?.content || []);
      }
    } catch (err) {
      console.error('Error fetching service team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompany = async (companyId: number, approved: boolean) => {
    try {
      await apiClient.put(`/admin/service/companies/${companyId}/verify`, {
        approved,
        notes: approved ? 'Approved by Service Team verification officer' : 'Corporate registry verification failed'
      });
      fetchInitialData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification update failed');
    }
  };

  const handleBlockUser = async (userId: number, blocked: boolean) => {
    try {
      await apiClient.put(`/admin/service/candidates/${userId}/block`, {
        blocked,
        reason: blocked ? 'Suspicious activity violation' : 'Account reviewed and reinstated'
      });
      fetchInitialData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'User status change failed');
    }
  };

  const handleViewDetails = async (userId: number) => {
    try {
      const res = await apiClient.get(`/admin/service/users/${userId}/details`);
      setSelectedUserDetails(res.data?.data);
    } catch (err: any) {
      alert('Failed to load user dossier');
    }
  };

  const handleSendTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReply) return;
    alert(`Response sent to customer for ${selectedTicket.id}! Ticket marked as RESOLVED.`);
    setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: 'RESOLVED' } : t));
    setSelectedTicket(null);
    setTicketReply('');
  };

  const tabTitle =
    activeTab === 'VERIFICATIONS' ? 'Corporate Verifications' :
    activeTab === 'USERS' ? 'User Moderation' : 'Support Desk & SLAs';

  return (
    <div className="eadmin-shell">
      {/* ── Service Team Sidebar ── */}
      <aside className="eadmin-sidebar">
        <div className="eadmin-sidebar-head">
          <div className="eadmin-brand-link">
            <HireMindLogo variant="navbar" size="xs" theme="dark" animated={false} />
          </div>
          <div className="eadmin-role-badge-box">
            <div className="eadmin-role-label">Operations</div>
            <span className="eadmin-role-tag eadmin-tag-service">SERVICE TEAM</span>
          </div>
        </div>

        <nav className="eadmin-nav-list">
          <div className="eadmin-nav-group-title">Operations & Support</div>
          <button
            className={`eadmin-nav-btn ${activeTab === 'VERIFICATIONS' ? 'active' : ''}`}
            onClick={() => setActiveTab('VERIFICATIONS')}
          >
            <span className="eadmin-nav-btn-left">
              <Building2 size={16} />
              <span>Verifications</span>
            </span>
            {pendingCompanies.length > 0 && (
              <span className="eadmin-badge eadmin-badge-rose" style={{ padding: '1px 6px', fontSize: '10px' }}>
                {pendingCompanies.length}
              </span>
            )}
          </button>
          <button
            className={`eadmin-nav-btn ${activeTab === 'USERS' ? 'active' : ''}`}
            onClick={() => setActiveTab('USERS')}
          >
            <span className="eadmin-nav-btn-left">
              <Users size={16} />
              <span>User Moderation</span>
            </span>
          </button>
          <button
            className={`eadmin-nav-btn ${activeTab === 'TICKETS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TICKETS')}
          >
            <span className="eadmin-nav-btn-left">
              <Ticket size={16} />
              <span>Support Tickets</span>
            </span>
            <span className="eadmin-badge eadmin-badge-amber" style={{ padding: '1px 6px', fontSize: '10px' }}>
              2 OPEN
            </span>
          </button>
        </nav>

        <div className="eadmin-sidebar-footer">
          <div className="eadmin-user-card">
            <div className="eadmin-user-avatar">
              <Headphones size={15} />
            </div>
            <div className="eadmin-user-info">
              <span className="eadmin-user-name">Service Agent</span>
              <span className="eadmin-user-email">{user?.email || 'service@hiremind.ai'}</span>
            </div>
          </div>
          <button
            onClick={() => logout('/admin-login')}
            className="eadmin-signout-btn"
          >
            <LogOut size={14} /> Exit Operations
          </button>
        </div>
      </aside>

      {/* ── Main Operations Workspace ── */}
      <main className="eadmin-main">
        {/* Top Header */}
        <header className="eadmin-header">
          <div className="eadmin-header-left">
            <div className="eadmin-breadcrumb">
              <span>Operations</span>
              <ChevronRight size={13} />
              <span>Service Team</span>
              <ChevronRight size={13} />
              <strong>{tabTitle}</strong>
            </div>
          </div>

          <div className="eadmin-header-right">
            <span className="eadmin-badge eadmin-badge-teal">
              <ShieldCheck size={12} /> SLA Level: 15m Active
            </span>
            <button
              onClick={fetchInitialData}
              className="eadmin-btn eadmin-btn-secondary"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="eadmin-content">
          <div className="eadmin-page-title-row">
            <div className="eadmin-page-title-box">
              <h1>
                {activeTab === 'VERIFICATIONS' && 'Corporate Verification Queue'}
                {activeTab === 'USERS' && 'User & Recruiter Moderation Bureau'}
                {activeTab === 'TICKETS' && 'Customer Support & SLA Desk'}
              </h1>
              <p>
                {activeTab === 'VERIFICATIONS' && 'Review and verify pending enterprise employer registrations.'}
                {activeTab === 'USERS' && 'Inspect user dossiers, oversee compliance, and manage account statuses.'}
                {activeTab === 'TICKETS' && 'Resolve inbound customer tickets and maintain SLA commitments.'}
              </p>
            </div>
          </div>

          {/* ── TAB 1: CORPORATE VERIFICATIONS ── */}
          {activeTab === 'VERIFICATIONS' && (
            <div>
              {pendingCompanies.length === 0 ? (
                <div className="eadmin-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <CheckCircle2 size={44} color="#0F766E" style={{ margin: '0 auto 14px' }} />
                  <h3 style={{ fontSize: '17px', fontWeight: 750, color: '#1E293B', margin: '0 0 6px' }}>
                    All Company Registrations Verified
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto' }}>
                    There are no pending corporate verification requests in the queue. New corporate registrations will appear here for badge approval.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                  {pendingCompanies.map((c) => (
                    <div key={c.id} className="eadmin-card" style={{ marginBottom: 0 }}>
                      <div className="eadmin-card-head">
                        <div>
                          <h3 className="eadmin-card-title">{c.name}</h3>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Company ID #{c.id}</div>
                        </div>
                        <span className="eadmin-badge eadmin-badge-amber">PENDING VERIFICATION</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong style={{ color: '#1E293B' }}>Industry:</strong> {c.industry || 'Technology'}</div>
                        <div><strong style={{ color: '#1E293B' }}>Company Size:</strong> {c.companySize || '50-200'} employees</div>
                        <div>
                          <strong style={{ color: '#1E293B' }}>Website:</strong>{' '}
                          {c.website ? (
                            <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 600 }}>
                              {c.website} ↗
                            </a>
                          ) : 'Not provided'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleVerifyCompany(c.id, true)}
                          className="eadmin-btn eadmin-btn-teal"
                          style={{ flex: 1 }}
                        >
                          ✓ Approve & Issue Badge
                        </button>
                        <button
                          onClick={() => handleVerifyCompany(c.id, false)}
                          className="eadmin-btn eadmin-btn-danger"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: USER MODERATION ── */}
          {activeTab === 'USERS' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', maxWidth: '640px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={15} color="#94A3B8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, or user ID..."
                    className="eadmin-input"
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
                <button
                  onClick={fetchInitialData}
                  className="eadmin-btn eadmin-btn-primary"
                >
                  Search
                </button>
              </div>

              <div className="eadmin-table-wrapper">
                <table className="eadmin-table">
                  <thead>
                    <tr>
                      <th>User Account</th>
                      <th>System Role</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                          No user records found matching search.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.firstName} {u.lastName}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748B' }}>{u.email}</div>
                          </td>
                          <td>
                            <span className="eadmin-badge eadmin-badge-blue">
                              {u.role || 'ROLE_CANDIDATE'}
                            </span>
                          </td>
                          <td>
                            <span className={`eadmin-badge ${u.status === 'ACTIVE' ? 'eadmin-badge-teal' : 'eadmin-badge-rose'}`}>
                              {u.status === 'ACTIVE' ? '● ACTIVE' : '■ BLOCKED'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleViewDetails(u.id)}
                                className="eadmin-btn eadmin-btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '11.5px', minHeight: '30px' }}
                              >
                                <Eye size={12} /> Inspect
                              </button>
                              <button
                                onClick={() => handleBlockUser(u.id, u.status === 'ACTIVE')}
                                className={`eadmin-btn ${u.status === 'ACTIVE' ? 'eadmin-btn-danger' : 'eadmin-btn-teal'}`}
                                style={{ padding: '5px 10px', fontSize: '11.5px', minHeight: '30px' }}
                              >
                                {u.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* User Dossier Inspect Modal */}
              {selectedUserDetails && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div className="eadmin-card" style={{ maxWidth: '520px', width: '100%', marginBottom: 0, boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)' }}>
                    <div className="eadmin-card-head">
                      <h3 className="eadmin-card-title">User Dossier & Security Record</h3>
                    </div>
                    <pre style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#1E293B', fontSize: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                      {JSON.stringify(selectedUserDetails, null, 2)}
                    </pre>
                    <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSelectedUserDetails(null)}
                        className="eadmin-btn eadmin-btn-primary"
                      >
                        Close Dossier
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: SUPPORT TICKETS ── */}
          {activeTab === 'TICKETS' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : '1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="eadmin-card"
                      onClick={() => setSelectedTicket(t)}
                      style={{
                        cursor: 'pointer',
                        borderColor: selectedTicket?.id === t.id ? '#2563EB' : undefined,
                        boxShadow: selectedTicket?.id === t.id ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : undefined,
                        marginBottom: 0
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 750, color: '#2563EB' }}>{t.id}</span>
                        <span className={`eadmin-badge ${t.priority === 'HIGH' ? 'eadmin-badge-rose' : 'eadmin-badge-amber'}`}>
                          {t.priority} PRIORITY
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '6px', fontSize: '14px' }}>{t.subject}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Customer: <strong style={{ color: '#475569' }}>{t.customer}</strong></span>
                        <span>{t.timeAgo}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTicket && (
                  <div className="eadmin-card" style={{ marginBottom: 0 }}>
                    <div className="eadmin-card-head">
                      <div>
                        <h3 className="eadmin-card-title">Reply to {selectedTicket.id}</h3>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Official Customer Response</div>
                      </div>
                      <span className={`eadmin-badge ${selectedTicket.status === 'RESOLVED' ? 'eadmin-badge-teal' : 'eadmin-badge-blue'}`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '16px', padding: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <div><strong style={{ color: '#0F172A' }}>Subject:</strong> {selectedTicket.subject}</div>
                      <div style={{ marginTop: '4px' }}><strong style={{ color: '#0F172A' }}>Customer:</strong> {selectedTicket.customer}</div>
                    </div>
                    <form onSubmit={handleSendTicketReply}>
                      <label className="eadmin-label">Resolution Message</label>
                      <textarea
                        rows={5}
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        placeholder="Type official support resolution to customer..."
                        required
                        className="eadmin-input"
                        style={{ marginBottom: '16px', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="submit"
                          className="eadmin-btn eadmin-btn-primary"
                          style={{ flex: 1 }}
                        >
                          <Send size={14} /> Send Official Resolution
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(null)}
                          className="eadmin-btn eadmin-btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ServiceTeamDashboard;

