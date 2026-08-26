import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAdminTheme } from '../context/AdminThemeContext';
import { CompanyTagApprovalQueue } from './CompanyTagApprovalQueue';
import {
  Building2, Calendar, Users, Settings, Plus, Trash2,
  DollarSign, Wallet, ShieldCheck, LogOut, Send,
  Clock, Search, Bell, ChevronDown, CheckCircle2,
  FolderKanban, BarChart3, Activity, Sun, Moon, CloudSun
} from 'lucide-react';
import '../css/admin-theme.css';
import '../css/company-executive-dashboard.css';

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

interface HrMember {
  hrProfileId: number;
  userId: number;
  name: string;
  email: string;
  designation?: string;
  companyVerified: boolean;
}

interface PendingApprovalItem {
  id: number;
  candidateName: string;
  jobTitle: string;
  department: string;
  hrName: string;
  status: string;
  createdAt: string;
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
  const { theme, setTheme } = useAdminTheme();
  const navigate = useNavigate();

  // Navigation state
  const [activeNav, setActiveNav] = useState<'OVERVIEW' | 'ANALYTICS' | 'SALARY' | 'PROJECTS' | 'TEAM' | 'SETTINGS'>('OVERVIEW');

  // Filter & quarter state
  const [selectedQuarter, setSelectedQuarter] = useState('Q3 Goals');
  const [showQuarterMenu, setShowQuarterMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Core API data states
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [hrTeam, setHrTeam] = useState<HrMember[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [msg, setMsg] = useState('');

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskCategory, setTaskCategory] = useState('GENERAL');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Profile Editor State
  const [companyName, setCompanyName] = useState('AURAFLOW TECHNOLOGIES');
  const companyTagline = 'Executive Dashboard | Q3 2026';
  const [companyWebsite, setCompanyWebsite] = useState('https://auraflow.ai');
  const [companyIndustry, setCompanyIndustry] = useState('Autonomous AI & Enterprise Solutions');
  const [companyAbout, setCompanyAbout] = useState('Enterprise autonomous AI hiring workflows, candidate credential authentication, and talent cloud.');

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

  const [activeReceipt, setActiveReceipt] = useState<SalaryPayrollRecord | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [tasksRes, hrRes, pendingRes] = await Promise.all([
        apiClient.get('/company/tasks').catch(() => ({ data: { data: [] } })),
        apiClient.get('/company/verifications/hrs').catch(() => ({ data: { data: [] } })),
        apiClient.get('/company/verifications/pending?status=PENDING').catch(() => ({ data: { content: [] } }))
      ]);

      setTasks(tasksRes.data?.data || []);
      setHrTeam(hrRes.data?.data || []);

      const pendingList = pendingRes.data?.content || pendingRes.data?.data || [];
      setPendingApprovals(pendingList.map((item: any) => ({
        id: item.id,
        candidateName: item.candidateName || 'Candidate',
        jobTitle: item.jobTitle || 'Senior Engineer',
        department: item.department || 'Engineering',
        hrName: item.hrName || 'HR Lead',
        status: item.status || 'PENDING',
        createdAt: item.createdAt || new Date().toISOString()
      })));
    } catch (e) {
      console.warn('Dashboard data fetch error', e);
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
        setMsg('✅ Goal / Project task successfully created and delegated!');
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
      }
    } catch (e: any) {
      setMsg(`❌ Failed to update task: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await apiClient.delete(`/company/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setMsg('🗑️ Task removed.');
    } catch (e: any) {
      setMsg(`❌ Failed to delete task: ${e?.response?.data?.message || 'Error'}`);
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
      setMsg(nextVerified ? `🛡️ Verified Recruiter badge awarded to ${hr.name}!` : `Revoked verified badge for ${hr.name}.`);
    } catch (e: any) {
      setMsg(`❌ Failed to update badge: ${e?.response?.data?.message || 'Error'}`);
    }
  };

  const handleDisburseSingle = (id: string) => {
    const txnRef = `TXN-AURA-${Math.floor(100000 + Math.random() * 900000)}`;
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
          transactionRef: `TXN-AURA-${Math.floor(100000 + Math.random() * 900000)}`
        };
      }
      return rec;
    }));

    if (count > 0) {
      setMsg(`🚀 Batch Disbursal Complete! ${count} payouts successfully transferred to accounts.`);
    } else {
      setMsg('ℹ️ All payroll payouts are already disbursed and up-to-date.');
    }
  };

  const handleLogoutSession = () => {
    logout();
    navigate('/admin-login');
  };

  const directorName = user ? `${user.firstName} ${user.lastName}` : 'Olivia Chen';

  return (
    <div className={`exec-dashboard-layout admin-page-wrapper admin-theme-${theme}`}>

      {/* ────────────────────────────────────────────────────────
          LEFT VERTICAL DOCK SIDEBAR (Matching Reference Image)
          ──────────────────────────────────────────────────────── */}
      <aside className="exec-sidebar">
        {/* Top Logo Glyph */}
        <div
          className="exec-logo-glyph"
          onClick={() => setActiveNav('OVERVIEW')}
          title="Executive Hub"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#FFFFFF" />
            <path d="M12 12L8.5 19H15.5L12 12Z" fill="#38BDF8" />
          </svg>
        </div>

        {/* Sidebar Dock Nav Items */}
        <nav className="exec-nav-list">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: Building2 },
            { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
            { id: 'SALARY', label: 'Sales', icon: DollarSign },
            { id: 'PROJECTS', label: 'Projects', icon: FolderKanban },
            { id: 'TEAM', label: 'Team', icon: Users },
            { id: 'SETTINGS', label: 'Settings', icon: Settings }
          ].map(item => {
            const Icon = item.icon;
            const isSelected = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id as any)}
                className={`exec-nav-btn ${isSelected ? 'active' : ''}`}
                title={item.label}
              >
                <Icon size={20} color={isSelected ? '#38BDF8' : '#94A3B8'} />
                <span className="exec-nav-btn-label">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ────────────────────────────────────────────────────────
          MAIN DASHBOARD VIEWPORT
          ──────────────────────────────────────────────────────── */}
      <main className="exec-viewport">

        {/* ── TOP HEADER BAR ── */}
        <header className="exec-header">
          <div className="exec-header-left">
            <div className="exec-header-title-row">
              <div className="exec-header-logo-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#FFFFFF" />
                </svg>
              </div>
              <h1 className="exec-header-title">
                {companyName} <span className="exec-header-tagline">— {companyTagline}</span>
              </h1>
            </div>
            <p className="exec-header-subtitle">
              Agii: <span className="exec-header-subtitle-strong">{directorName}, CEO</span>
            </p>
          </div>

          {/* Right Header Action Items */}
          <div className="exec-header-actions">
            {/* 3-State Official Theme Switcher (100% Light | 50% Soft Light | 100% Dark) */}
            <div className="admin-theme-segmented-ctrl">
              <button
                onClick={() => setTheme('light-100')}
                className={`admin-theme-btn ${theme === 'light-100' ? 'active' : ''}`}
                title="100% Crisp Corporate Daylight Mode"
              >
                <Sun size={13} /> Light
              </button>
              <button
                onClick={() => setTheme('light-50')}
                className={`admin-theme-btn ${theme === 'light-50' ? 'active' : ''}`}
                title="50% Soft / Eye-Comfort Balanced Mode"
              >
                <CloudSun size={13} /> 50%
              </button>
              <button
                onClick={() => setTheme('dark-100')}
                className={`admin-theme-btn ${theme === 'dark-100' ? 'active' : ''}`}
                title="100% Executive Obsidian Midnight Mode"
              >
                <Moon size={13} /> Dark
              </button>
            </div>

            {/* Quarter Filter Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowQuarterMenu(!showQuarterMenu)}
                className="exec-dropdown-trigger"
              >
                <Clock size={13} color="#94A3B8" />
                <span>{selectedQuarter}</span>
                <ChevronDown size={13} />
              </button>

              {showQuarterMenu && (
                <div className="exec-dropdown-menu">
                  {['Q1 Goals', 'Q2 Goals', 'Q3 Goals', 'Q4 Goals', 'Annual 2026'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setSelectedQuarter(q); setShowQuarterMenu(false); }}
                      className={`exec-dropdown-item ${selectedQuarter === q ? 'active' : ''}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Display */}
            <div className="exec-date-badge">
              <Calendar size={13} color="#94A3B8" />
              <span>25/08/2026 14:00</span>
            </div>

            {/* Notification Bell with Badge */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMsg('🔔 1 Pending Candidate verification approval requires your signature.')}
                className="exec-notification-btn"
                title="Notifications"
              >
                <Bell size={15} />
              </button>
              <span className="exec-notification-badge">
                1
              </span>
            </div>

            {/* User Profile Pill with Avatar & Dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="exec-profile-chip"
              >
                <div className="exec-profile-avatar-sm">
                  {directorName.charAt(0)}
                </div>
                <div className="exec-profile-info">
                  <div className="exec-profile-name">
                    {directorName}
                  </div>
                  <div className="exec-profile-role">CEO</div>
                </div>
                <ChevronDown size={12} color="#94A3B8" />
              </div>

              {showProfileMenu && (
                <div className="exec-profile-dropdown">
                  <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>{directorName}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{user?.email || 'director@auraflow.ai'}</div>
                  </div>
                  <button
                    onClick={() => { setActiveNav('SETTINGS'); setShowProfileMenu(false); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: 'transparent',
                      color: '#CBD5E1',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Settings size={13} /> Settings & Profile
                  </button>
                  <button
                    onClick={handleLogoutSession}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4
                    }}
                  >
                    <LogOut size={13} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {msg && (
          <div className="exec-banner-msg">
            <span>{msg}</span>
            <button onClick={() => setMsg('')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            VIEW 1: OVERVIEW (EXACT REPLICA OF THE REFERENCE IMAGE)
            ──────────────────────────────────────────────────────── */}
        {activeNav === 'OVERVIEW' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── ROW 1: 4 TOP KPI METRIC CARDS ── */}
            <div className="exec-kpi-grid">
              {/* Card 1: Revenue */}
              <div className="exec-kpi-card">
                <div className="exec-kpi-header">
                  <span className="exec-kpi-title">Revenue</span>
                  <div style={{ color: '#0284C7', opacity: 0.8 }}><BarChart3 size={15} /></div>
                </div>
                <div className="exec-kpi-val-row">
                  <span className="exec-kpi-value">$2,850,000</span>
                  <span className="exec-kpi-badge positive">
                    +14%
                  </span>
                </div>
              </div>

              {/* Card 2: Active Users */}
              <div className="exec-kpi-card">
                <div className="exec-kpi-header">
                  <span className="exec-kpi-title">Active Users</span>
                  <div style={{ color: '#0284C7', opacity: 0.8 }}><Users size={15} /></div>
                </div>
                <div className="exec-kpi-val-row">
                  <span className="exec-kpi-value">142,500</span>
                  <span className="exec-kpi-badge positive">
                    +9%
                  </span>
                </div>
              </div>

              {/* Card 3: MRR */}
              <div className="exec-kpi-card">
                <div className="exec-kpi-header">
                  <span className="exec-kpi-title">MRR</span>
                  <div style={{ color: '#10B981', opacity: 0.8 }}><Wallet size={15} /></div>
                </div>
                <div className="exec-kpi-val-row">
                  <span className="exec-kpi-value">$450k</span>
                  <span className="exec-kpi-badge positive">
                    +11%
                  </span>
                </div>
              </div>

              {/* Card 4: Churn Rate */}
              <div className="exec-kpi-card">
                <div className="exec-kpi-header">
                  <span className="exec-kpi-title">Churn Rate</span>
                  <div style={{ color: '#EF4444', opacity: 0.8 }}><Activity size={15} /></div>
                </div>
                <div className="exec-kpi-val-row">
                  <span className="exec-kpi-value">3.2%</span>
                  <span className="exec-kpi-badge negative">
                    -0.5%
                  </span>
                </div>
              </div>
            </div>

            {/* ── ROW 2: 3 CORE ANALYTICS & VISUALIZATION PANELS ── */}
            <div className="exec-charts-grid">

              {/* Chart 1: Monthly Revenue Growth 2026 (Smooth Wave Spline Chart) */}
              <div className="exec-chart-card">
                <div className="exec-chart-header">
                  <h3 className="exec-chart-title">
                    Monthly Revenue Growth 2026
                  </h3>
                  <div className="exec-chart-legend">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#38BDF8' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8' }} /> Current
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#2563EB' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} /> Target
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0EA5E9' }}>
                      <span style={{ width: 12, height: 2, background: '#0EA5E9' }} /> STM goal
                    </span>
                  </div>
                </div>

                {/* SVG Spline Wave Visualization */}
                <div style={{ position: 'relative', width: '100%', height: 160, marginTop: 'auto' }}>
                  <svg width="100%" height="160" viewBox="0 0 460 160" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="30" y1="20" x2="450" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <line x1="30" y1="60" x2="450" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <line x1="30" y1="100" x2="450" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <line x1="30" y1="140" x2="450" y2="140" stroke="rgba(255,255,255,0.08)" />

                    {/* Y-axis Labels */}
                    <text x="0" y="24" fill="#64748B" fontSize="9.5" fontWeight="600">$3M</text>
                    <text x="0" y="64" fill="#64748B" fontSize="9.5" fontWeight="600">$2M</text>
                    <text x="0" y="104" fill="#64748B" fontSize="9.5" fontWeight="600">$1M</text>
                    <text x="0" y="144" fill="#64748B" fontSize="9.5" fontWeight="600">$0</text>

                    {/* Target Blue Wave Area + Path */}
                    <path
                      d="M30,135 C80,80 120,105 170,95 C220,85 260,35 310,40 C360,45 400,100 450,45 L450,140 L30,140 Z"
                      fill="url(#blueAreaGrad)"
                    />
                    <path
                      d="M30,135 C80,80 120,105 170,95 C220,85 260,35 310,40 C360,45 400,100 450,45"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                    />

                    {/* Current Cyan Wave Area + Path */}
                    <path
                      d="M30,140 C80,120 120,130 170,115 C220,100 260,65 310,75 C360,85 400,60 450,20 L450,140 L30,140 Z"
                      fill="url(#cyanAreaGrad)"
                    />
                    <path
                      d="M30,140 C80,120 120,130 170,115 C220,100 260,65 310,75 C360,85 400,60 450,20"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="3"
                    />

                    {/* STM Goal Dashed Top Indicator */}
                    <path
                      d="M30,135 C150,90 280,40 450,20"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </svg>
                </div>

                {/* X-Axis Month Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 30, marginTop: 8, fontSize: 10, color: '#64748B', fontWeight: 600 }}>
                  <span>Jan</span>
                  <span>Mar</span>
                  <span>May</span>
                  <span>Jul</span>
                  <span>Sep</span>
                  <span>Nov</span>
                </div>
              </div>

              {/* Chart 2: Quarterly Sales by Region (Grouped Multi-bar Chart) */}
              <div className="exec-chart-card">
                <div className="exec-chart-header">
                  <h3 className="exec-chart-title">
                    Quarterly Sales by Region
                  </h3>
                  <div style={{ display: 'flex', gap: 8, fontSize: 10.5, fontWeight: 600 }}>
                    <span style={{ color: '#38BDF8' }}>● NA</span>
                    <span style={{ color: '#10B981' }}>● EU</span>
                    <span style={{ color: '#F97316' }}>● APAC</span>
                  </div>
                </div>

                {/* Grouped Bars Container */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 155, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                  {/* Region 1: NA */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                    <div style={{ width: 14, height: 95, background: '#38BDF8', borderRadius: '4px 4px 0 0' }} title="NA: 260k" />
                    <div style={{ width: 14, height: 65, background: '#10B981', borderRadius: '4px 4px 0 0' }} title="EU: 180k" />
                    <div style={{ width: 14, height: 110, background: '#F97316', borderRadius: '4px 4px 0 0' }} title="APAC: 310k" />
                  </div>

                  {/* Region 2: EU */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                    <div style={{ width: 14, height: 85, background: '#38BDF8', borderRadius: '4px 4px 0 0' }} title="NA: 240k" />
                    <div style={{ width: 14, height: 60, background: '#10B981', borderRadius: '4px 4px 0 0' }} title="EU: 170k" />
                    <div style={{ width: 14, height: 90, background: '#F97316', borderRadius: '4px 4px 0 0' }} title="APAC: 250k" />
                  </div>

                  {/* Region 3: APAC */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                    <div style={{ width: 14, height: 135, background: '#38BDF8', borderRadius: '4px 4px 0 0' }} title="NA: 380k" />
                    <div style={{ width: 14, height: 75, background: '#10B981', borderRadius: '4px 4px 0 0' }} title="EU: 210k" />
                    <div style={{ width: 14, height: 85, background: '#F97316', borderRadius: '4px 4px 0 0' }} title="APAC: 240k" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 10.5, color: '#64748B', fontWeight: 700 }}>
                  <span>NA</span>
                  <span>EU</span>
                  <span>APAC</span>
                </div>
              </div>

              {/* Chart 3: User Acquisition Channel (Doughnut Ring Chart) */}
              <div className="exec-chart-card" style={{ alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 className="exec-chart-title">
                    User Acquisition Channel
                  </h3>
                  <span style={{ color: '#64748B', fontSize: 14, cursor: 'pointer' }}>···</span>
                </div>

                {/* SVG Doughnut Ring */}
                <div style={{ position: 'relative', width: 130, height: 130 }}>
                  <svg width="130" height="130" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#1E293B" strokeWidth="14" />
                    {/* Slices */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#0284C7" strokeWidth="14" strokeDasharray="95 144" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="14" strokeDasharray="55 184" strokeDashoffset="-95" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="14" strokeDasharray="45 194" strokeDashoffset="-150" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#EF4444" strokeWidth="14" strokeDasharray="44 195" strokeDashoffset="-195" />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Total</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#F8FAFC' }}>100%</span>
                  </div>
                </div>

                {/* Doughnut Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'center', marginTop: 12, fontSize: 10.5, fontWeight: 600, color: '#94A3B8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0284C7' }} /> Organic
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} /> Paid
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} /> Referral
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444' }} /> Social
                  </span>
                </div>
              </div>

            </div>

            {/* ── ROW 3: 3 OPERATIONAL & GOVERNANCE PANELS ── */}
            <div className="exec-ops-grid">

              {/* Panel 1: Project Progress Tracker */}
              <div className="exec-ops-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F1F5F9' }}>Project Alpha</h3>
                    <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: 10.5, padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                      Active
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: 16, padding: 0 }}
                    title="Add Goal"
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Task 1 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                      <span style={{ color: '#E2E8F0' }}>Project Alpha</span>
                      <span style={{ color: '#38BDF8' }}>In Progress 86%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#1E293B', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '86%', height: '100%', background: 'linear-gradient(90deg, #0EA5E9, #38BDF8)', borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                      <span style={{ color: '#E2E8F0' }}>Beta Launch</span>
                      <span style={{ color: '#10B981' }}>On Track 100%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#1E293B', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #059669, #10B981)', borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Task 3 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                      <span style={{ color: '#E2E8F0' }}>Marketing Campaign</span>
                      <span style={{ color: '#EF4444' }}>Delayed 45%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#1E293B', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '45%', height: '100%', background: 'linear-gradient(90deg, #DC2626, #EF4444)', borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 2: Pending Approvals & Team Updates */}
              <div className="exec-ops-card" style={{ gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F1F5F9' }}>Pending Approvals</h3>
                  <span style={{ color: '#64748B', fontSize: 14, cursor: 'pointer' }}>···</span>
                </div>

                {/* Subcard: Pending Approvals */}
                <div
                  onClick={() => setActiveNav('PROJECTS')}
                  className="exec-subcard"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={16} color="#F59E0B" />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F1F5F9' }}>
                        Pending Approvals: Candidate Tags
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>
                        {pendingApprovals.length > 0 ? `${pendingApprovals.length} candidates pending endorsement` : 'All candidate tags reviewed'}
                      </div>
                    </div>
                  </div>
                  <Search size={14} color="#64748B" />
                </div>

                {/* Subcard: Team Updates */}
                <div style={{ fontSize: 13, fontWeight: 800, color: '#F1F5F9', marginTop: 2 }}>
                  Team Updates
                </div>

                <div
                  onClick={() => setActiveNav('TEAM')}
                  className="exec-subcard"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Users size={16} color="#38BDF8" />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F1F5F9' }}>
                        HR Recruiter Team Pulse
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>
                        {hrTeam.length} active recruiters registered
                      </div>
                    </div>
                  </div>
                  <Search size={14} color="#64748B" />
                </div>
              </div>

              {/* Panel 3: Top Performing Products / Hiring Squads */}
              <div className="exec-ops-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#F1F5F9' }}>Top Performing Products</h3>
                  <span style={{ color: '#64748B', fontSize: 14, cursor: 'pointer' }}>···</span>
                </div>

                {/* Bar Graph */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 110, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                  {/* Category 1 */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ width: 12, height: 75, background: '#0284C7', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 12, height: 50, background: '#10B981', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 12, height: 65, background: '#EF4444', borderRadius: '3px 3px 0 0' }} />
                  </div>

                  {/* Category 2 */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ width: 12, height: 95, background: '#0284C7', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 12, height: 60, background: '#10B981', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 12, height: 45, background: '#EF4444', borderRadius: '3px 3px 0 0' }} />
                  </div>

                  {/* Category 3 */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ width: 12, height: 85, background: '#0284C7', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 12, height: 45, background: '#10B981', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 12, height: 40, background: '#EF4444', borderRadius: '3px 3px 0 0' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 10, color: '#64748B', fontWeight: 600 }}>
                  <span>AI Core Engine</span>
                  <span>Talent Cloud</span>
                  <span>Analytics Pro</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            VIEW 2: ANALYTICS & TELEMETRY
            ──────────────────────────────────────────────────────── */}
        {activeNav === 'ANALYTICS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="exec-card-section">
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
                📊 Comprehensive Hiring & Placement Telemetry
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
                Deep-dive performance telemetry for technical screening, interview velocity, and candidate verification.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="exec-card-section" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>AVG. INTERVIEW VELOCITY</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#38BDF8', marginTop: 4 }}>3.4 Days</div>
                <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>↓ 28% Faster than industry benchmark</div>
              </div>

              <div className="exec-card-section" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>CREDENTIAL VERIFICATION ACCURACY</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981', marginTop: 4 }}>99.98%</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Zero fraudulent tag leakage</div>
              </div>

              <div className="exec-card-section" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>OFFER ACCEPTANCE RATE</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B', marginTop: 4 }}>94.2%</div>
                <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>↑ 6.4% YoY Increase</div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            VIEW 3: SALES / SALARY DISBURSAL (salary-disbuss)
            ──────────────────────────────────────────────────────── */}
        {activeNav === 'SALARY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header + Action */}
            <div className="exec-card-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
                  💰 HR & Staff Salary Disbursal Management
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
                  Execute one-click instant salary disbursements, review transaction references, and manage payroll accounts.
                </p>
              </div>

              <button
                onClick={handleDisburseAllPending}
                className="exec-success-btn"
              >
                <Send size={15} /> 🚀 Disburse All Pending Salaries
              </button>
            </div>

            {/* Roster Table */}
            <div className="exec-card-section" style={{ padding: '20px', overflowX: 'auto' }}>
              <table className="exec-table">
                <thead>
                  <tr>
                    <th>Employee & Role</th>
                    <th>Account / UPI Ref</th>
                    <th>Base Salary</th>
                    <th>Incentive</th>
                    <th>Total Payout</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRoster.map(rec => (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#F8FAFC' }}>{rec.employeeName}</div>
                        <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{rec.role}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#E2E8F0' }}>{rec.accountMasked}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{rec.paymentMethod}</div>
                      </td>
                      <td style={{ color: '#CBD5E1' }}>
                        ${rec.baseSalary.toLocaleString()}
                      </td>
                      <td style={{ color: '#10B981', fontWeight: 700 }}>
                        +${rec.incentive.toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 900, color: '#FFFFFF' }}>
                        ${(rec.baseSalary + rec.incentive).toLocaleString()}
                      </td>
                      <td>
                        <span className={`exec-kpi-badge ${rec.status === 'DISBURSED' ? 'positive' : 'negative'}`} style={{ color: rec.status === 'DISBURSED' ? '#10B981' : '#F59E0B' }}>
                          {rec.status === 'DISBURSED' ? '✓ DISBURSED' : '⏳ PENDING'}
                        </span>
                        {rec.transactionRef && (
                          <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>
                            {rec.transactionRef}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {rec.status === 'PENDING' ? (
                          <button
                            onClick={() => handleDisburseSingle(rec.id)}
                            className="exec-success-btn"
                            style={{ padding: '6px 14px', fontSize: 12 }}
                          >
                            ⚡ Disburse Payout
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveReceipt(rec)}
                            style={{
                              background: '#1E293B',
                              color: '#38BDF8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
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
        )}

        {/* ────────────────────────────────────────────────────────
            VIEW 4: PROJECTS / TASKS & CANDIDATE APPROVALS
            ──────────────────────────────────────────────────────── */}
        {activeNav === 'PROJECTS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header with Add Button */}
            <div className="exec-card-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
                  📁 Corporate Projects, Goals & Task Delegation
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
                  Create and assign strategic hiring deliverables to your HR recruiters.
                </p>
              </div>

              <button
                onClick={() => setShowTaskModal(true)}
                className="exec-primary-btn"
                style={{ fontSize: 13, padding: '9px 18px' }}
              >
                <Plus size={15} /> Add New Goal / Task
              </button>
            </div>

            {/* Task Cards List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="exec-card-section"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: task.status === 'COMPLETED' ? '#94A3B8' : '#F8FAFC', textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>{task.description}</p>
                      )}
                    </div>
                    <span className={`exec-kpi-badge ${task.priority === 'HIGH' ? 'negative' : 'positive'}`} style={{ color: task.priority === 'HIGH' ? '#EF4444' : '#38BDF8' }}>
                      {task.priority}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                      Assigned: <strong>{task.assignedToName}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        style={{
                          background: task.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.18)' : '#1E293B',
                          color: task.status === 'COMPLETED' ? '#10B981' : '#CBD5E1',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {task.status}
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Candidate Verifications Queue */}
            <div style={{ marginTop: 10 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 900, color: '#F8FAFC' }}>
                🛡️ Candidate Credential Tag Approvals Queue
              </h3>
              <CompanyTagApprovalQueue />
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            VIEW 5: TEAM & RECRUITER VERIFIED BADGES
            ──────────────────────────────────────────────────────── */}
        {activeNav === 'TEAM' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="exec-card-section">
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
                👥 Company HR Recruiter Roster & Verified Badges
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
                Authorize HR recruiters with official Company Verified Badges so candidates can authenticate their identity.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              {hrTeam.map(hr => (
                <div
                  key={hr.hrProfileId}
                  className="exec-card-section"
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 16
                    }}>
                      {hr.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#F8FAFC' }}>{hr.name}</span>
                        {hr.companyVerified && (
                          <span className="exec-kpi-badge positive" style={{ fontSize: 10 }}>
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{hr.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    <button
                      onClick={() => handleToggleHrBadge(hr)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        background: hr.companyVerified ? 'rgba(239, 68, 68, 0.18)' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                        color: hr.companyVerified ? '#EF4444' : '#FFFFFF'
                      }}
                    >
                      {hr.companyVerified ? 'Revoke Badge' : '🛡️ Award Badge'}
                    </button>
                    <button
                      onClick={() => navigate('/team-chat')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: '#1E293B',
                        color: '#F8FAFC',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            VIEW 6: SETTINGS & CORPORATE PROFILE
            ──────────────────────────────────────────────────────── */}
        {activeNav === 'SETTINGS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
            <div className="exec-card-section">
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
                ⚙️ Executive Profile & Corporate Configuration
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94A3B8' }}>
                Manage your enterprise identity, verified domain parameters, and security policies.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); setMsg('✅ Corporate profile settings updated!'); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Company Legal Name</label>
                    <input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="exec-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Primary Website URL</label>
                    <input
                      value={companyWebsite}
                      onChange={e => setCompanyWebsite(e.target.value)}
                      className="exec-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Industry & Sector</label>
                    <input
                      value={companyIndustry}
                      onChange={e => setCompanyIndustry(e.target.value)}
                      className="exec-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Company Description</label>
                    <textarea
                      rows={3}
                      value={companyAbout}
                      onChange={e => setCompanyAbout(e.target.value)}
                      className="exec-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    className="exec-primary-btn"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ── CREATE TASK MODAL ── */}
      {showTaskModal && (
        <div className="exec-modal-backdrop">
          <div className="exec-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F8FAFC' }}>Create & Delegate Goal / Task</h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Task Title *</label>
                  <input
                    required
                    placeholder="e.g. Screen top 10 AI candidates for Core Engine"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    className="exec-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={2}
                    placeholder="Deliverable details..."
                    value={taskDesc}
                    onChange={e => setTaskDesc(e.target.value)}
                    className="exec-textarea"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Priority</label>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value)}
                      className="exec-select"
                    >
                      <option value="HIGH">🔴 High</option>
                      <option value="MEDIUM">🟡 Medium</option>
                      <option value="LOW">🟢 Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Category</label>
                    <select
                      value={taskCategory}
                      onChange={e => setTaskCategory(e.target.value)}
                      className="exec-select"
                    >
                      <option value="HIRING">Hiring</option>
                      <option value="INTERVIEW">Interviews</option>
                      <option value="COMPLIANCE">Compliance</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Assign to HR Recruiter</label>
                  <select
                    value={taskAssigneeId}
                    onChange={e => setTaskAssigneeId(e.target.value)}
                    className="exec-select"
                  >
                    <option value="">Unassigned (Team Goal)</option>
                    {hrTeam.map(hr => (
                      <option key={hr.userId} value={hr.userId}>
                        {hr.name} ({hr.designation || 'HR'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" onClick={() => setShowTaskModal(false)} style={{ background: '#1E293B', color: '#CBD5E1', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" className="exec-primary-btn" style={{ fontSize: 13, padding: '8px 16px' }}>
                    Create Task 🚀
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SALARY DISBURSAL RECEIPT SLIP MODAL ── */}
      {activeReceipt && (
        <div className="exec-modal-backdrop">
          <div className="exec-modal-box" style={{ width: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#F8FAFC' }}>Salary Disbursal Receipt</h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Ref ID:</span>
                <span style={{ fontWeight: 800, color: '#F8FAFC' }}>{activeReceipt.transactionRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Beneficiary:</span>
                <span style={{ fontWeight: 800, color: '#F8FAFC' }}>{activeReceipt.employeeName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Role:</span>
                <span style={{ color: '#CBD5E1' }}>{activeReceipt.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>Account / UPI:</span>
                <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{activeReceipt.accountMasked}</span>
              </div>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#F8FAFC' }}>Total Disbursed:</span>
                <span style={{ fontWeight: 900, fontSize: 17, color: '#10B981' }}>${(activeReceipt.baseSalary + activeReceipt.incentive).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={() => setActiveReceipt(null)}
                className="exec-primary-btn"
                style={{ fontSize: 12.5, padding: '7px 16px' }}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
