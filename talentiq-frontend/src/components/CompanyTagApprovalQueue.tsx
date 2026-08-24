import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Award, CheckCircle2, XCircle, ShieldCheck, Users, ShieldAlert, UserCheck } from 'lucide-react';

interface VerificationRequest {
  id: number;
  companyId: number;
  companyName: string;
  hrUserId: number;
  hrName: string;
  candidateUserId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  department?: string;
  status: string;
  requestedAt: string;
  skillsTagged?: string;
  notes?: string;
  badgeCertificateId?: string;
}

interface HrMember {
  hrProfileId: number;
  userId: number;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  companyAdmin: boolean;
  companyVerified: boolean;
  companyVerifiedTitle?: string;
  companyVerifiedAt?: string;
  active: boolean;
}

export const CompanyTagApprovalQueue: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'HR_TEAM'>('CANDIDATES');
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [hrTeam, setHrTeam] = useState<HrMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'CANDIDATES') {
        const res = await apiClient.get('/company/verifications/pending?status=PENDING');
        setRequests(res.data?.content || res.data?.data?.content || []);
      } else {
        const res = await apiClient.get('/company/verifications/hrs');
        setHrTeam(res.data?.data || []);
      }
    } catch (e) {
      console.warn('Failed to load company verification queue', e);
      if (activeTab === 'CANDIDATES') setRequests([]);
      else setHrTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id: number, approved: boolean) => {
    setActionLoadingId(id);
    setMsg('');
    try {
      await apiClient.put(`/company/verifications/${id}/decision`, {
        approved,
        rejectionReason: approved ? null : 'Declined by Company Director'
      });
      setRequests(prev => prev.filter(r => r.id !== id));
      setMsg(approved ? '✅ Candidate tag successfully approved and verified!' : '⚠️ Request rejected.');
    } catch (err: any) {
      setMsg(`❌ ${err?.response?.data?.message || 'Action failed'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleHrVerification = async (hrProfileId: number, currentVerified: boolean) => {
    setActionLoadingId(hrProfileId);
    setMsg('');
    const willVerify = !currentVerified;
    try {
      const res = await apiClient.put(`/company/verifications/hrs/${hrProfileId}/verify`, {
        verified: willVerify,
        badgeTitle: willVerify ? 'Official Company Verified Recruiter' : null
      });
      const updated = res.data?.data;
      setHrTeam(prev => prev.map(h => h.hrProfileId === hrProfileId ? { ...h, companyVerified: willVerify, companyVerifiedTitle: updated?.companyVerifiedTitle } : h));
      setMsg(willVerify ? '✅ Verified Recruiter badge awarded to HR!' : '⚠️ Verified Recruiter badge revoked.');
    } catch (err: any) {
      setMsg(`❌ ${err?.response?.data?.message || 'Action failed'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {/* Top Tab Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="var(--admin-accent)" /> Corporate Verification & Trust Governance
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
            Award verified badges to HR recruiters & approve cryptographic candidate tags.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--admin-surface-subtle)', padding: 4, borderRadius: 10, border: '1px solid var(--admin-border)' }}>
          <button
            onClick={() => setActiveTab('CANDIDATES')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'CANDIDATES' ? '#38BDF8' : 'transparent',
              color: activeTab === 'CANDIDATES' ? '#0F172A' : 'var(--admin-text-secondary)'
            }}
          >
            Candidate Approvals ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('HR_TEAM')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'HR_TEAM' ? '#38BDF8' : 'transparent',
              color: activeTab === 'HR_TEAM' ? '#0F172A' : 'var(--admin-text-secondary)'
            }}
          >
            HR Recruiter Badges ({hrTeam.length})
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          Loading {activeTab === 'CANDIDATES' ? 'pending verification requests' : 'company HR team'}...
        </div>
      ) : activeTab === 'CANDIDATES' ? (
        requests.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', background: 'var(--admin-surface)', borderRadius: 16, border: '1px dashed var(--admin-border)' }}>
            <ShieldCheck size={36} color="#34D399" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
              No pending candidate verification requests.
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
              When an authorized HR recruiter hires talent and requests a company badge, requests will appear here for Director approval.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(req => (
              <div
                key={req.id}
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: 'var(--admin-card-shadow)',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                      {req.candidateName}
                    </span>
                    <span style={{ fontSize: '12px', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                      🎯 {req.jobTitle}
                    </span>
                    {req.department && (
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                        • {req.department}
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 4, fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>
                    Candidate: <strong>{req.candidateEmail}</strong> | Requested by HR: <strong>{req.hrName}</strong>
                  </div>

                  {req.notes && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>
                      "{req.notes}"
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDecision(req.id, true)}
                    disabled={actionLoadingId === req.id}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={14} /> Approve & Issue Tag
                  </button>

                  <button
                    onClick={() => handleDecision(req.id, false)}
                    disabled={actionLoadingId === req.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#F87171',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* HR TEAM BADGES TAB */
        hrTeam.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', background: 'var(--admin-surface)', borderRadius: 16, border: '1px dashed var(--admin-border)' }}>
            <Users size={36} color="#38BDF8" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
              No HR team recruiters registered under your company yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hrTeam.map(hr => (
              <div
                key={hr.hrProfileId}
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: 'var(--admin-card-shadow)',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                      {hr.name}
                    </span>
                    {hr.companyVerified ? (
                      <span style={{ fontSize: '11.5px', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 999, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={13} /> {hr.companyVerifiedTitle || 'Verified Recruiter'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', background: 'var(--admin-surface-subtle)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                        Unverified
                      </span>
                    )}
                    {hr.companyAdmin && (
                      <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        Director / Admin
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 4, fontSize: '12.5px', color: 'var(--admin-text-secondary)' }}>
                    {hr.email} • {hr.designation || 'HR Recruiter'} {hr.department ? `(${hr.department})` : ''}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleToggleHrVerification(hr.hrProfileId, hr.companyVerified)}
                    disabled={actionLoadingId === hr.hrProfileId}
                    style={{
                      background: hr.companyVerified ? 'rgba(239, 68, 68, 0.12)' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      color: hr.companyVerified ? '#F87171' : '#FFFFFF',
                      border: hr.companyVerified ? '1px solid rgba(239, 68, 68, 0.25)' : 'none',
                      borderRadius: 10,
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {hr.companyVerified ? <><ShieldAlert size={14} /> Revoke Verified Badge</> : <><UserCheck size={14} /> Award Verified Badge</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
