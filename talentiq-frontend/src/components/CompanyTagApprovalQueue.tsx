import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Award, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

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

export const CompanyTagApprovalQueue: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/company/verifications/pending?status=PENDING');
      setRequests(res.data?.content || res.data?.data?.content || []);
    } catch (e) {
      console.warn('Failed to load pending verifications', e);
      setRequests([]);
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

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="var(--admin-accent)" /> Company Candidate Verification Queue
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
            Review candidate tag requests submitted by your HR recruiters. Approvals issue official cryptographic company badges.
          </p>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '4px 12px', borderRadius: 999 }}>
          {requests.length} Pending Approval
        </span>
      </div>

      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          Loading pending company verification requests...
        </div>
      ) : requests.length === 0 ? (
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
                boxShadow: 'var(--admin-card-shadow)'
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
      )}
    </div>
  );
};
