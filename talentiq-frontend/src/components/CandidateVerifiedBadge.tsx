import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Award, Briefcase, CheckCircle2 } from 'lucide-react';

interface CompanyVerificationBadge {
  id: number;
  companyId: number;
  companyName: string;
  companyLogoUrl?: string;
  hrName: string;
  jobTitle: string;
  department?: string;
  status: string;
  approvedAt: string;
  approvedByName?: string;
  badgeCertificateId: string;
  skillsTagged?: string;
}

interface OfficialEmployment {
  id: number;
  companyName: string;
  jobTitle: string;
  department?: string;
  employeeCode: string;
  status: string;
  employmentType: string;
  joinDate?: string;
  verifiedAt?: string;
}

interface Props {
  candidateUserId: number;
}

export const CandidateVerifiedBadge: React.FC<Props> = ({ candidateUserId }) => {
  const [badges, setBadges] = useState<CompanyVerificationBadge[]>([]);
  const [employments, setEmployments] = useState<OfficialEmployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateUserId) return;
    setLoading(true);

    const p1 = apiClient.get(`/company/verifications/candidate/${candidateUserId}`)
      .then(res => setBadges(res.data?.data || []))
      .catch(() => setBadges([]));

    const p2 = apiClient.get('/employees/me')
      .then(res => {
        const list = res.data?.data || [];
        setEmployments(list.filter((e: OfficialEmployment) => e.status === 'ACTIVE'));
      })
      .catch(() => setEmployments([]));

    Promise.allSettled([p1, p2]).finally(() => setLoading(false));
  }, [candidateUserId]);

  if (loading || (badges.length === 0 && employments.length === 0)) return null;

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Official Verified Employee Card */}
      {employments.map(emp => (
        <div
          key={`emp-${emp.id}`}
          style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(56, 189, 248, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 0 15px rgba(56, 189, 248, 0.5)',
                flexShrink: 0
              }}
            >
              <Briefcase size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Verified Corporate Employee
                </span>
                <span style={{ fontSize: '11px', color: '#E2E8F0', fontFamily: 'monospace', background: 'rgba(56, 189, 248, 0.2)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                  {emp.employeeCode}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#E2E8F0' }}>
                Active at <strong>{emp.companyName}</strong> · <em>{emp.jobTitle}</em> {emp.department ? `(${emp.department})` : ''}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontSize: '10.5px', color: '#38BDF8', fontWeight: 700, display: 'block' }}>
              OFFICIAL MEMBER
            </span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              {emp.joinDate ? `Joined ${emp.joinDate}` : 'Active'}
            </span>
          </div>
        </div>
      ))}

      {/* Candidate Tag Badges */}
      {badges.map(b => (
        <div
          key={`badge-${b.id}`}
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 0 15px rgba(52, 211, 153, 0.5)',
                flexShrink: 0
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#34D399' }}>
                  ✓ Official Company Verified
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: 999 }}>
                  {b.badgeCertificateId}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#E2E8F0' }}>
                Hired & Verified by <strong>{b.companyName}</strong> as <em>{b.jobTitle}</em>
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontSize: '10.5px', color: '#6EE7B7', fontWeight: 600, display: 'block' }}>
              Approved by Leadership
            </span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              {new Date(b.approvedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
