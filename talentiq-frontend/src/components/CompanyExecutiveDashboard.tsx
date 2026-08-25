import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CompanyTagApprovalQueue } from './CompanyTagApprovalQueue';
import {
  Building2, CheckSquare, Calendar, Users, Award, MessageSquare,
  Settings, Plus, Trash2, Video, DollarSign, Wallet,
  ShieldCheck, LogOut, Menu, X,
  Send, Edit3, CreditCard, ChevronRight,
  Clock
} from 'lucide-react';

interface CompanyTask {
  id: number;
  companyId: number;
  companyName: string;
  creatorUserId: number;
  creatorName: string;
  assignedToUserId?: number;
  assignedToName: string;
  title: string;
  description?: string;
  priority: string;
  category: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionRate: number;
}

interface MeetingSlot {
  id: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  status: string;
}

interface HrMember {
  hrProfileId: number;
  userId: number;
  name: string;
  email: string;
  designation?: string;
  companyVerified: boolean;
}

interface SalaryPayrollRecord {
  id: string;
  employeeName: string;
  employeeEmail: string;
  role: string;
  baseSalary: number;
  incentive: number;
  paymentMethod: string;
  accountMasked: string;
  status: 'DISBURSED' | 'PENDING' | 'PROCESSING';
  payoutDate?: string;
  transactionRef?: string;
}

export const CompanyExecutiveDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation state
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'TASKS' | 'MEETINGS' | 'HR_TEAM' | 'VERIFICATIONS' | 'SALARY' | 'SETTINGS' | 'EDIT_PROFILE' | 'BILLING'
  >('OVERVIEW');

  // Left slide-over panel drawer state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Core data states
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [meetings, setMeetings] = useState<MeetingSlot[]>([]);
  const [hrTeam, setHrTeam] = useState<HrMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Task Filter
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Create Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskCategory, setTaskCategory] = useState('GENERAL');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Schedule Meeting Modal State
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingCandidateName, setMeetingCandidateName] = useState('');
  const [meetingCandidateEmail, setMeetingCandidateEmail] = useState('');
  const [meetingJobTitle, setMeetingJobTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingDuration, setMeetingDuration] = useState('45');
  const [meetingLink, setMeetingLink] = useState('');

  // Company Profile Settings State
  const [companyName, setCompanyName] = useState('HireMind Enterprise');
  const [companyWebsite, setCompanyWebsite] = useState('https://hiremind.ai');
  const [companyIndustry, setCompanyIndustry] = useState('Artificial Intelligence & Autonomous Recruitment');
  const [companyLocation, setCompanyLocation] = useState('Bangalore, India & San Francisco, CA');
  const [companyHeadcount, setCompanyHeadcount] = useState('150-500 Employees');
  const [companyAbout, setCompanyAbout] = useState('Enterprise talent screening, autonomous interview orchestration, and verified candidate credential issuer.');

  // Salary Disbursal / Payroll State (salary-disbuss)
  const [payrollRoster, setPayrollRoster] = useState<SalaryPayrollRecord[]>([
    {
      id: 'PAY-001',
      employeeName: 'Sarah Jenkins',
      employeeEmail: 'sarah.jenkins@hiremind.ai',
      role: 'Lead Senior Technical Recruiter',
      baseSalary: 4500,
      incentive: 750,
      paymentMethod: 'Bank Transfer (ACH)',
      accountMasked: 'HDFC••••4829',
      status: 'DISBURSED',
      payoutDate: '2026-08-01',
      transactionRef: 'TXN-HMD-882194'
    },
    {
      id: 'PAY-002',
      employeeName: 'David Chen',
      employeeEmail: 'david.chen@hiremind.ai',
      role: 'Talent Acquisition Partner',
      baseSalary: 3800,
      incentive: 400,
      paymentMethod: 'UPI Direct',
      accountMasked: 'david.chen@okaxis',
      status: 'PENDING',
      payoutDate: 'Pending Cycle'
    },
    {
      id: 'PAY-003',
      employeeName: 'Elena Rostova',
      employeeEmail: 'elena.rostova@hiremind.ai',
      role: 'Executive Hiring Director',
      baseSalary: 6200,
      incentive: 1200,
      paymentMethod: 'Corporate Wire',
      accountMasked: 'CITI••••1190',
      status: 'DISBURSED',
      payoutDate: '2026-08-01',
      transactionRef: 'TXN-HMD-991204'
    },
    {
      id: 'PAY-004',
      employeeName: 'Marcus Aurelius',
      employeeEmail: 'marcus.a@hiremind.ai',
      role: 'Senior AI Recruiter',
      baseSalary: 4200,
      incentive: 600,
      paymentMethod: 'Bank Transfer',
      accountMasked: 'ICICI••••8372',
      status: 'PENDING',
      payoutDate: 'Pending Cycle'
    }
  ]);

  // Disbursal receipt modal
  const [activeReceipt, setActiveReceipt] = useState<SalaryPayrollRecord | null>(null);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPanelOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes, meetingsRes, hrRes] = await Promise.all([
        apiClient.get('/company/tasks').catch(() => ({ data: { data: [] } })),
        apiClient.get('/company/tasks/stats').catch(() => ({ data: { data: null } })),
        apiClient.get('/interviews/calendar').catch(() => ({ data: { data: [] } })),
        apiClient.get('/company/verifications/hrs').catch(() => ({ data: { data: [] } }))
      ]);

      setTasks(tasksRes.data?.data || []);
      setTaskStats(statsRes.data?.data || null);
      setMeetings(meetingsRes.data?.data || []);
      setHrTeam(hrRes.data?.data || []);
    } catch (e) {
      console.warn('Dashboard data fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const res = await apiClient.post('/company/tasks', {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        category: taskCategory,
        assignedToUserId: taskAssigneeId ? Number(taskAssigneeId) : null,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null
      });

      if (res.data?.data) {
        setTasks(prev => [res.data.data, ...prev]);
        setShowTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssigneeId('');
        setTaskDueDate('');
        setMsg('✅ Task created and assigned successfully!');
        refreshStats();
      }
    } catch (e: any) {
      setMsg(`❌ Failed to create task: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleToggleTaskStatus = async (task: CompanyTask) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : (task.status === 'TODO' ? 'IN_PROGRESS' : 'COMPLETED');
    try {
      const res = await apiClient.put(`/company/tasks/${task.id}/status`, { status: nextStatus });
      if (res.data?.data) {
        setTasks(prev => prev.map(t => t.id === task.id ? res.data.data : t));
        refreshStats();
      }
    } catch (e: any) {
      setMsg(`❌ Failed to update task: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await apiClient.delete(`/company/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      refreshStats();
      setMsg('🗑️ Task removed.');
    } catch (e: any) {
      setMsg(`❌ Failed to delete task: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const refreshStats = async () => {
    try {
      const res = await apiClient.get('/company/tasks/stats');
      setTaskStats(res.data?.data || null);
    } catch (ignored) {}
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCandidateName.trim() || !meetingDate) return;

    try {
      const res = await apiClient.post('/interviews/schedule', {
        applicationId: 0,
        candidateUserId: user?.id || 1,
        candidateName: meetingCandidateName.trim(),
        candidateEmail: meetingCandidateEmail.trim() || 'candidate@hiremind.ai',
        jobTitle: meetingJobTitle.trim() || 'Executive Leadership Review',
        scheduledAt: new Date(meetingDate).toISOString(),
        durationMinutes: Number(meetingDuration) || 45,
        meetingLink: meetingLink.trim() || 'https://meet.google.com/hmd-exec-sync',
        notes: 'Company Executive Meeting & Candidate Interview'
      });

      if (res.data?.data) {
        setMeetings(prev => [res.data.data, ...prev]);
        setShowMeetingModal(false);
        setMeetingCandidateName('');
        setMeetingCandidateEmail('');
        setMeetingJobTitle('');
        setMeetingDate('');
        setMeetingLink('');
        setMsg('📅 Meeting scheduled & reminder created successfully!');
      }
    } catch (e: any) {
      setMsg(`❌ Failed to schedule meeting: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  // Salary Disbursal Handler
  const handleDisburseSingle = (id: string) => {
    const txnRef = `TXN-HMD-${Math.floor(100000 + Math.random() * 900000)}`;
    const today = new Date().toISOString().split('T')[0];

    setPayrollRoster(prev => prev.map(rec => {
      if (rec.id === id) {
        const updated: SalaryPayrollRecord = {
          ...rec,
          status: 'DISBURSED',
          payoutDate: today,
          transactionRef: txnRef
        };
        setActiveReceipt(updated);
        return updated;
      }
      return rec;
    }));
    setMsg(`⚡ Salary payout successfully disbursed! Ref: ${txnRef}`);
  };

  const handleDisburseAllPending = () => {
    const today = new Date().toISOString().split('T')[0];
    let count = 0;

    setPayrollRoster(prev => prev.map(rec => {
      if (rec.status === 'PENDING') {
        count++;
        return {
          ...rec,
          status: 'DISBURSED',
          payoutDate: today,
          transactionRef: `TXN-HMD-${Math.floor(100000 + Math.random() * 900000)}`
        };
      }
      return rec;
    }));

    if (count > 0) {
      setMsg(`🚀 Batch Disbursal Complete! ${count} pending payouts successfully transferred to HR & team accounts.`);
    } else {
      setMsg('ℹ️ All payroll payouts are already up-to-date and disbursed.');
    }
  };

  const handleToggleHrBadge = async (hr: HrMember) => {
    try {
      const nextVerified = !hr.companyVerified;
      await apiClient.put(`/company/verifications/hrs/${hr.hrProfileId}/verify`, {
        verified: nextVerified,
        badgeTitle: nextVerified ? 'Official Company Verified Recruiter' : null
      });

      setHrTeam(prev => prev.map(h => h.hrProfileId === hr.hrProfileId ? { ...h, companyVerified: nextVerified } : h));
      setMsg(nextVerified ? `🛡️ Verified Badge awarded to ${hr.name}!` : `Revoked verified badge for ${hr.name}.`);
    } catch (e: any) {
      setMsg(`❌ Failed to update badge: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleLogoutSession = () => {
    logout();
    navigate('/admin-login');
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'ALL') return true;
    return t.status === taskFilter;
  });

  // Payroll Metrics Calculations
  const totalPayrollBudget = payrollRoster.reduce((acc, curr) => acc + curr.baseSalary + curr.incentive, 0);
  const totalDisbursed = payrollRoster
    .filter(r => r.status === 'DISBURSED')
    .reduce((acc, curr) => acc + curr.baseSalary + curr.incentive, 0);
  const totalPending = totalPayrollBudget - totalDisbursed;

  return (
    <div style={{ position: 'relative' }}>

      {/* ────────────────────────────────────────────────────────
          FLOATING QUICK TRIGGER FOR LEFT PANEL
          ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsPanelOpen(true)}
        style={{
          position: 'fixed',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 9000,
          background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          padding: '14px 10px',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.45)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s ease'
        }}
        title="Open Company Executive Side Panel"
      >
        <Menu size={18} />
        <span style={{ fontSize: 10, fontWeight: 900, writingMode: 'vertical-rl', letterSpacing: 1 }}>MENU</span>
      </button>

      {/* ────────────────────────────────────────────────────────
          SLIDE-OVER LEFT SIDE PANEL / DRAWER
          ──────────────────────────────────────────────────────── */}
      {isPanelOpen && (
        <div
          onClick={() => setIsPanelOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Drawer Container (Stops propagation so clicks inside don't close) */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 330,
              maxWidth: '85vw',
              height: '100vh',
              background: 'var(--admin-surface)',
              borderRight: '1px solid var(--admin-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '8px 0 32px rgba(0, 0, 0, 0.5)',
              overflowY: 'auto'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '20px 22px',
              borderBottom: '1px solid var(--admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, var(--admin-surface) 0%, var(--admin-surface-subtle) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}>
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--admin-text-primary)' }}>
                    {companyName}
                  </h3>
                  <span style={{ fontSize: 11, color: '#10B981', fontWeight: 800 }}>✓ Verified Enterprise</span>
                </div>
              </div>

              <button
                onClick={() => setIsPanelOpen(false)}
                style={{
                  background: 'var(--admin-surface-subtle)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text-muted)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Close Panel (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Executive Profile Card */}
            <div style={{ padding: '14px 20px', background: 'var(--admin-surface-subtle)', borderBottom: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Logged-In Executive
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                {user?.email}
              </div>
              <div style={{ display: 'inline-block', marginTop: 6, background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800 }}>
                ROLE_COMPANY_ADMIN
              </div>
            </div>

            {/* Navigation Menu List */}
            <div style={{ padding: '16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 10.5, fontWeight: 900, color: 'var(--admin-text-muted)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Executive Navigation
              </div>

              {[
                { id: 'OVERVIEW', label: 'Overview & KPIs', icon: Building2, count: null },
                { id: 'HR_TEAM', label: 'HR Team', icon: Users, count: hrTeam.length },
                { id: 'SALARY', label: 'Salary Disbursal', icon: DollarSign, count: `${payrollRoster.filter(r => r.status === 'PENDING').length} Due` },
                { id: 'EDIT_PROFILE', label: 'Edit Profile', icon: Edit3, count: null },
                { id: 'SETTINGS', label: 'Settings', icon: Settings, count: null },
                { id: 'TASKS', label: 'Goals & Task Roster', icon: CheckSquare, count: tasks.length },
                { id: 'MEETINGS', label: 'Meeting Reminders', icon: Calendar, count: meetings.length },
                { id: 'VERIFICATIONS', label: 'Candidate Approvals', icon: Award, count: null },
                { id: 'BILLING', label: 'Invoices & Billing', icon: CreditCard, count: null }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsPanelOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isSelected ? '1px solid rgba(2, 132, 199, 0.4)' : 'none',
                      background: isSelected ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)' : 'transparent',
                      color: isSelected ? '#38BDF8' : 'var(--admin-text-primary)',
                      fontSize: 13.5,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={16} color={isSelected ? '#38BDF8' : 'var(--admin-text-secondary)'} />
                      <span>{item.label}</span>
                    </div>

                    {item.count && (
                      <span style={{
                        fontSize: 11,
                        background: isSelected ? '#38BDF8' : 'var(--admin-surface-subtle)',
                        color: isSelected ? '#0F172A' : 'var(--admin-text-secondary)',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontWeight: 800
                      }}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              <div style={{ fontSize: 10.5, fontWeight: 900, color: 'var(--admin-text-muted)', padding: '12px 10px 4px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                External Collaboration
              </div>

              <button
                onClick={() => {
                  navigate('/team-chat');
                  setIsPanelOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--admin-text-primary)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MessageSquare size={16} color="var(--admin-text-secondary)" />
                  <span>Team Messages & Files</span>
                </div>
                <ChevronRight size={14} color="var(--admin-text-muted)" />
              </button>
            </div>

            {/* Drawer Footer with Logout Button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)' }}>
              <button
                onClick={handleLogoutSession}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} /> Log Out from Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPANY PROFILE BANNER & QUICK STATS ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--admin-surface) 0%, var(--admin-surface-subtle) 100%)',
        border: '1px solid var(--admin-border)',
        borderRadius: 18,
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: 'var(--admin-card-shadow)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Left Panel Menu Trigger Button */}
          <button
            onClick={() => setIsPanelOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
            }}
            title="Open Executive Control Menu"
          >
            <Menu size={18} /> Company Menu
          </button>

          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--admin-surface-subtle)',
            border: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22
          }}>
            🏢
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--admin-text-primary)' }}>
                {companyName}
              </h2>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>
                ✓ Verified Enterprise
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
              {companyIndustry} • {companyWebsite} • Director: <strong>{user?.firstName} {user?.lastName}</strong>
            </p>
          </div>
        </div>

        {/* Top Quick Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowTaskModal(true)}
            style={{
              background: '#38BDF8',
              color: '#0F172A',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} /> Add Task
          </button>
          <button
            onClick={() => setShowMeetingModal(true)}
            style={{
              background: 'var(--admin-surface-subtle)',
              color: 'var(--admin-text-primary)',
              border: '1px solid var(--admin-border)',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Calendar size={16} /> Schedule Meeting
          </button>
          <button
            onClick={() => setActiveTab('SALARY')}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <DollarSign size={16} /> Disburse Salaries
          </button>
        </div>
      </div>

      {/* Global Message Banner */}
      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 12, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', fontSize: '13.5px', color: 'var(--admin-text-primary)' }}>
          {msg}
        </div>
      )}

      {loading && (
        <div style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
          Syncing executive tasks & meeting reminders...
        </div>
      )}

      {/* ── SEGMENTED NAVIGATION TABS BAR ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'OVERVIEW', label: 'Overview & KPIs', icon: Building2 },
          { id: 'HR_TEAM', label: `HR Team (${hrTeam.length})`, icon: Users },
          { id: 'SALARY', label: 'Salary Disbursal', icon: DollarSign },
          { id: 'TASKS', label: `Goals & Tasks (${tasks.length})`, icon: CheckSquare },
          { id: 'MEETINGS', label: `Meeting Reminders (${meetings.length})`, icon: Calendar },
          { id: 'VERIFICATIONS', label: 'Candidate Approvals', icon: Award },
          { id: 'EDIT_PROFILE', label: 'Edit Profile', icon: Edit3 },
          { id: 'SETTINGS', label: 'Settings', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 12,
                border: isActive ? 'none' : '1px solid var(--admin-border)',
                background: isActive ? 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)' : 'var(--admin-surface)',
                color: isActive ? '#FFFFFF' : 'var(--admin-text-secondary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none'
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────
          TAB 1: EXECUTIVE OVERVIEW & KPIS
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'OVERVIEW' && (
        <div>
          {/* KPI Cards Grid */}
          <div className="temporal-metrics-grid" style={{ marginBottom: 20 }}>
            <div className="temporal-card">
              <div className="temporal-label"><CheckSquare size={13} /> Task Completion Rate</div>
              <div className="temporal-val highlight">{taskStats?.completionRate ?? 0}%</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                {taskStats?.completedTasks ?? 0} of {taskStats?.totalTasks ?? 0} Completed
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><Calendar size={13} /> Upcoming Meetings</div>
              <div className="temporal-val">{meetings.length}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                Executive Sync & Candidate Interviews
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><DollarSign size={13} /> Monthly Payroll</div>
              <div className="temporal-val" style={{ color: '#10B981' }}>${totalPayrollBudget.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                ${totalDisbursed.toLocaleString()} Disbursed • ${totalPending.toLocaleString()} Pending
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><Users size={13} /> HR Recruiters</div>
              <div className="temporal-val highlight">{hrTeam.length}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                {hrTeam.filter(h => h.companyVerified).length} Verified Badges Awarded
              </div>
            </div>
          </div>

          {/* Quick Tasks & Meetings split grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Recent Tasks */}
            <div className="admin-card-section" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 className="admin-section-heading" style={{ margin: 0 }}>
                  <CheckSquare size={18} color="var(--admin-primary)" /> Goals & Task Roster
                </h3>
                <button
                  onClick={() => setActiveTab('TASKS')}
                  style={{ background: 'transparent', border: 'none', color: '#38BDF8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  View All &rarr;
                </button>
              </div>

              {tasks.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                  No tasks created yet. Click "+ Add Task" to assign work to your HR team.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tasks.slice(0, 4).map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTaskStatus(task)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--admin-surface-subtle)',
                        border: '1px solid var(--admin-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: task.status === 'COMPLETED' ? 'none' : '2px solid var(--admin-border)',
                          background: task.status === 'COMPLETED' ? '#10B981' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: 12
                        }}>
                          {task.status === 'COMPLETED' && '✓'}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: task.status === 'COMPLETED' ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                            textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none'
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            Assigned to: <strong>{task.assignedToName}</strong> • {task.category}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: 10.5,
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontWeight: 800,
                        background: task.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: task.priority === 'HIGH' ? '#EF4444' : '#38BDF8'
                      }}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Meetings */}
            <div className="admin-card-section" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 className="admin-section-heading" style={{ margin: 0 }}>
                  <Calendar size={18} color="var(--admin-accent)" /> Meeting & Interview Reminders
                </h3>
                <button
                  onClick={() => setActiveTab('MEETINGS')}
                  style={{ background: 'transparent', border: 'none', color: '#38BDF8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  View All &rarr;
                </button>
              </div>

              {meetings.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                  No upcoming meetings. Click "Schedule Meeting" to create one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {meetings.slice(0, 3).map(m => (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--admin-surface-subtle)',
                        border: '1px solid var(--admin-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                          {m.candidateName} — {m.jobTitle}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                          ⏰ {new Date(m.scheduledAt).toLocaleString()} ({m.durationMinutes} mins)
                        </div>
                      </div>

                      {m.meetingLink && (
                        <a
                          href={m.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38BDF8',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Video size={13} /> Join Call
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 2: HR TEAM MANAGEMENT & VERIFIED RECRUITER BADGES
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'HR_TEAM' && (
        <div className="admin-card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 className="admin-section-heading" style={{ margin: 0 }}>
                <Users size={18} color="var(--admin-primary)" /> Company HR Recruiter Roster & Verified Badges
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
                Authorize HR recruiters with official Company Verified Badges so candidates can authenticate their identity.
              </p>
            </div>
          </div>

          {hrTeam.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', background: 'var(--admin-surface-subtle)', borderRadius: 14, border: '1px dashed var(--admin-border)' }}>
              <Users size={36} color="#38BDF8" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)' }}>No HR recruiters registered under {companyName}.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--admin-text-secondary)' }}>HRs registering with your company domain will appear here automatically.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {hrTeam.map(hr => (
                <div
                  key={hr.hrProfileId}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 14,
                    background: 'var(--admin-surface-subtle)',
                    border: '1px solid var(--admin-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16
                    }}>
                      {hr.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{hr.name}</span>
                        {hr.companyVerified && (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                            ✓ Verified Recruiter
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)', marginTop: 2 }}>{hr.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>Role: {hr.designation || 'Talent Acquisition Specialist'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--admin-border)', paddingTop: 12 }}>
                    <button
                      onClick={() => handleToggleHrBadge(hr)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        background: hr.companyVerified ? 'rgba(239, 68, 68, 0.15)' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                        color: hr.companyVerified ? '#EF4444' : '#FFFFFF'
                      }}
                    >
                      {hr.companyVerified ? 'Revoke Verified Badge' : '🛡️ Award Verified Badge'}
                    </button>
                    <button
                      onClick={() => navigate('/team-chat')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--admin-border)',
                        background: 'var(--admin-surface)',
                        color: 'var(--admin-text-primary)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 3: SALARY DISBURSAL & PAYROLL SUITE (salary-disbuss)
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'SALARY' && (
        <div>
          {/* Executive Payroll Summary */}
          <div className="temporal-metrics-grid" style={{ marginBottom: 20 }}>
            <div className="temporal-card">
              <div className="temporal-label"><Wallet size={13} /> Total Monthly Liability</div>
              <div className="temporal-val highlight">${totalPayrollBudget.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                Full-time HR staff & executive compensation
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><ShieldCheck size={13} /> Disbursed to Date</div>
              <div className="temporal-val" style={{ color: '#10B981' }}>${totalDisbursed.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                {payrollRoster.filter(r => r.status === 'DISBURSED').length} of {payrollRoster.length} Accounts Transferred
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><Clock size={13} /> Pending Disbursals</div>
              <div className="temporal-val" style={{ color: totalPending > 0 ? '#F59E0B' : '#10B981' }}>${totalPending.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                {payrollRoster.filter(r => r.status === 'PENDING').length} Payouts Awaiting Execution
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><Calendar size={13} /> Next Auto Payout Cycle</div>
              <div className="temporal-val">1st Sept 2026</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                Direct ACH / Wire / UPI Settlement
              </div>
            </div>
          </div>

          {/* Salary Table Section */}
          <div className="admin-card-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 className="admin-section-heading" style={{ margin: 0 }}>
                  <DollarSign size={18} color="#10B981" /> HR & Employee Salary Disbursal Management
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
                  Execute one-click instant salary disbursements, review transaction references, and manage payroll accounts.
                </p>
              </div>

              <button
                onClick={handleDisburseAllPending}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Send size={15} /> 🚀 Disburse All Pending Salaries
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--admin-border)', fontSize: 12, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Employee & Designation</th>
                    <th style={{ padding: '12px 14px' }}>Account / UPI Ref</th>
                    <th style={{ padding: '12px 14px' }}>Base Salary</th>
                    <th style={{ padding: '12px 14px' }}>Incentive</th>
                    <th style={{ padding: '12px 14px' }}>Total Payout</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRoster.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--admin-border)', fontSize: 13 }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--admin-text-primary)' }}>{rec.employeeName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}>{rec.role}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{rec.accountMasked}</div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{rec.paymentMethod}</div>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--admin-text-primary)' }}>
                        ${rec.baseSalary.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', color: '#10B981', fontWeight: 700 }}>
                        +${rec.incentive.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', fontWeight: 900, color: 'var(--admin-text-primary)' }}>
                        ${(rec.baseSalary + rec.incentive).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          background: rec.status === 'DISBURSED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: rec.status === 'DISBURSED' ? '#10B981' : '#F59E0B'
                        }}>
                          {rec.status === 'DISBURSED' ? '✓ DISBURSED' : '⏳ PENDING'}
                        </span>
                        {rec.transactionRef && (
                          <div style={{ fontSize: 10, color: 'var(--admin-text-muted)', marginTop: 3 }}>
                            {rec.transactionRef}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        {rec.status === 'PENDING' ? (
                          <button
                            onClick={() => handleDisburseSingle(rec.id)}
                            style={{
                              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            ⚡ Disburse Payout
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveReceipt(rec)}
                            style={{
                              background: 'var(--admin-surface-subtle)',
                              color: '#38BDF8',
                              border: '1px solid var(--admin-border)',
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            View Receipt 📄
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 4: GOALS & TASK MANAGEMENT HUB (ASSIGN & TRACK)
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'TASKS' && (
        <div className="admin-card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 className="admin-section-heading" style={{ margin: 0 }}>
                <CheckSquare size={18} color="var(--admin-primary)" /> Task & Goal Delegation Center
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
                Create goals, assign tasks to HR recruiters, and track live progress to completion.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--admin-surface-subtle)', padding: 4, borderRadius: 8, border: '1px solid var(--admin-border)' }}>
                {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: taskFilter === filter ? '#38BDF8' : 'transparent',
                      color: taskFilter === filter ? '#0F172A' : 'var(--admin-text-secondary)'
                    }}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'TODO' ? 'To-Do' : filter === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowTaskModal(true)}
                style={{
                  background: '#38BDF8',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', background: 'var(--admin-surface-subtle)', borderRadius: 14, border: '1px dashed var(--admin-border)' }}>
              <CheckSquare size={36} color="#38BDF8" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)' }}>No tasks found in this view.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--admin-text-secondary)' }}>Click "+ Add Task" to create a new goal or assignment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: 'var(--admin-surface-subtle)',
                    border: '1px solid var(--admin-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      style={{
                        marginTop: 2,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: task.status === 'COMPLETED' ? 'none' : '2px solid var(--admin-border)',
                        background: task.status === 'COMPLETED' ? '#10B981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                      title="Toggle Status (TODO -> IN_PROGRESS -> COMPLETED)"
                    >
                      {task.status === 'COMPLETED' && '✓'}
                    </button>
                    <div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: task.status === 'COMPLETED' ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                        textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none'
                      }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
                          {task.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, fontSize: 11.5, color: 'var(--admin-text-muted)', flexWrap: 'wrap' }}>
                        <span>👤 Assigned to: <strong>{task.assignedToName}</strong></span>
                        <span>• 📂 Category: <strong>{task.category}</strong></span>
                        {task.dueDate && (
                          <span>• ⏰ Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        background: task.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : task.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: task.status === 'COMPLETED' ? '#10B981' : task.status === 'IN_PROGRESS' ? '#F59E0B' : '#38BDF8'
                      }}
                    >
                      {task.status}
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 6 }}
                      title="Delete Task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 5: MEETINGS & CALENDAR REMINDERS
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'MEETINGS' && (
        <div className="admin-card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 className="admin-section-heading" style={{ margin: 0 }}>
                <Calendar size={18} color="var(--admin-accent)" /> Executive Meeting & Interview Reminder Hub
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
                Coordinate executive interviews, team syncs, and candidate final rounds with automatic reminder triggers.
              </p>
            </div>
            <button
              onClick={() => setShowMeetingModal(true)}
              style={{
                background: '#38BDF8',
                color: '#0F172A',
                border: 'none',
                borderRadius: 8,
                padding: '7px 16px',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Plus size={14} /> Schedule Meeting
            </button>
          </div>

          {meetings.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', background: 'var(--admin-surface-subtle)', borderRadius: 14, border: '1px dashed var(--admin-border)' }}>
              <Calendar size={36} color="#38BDF8" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)' }}>No meetings scheduled.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--admin-text-secondary)' }}>Click "Schedule Meeting" to create an interview slot with automated reminders.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {meetings.map(m => (
                <div
                  key={m.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 14,
                    background: 'var(--admin-surface-subtle)',
                    border: '1px solid var(--admin-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                      {m.candidateName} — {m.jobTitle}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)', marginTop: 2 }}>
                      Email: <strong>{m.candidateEmail}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                      ⏰ <strong>{new Date(m.scheduledAt).toLocaleString()}</strong> ({m.durationMinutes} mins)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {m.meetingLink && (
                      <a
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                          color: '#FFFFFF',
                          padding: '8px 16px',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                        }}
                      >
                        <Video size={14} /> Join Video Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 6: CANDIDATE VERIFICATION APPROVAL QUEUE
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'VERIFICATIONS' && (
        <CompanyTagApprovalQueue />
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 7: EDIT COMPANY PROFILE
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'EDIT_PROFILE' && (
        <div className="admin-card-section" style={{ maxWidth: 680 }}>
          <h3 className="admin-section-heading">
            <Edit3 size={18} color="var(--admin-primary)" /> Edit Company Profile & Legal Identity
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
            Configure your corporate details, branding, official headquarters, and public bio.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); setMsg('✅ Company profile updated successfully!'); }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Company Legal Name *</label>
                <input
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Primary Website URL</label>
                  <input
                    value={companyWebsite}
                    onChange={e => setCompanyWebsite(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Industry & Sector</label>
                  <input
                    value={companyIndustry}
                    onChange={e => setCompanyIndustry(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Headquarters Location</label>
                  <input
                    value={companyLocation}
                    onChange={e => setCompanyLocation(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Employee Headcount</label>
                  <select
                    value={companyHeadcount}
                    onChange={e => setCompanyHeadcount(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, boxSizing: 'border-box' }}
                  >
                    <option value="1-50 Employees">1-50 Employees</option>
                    <option value="50-150 Employees">50-150 Employees</option>
                    <option value="150-500 Employees">150-500 Employees</option>
                    <option value="500+ Enterprise">500+ Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Company Description / Bio</label>
                <textarea
                  rows={3}
                  value={companyAbout}
                  onChange={e => setCompanyAbout(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 8: COMPANY SETTINGS & SECURITY VAULT
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'SETTINGS' && (
        <div className="admin-card-section" style={{ maxWidth: 680 }}>
          <h3 className="admin-section-heading">
            <Settings size={18} color="var(--admin-primary)" /> Corporate Governance & Vault Security Settings
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
            Configure multi-tenant data access, verification approval controls, and notifications.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>🛡️ Multi-Tenant Isolation Vault</div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>Strict row-level cryptographic isolation active for all company dossiers.</div>
              </div>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>ACTIVE</span>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>✍️ Director Signature Requirement</div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>Require Company Director approval before candidate badges are minted.</div>
              </div>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>ENFORCED</span>
            </div>

            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>🔔 Instant Email & Push Notifications</div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>Trigger instant notifications when an HR submits a new candidate tag.</div>
              </div>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>ENABLED</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 9: INVOICES & BILLING
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'BILLING' && (
        <div className="admin-card-section">
          <h3 className="admin-section-heading">
            <CreditCard size={18} color="var(--admin-primary)" /> Corporate Subscription & Invoices
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
            Enterprise recruitment tier, candidate credential allocations, and downloadable billing invoices.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 800 }}>CURRENT PLAN</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#38BDF8', marginTop: 4 }}>Enterprise Platinum Suite</div>
              <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>Unlimited candidate credential issuance & HR team seats</div>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 800 }}>CREDENTIAL CREDITS</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981', marginTop: 4 }}>∞ Unlimited Quota</div>
              <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>Active company token with zero throttling</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--admin-border)', fontSize: 12, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Invoice ID</th>
                <th style={{ padding: '12px 14px' }}>Billing Cycle</th>
                <th style={{ padding: '12px 14px' }}>Amount</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'INV-2026-08', period: 'August 2026', amount: '$2,499.00', status: 'PAID' },
                { id: 'INV-2026-07', period: 'July 2026', amount: '$2,499.00', status: 'PAID' },
                { id: 'INV-2026-06', period: 'June 2026', amount: '$2,499.00', status: 'PAID' }
              ].map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--admin-border)', fontSize: 13 }}>
                  <td style={{ padding: '14px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inv.id}</td>
                  <td style={{ padding: '14px', color: 'var(--admin-text-secondary)' }}>{inv.period}</td>
                  <td style={{ padding: '14px', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inv.amount}</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                      ✓ {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <button style={{ background: 'var(--admin-surface-subtle)', border: '1px solid var(--admin-border)', color: '#38BDF8', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Download PDF 📄
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE TASK MODAL ── */}
      {showTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 16, width: 480, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Create & Assign Goal / Task</h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Task Title *</label>
                  <input
                    required
                    placeholder="e.g. Screen top 10 AI candidates for Backend role"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={2}
                    placeholder="Detailed goals or deliverables..."
                    value={taskDesc}
                    onChange={e => setTaskDesc(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Priority</label>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    >
                      <option value="HIGH">🔴 High Priority</option>
                      <option value="MEDIUM">🟡 Medium Priority</option>
                      <option value="LOW">🟢 Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Category</label>
                    <select
                      value={taskCategory}
                      onChange={e => setTaskCategory(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    >
                      <option value="HIRING">Hiring & Sourcing</option>
                      <option value="INTERVIEW">Technical Interviews</option>
                      <option value="COMPLIANCE">Compliance & Verification</option>
                      <option value="GENERAL">General Operations</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Assign to HR Recruiter</label>
                  <select
                    value={taskAssigneeId}
                    onChange={e => setTaskAssigneeId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  >
                    <option value="">Unassigned (Open Team Goal)</option>
                    {hrTeam.map(hr => (
                      <option key={hr.userId} value={hr.userId}>
                        {hr.name} ({hr.designation || 'HR Recruiter'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" onClick={() => setShowTaskModal(false)} style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    Create Task 🚀
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCHEDULE MEETING MODAL ── */}
      {showMeetingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 16, width: 480, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Schedule Executive Meeting / Interview</h3>
              <button onClick={() => setShowMeetingModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleScheduleMeeting}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Candidate / Participant Name *</label>
                  <input
                    required
                    placeholder="e.g. Alex Mercer"
                    value={meetingCandidateName}
                    onChange={e => setMeetingCandidateName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Candidate Email</label>
                  <input
                    type="email"
                    placeholder="candidate@hiremind.ai"
                    value={meetingCandidateEmail}
                    onChange={e => setMeetingCandidateEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Date & Time *</label>
                    <input
                      required
                      type="datetime-local"
                      value={meetingDate}
                      onChange={e => setMeetingDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Duration (Minutes)</label>
                    <select
                      value={meetingDuration}
                      onChange={e => setMeetingDuration(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                    >
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Video Meeting Link (Google Meet / Zoom)</label>
                  <input
                    placeholder="https://meet.google.com/hmd-exec-sync"
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" onClick={() => setShowMeetingModal(false)} style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    Schedule & Send 📅
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SALARY DISBURSAL RECEIPT SLIP MODAL ── */}
      {activeReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 16, width: 440, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--admin-border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--admin-text-primary)' }}>Salary Disbursal Receipt</h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Transaction Reference:</span>
                <span style={{ fontWeight: 800, color: 'var(--admin-text-primary)' }}>{activeReceipt.transactionRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Beneficiary:</span>
                <span style={{ fontWeight: 800, color: 'var(--admin-text-primary)' }}>{activeReceipt.employeeName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Designation:</span>
                <span style={{ color: 'var(--admin-text-secondary)' }}>{activeReceipt.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Account / UPI:</span>
                <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{activeReceipt.accountMasked}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Payout Date:</span>
                <span style={{ color: 'var(--admin-text-primary)' }}>{activeReceipt.payoutDate}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--admin-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--admin-text-primary)' }}>Total Disbursed:</span>
                <span style={{ fontWeight: 900, fontSize: 18, color: '#10B981' }}>${(activeReceipt.baseSalary + activeReceipt.incentive).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setActiveReceipt(null)}
                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
