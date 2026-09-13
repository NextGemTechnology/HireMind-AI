import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { HrModalFrame } from './HrModalFrame';
import {
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Search,
  DollarSign,
  X,
  RefreshCw,
  FileText
} from 'lucide-react';

interface Employee {
  id: number;
  companyId: number;
  companyName: string;
  userId: number;
  candidateName: string;
  candidateEmail: string;
  candidateAvatarUrl?: string;
  hrName?: string;
  employeeCode: string;
  jobTitle: string;
  department?: string;
  employmentType: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'ON_NOTICE' | 'TERMINATED' | 'REJECTED';
  joinDate?: string;
  verifiedAt?: string;
  verifiedByName?: string;
  rejectionReason?: string;
  terminationStatus?: string;
  terminationReason?: string;
  noticePeriodDays?: number;
  lastWorkingDate?: string;
  baseSalary?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  badgeCertificateId?: string;
  createdAt: string;
}

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingVerifications: number;
  onNoticeEmployees: number;
  terminatedEmployees: number;
  pendingTerminations: number;
}

interface HrEmployeeManagementProps {
  styles: any;
  theme?: string;
}

export const HrEmployeeManagement: React.FC<HrEmployeeManagementProps> = ({ styles }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showTerminateModal, setShowTerminateModal] = useState<boolean>(false);
  const [showSalaryModal, setShowSalaryModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);

  // Form states
  const [onboardCandidateId, setOnboardCandidateId] = useState<string>('');
  const [onboardJobTitle, setOnboardJobTitle] = useState<string>('');
  const [onboardDepartment, setOnboardDepartment] = useState<string>('');
  const [onboardType, setOnboardType] = useState<string>('FULL_TIME');
  const [onboardSalary, setOnboardSalary] = useState<string>('');
  const [onboardCurrency, setOnboardCurrency] = useState<string>('INR');
  const [onboardCode, setOnboardCode] = useState<string>('');
  const [onboardNotes, setOnboardNotes] = useState<string>('');

  // Termination form
  const [termReason, setTermReason] = useState<string>('');
  const [termNoticeDays, setTermNoticeDays] = useState<number>(30);

  // Salary form
  const [salaryAmount, setSalaryAmount] = useState<string>('');
  const [salaryCurrency, setSalaryCurrency] = useState<string>('INR');
  const [salaryPeriod, setSalaryPeriod] = useState<string>('September 2026');
  const [salaryNotes, setSalaryNotes] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const openParam = searchParams.get('open');
    if (openParam === 'onboard') {
      setShowOnboardModal(true);
    }
    const filterParam = searchParams.get('filter');
    setStatusFilter(filterParam || 'ALL');
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const statusParam = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const [empRes, statsRes] = await Promise.all([
        apiClient.get(`/employees${statusParam}`),
        apiClient.get('/employees/stats')
      ]);
      setEmployees(empRes.data?.data?.content || empRes.data?.data || []);
      setStats(statsRes.data?.data || null);
    } catch (err) {
      setLoadError(true);
      console.error('Failed to load employee directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardCandidateId || !onboardJobTitle) {
      setMsg({ text: 'Please fill candidate user ID and job title', type: 'error' });
      return;
    }
    setActionLoading(true);
    setMsg(null);
    try {
      await apiClient.post('/employees', {
        candidateUserId: parseInt(onboardCandidateId),
        jobTitle: onboardJobTitle,
        department: onboardDepartment || undefined,
        employmentType: onboardType,
        baseSalary: onboardSalary ? parseFloat(onboardSalary) : undefined,
        salaryCurrency: onboardCurrency,
        employeeCode: onboardCode || undefined,
        notes: onboardNotes || undefined
      });
      setMsg({ text: 'Candidate successfully onboarded! Verification request sent to Company Manager.', type: 'success' });
      setShowOnboardModal(false);
      resetOnboardForm();
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Onboarding failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const resetOnboardForm = () => {
    setOnboardCandidateId('');
    setOnboardJobTitle('');
    setOnboardDepartment('');
    setOnboardSalary('');
    setOnboardCode('');
    setOnboardNotes('');
  };

  const openDetails = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDetailsModal(true);
    try {
      const res = await apiClient.get(`/employees/${emp.id}/history`);
      setEmployeeHistory(res.data?.data || []);
    } catch {
      setEmployeeHistory([]);
    }
  };

  const openTerminate = (emp: Employee) => {
    setSelectedEmployee(emp);
    setTermReason('');
    setTermNoticeDays(30);
    setShowTerminateModal(true);
  };

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !termReason) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/employees/${selectedEmployee.id}/terminate`, {
        reason: termReason,
        noticePeriodDays: termNoticeDays
      });
      setMsg({ text: 'Termination request submitted for Company Leadership approval.', type: 'success' });
      setShowTerminateModal(false);
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to submit termination', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendToggle = async (emp: Employee) => {
    setActionLoading(true);
    try {
      if (emp.status === 'SUSPENDED') {
        await apiClient.put(`/employees/${emp.id}/reinstate`);
        setMsg({ text: 'Employee reinstated to active status.', type: 'success' });
      } else {
        await apiClient.put(`/employees/${emp.id}/suspend`, { reason: 'HR administrative review' });
        setMsg({ text: 'Employee suspended.', type: 'success' });
      }
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Operation failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const openSalaryModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSalaryAmount(emp.baseSalary ? emp.baseSalary.toString() : '');
    setSalaryCurrency(emp.salaryCurrency || 'INR');
    setSalaryPeriod(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    setSalaryNotes('');
    setShowSalaryModal(true);
  };

  const handleCreateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !salaryAmount) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post('/salary', {
        employeeId: selectedEmployee.id,
        amount: parseFloat(salaryAmount),
        currency: salaryCurrency,
        periodLabel: salaryPeriod,
        notes: salaryNotes || undefined
      });
      const salaryId = res.data?.data?.id;
      // Auto submit for approval
      if (salaryId) {
        await apiClient.put(`/salary/${salaryId}/submit`);
      }
      setMsg({ text: 'Salary disbursement submitted for Company Manager approval!', type: 'success' });
      setShowSalaryModal(false);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Salary submission failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>ACTIVE</span>;
      case 'PENDING_VERIFICATION':
        return <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>PENDING VERIFICATION</span>;
      case 'ON_NOTICE':
        return <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>ON NOTICE</span>;
      case 'SUSPENDED':
        return <span style={{ background: 'rgba(100,116,139,0.2)', color: '#94A3B8', border: '1px solid rgba(100,116,139,0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>SUSPENDED</span>;
      case 'TERMINATED':
        return <span style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>TERMINATED</span>;
      default:
        return <span style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8', padding: '3px 10px', borderRadius: '12px', fontSize: '11px' }}>{status}</span>;
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (emp.candidateName && emp.candidateName.toLowerCase().includes(q)) ||
      (emp.jobTitle && emp.jobTitle.toLowerCase().includes(q)) ||
      (emp.employeeCode && emp.employeeCode.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="hr-employees" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
      {loadError && <div className="hr-error" role="alert">Could not load the employee directory.<button className="hr-button" onClick={fetchData}>Try again</button></div>}
      {/* Toast Alert */}
      {msg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'success' ? '#10B981' : '#EF4444',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div style={{
        background: styles.cardBg,
        borderRadius: '16px',
        padding: '24px',
        border: styles.cardBorder,
        boxShadow: styles.cardShadow,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: styles.heading, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={24} color="#38BDF8" /> Verified Internal Team & Employee Lifecycle
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: styles.subtext }}>
              Manage corporate employee directory, verified badges, compensation disbursements, and lifecycle state transitions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={fetchData}
              style={{
                padding: '10px 14px', borderRadius: '10px',
                background: styles.cardSubBg, color: styles.heading,
                border: styles.cardBorder, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => setShowOnboardModal(true)}
              style={{
                padding: '10px 18px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284C7, #38BDF8)',
                color: '#FFF', border: 'none', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
              }}
            >
              <UserPlus size={16} /> + Onboard Candidate
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
              <div style={{ fontSize: '11px', color: styles.subtext, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Employees</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: styles.heading, marginTop: '4px' }}>{stats.totalEmployees}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ fontSize: '11px', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Working</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>{stats.activeEmployees}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div style={{ fontSize: '11px', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Approval</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>{stats.pendingVerifications}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div style={{ fontSize: '11px', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Notice</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#EF4444', marginTop: '4px' }}>{stats.onNoticeEmployees}</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: styles.cardSubBg, border: styles.cardBorder }}>
              <div style={{ fontSize: '11px', color: styles.subtext, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Separated</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: styles.heading, marginTop: '4px' }}>{stats.terminatedEmployees}</div>
            </div>
          </div>
        )}
      </div>

      {/* Directory Controls */}
      <div style={{
        background: styles.cardBg,
        borderRadius: '16px',
        padding: '20px',
        border: styles.cardBorder,
        boxShadow: styles.cardShadow,
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['ALL', 'ACTIVE', 'PENDING_VERIFICATION', 'ON_NOTICE', 'SUSPENDED', 'TERMINATED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: statusFilter === st ? '1px solid #38BDF8' : styles.cardBorder,
                  background: statusFilter === st ? 'rgba(56,189,248,0.15)' : 'transparent',
                  color: statusFilter === st ? '#38BDF8' : styles.subtext,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: styles.cardSubBg, border: styles.cardBorder, borderRadius: '10px', padding: '6px 12px', width: '280px' }}>
            <Search size={14} color={styles.subtext} />
            <input
              type="text"
              placeholder="Search by name, title, code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: styles.heading, fontSize: '12px', width: '100%' }}
            />
          </div>
        </div>

        {/* Employees Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: styles.cardBorder, color: styles.subtext, textAlign: 'left' }}>
                <th style={{ padding: '12px 8px' }}>Employee</th>
                <th style={{ padding: '12px 8px' }}>Code</th>
                <th style={{ padding: '12px 8px' }}>Designation & Dept</th>
                <th style={{ padding: '12px 8px' }}>Type</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
                <th style={{ padding: '12px 8px' }}>Base Compensation</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: styles.subtext }}>
                    No employees found matching filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0284C7, #38BDF8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#FFF', fontWeight: 800, fontSize: '13px'
                        }}>
                          {emp.candidateName ? emp.candidateName.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: styles.heading }}>{emp.candidateName}</div>
                          <div style={{ fontSize: '11px', color: styles.subtext }}>{emp.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
                      {emp.employeeCode}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ color: styles.heading, fontWeight: 600 }}>{emp.jobTitle}</div>
                      <div style={{ fontSize: '11px', color: styles.subtext }}>{emp.department || 'General'}</div>
                    </td>
                    <td style={{ padding: '12px 8px', color: styles.subtext, fontSize: '12px' }}>
                      {emp.employmentType.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {getStatusBadge(emp.status)}
                    </td>
                    <td style={{ padding: '12px 8px', color: styles.heading, fontWeight: 600 }}>
                      {emp.baseSalary ? `${emp.salaryCurrency} ${emp.baseSalary.toLocaleString()} / ${emp.salaryPeriod?.toLowerCase()}` : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => openDetails(emp)}
                          title="View Details & Audit Trail"
                          style={{
                            padding: '6px 10px', borderRadius: '8px', background: styles.cardSubBg,
                            border: styles.cardBorder, color: styles.heading, cursor: 'pointer', fontSize: '11px', fontWeight: 700
                          }}
                        >
                          Details
                        </button>
                        {emp.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => openSalaryModal(emp)}
                              title="Create Salary Disbursement"
                              style={{
                                padding: '6px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)',
                                border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', cursor: 'pointer', fontSize: '11px', fontWeight: 700
                              }}
                            >
                              <DollarSign size={12} /> Pay
                            </button>
                            <button
                              onClick={() => openTerminate(emp)}
                              title="Request Termination"
                              style={{
                                padding: '6px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', cursor: 'pointer', fontSize: '11px', fontWeight: 700
                              }}
                            >
                              Notice
                            </button>
                          </>
                        )}
                        {(emp.status === 'ACTIVE' || emp.status === 'SUSPENDED') && (
                          <button
                            onClick={() => handleSuspendToggle(emp)}
                            title={emp.status === 'SUSPENDED' ? 'Reinstate Employee' : 'Suspend Employee'}
                            style={{
                              padding: '6px 8px', borderRadius: '8px', background: styles.cardSubBg,
                              border: styles.cardBorder, color: styles.subtext, cursor: 'pointer', fontSize: '11px'
                            }}
                          >
                            {emp.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal 1: Onboard Candidate ── */}
      {showOnboardModal && (
        <HrModalFrame title="Onboard candidate" onClose={() => setShowOnboardModal(false)}>
          <div style={{
            background: '#0F172A', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px',
            width: '520px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#38BDF8" /> Onboard Candidate as Employee
              </h2>
              <button aria-label="Close onboarding" onClick={() => setShowOnboardModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleOnboard}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Candidate User ID *</label>
                <input
                  type="number"
                  placeholder="Enter User ID (e.g. 5)"
                  value={onboardCandidateId}
                  onChange={e => setOnboardCandidateId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Official Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={onboardJobTitle}
                  onChange={e => setOnboardJobTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering"
                    value={onboardDepartment}
                    onChange={e => setOnboardDepartment(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Employment Type</label>
                  <select
                    value={onboardType}
                    onChange={e => setOnboardType(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Internship</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Base Salary</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={onboardSalary}
                    onChange={e => setOnboardSalary(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Currency</label>
                  <input
                    type="text"
                    value={onboardCurrency}
                    onChange={e => setOnboardCurrency(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Custom Employee Code (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={onboardCode}
                  onChange={e => setOnboardCode(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Onboarding Notes</label>
                <textarea
                  rows={2}
                  placeholder="Internal notes for leadership..."
                  value={onboardNotes}
                  onChange={e => setOnboardNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: '#334155', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 22px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0284C7, #38BDF8)',
                    color: '#FFF', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </HrModalFrame>
      )}

      {/* ── Modal 2: Employee Details & Audit History ── */}
      {showDetailsModal && selectedEmployee && (
        <HrModalFrame title="Employee details" onClose={() => setShowDetailsModal(false)}>
          <div style={{
            background: '#0F172A', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px',
            width: '560px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#38BDF8" /> Employee Dossier & Audit Log
              </h2>
              <button aria-label="Close employee details" onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>{selectedEmployee.candidateName}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{selectedEmployee.candidateEmail}</div>
                </div>
                <div>{getStatusBadge(selectedEmployee.status)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#CBD5E1', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                <div><strong>Code:</strong> {selectedEmployee.employeeCode}</div>
                <div><strong>Title:</strong> {selectedEmployee.jobTitle}</div>
                <div><strong>Dept:</strong> {selectedEmployee.department || 'N/A'}</div>
                <div><strong>Joined:</strong> {selectedEmployee.joinDate || 'N/A'}</div>
                <div><strong>Verified By:</strong> {selectedEmployee.verifiedByName || 'Pending'}</div>
                <div><strong>Salary:</strong> {selectedEmployee.baseSalary ? `${selectedEmployee.salaryCurrency} ${selectedEmployee.baseSalary.toLocaleString()}` : 'N/A'}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', marginBottom: '12px' }}>Status Transition Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {employeeHistory.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>No recorded history.</div>
              ) : (
                employeeHistory.map((h, i) => (
                  <div key={i} style={{ borderLeft: '2px solid #38BDF8', paddingLeft: '12px', marginLeft: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>
                      {h.fromStatus ? `${h.fromStatus} → ` : ''}{h.toStatus}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{h.notes}</div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                      By {h.changedByName} · {new Date(h.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{ padding: '8px 18px', borderRadius: '8px', background: '#334155', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </HrModalFrame>
      )}

      {/* ── Modal 3: Termination Request ── */}
      {showTerminateModal && selectedEmployee && (
        <HrModalFrame title="Request employee termination" onClose={() => setShowTerminateModal(false)}>
          <div style={{
            background: '#0F172A', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px',
            width: '460px', maxWidth: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Request Employee Termination
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94A3B8' }}>
              Submitting this request will transition <strong>{selectedEmployee.candidateName}</strong> to <strong>ON NOTICE</strong> status. Official separation requires approval by Company Leadership.
            </p>

            <form onSubmit={handleTerminateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Termination Reason *</label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed justification..."
                  value={termReason}
                  onChange={e => setTermReason(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Notice Period (Days)</label>
                <input
                  type="number"
                  value={termNoticeDays}
                  onChange={e => setTermNoticeDays(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTerminateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#334155', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 20px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                    color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </HrModalFrame>
      )}

      {/* ── Modal 4: Create Salary Disbursement ── */}
      {showSalaryModal && selectedEmployee && (
        <HrModalFrame title="Create salary request" onClose={() => setShowSalaryModal(false)}>
          <div style={{
            background: '#0F172A', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px',
            width: '460px', maxWidth: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} /> Create Salary Disbursement
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94A3B8' }}>
              Prepare salary payment for <strong>{selectedEmployee.candidateName}</strong> ({selectedEmployee.employeeCode}). This will be submitted to the Company Manager for authorization.
            </p>

            <form onSubmit={handleCreateSalary}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Amount *</label>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={e => setSalaryAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Currency</label>
                  <input
                    type="text"
                    value={salaryCurrency}
                    onChange={e => setSalaryCurrency(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Payroll Period *</label>
                <input
                  type="text"
                  placeholder="e.g. September 2026"
                  value={salaryPeriod}
                  onChange={e => setSalaryPeriod(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional bonus or adjustment notes..."
                  value={salaryNotes}
                  onChange={e => setSalaryNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#334155', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 20px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #059669, #10B981)',
                    color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Submitting...' : 'Submit to Manager'}
                </button>
              </div>
            </form>
          </div>
        </HrModalFrame>
      )}
    </div>
  );
};
