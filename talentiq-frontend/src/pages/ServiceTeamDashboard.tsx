import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  CheckCircle,
  Search,
  RefreshCw,
  Eye,
  Ticket,
  Users,
  Building2,
  LogOut,
  Send
} from 'lucide-react';
import '../css/admin-dashboards-distinct.css';

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

  return (
    <div className="service-desk-wrapper">
      {/* ── Service Team Sidebar ── */}
      <aside className="service-sidebar">
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid #6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818CF8'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#A5B4FC', letterSpacing: '0.05em' }}>
                SERVICE & SUPPORT
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Customer Success Desk</div>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#A5B4FC',
            marginTop: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1', display: 'inline-block' }} />
            SLA HOTLINE ACTIVE
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          <button
            className={`service-nav-btn ${activeTab === 'VERIFICATIONS' ? 'active' : ''}`}
            onClick={() => setActiveTab('VERIFICATIONS')}
          >
            <Building2 size={16} /> Corporate Verifications
            {pendingCompanies.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#FFF', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                {pendingCompanies.length}
              </span>
            )}
          </button>
          <button
            className={`service-nav-btn ${activeTab === 'USERS' ? 'active' : ''}`}
            onClick={() => setActiveTab('USERS')}
          >
            <Users size={16} /> User & HR Moderation
          </button>
          <button
            className={`service-nav-btn ${activeTab === 'TICKETS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TICKETS')}
          >
            <Ticket size={16} /> Customer Support Tickets
            <span style={{ marginLeft: 'auto', background: '#F59E0B', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
              2 OPEN
            </span>
          </button>
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Signed in as Service Agent:</div>
          <div style={{ fontSize: '12px', color: '#A5B4FC', fontWeight: 600, wordBreak: 'break-all', marginBottom: '12px' }}>
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
            <LogOut size={14} /> Exit Helpdesk
          </button>
        </div>
      </aside>

      {/* ── Main Operations Workspace ── */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#F1F5F9', margin: 0 }}>
              {activeTab === 'VERIFICATIONS' && '🏢 Corporate Verification & Onboarding Queue'}
              {activeTab === 'USERS' && '👤 User & Recruiter Moderation Bureau'}
              {activeTab === 'TICKETS' && '🎫 Customer Support Tickets & SLA Desk'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              Service & Moderation Team | Enterprise Customer SLA Level: 15 Minutes
            </p>
          </div>

          <button
            onClick={fetchInitialData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#A5B4FC',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Queue
          </button>
        </div>

        {/* ── TAB 1: CORPORATE VERIFICATIONS ── */}
        {activeTab === 'VERIFICATIONS' && (
          <div>
            {pendingCompanies.length === 0 ? (
              <div className="service-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', margin: '0 0 8px' }}>
                  All Company Registrations Verified!
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '400px', margin: '0 auto' }}>
                  There are no pending corporate verification requests in the queue. New corporate registrations will appear here for badge approval.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {pendingCompanies.map((c) => (
                  <div key={c.id} className="service-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>{c.name}</h3>
                      <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        PENDING
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><strong>Industry:</strong> {c.industry || 'Technology'}</div>
                      <div><strong>Size:</strong> {c.companySize || '50-200'} employees</div>
                      <div><strong>Website:</strong> <a href={c.website || '#'} target="_blank" rel="noreferrer" style={{ color: '#818CF8' }}>{c.website || 'N/A'}</a></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleVerifyCompany(c.id, true)}
                        style={{ flex: 1, padding: '8px', background: '#10B981', border: 'none', borderRadius: '6px', color: '#060913', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                      >
                        ✓ Approve & Issue Badge
                      </button>
                      <button
                        onClick={() => handleVerifyCompany(c.id, false)}
                        style={{ padding: '8px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '6px', color: '#F87171', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
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
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color="#64748B" style={{ position: 'absolute', top: '12px', left: '14px' }} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email, or candidate ID..."
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '13px'
                  }}
                />
              </div>
              <button
                onClick={fetchInitialData}
                style={{ padding: '10px 20px', background: '#6366F1', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Search
              </button>
            </div>

            <div className="service-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', color: '#94A3B8' }}>
                    <th style={{ padding: '14px 18px' }}>User</th>
                    <th style={{ padding: '14px 18px' }}>Role</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#A5B4FC' }}>
                        {u.role || 'ROLE_CANDIDATE'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.status === 'ACTIVE' ? '#10B981' : '#F87171'
                        }}>
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleViewDetails(u.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#A5B4FC',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                          <button
                            onClick={() => handleBlockUser(u.id, u.status === 'ACTIVE')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: u.status === 'ACTIVE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: u.status === 'ACTIVE' ? '#F87171' : '#10B981'
                            }}
                          >
                            {u.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User Dossier Inspect Modal */}
            {selectedUserDetails && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div className="service-card" style={{ maxWidth: '480px', width: '100%', background: '#0F172A' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px' }}>User Dossier & Security Record</h3>
                  <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '8px', color: '#A5B4FC', fontSize: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                    {JSON.stringify(selectedUserDetails, null, 2)}
                  </pre>
                  <button
                    onClick={() => setSelectedUserDetails(null)}
                    style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#6366F1', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SUPPORT TICKETS ── */}
        {activeTab === 'TICKETS' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1fr' : '1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="service-card"
                    onClick={() => setSelectedTicket(t)}
                    style={{
                      cursor: 'pointer',
                      borderColor: selectedTicket?.id === t.id ? '#6366F1' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#818CF8' }}>{t.id}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: t.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: t.priority === 'HIGH' ? '#F87171' : '#F59E0B'
                      }}>
                        {t.priority} PRIORITY
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>{t.subject}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                      <span>From: {t.customer}</span>
                      <span>{t.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket && (
                <div className="service-card">
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 12px' }}>
                    Reply to {selectedTicket.id}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <strong>Subject:</strong> {selectedTicket.subject}<br />
                    <strong>Customer:</strong> {selectedTicket.customer}
                  </div>
                  <form onSubmit={handleSendTicketReply}>
                    <textarea
                      rows={5}
                      value={ticketReply}
                      onChange={(e) => setTicketReply(e.target.value)}
                      placeholder="Type official support resolution to customer..."
                      required
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        padding: '12px',
                        fontSize: '13px',
                        marginBottom: '16px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="submit"
                        style={{ flex: 1, padding: '10px', background: '#6366F1', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Send size={14} /> Send Official Resolution
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#94A3B8', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
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
      </main>
    </div>
  );
};

export default ServiceTeamDashboard;
