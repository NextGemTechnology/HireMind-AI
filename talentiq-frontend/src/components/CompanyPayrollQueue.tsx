import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  FileCheck,
  CreditCard
} from 'lucide-react';

interface SalaryRecord {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string;
  amount: number;
  currency: string;
  periodLabel: string;
  disbursementType: string;
  status: string;
  submittedByName?: string;
  submittedAt?: string;
  approvedByName?: string;
  transactionRef?: string;
  paymentStatus?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

interface CompanyPayrollQueueProps {
  initialFilter?: 'ALL' | 'PENDING' | 'COMPLETED';
}

export const CompanyPayrollQueue: React.FC<CompanyPayrollQueueProps> = ({ initialFilter = 'ALL' }) => {
  const [filterView, setFilterView] = useState<'ALL' | 'PENDING' | 'COMPLETED'>(initialFilter);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (initialFilter) {
      setFilterView(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/salary');
      const data = res.data?.data?.content || res.data?.data || [];
      setSalaries(data);
    } catch (err) {
      console.error('Failed to load salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (salaryId: number, approved: boolean) => {
    setActionId(salaryId);
    try {
      const res = await apiClient.put(`/salary/${salaryId}/approve`, {
        approved,
        rejectionReason: approved ? undefined : 'Executive review: Payroll adjustment required'
      });
      const data = res.data?.data;
      if (approved && data?.transactionRef) {
        setMsg(`✅ Salary disbursement approved! Payment Ref: ${data.transactionRef}`);
      } else if (approved) {
        setMsg('✅ Salary approved');
      } else {
        setMsg('❌ Salary disbursement rejected');
      }
      fetchSalaries();
    } catch (err: any) {
      setMsg('⚠️ ' + (err.response?.data?.message || 'Approval action failed'));
    } finally {
      setActionId(null);
    }
  };

  const pendingSalaries = salaries.filter(s => s.status === 'PENDING_APPROVAL');
  const completedSalaries = salaries.filter(s => s.status === 'COMPLETED');

  return (
    <div style={{ background: '#0F172A', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={22} color="#10B981" /> Corporate Payroll & Salary Authorization
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
            Secure disbursement authorization queue with payment gateway simulation and full transaction audit trails.
          </p>
        </div>
        <button
          onClick={fetchSalaries}
          style={{
            padding: '8px 14px', borderRadius: '8px', background: '#1E293B', color: '#F8FAFC',
            border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
          {msg}
        </div>
      )}

      {/* Sub-Tab Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilterView('ALL')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: filterView === 'ALL' ? 'rgba(56,189,248,0.15)' : 'transparent',
            border: filterView === 'ALL' ? '1px solid #38BDF8' : '1px solid transparent',
            color: filterView === 'ALL' ? '#38BDF8' : '#94A3B8',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          All Disbursements ({salaries.length})
        </button>
        <button
          onClick={() => setFilterView('PENDING')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: filterView === 'PENDING' ? 'rgba(245,158,11,0.15)' : 'transparent',
            border: filterView === 'PENDING' ? '1px solid #F59E0B' : '1px solid transparent',
            color: filterView === 'PENDING' ? '#F59E0B' : '#94A3B8',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Clock size={14} /> Pending Authorization
          {pendingSalaries.length > 0 && (
            <span style={{ background: '#F59E0B', color: '#000', fontSize: '11px', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
              {pendingSalaries.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterView('COMPLETED')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: filterView === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'transparent',
            border: filterView === 'COMPLETED' ? '1px solid #10B981' : '1px solid transparent',
            color: filterView === 'COMPLETED' ? '#10B981' : '#94A3B8',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <FileCheck size={14} /> Completed History ({completedSalaries.length})
        </button>
      </div>

      {/* Pending Authorization Section */}
      {(filterView === 'ALL' || filterView === 'PENDING') && (
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F59E0B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} /> Pending Executive Approvals ({pendingSalaries.length})
        </h3>

        {pendingSalaries.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#1E293B', borderRadius: '12px', color: '#64748B', fontSize: '13px' }}>
            ✓ No salary disbursements currently awaiting authorization.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingSalaries.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px',
                  padding: '16px 20px', borderRadius: '12px', background: '#1E293B', border: '1px solid rgba(245,158,11,0.3)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>{s.employeeName}</span>
                    <span style={{ fontSize: '11px', color: '#38BDF8', fontFamily: 'monospace', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                      {s.employeeCode}
                    </span>
                    <span style={{ fontSize: '11px', color: '#CBD5E1', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
                      {s.periodLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    Submitted by: {s.submittedByName || 'HR Recruiter'} {s.notes ? `· "${s.notes}"` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                      {s.currency} {s.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{s.disbursementType.replace('_', ' ')}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDecision(s.id, true)}
                      disabled={actionId === s.id}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #059669, #10B981)',
                        color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} /> Authorize & Pay
                    </button>
                    <button
                      onClick={() => handleDecision(s.id, false)}
                      disabled={actionId === s.id}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', background: '#334155',
                        color: '#FFF', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Completed Disbursements History */}
      {(filterView === 'ALL' || filterView === 'COMPLETED') && (
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={16} color="#10B981" /> Completed Disbursements History ({completedSalaries.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Employee</th>
                <th style={{ padding: '10px 8px' }}>Period</th>
                <th style={{ padding: '10px 8px' }}>Amount</th>
                <th style={{ padding: '10px 8px' }}>Transaction Ref</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {completedSalaries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                    No completed disbursements yet.
                  </td>
                </tr>
              ) : (
                completedSalaries.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#CBD5E1' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#FFF' }}>{s.employeeName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{s.employeeCode}</div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>{s.periodLabel}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                      {s.currency} {s.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#38BDF8', fontSize: '11px' }}>
                      {s.transactionRef || 'MOCK-TXN'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                        COMPLETED
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: '12px', color: '#94A3B8' }}>
                      {s.paidAt ? new Date(s.paidAt).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
