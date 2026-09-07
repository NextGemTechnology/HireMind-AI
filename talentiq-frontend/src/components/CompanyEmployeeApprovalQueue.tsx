import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Briefcase
} from 'lucide-react';

interface Employee {
  id: number;
  companyId: number;
  candidateName: string;
  candidateEmail: string;
  employeeCode: string;
  jobTitle: string;
  department?: string;
  employmentType: string;
  status: string;
  terminationStatus?: string;
  terminationReason?: string;
  noticePeriodDays?: number;
  baseSalary?: number;
  salaryCurrency?: string;
  createdAt: string;
}

interface CompanyEmployeeApprovalQueueProps {
  initialSubTab?: 'VERIFICATIONS' | 'TERMINATIONS' | 'ALL';
}

export const CompanyEmployeeApprovalQueue: React.FC<CompanyEmployeeApprovalQueueProps> = ({ initialSubTab = 'VERIFICATIONS' }) => {
  const [subTab, setSubTab] = useState<'VERIFICATIONS' | 'TERMINATIONS' | 'ALL'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [pendingVerifications, setPendingVerifications] = useState<Employee[]>([]);
  const [pendingTerminations, setPendingTerminations] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const [verifRes, allRes] = await Promise.all([
        apiClient.get('/employees?status=PENDING_VERIFICATION'),
        apiClient.get('/employees')
      ]);
      const verifs = verifRes.data?.data?.content || verifRes.data?.data || [];
      const all = allRes.data?.data?.content || allRes.data?.data || [];
      setPendingVerifications(verifs);
      setAllEmployees(all);
      setPendingTerminations(all.filter((e: Employee) => e.status === 'ON_NOTICE' && e.terminationStatus === 'PENDING_APPROVAL'));
    } catch (err) {
      console.error('Failed to load employee queues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDecision = async (empId: number, approved: boolean) => {
    setActionId(empId);
    try {
      await apiClient.put(`/employees/${empId}/verify`, {
        approved,
        rejectionReason: approved ? undefined : 'Executive decision: Onboarding criteria not satisfied'
      });
      setMsg(approved ? '✅ Employee officially verified & active' : '❌ Employee onboarding rejected');
      fetchQueues();
    } catch (err: any) {
      setMsg('⚠️ ' + (err.response?.data?.message || 'Verification update failed'));
    } finally {
      setActionId(null);
    }
  };

  const handleTerminationDecision = async (empId: number, approved: boolean) => {
    setActionId(empId);
    try {
      await apiClient.put(`/employees/${empId}/terminate/decision`, {
        approved,
        notes: approved ? 'Termination approved by Company Leadership' : 'Termination rejected by Company Leadership'
      });
      setMsg(approved ? '✅ Termination finalized' : 'Restored employee to active status');
      fetchQueues();
    } catch (err: any) {
      setMsg('⚠️ ' + (err.response?.data?.message || 'Termination decision failed'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div style={{ background: '#0F172A', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={22} color="#38BDF8" /> Employee Governance & Approval Queues
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
            Executive authorization workspace for corporate employee onboarding and separation notices.
          </p>
        </div>
        <button
          onClick={fetchQueues}
          style={{
            padding: '8px 14px', borderRadius: '8px', background: '#1E293B', color: '#F8FAFC',
            border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38BDF8', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
          {msg}
        </div>
      )}

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setSubTab('VERIFICATIONS')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: subTab === 'VERIFICATIONS' ? 'rgba(56,189,248,0.15)' : 'transparent',
            border: subTab === 'VERIFICATIONS' ? '1px solid #38BDF8' : '1px solid transparent',
            color: subTab === 'VERIFICATIONS' ? '#38BDF8' : '#94A3B8',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <ShieldCheck size={16} /> Pending Verifications
          {pendingVerifications.length > 0 && (
            <span style={{ background: '#F59E0B', color: '#000', fontSize: '11px', padding: '1px 7px', borderRadius: '10px', fontWeight: 800 }}>
              {pendingVerifications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('TERMINATIONS')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: subTab === 'TERMINATIONS' ? 'rgba(239,68,68,0.15)' : 'transparent',
            border: subTab === 'TERMINATIONS' ? '1px solid #EF4444' : '1px solid transparent',
            color: subTab === 'TERMINATIONS' ? '#EF4444' : '#94A3B8',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <AlertTriangle size={16} /> Separation Requests
          {pendingTerminations.length > 0 && (
            <span style={{ background: '#EF4444', color: '#FFF', fontSize: '11px', padding: '1px 7px', borderRadius: '10px', fontWeight: 800 }}>
              {pendingTerminations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('ALL')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: subTab === 'ALL' ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: subTab === 'ALL' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
            color: subTab === 'ALL' ? '#FFF' : '#94A3B8',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          All Employees ({allEmployees.length})
        </button>
      </div>

      {/* Tab Content 1: Pending Verifications */}
      {subTab === 'VERIFICATIONS' && (
        <div>
          {pendingVerifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
              ✓ No pending employee verifications. All candidates processed.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingVerifications.map(emp => (
                <div
                  key={emp.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px',
                    padding: '16px 20px', borderRadius: '12px', background: '#1E293B', border: '1px solid rgba(245,158,11,0.2)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>{emp.candidateName}</span>
                      <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>
                        {emp.employeeCode}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '4px' }}>
                      <strong>{emp.jobTitle}</strong> · {emp.department || 'General'} · {emp.employmentType.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {emp.candidateEmail} · Base: {emp.baseSalary ? `${emp.salaryCurrency} ${emp.baseSalary.toLocaleString()}` : 'Not specified'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleVerifyDecision(emp.id, true)}
                      disabled={actionId === emp.id}
                      style={{
                        padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} /> Verify & Activate
                    </button>
                    <button
                      onClick={() => handleVerifyDecision(emp.id, false)}
                      disabled={actionId === emp.id}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)',
                        color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
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
      )}

      {/* Tab Content 2: Pending Terminations */}
      {subTab === 'TERMINATIONS' && (
        <div>
          {pendingTerminations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
              ✓ No pending separation or termination requests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingTerminations.map(emp => (
                <div
                  key={emp.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px',
                    padding: '16px 20px', borderRadius: '12px', background: '#1E293B', border: '1px solid rgba(239,68,68,0.25)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444' }}>{emp.candidateName}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '8px' }}>
                        {emp.employeeCode}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#E2E8F0', marginTop: '4px' }}>
                      <strong>Role:</strong> {emp.jobTitle} · Notice: {emp.noticePeriodDays} days
                    </div>
                    <div style={{ fontSize: '12px', color: '#F87171', marginTop: '4px', fontStyle: 'italic' }}>
                      Reason: "{emp.terminationReason}"
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleTerminationDecision(emp.id, true)}
                      disabled={actionId === emp.id}
                      style={{
                        padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                        color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} /> Approve Separation
                    </button>
                    <button
                      onClick={() => handleTerminationDecision(emp.id, false)}
                      disabled={actionId === emp.id}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', background: '#334155',
                        color: '#FFF', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      Reject & Retain
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: All Employees Table */}
      {subTab === 'ALL' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Employee</th>
                <th style={{ padding: '10px 8px' }}>Code</th>
                <th style={{ padding: '10px 8px' }}>Designation</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Compensation</th>
              </tr>
            </thead>
            <tbody>
              {allEmployees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#E2E8F0' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontWeight: 700, color: '#FFF' }}>{emp.candidateName}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{emp.candidateEmail}</div>
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#38BDF8' }}>{emp.employeeCode}</td>
                  <td style={{ padding: '10px 8px' }}>{emp.jobTitle}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                      background: emp.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: emp.status === 'ACTIVE' ? '#10B981' : '#F59E0B'
                    }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {emp.baseSalary ? `${emp.salaryCurrency} ${emp.baseSalary.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
