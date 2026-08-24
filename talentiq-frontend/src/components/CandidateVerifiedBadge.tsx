import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Award } from 'lucide-react';

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

interface Props {
  candidateUserId: number;
}

export const CandidateVerifiedBadge: React.FC<Props> = ({ candidateUserId }) => {
  const [badges, setBadges] = useState<CompanyVerificationBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateUserId) return;
    apiClient.get(`/company/verifications/candidate/${candidateUserId}`)
      .then(res => {
        setBadges(res.data?.data || []);
      })
      .catch(() => {
        setBadges([]);
      })
      .finally(() => setLoading(false));
  }, [candidateUserId]);

  if (loading || badges.length === 0) return null;

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {badges.map(b => (
        <div
          key={b.id}
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
