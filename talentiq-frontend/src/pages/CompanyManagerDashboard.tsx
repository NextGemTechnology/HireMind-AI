import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  CheckSquare,
  TrendingUp,
  RefreshCw,
  Award,
  PlusCircle,
  Briefcase,
  LogOut,
  Calendar,
  ChevronDown,
  Pin,
  Send,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Sparkles,
  UserCheck,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Download,
  Star,
  Globe,
  MapPin,
  Mail,
  Phone,
  Shield,
  X,
  Edit3,
  BarChart3,
  DollarSign,
  User,
  Hash,
  Eye,
  CheckCircle,
  Clock
} from 'lucide-react';
import { AiLogo } from '../components/AiLogo';
import { CompanyEmployeeApprovalQueue } from '../components/CompanyEmployeeApprovalQueue';
import { CompanyPayrollQueue } from '../components/CompanyPayrollQueue';
import { CompanyTagApprovalQueue } from '../components/CompanyTagApprovalQueue';
import '../css/admin-dashboards-distinct.css';

export const CompanyManagerDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  // Primary active navigation tab (10 core menus mapping to the 12 screens)
  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'PROFILE' | 'RECRUITERS' | 'CANDIDATES' | 'EMPLOYEES' | 'PAYROLL' | 'ANALYTICS' | 'CHAT' | 'SETTINGS' | 'STRATEGY'
  >('DASHBOARD');

  // Sub-tabs for granular views
  const [profileSubTab, setProfileSubTab] = useState<'OVERVIEW' | 'CONTACT' | 'BRANDING' | 'SUBSCRIPTION' | 'VERIFICATION'>('OVERVIEW');
  const [recruiterSubTab, setRecruiterSubTab] = useState<'ROSTER' | 'INVITATIONS' | 'APPROVAL_QUEUE'>('ROSTER');
  const [candidateSubTab, setCandidateSubTab] = useState<'SEARCH_INVITE' | 'VERIFICATIONS' | 'INVITATIONS'>('SEARCH_INVITE');
  const [employeeSubTab, setEmployeeSubTab] = useState<'DIRECTORY' | 'PERFORMANCE' | 'TERMINATIONS'>('DIRECTORY');
  const [payrollSubTab, setPayrollSubTab] = useState<'DISBURSEMENT' | 'HISTORY'>('DISBURSEMENT');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'HIRING' | 'EMPLOYEES' | 'PAYROLL' | 'PERFORMANCE'>('HIRING');
  const [settingsSubTab, setSettingsSubTab] = useState<'ACCOUNT' | 'SECURITY' | 'NOTIFICATIONS' | 'INTEGRATIONS' | 'BILLING'>('ACCOUNT');

  // Filter states
  const [recruiterFilter, setRecruiterFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'INACTIVE'>('ALL');
  const [recruiterSearch, setRecruiterSearch] = useState<string>('');
  const [candVerifFilter, setCandVerifFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [empDirectoryFilter, setEmpDirectoryFilter] = useState<'WORKING' | 'EX' | 'TERMINATED'>('WORKING');
  const [empSearch, setEmpSearch] = useState<string>('');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'>('ALL');
  const [payrollMonth, setPayrollMonth] = useState<string>('September 2026');

  // Sidebar pin and hover states
  const [hoveredMenuId, setHoveredMenuId] = useState<string | null>(null);
  const [pinnedMenus, setPinnedMenus] = useState<Record<string, boolean>>({
    'DASHBOARD': true,
    'PROFILE': true,
    'RECRUITERS': true,
    'CANDIDATES': true,
    'EMPLOYEES': true,
    'PAYROLL': true,
    'ANALYTICS': true,
    'CHAT': true,
    'SETTINGS': true,
    'STRATEGY': true
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Core Data State
  const [dashboard, setDashboard] = useState<any>(null);
  const [hrTeam, setHrTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [candidatePool, setCandidatePool] = useState<any[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([]);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Modals state
  const [showInviteHrModal, setShowInviteHrModal] = useState<boolean>(false);
  const [showInviteCandModal, setShowInviteCandModal] = useState<boolean>(false);
  const [showShareableLinksModal, setShowShareableLinksModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showNewReviewModal, setShowNewReviewModal] = useState<boolean>(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');

  // Form states
  const [inviteHrEmail, setInviteHrEmail] = useState<string>('');
  const [inviteHrName, setInviteHrName] = useState<string>('');
  const [inviteHrDesignation, setInviteHrDesignation] = useState<string>('Talent Acquisition Specialist');
  const [inviteHrAutoBadge, setInviteHrAutoBadge] = useState<boolean>(true);

  const [inviteCandEmail, setInviteCandEmail] = useState<string>('');
  const [inviteCandName, setInviteCandName] = useState<string>('');
  const [inviteCandJobTitle, setInviteCandJobTitle] = useState<string>('Full-Stack Engineer');
  const [inviteCandAutoBadge, setInviteCandAutoBadge] = useState<boolean>(true);

  const [inviteSubmitting, setInviteSubmitting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [badgeActionHrId, setBadgeActionHrId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Company Profile Form State
  const [editCompanyName, setEditCompanyName] = useState<string>('');
  const [editTagline, setEditTagline] = useState<string>('');
  const [editIndustry, setEditIndustry] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [profileSaving, setProfileSaving] = useState<boolean>(false);

  // New Performance Review Form State
  const [reviewEmpId, setReviewEmpId] = useState<number | ''>('');
  const [reviewEmpName, setReviewEmpName] = useState<string>('');
  const [reviewPeriod, setReviewPeriod] = useState<string>('Q3 2026');
  const [reviewTechRating, setReviewTechRating] = useState<number>(5);
  const [reviewCommRating, setReviewCommRating] = useState<number>(4);
  const [reviewLeadRating, setReviewLeadRating] = useState<number>(4);
  const [reviewOverallRating, setReviewOverallRating] = useState<number>(4.5);
  const [reviewStrengths, setReviewStrengths] = useState<string>('');
  const [reviewGrowth, setReviewGrowth] = useState<string>('');
  const [reviewGoals, setReviewGoals] = useState<string>('');
  const [reviewPromotion, setReviewPromotion] = useState<boolean>(false);
  const [reviewSaving, setReviewSaving] = useState<boolean>(false);

  // Chat State (Screen 11)
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [chatMessages, setChatMessages] = useState<Array<{ id: number; sender: string; isSelf: boolean; text: string; time: string }>>([
    { id: 1, sender: 'Sarah Jenkins (HR Lead)', isSelf: false, text: 'Hi team, 3 final round candidates are confirmed for the Senior Frontend Architect position today.', time: '09:30 AM' },
    { id: 2, sender: 'David Miller (Talent VP)', isSelf: false, text: 'Great work Sarah! Let us ensure their technical scorecards and salary expectations are logged before 3 PM.', time: '09:42 AM' },
    { id: 3, sender: 'You', isSelf: true, text: 'Approved. I reviewed the budget for the new tier; we have executive authorization for up to $165k base plus equity.', time: '09:45 AM' },
    { id: 4, sender: 'Sarah Jenkins (HR Lead)', isSelf: false, text: 'Perfect. We will prepare the offer letter templates accordingly.', time: '09:48 AM' }
  ]);
  const [chatInputText, setChatInputText] = useState<string>('');

  // Settings State (Screen 12)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(true);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [payrollAlerts, setPayrollAlerts] = useState<boolean>(true);
  const [verificationAlerts, setVerificationAlerts] = useState<boolean>(true);
  const [activeSessions, setActiveSessions] = useState<Array<{ id: number; device: string; ip: string; location: string; lastActive: string; isCurrent: boolean }>>([
    { id: 1, device: 'MacBook Pro (Chrome 128 / macOS Sequoia)', ip: '192.168.1.42', location: 'San Francisco, CA, US', lastActive: 'Active Now', isCurrent: true },
    { id: 2, device: 'iPhone 15 Pro (TalentIQ Mobile / iOS 18)', ip: '172.56.21.89', location: 'San Francisco, CA, US', lastActive: '2 hours ago', isCurrent: false }
  ]);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const [dashRes, hrRes, taskRes, invRes] = await Promise.all([
        apiClient.get('/admin/company/dashboard').catch(() => null),
        apiClient.get('/admin/company/team/hrs').catch(() => null),
        apiClient.get('/admin/company/tasks').catch(() => null),
        apiClient.get('/admin/company/invitations').catch(() => null)
      ]);

      if (dashRes?.data?.data) {
        setDashboard(dashRes.data.data);
        setEditCompanyName(dashRes.data.data.companyName || '');
        setEditTagline(dashRes.data.data.tagline || 'Leading Next-Gen AI & Engineering Enterprise');
        setEditIndustry(dashRes.data.data.industry || 'Technology & Software');
        setEditWebsite(dashRes.data.data.website || 'https://hiremind.ai');
        setEditLocation(dashRes.data.data.location || 'San Francisco, CA');
        setEditEmail(dashRes.data.data.email || user?.email || 'admin@enterprise.com');
        setEditPhone(dashRes.data.data.phone || '+1 (555) 382-9900');
      }
      if (hrRes?.data?.data) setHrTeam(hrRes.data.data);
      if (taskRes?.data?.data) setTasks(taskRes.data.data);
      if (invRes?.data?.data) setInvitations(invRes.data.data);

      // Fetch performance and analytics
      fetchPerformanceData();
      fetchAnalyticsData();
      fetchEmployeesData();
    } catch (err) {
      console.error('Error fetching company manager workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const [revRes, statsRes] = await Promise.all([
        apiClient.get('/admin/company/performance').catch(() => null),
        apiClient.get('/admin/company/performance/stats').catch(() => null)
      ]);
      if (revRes?.data?.data?.content) {
        setPerformanceReviews(revRes.data.data.content);
      } else if (revRes?.data?.data) {
        setPerformanceReviews(revRes.data.data);
      }
      if (statsRes?.data?.data) {
        setPerformanceStats(statsRes.data.data);
      }
    } catch (e) {
      console.warn('Performance fetch error, using defaults', e);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const res = await apiClient.get('/admin/company/analytics').catch(() => null);
      if (res?.data?.data) {
        setAnalyticsData(res.data.data);
      }
    } catch (e) {
      console.warn('Analytics fetch error', e);
    }
  };

  const fetchEmployeesData = async () => {
    try {
      const res = await apiClient.get('/employees').catch(() => null);
      const list = res?.data?.data?.content || res?.data?.data || [];
      if (list.length > 0) {
        setEmployeesList(list);
      } else {
        // High quality fallback dataset for Screen 7
        setEmployeesList([
          { id: 101, candidateName: 'Marcus Vance', candidateEmail: 'm.vance@company.com', employeeCode: 'EMP-001', jobTitle: 'Lead AI Engineer', department: 'Engineering', status: 'ACTIVE', baseSalary: 145000, createdAt: '2025-02-15' },
          { id: 102, candidateName: 'Elena Rostova', candidateEmail: 'e.rostova@company.com', employeeCode: 'EMP-002', jobTitle: 'Senior Product Designer', department: 'Product', status: 'ACTIVE', baseSalary: 120000, createdAt: '2025-04-10' },
          { id: 103, candidateName: 'Julian Thorne', candidateEmail: 'j.thorne@company.com', employeeCode: 'EMP-003', jobTitle: 'Talent Acquisition Partner', department: 'Human Resources', status: 'ACTIVE', baseSalary: 95000, createdAt: '2025-05-01' },
          { id: 104, candidateName: 'Sophia Lin', candidateEmail: 's.lin@company.com', employeeCode: 'EMP-004', jobTitle: 'Full-Stack Developer', department: 'Engineering', status: 'ACTIVE', baseSalary: 110000, createdAt: '2025-06-18' },
          { id: 105, candidateName: 'David Kalu', candidateEmail: 'd.kalu@company.com', employeeCode: 'EMP-005', jobTitle: 'Operations Specialist', department: 'Operations', status: 'EX_EMPLOYEE', baseSalary: 85000, createdAt: '2024-11-20' },
          { id: 106, candidateName: 'Aria Montgomery', candidateEmail: 'a.mont@company.com', employeeCode: 'EMP-006', jobTitle: 'Frontend Developer', department: 'Engineering', status: 'TERMINATED', baseSalary: 102000, createdAt: '2024-08-12' }
        ]);
      }
    } catch (e) {
      console.warn('Employees fetch error', e);
    }
  };

  const fetchCandidatePool = async () => {
    try {
      const res = await apiClient.get('/admin/company/candidates/pool').catch(() => null);
      if (res?.data?.data) {
        setCandidatePool(res.data.data);
      } else {
        setCandidatePool([
          { id: 201, firstName: 'Alexander', lastName: 'Pierce', email: 'alex.pierce@dev.io', skills: 'React, TypeScript, GraphQL, Node.js', experience: '5 Years', availability: 'Immediate' },
          { id: 202, firstName: 'Maya', lastName: 'Chen', email: 'maya.chen@engineer.ai', skills: 'Python, PyTorch, LangChain, FastAPI', experience: '4 Years', availability: '2 Weeks' },
          { id: 203, firstName: 'Devon', lastName: 'Lee', email: 'devon.lee@cloudops.org', skills: 'Kubernetes, AWS, Terraform, Docker', experience: '6 Years', availability: '1 Month' },
          { id: 204, firstName: 'Chloe', lastName: 'Dubois', email: 'chloe.dubois@design.co', skills: 'Figma, UI Systems, Interaction Design', experience: '3 Years', availability: 'Immediate' }
        ]);
      }
    } catch (e) {
      console.warn('Candidate pool error', e);
    }
  };

  const handleToggleHrBadge = async (hr: any) => {
    setBadgeActionHrId(hr.id);
    try {
      await apiClient.post(`/admin/company/team/hrs/${hr.id}/badge`);
      showToast(hr.companyVerified ? 'Verification badge revoked.' : '⭐ Verification badge officially awarded!');
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update badge status');
    } finally {
      setBadgeActionHrId(null);
    }
  };

  const handleSendInviteHr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteHrEmail) return;
    setInviteSubmitting(true);
    try {
      await apiClient.post('/admin/company/invitations', {
        email: inviteHrEmail,
        recipientName: inviteHrName,
        role: 'ROLE_HR',
        designation: inviteHrDesignation,
        autoVerifyBadge: inviteHrAutoBadge
      });
      setShowInviteHrModal(false);
      setInviteHrEmail('');
      setInviteHrName('');
      showToast('Corporate invitation dispatched to HR recruiter!');
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleSendInviteCand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCandEmail) return;
    setInviteSubmitting(true);
    try {
      await apiClient.post('/admin/company/invitations', {
        email: inviteCandEmail,
        recipientName: inviteCandName,
        role: 'ROLE_CANDIDATE',
        designation: inviteCandJobTitle,
        autoVerifyBadge: inviteCandAutoBadge
      });
      setShowInviteCandModal(false);
      setInviteCandEmail('');
      setInviteCandName('');
      showToast('Invitation dispatched to candidate with onboarding access!');
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send candidate invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResendInvite = async (id: number) => {
    try {
      await apiClient.post(`/admin/company/invitations/${id}/resend`);
      showToast('Invitation re-dispatched with renewed 7-day validity!');
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleRevokeInvite = async (id: number) => {
    if (!window.confirm('Are you sure you want to revoke this corporate invitation?')) return;
    try {
      await apiClient.delete(`/admin/company/invitations/${id}`);
      showToast('Invitation revoked.');
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiClient.put('/admin/company/profile', {
        companyName: editCompanyName,
        tagline: editTagline,
        industry: editIndustry,
        website: editWebsite,
        location: editLocation,
        email: editEmail,
        phone: editPhone
      });
      setShowEditProfileModal(false);
      showToast('Company profile details updated successfully!');
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update company profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmitPerformanceReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEmpName) return;
    setReviewSaving(true);
    try {
      await apiClient.post('/admin/company/performance', {
        employeeId: reviewEmpId || 101,
        employeeName: reviewEmpName,
        reviewPeriod: reviewPeriod,
        technicalSkillsRating: reviewTechRating,
        communicationRating: reviewCommRating,
        leadershipRating: reviewLeadRating,
        overallRating: reviewOverallRating,
        strengths: reviewStrengths || 'Consistently exceeds delivery timelines and demonstrates strong technical leadership.',
        areasForImprovement: reviewGrowth || 'Cross-department architectural documentation.',
        goalsNextQuarter: reviewGoals || 'Lead the next microservices migration sprint.',
        promotionRecommended: reviewPromotion
      });
      setShowNewReviewModal(false);
      showToast('Performance review submitted & verified successfully!');
      fetchPerformanceData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSaving(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: 'You',
      isSelf: true,
      text: chatInputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInputText('');

    // Simulated reply after 1.5s
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'Sarah Jenkins (HR Lead)',
          isSelf: false,
          text: 'Acknowledged! Updating the recruitment portal records now.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  const handleRevokeSession = (sessionId: number) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    showToast('Session revoked successfully.');
  };

  const handleAskAiManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setAiLoading(true);
    setTimeout(() => {
      if (aiPrompt.toLowerCase().includes('today') || aiPrompt.toLowerCase().includes('work')) {
        setAiResponse(`📋 **Today's Strategic Executive Overview for ${dashboard?.companyName || 'Your Enterprise'}:**\n- 4 interviews scheduled with Senior Full-Stack candidates.\n- 2 tasks pending review from HR recruitment team.\n- 1 offer letter awaiting executive sign-off for Lead AI Engineer.\n- Salary disbursements for September are 82% processed.`);
      } else if (aiPrompt.toLowerCase().includes('pending') || aiPrompt.toLowerCase().includes('hr')) {
        setAiResponse(`⏳ **HR Recruiters with Pending Actions:**\n- **Sarah Jenkins**: 2 job descriptions pending compliance check.\n- **Julian Thorne**: 1 candidate verification review overdue.`);
      } else if (aiPrompt.toLowerCase().includes('performance') || aiPrompt.toLowerCase().includes('rating')) {
        setAiResponse(`⭐ **Quarterly Performance Pulse:**\nAverage team performance rating is **4.6 / 5.0**. Engineering leads all departments with 4.8 avg rating, followed by Product at 4.6.`);
      } else {
        setAiResponse(`🤖 **AI Corporate Analysis:**\nAll hiring pipeline velocity metrics are up 18% month-over-month. Active candidate engagement score is 94.2%. Platform retention is 98.4%.`);
      }
      setAiLoading(false);
    }, 600);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await apiClient.post('/admin/company/tasks', {
        title: newTaskTitle,
        assignedToHrId: hrTeam[0]?.id || 1,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
      });
      setShowTaskModal(false);
      setNewTaskTitle('');
      fetchCompanyData();
      showToast('Strategic goal created!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Task creation failed');
    }
  };

  const togglePin = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedMenus(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filtered HRs for Screen 4
  const filteredHrs = hrTeam.filter(hr => {
    const matchesSearch = !recruiterSearch ||
      `${hr.firstName} ${hr.lastName}`.toLowerCase().includes(recruiterSearch.toLowerCase()) ||
      hr.email?.toLowerCase().includes(recruiterSearch.toLowerCase()) ||
      hr.designation?.toLowerCase().includes(recruiterSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (recruiterFilter === 'VERIFIED') return hr.companyVerified;
    if (recruiterFilter === 'PENDING') return !hr.companyVerified;
    if (recruiterFilter === 'INACTIVE') return hr.active === false;
    return true;
  });

  // Filtered Employees for Screen 7
  const filteredEmployees = employeesList.filter(emp => {
    const matchesSearch = !empSearch ||
      emp.candidateName?.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.candidateEmail?.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.department?.toLowerCase().includes(empSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (empDirectoryFilter === 'WORKING') return emp.status === 'ACTIVE' || !emp.status;
    if (empDirectoryFilter === 'EX') return emp.status === 'EX_EMPLOYEE';
    if (empDirectoryFilter === 'TERMINATED') return emp.status === 'TERMINATED';
    return true;
  });

  // Hiring trend data for Screen 2 area chart
  const hiringTrendData = dashboard?.hiringTrend || [
    { month: 'Jan', applications: 28, hires: 4 },
    { month: 'Feb', applications: 35, hires: 6 },
    { month: 'Mar', applications: 42, hires: 8 },
    { month: 'Apr', applications: 38, hires: 5 },
    { month: 'May', applications: 55, hires: 9 },
    { month: 'Jun', applications: 62, hires: 12 },
    { month: 'Jul', applications: 58, hires: 10 },
    { month: 'Aug', applications: 70, hires: 14 },
    { month: 'Sep', applications: 84, hires: 18 }
  ];

  return (
    <div className="company-workspace-wrapper">
      {/* ── Corporate Executive Sidebar ── */}
      <aside className="company-sidebar">
        {/* HQ Branding Header */}
        <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(56, 189, 248, 0.15) 100%)',
              border: '1px solid #38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)'
            }}>
              <Building2 size={19} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#38BDF8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                CORPORATE HQ
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dashboard?.companyName || 'Enterprise Workspace'}
              </div>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '4px 10px',
            borderRadius: '14px',
            fontSize: '11px',
            color: '#34D399',
            fontWeight: 800,
            marginTop: '4px'
          }}>
            <Award size={12} color="#F59E0B" /> VERIFIED ENTERPRISE
          </div>
        </div>

        {/* Navigation Items (10 core menus mapping to the 12 screens) */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {[
            {
              id: 'DASHBOARD',
              label: 'Executive Dashboard',
              icon: <BarChart3 size={16} />,
              defaultTab: 'DASHBOARD' as const,
              submenus: [
                { id: 'dash_overview', label: 'Company KPI & Growth', tab: 'DASHBOARD' as const }
              ]
            },
            {
              id: 'PROFILE',
              label: 'Company Profile',
              icon: <Building2 size={16} />,
              defaultTab: 'PROFILE' as const,
              submenus: [
                { id: 'prof_over', label: 'Overview & Story', tab: 'PROFILE' as const, subTab: 'OVERVIEW' as const },
                { id: 'prof_contact', label: 'Contact & Location', tab: 'PROFILE' as const, subTab: 'CONTACT' as const },
                { id: 'prof_branding', label: 'Branding & Identity', tab: 'PROFILE' as const, subTab: 'BRANDING' as const },
                { id: 'prof_sub', label: 'Subscription Plan', tab: 'PROFILE' as const, subTab: 'SUBSCRIPTION' as const },
                { id: 'prof_verif', label: 'Verification Badge', tab: 'PROFILE' as const, subTab: 'VERIFICATION' as const }
              ]
            },
            {
              id: 'RECRUITERS',
              label: 'HR Management',
              icon: <Users size={16} />,
              defaultTab: 'RECRUITERS' as const,
              badge: `${hrTeam.length} Active`,
              submenus: [
                { id: 'rec_roster', label: 'Active HR Recruiters', tab: 'RECRUITERS' as const, subTab: 'ROSTER' as const },
                { id: 'rec_inv', label: 'Pending Onboarding Invites', tab: 'RECRUITERS' as const, subTab: 'INVITATIONS' as const },
                { id: 'rec_queue', label: 'Badge Tag Approval Queue', tab: 'RECRUITERS' as const, subTab: 'APPROVAL_QUEUE' as const }
              ]
            },
            {
              id: 'CANDIDATES',
              label: 'Candidates & Talent',
              icon: <UserCheck size={16} />,
              defaultTab: 'CANDIDATES' as const,
              submenus: [
                { id: 'cand_search', label: 'Search & Invite Talent', tab: 'CANDIDATES' as const, subTab: 'SEARCH_INVITE' as const },
                { id: 'cand_verif', label: 'Verification Requests', tab: 'CANDIDATES' as const, subTab: 'VERIFICATIONS' as const },
                { id: 'cand_inv', label: 'Candidate Invitations', tab: 'CANDIDATES' as const, subTab: 'INVITATIONS' as const }
              ]
            },
            {
              id: 'EMPLOYEES',
              label: 'Workforce & Reviews',
              icon: <Briefcase size={16} />,
              defaultTab: 'EMPLOYEES' as const,
              submenus: [
                { id: 'emp_dir', label: 'Company Directory', tab: 'EMPLOYEES' as const, subTab: 'DIRECTORY' as const },
                { id: 'emp_perf', label: 'Performance & Feedback', tab: 'EMPLOYEES' as const, subTab: 'PERFORMANCE' as const },
                { id: 'emp_term', label: 'Separation & Notice', tab: 'EMPLOYEES' as const, subTab: 'TERMINATIONS' as const }
              ]
            },
            {
              id: 'PAYROLL',
              label: 'Payroll & Payments',
              icon: <CreditCard size={16} />,
              defaultTab: 'PAYROLL' as const,
              submenus: [
                { id: 'pay_disb', label: 'Salary Disbursement Queue', tab: 'PAYROLL' as const, subTab: 'DISBURSEMENT' as const },
                { id: 'pay_hist', label: 'Payroll History & Logs', tab: 'PAYROLL' as const, subTab: 'HISTORY' as const }
              ]
            },
            {
              id: 'ANALYTICS',
              label: 'Reports & Analytics',
              icon: <TrendingUp size={16} />,
              defaultTab: 'ANALYTICS' as const,
              submenus: [
                { id: 'ana_hiring', label: 'Hiring Telemetry', tab: 'ANALYTICS' as const, subTab: 'HIRING' as const },
                { id: 'ana_emp', label: 'Workforce Retention', tab: 'ANALYTICS' as const, subTab: 'EMPLOYEES' as const },
                { id: 'ana_pay', label: 'Payroll Cost Breakdown', tab: 'ANALYTICS' as const, subTab: 'PAYROLL' as const },
                { id: 'ana_perf', label: 'Performance Analytics', tab: 'ANALYTICS' as const, subTab: 'PERFORMANCE' as const }
              ]
            },
            {
              id: 'CHAT',
              label: 'Messages & Team Chat',
              icon: <MessageSquare size={16} />,
              defaultTab: 'CHAT' as const,
              badge: 'Live',
              submenus: [
                { id: 'chat_all', label: 'Corporate Channels & DMs', tab: 'CHAT' as const }
              ]
            },
            {
              id: 'SETTINGS',
              label: 'Settings & Security',
              icon: <Settings size={16} />,
              defaultTab: 'SETTINGS' as const,
              submenus: [
                { id: 'set_acc', label: 'Account & Profile', tab: 'SETTINGS' as const, subTab: 'ACCOUNT' as const },
                { id: 'set_sec', label: '2FA & Active Sessions', tab: 'SETTINGS' as const, subTab: 'SECURITY' as const },
                { id: 'set_notif', label: 'Notifications & Alerts', tab: 'SETTINGS' as const, subTab: 'NOTIFICATIONS' as const },
                { id: 'set_integ', label: 'Integrations & Webhooks', tab: 'SETTINGS' as const, subTab: 'INTEGRATIONS' as const },
                { id: 'set_bill', label: 'Billing & Invoices', tab: 'SETTINGS' as const, subTab: 'BILLING' as const }
              ]
            },
            {
              id: 'STRATEGY',
              label: 'Strategy & AI Copilot',
              icon: <Sparkles size={16} />,
              defaultTab: 'STRATEGY' as const,
              badge: tasks.length > 0 ? `${tasks.length}` : undefined,
              submenus: [
                { id: 'strat_tasks', label: 'Sprint Roadmap Goals', tab: 'STRATEGY' as const },
                { id: 'strat_copilot', label: 'AI Strategy Copilot', tab: 'STRATEGY' as const }
              ]
            }
          ].map((group) => {
            const isGroupActive = activeTab === group.defaultTab;
            const isOpen = Boolean(pinnedMenus[group.id] || hoveredMenuId === group.id);
            const isPinned = Boolean(pinnedMenus[group.id]);

            return (
              <div
                key={group.id}
                className="company-menu-group"
                onMouseEnter={() => setHoveredMenuId(group.id)}
                onMouseLeave={() => {
                  if (hoveredMenuId === group.id) setHoveredMenuId(null);
                }}
              >
                <button
                  className={`company-nav-btn ${isGroupActive ? 'active' : ''}`}
                  onClick={() => {
                    togglePin(group.id);
                    setActiveTab(group.defaultTab);
                  }}
                  title={isPinned ? 'Menu is Stable (Pinned). Click to unpin.' : 'Hover opens submenus. Click to pin open.'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {group.icon}
                    <span>{group.label}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {group.badge && (
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38BDF8',
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        fontWeight: 800
                      }}>
                        {group.badge}
                      </span>
                    )}
                    <span
                      className={`company-pin-btn ${isPinned ? 'pinned' : ''}`}
                      onClick={(e) => togglePin(group.id, e)}
                      title={isPinned ? 'Pinned Open. Click to unpin.' : 'Click to pin open.'}
                      style={{ color: isPinned ? '#38BDF8' : '#64748B' }}
                    >
                      <Pin size={11} style={{ transform: isPinned ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                    </span>
                    <ChevronDown
                      size={13}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        opacity: 0.8
                      }}
                    />
                  </div>
                </button>

                {/* Submenu List */}
                {isOpen && (
                  <div className="company-submenu-list">
                    {group.submenus.map((sub: any) => {
                      const isSubActive = activeTab === sub.tab && (
                        (sub.tab === 'PROFILE' && sub.subTab === profileSubTab) ||
                        (sub.tab === 'RECRUITERS' && sub.subTab === recruiterSubTab) ||
                        (sub.tab === 'CANDIDATES' && sub.subTab === candidateSubTab) ||
                        (sub.tab === 'EMPLOYEES' && sub.subTab === employeeSubTab) ||
                        (sub.tab === 'PAYROLL' && sub.subTab === payrollSubTab) ||
                        (sub.tab === 'ANALYTICS' && sub.subTab === analyticsSubTab) ||
                        (sub.tab === 'SETTINGS' && sub.subTab === settingsSubTab) ||
                        (sub.tab === 'DASHBOARD') ||
                        (sub.tab === 'CHAT') ||
                        (sub.tab === 'STRATEGY')
                      );

                      return (
                        <button
                          key={sub.id}
                          className={`company-submenu-item ${isSubActive ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedMenus(prev => ({ ...prev, [group.id]: true }));
                            setActiveTab(sub.tab);
                            if (sub.subTab) {
                              if (sub.tab === 'PROFILE') setProfileSubTab(sub.subTab);
                              if (sub.tab === 'RECRUITERS') setRecruiterSubTab(sub.subTab);
                              if (sub.tab === 'CANDIDATES') setCandidateSubTab(sub.subTab);
                              if (sub.tab === 'EMPLOYEES') setEmployeeSubTab(sub.subTab);
                              if (sub.tab === 'PAYROLL') setPayrollSubTab(sub.subTab);
                              if (sub.tab === 'ANALYTICS') setAnalyticsSubTab(sub.subTab);
                              if (sub.tab === 'SETTINGS') setSettingsSubTab(sub.subTab);
                            }
                          }}
                        >
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(56, 189, 248, 0.2)', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '11px', fontWeight: 800 }}>
              {user?.email?.charAt(0).toUpperCase() || 'M'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Company Director</div>
              <div style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => logout('/admin-login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '7px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={13} /> Exit Portal
          </button>
        </div>
      </aside>

      {/* ── Main Executive Workspace ── */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {/* Workspace Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeTab === 'DASHBOARD' && '📊 Executive Dashboard & Telemetry'}
              {activeTab === 'PROFILE' && '🏢 Enterprise Corporate Profile & Badges'}
              {activeTab === 'RECRUITERS' && '👥 HR Recruiter Management & Badge Governance'}
              {activeTab === 'CANDIDATES' && '🎯 Candidate Sourcing, Onboarding & Verifications'}
              {activeTab === 'EMPLOYEES' && '💼 Workforce Directory & Quarterly Performance'}
              {activeTab === 'PAYROLL' && '💳 Corporate Payroll & Salary Disbursements'}
              {activeTab === 'ANALYTICS' && '📈 Telemetry Reports & Multi-Domain Analytics'}
              {activeTab === 'CHAT' && '💬 Enterprise Team Chat & Direct Messaging'}
              {activeTab === 'SETTINGS' && '⚙️ Company Settings & 2FA Security'}
              {activeTab === 'STRATEGY' && '🚀 Sprint Goals & AI Strategy Copilot'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              Multi-tenant isolated workspace | Company: <strong style={{ color: '#38BDF8' }}>{dashboard?.companyName || 'Enterprise'}</strong> | Plan: <strong style={{ color: '#34D399' }}>{dashboard?.subscriptionPlan || 'ENTERPRISE_TIER'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowInviteHrModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#2563EB',
                border: 'none',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Users size={13} /> + Invite HR
            </button>
            <button
              onClick={() => setShowInviteCandModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10B981',
                borderRadius: '8px',
                color: '#34D399',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <UserCheck size={13} /> + Invite Candidate
            </button>
            <button
              onClick={fetchCompanyData}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Sync Data
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 2: EXECUTIVE DASHBOARD OVERVIEW
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'DASHBOARD' && (
          <div>
            {/* Welcome Greeting Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.85) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '16px',
              padding: '22px 26px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.2)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', color: '#38BDF8', fontWeight: 800, marginBottom: '6px' }}>
                  <Sparkles size={12} /> ENTERPRISE OPERATING SYSTEM
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#F8FAFC', margin: '0 0 6px' }}>
                  Welcome back, {user?.email?.split('@')[0] || 'Executive'}!
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
                  Here is the live corporate status for <strong style={{ color: '#38BDF8' }}>{dashboard?.companyName || 'your enterprise'}</strong> today. All hiring pipelines, verifications, and payroll queues are active.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowShareableLinksModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    color: '#38BDF8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={13} /> Share Onboarding Links
                </button>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="cmp-kpi-grid">
              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>TOTAL EMPLOYEES</span>
                  <Users size={18} color="#38BDF8" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#F8FAFC' }}>
                  {dashboard?.totalEmployees ?? employeesList.filter(e => e.status === 'ACTIVE').length}
                </div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                  <TrendingUp size={12} /> +8.4% month-over-month
                </div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>ACTIVE JOB OPENINGS</span>
                  <Briefcase size={18} color="#60A5FA" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#F8FAFC' }}>
                  {dashboard?.activeJobsCount ?? dashboard?.totalJobs ?? 6}
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA', marginTop: '6px', fontWeight: 700 }}>
                  Live on Marketplace
                </div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>PENDING VERIFICATIONS</span>
                  <Clock size={18} color="#F59E0B" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B' }}>
                  {dashboard?.pendingApprovalsCount ?? 3}
                </div>
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '6px', fontWeight: 700 }}>
                  Action required by Director
                </div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>VERIFIED HR RECRUITERS</span>
                  <ShieldCheck size={18} color="#10B981" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#10B981' }}>
                  {dashboard?.totalHrs ?? hrTeam.length}
                </div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px', fontWeight: 700 }}>
                  Official Badges Authorized
                </div>
              </div>
            </div>

            {/* Main Visual Row: Hiring Trend Area Chart + Company Overview Snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Hiring Trend SVG Chart */}
              <div className="cmp-chart-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={16} color="#38BDF8" /> Hiring & Pipeline Growth Trend
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                      Monthly candidate applications vs verified hires (2026)
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38BDF8' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8' }} /> Applications
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> Verified Hires
                    </span>
                  </div>
                </div>

                {/* Responsive SVG Area / Line Chart */}
                <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                  <svg viewBox="0 0 500 180" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="gradHires" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    <line x1="20" y1="30" x2="490" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="20" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="20" y1="120" x2="490" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="20" y1="160" x2="490" y2="160" stroke="rgba(255,255,255,0.12)" />

                    {/* Area fill for applications */}
                    <polygon
                      points="30,120 85,105 140,92 195,100 250,70 305,58 360,65 415,44 470,22 470,160 30,160"
                      fill="url(#gradApps)"
                    />
                    {/* Line for applications */}
                    <polyline
                      points="30,120 85,105 140,92 195,100 250,70 305,58 360,65 415,44 470,22"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="3"
                    />

                    {/* Area fill for hires */}
                    <polygon
                      points="30,150 85,145 140,140 195,146 250,136 305,128 360,132 415,124 470,110 470,160 30,160"
                      fill="url(#gradHires)"
                    />
                    {/* Line for hires */}
                    <polyline
                      points="30,150 85,145 140,140 195,146 250,136 305,128 360,132 415,124 470,110"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                    />

                    {/* Data Points */}
                    {hiringTrendData.map((pt: any, i: number) => {
                      const x = 30 + (i * 55);
                      const y = Math.max(20, 160 - (pt.applications || 20) * 1.5);
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="4" fill="#38BDF8" stroke="#0B1426" strokeWidth="2" />
                          <text x={x} y="174" fill="#64748B" fontSize="10" textAnchor="middle">{pt.month || pt.m}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Company Overview Snapshot Card */}
              <div className="cmp-chart-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(37, 99, 235, 0.2)',
                      border: '1px solid #38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38BDF8'
                    }}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#F8FAFC', margin: 0 }}>
                        {dashboard?.companyName || 'Enterprise Corporate Group'}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {dashboard?.tagline || 'Leading Next-Gen AI & Engineering Enterprise'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditProfileModal(true)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      color: '#38BDF8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit3 size={11} /> Edit Profile
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Industry Sector</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0', marginTop: '2px' }}>
                      {dashboard?.industry || 'Technology & Software'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Verified Badge</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={13} /> Official Partner
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Headquarters</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0', marginTop: '2px' }}>
                      {dashboard?.location || 'San Francisco, CA'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Subscription Tier</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8', marginTop: '2px' }}>
                      {dashboard?.subscriptionPlan || 'Enterprise SaaS'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setActiveTab('PROFILE')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(37, 99, 235, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '8px',
                      color: '#38BDF8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Full Profile Specs →
                  </button>
                  <button
                    onClick={() => setActiveTab('ANALYTICS')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      color: '#34D399',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    View Analytics Telemetry →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 3: COMPANY PROFILE (Overview, Contact, Branding, Sub, Verif)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PROFILE' && (
          <div>
            {/* Subtabs Header */}
            <div className="cmp-subtabs-nav">
              {[
                { id: 'OVERVIEW', label: 'Company Overview', icon: <Building2 size={14} /> },
                { id: 'CONTACT', label: 'Contact & Location', icon: <MapPin size={14} /> },
                { id: 'BRANDING', label: 'Branding & Identity', icon: <Sparkles size={14} /> },
                { id: 'SUBSCRIPTION', label: 'Subscription Plan', icon: <CreditCard size={14} /> },
                { id: 'VERIFICATION', label: 'Verification Badge', icon: <ShieldCheck size={14} /> }
              ].map(sub => (
                <button
                  key={sub.id}
                  className={`cmp-subtab-btn ${profileSubTab === sub.id ? 'active' : ''}`}
                  onClick={() => setProfileSubTab(sub.id as any)}
                >
                  {sub.icon}
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>

            {/* Subtab 1: Overview */}
            {profileSubTab === 'OVERVIEW' && (
              <div className="company-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Corporate Profile & Overview
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                      Public marketplace information for candidates and verified partners.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEditProfileModal(true)}
                    style={{
                      padding: '8px 16px',
                      background: '#2563EB',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit3 size={13} /> Edit Profile Data
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>LEGAL ENTITY NAME</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', marginTop: '4px' }}>
                      {dashboard?.companyName || 'Enterprise Corporate Group Inc.'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>CORPORATE TAGLINE</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8', marginTop: '4px' }}>
                      {dashboard?.tagline || 'Leading Next-Gen AI & Engineering Enterprise'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>PRIMARY INDUSTRY</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      {dashboard?.industry || 'Technology & Artificial Intelligence'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>WORKFORCE SIZE</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      50 - 250 Employees (Enterprise Scale)
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>FOUNDED YEAR</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      2021
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>OFFICIAL WEBSITE</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={13} /> {dashboard?.website || 'https://hiremind.ai'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '18px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, marginBottom: '6px' }}>ABOUT THE ENTERPRISE</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6 }}>
                    HireMind Enterprise specializes in deep tech, artificial intelligence, and autonomous software engineering. Operating across North America, Europe, and Asia-Pacific, we connect world-class engineering talent with mission-critical projects.
                  </p>
                </div>
              </div>
            )}

            {/* Subtab 2: Contact & Location */}
            {profileSubTab === 'CONTACT' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#38BDF8" /> Corporate Contact & Registered Headquarters
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Primary Corporate Email</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#38BDF8" /> {dashboard?.email || user?.email || 'admin@enterprise.com'}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Executive Phone Number</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="#38BDF8" /> +1 (555) 382-9900
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>HQ Address</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      500 Howard Street, Suite 400
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>City & State</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      San Francisco, CA 94105
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Country</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      United States
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Timezone</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
                      PST (UTC-8)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 3: Branding */}
            {profileSubTab === 'BRANDING' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#38BDF8" /> Brand Identity, Logos & Social Presence
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div style={{ padding: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px', fontWeight: 700 }}>COMPANY LOGO</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 900, fontSize: '22px' }}>
                        {dashboard?.companyName?.charAt(0) || 'H'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>Primary Corporate Vector</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>PNG / SVG - 512x512 recommended</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px', fontWeight: 700 }}>BRAND ACCENT PALETTE</div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#2563EB', border: '1px solid #FFF' }} title="#2563EB" />
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#38BDF8', border: '1px solid #FFF' }} title="#38BDF8" />
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#10B981', border: '1px solid #FFF' }} title="#10B981" />
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0F172A', border: '1px solid #FFF' }} title="#0F172A" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 4: Subscription Plan */}
            {profileSubTab === 'SUBSCRIPTION' && (
              <div className="company-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Active Subscription & SaaS Licensing Tier
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                      Manage enterprise seats, recruiter allocations, and billing cycles.
                    </p>
                  </div>
                  <span className="cmp-badge cmp-badge-success">
                    <CheckCircle2 size={12} /> ACTIVE LICENSE
                  </span>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(15,23,42,0.6) 100%)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', padding: '22px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 800, letterSpacing: '0.05em' }}>ENTERPRISE UNLIMITED TIER</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#F8FAFC', marginTop: '4px' }}>$499 <span style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 500 }}>/ month</span></div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Renews on October 1, 2026 | Billed Annually</div>
                    </div>
                    <button
                      style={{
                        padding: '10px 18px',
                        background: '#2563EB',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#FFF',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Manage SaaS Subscription
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>HR Recruiter Seats</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>{hrTeam.length} / 25 Used</div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Active Job Postings</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>Unlimited</div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Candidate Talent Discovery</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>Enabled (Global Pool)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 5: Verification Badge */}
            {profileSubTab === 'VERIFICATION' && (
              <div className="company-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                    <Award size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Official Verified Enterprise Partner Status
                    </h3>
                    <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 700 }}>
                      Cryptographically Validated & Registered on TalentIQ Platform
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '20px' }}>
                  Your enterprise has met all platform compliance and legal verification requirements. HR Recruiters authorized by your company carry your verified achievement badge, ensuring exclusive multi-tenant authorization and candidate trust.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Corporate Registration ID</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>REG-US-CA-2026-99382</div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Domain Verification</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> DNS TXT Verified
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Badge Issuance Date</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>January 15, 2026</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 4: HR RECRUITER ROSTER & BADGE GOVERNANCE
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'RECRUITERS' && (
          <div>
            {/* Subtabs for HR Recruiter Section */}
            <div className="cmp-subtabs-nav">
              <button
                className={`cmp-subtab-btn ${recruiterSubTab === 'ROSTER' ? 'active' : ''}`}
                onClick={() => setRecruiterSubTab('ROSTER')}
              >
                <Users size={14} /> <span>Active Recruiter Roster</span>
              </button>
              <button
                className={`cmp-subtab-btn ${recruiterSubTab === 'INVITATIONS' ? 'active' : ''}`}
                onClick={() => setRecruiterSubTab('INVITATIONS')}
              >
                <Mail size={14} /> <span>Pending Onboarding Invites</span>
              </button>
              <button
                className={`cmp-subtab-btn ${recruiterSubTab === 'APPROVAL_QUEUE' ? 'active' : ''}`}
                onClick={() => setRecruiterSubTab('APPROVAL_QUEUE')}
              >
                <ShieldCheck size={14} /> <span>Badge Tag Approval Queue</span>
              </button>
            </div>

            {recruiterSubTab === 'ROSTER' && (
              <div className="cmp-table-container">
                {/* Header with Search and Filter Pills */}
                <div className="cmp-table-header">
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Active HR Recruiter Team Roster
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                      Only company-verified recruiters can view and manage candidates or post openings.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                      <input
                        type="text"
                        placeholder="Search recruiters..."
                        value={recruiterSearch}
                        onChange={(e) => setRecruiterSearch(e.target.value)}
                        style={{ padding: '6px 12px 6px 30px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', color: '#FFF', fontSize: '12px' }}
                      />
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['ALL', 'VERIFIED', 'PENDING'].map(pill => (
                        <button
                          key={pill}
                          onClick={() => setRecruiterFilter(pill as any)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: recruiterFilter === pill ? '#2563EB' : 'rgba(255,255,255,0.06)',
                            color: recruiterFilter === pill ? '#FFF' : '#94A3B8',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowInviteHrModal(true)}
                      style={{
                        padding: '6px 14px',
                        background: '#2563EB',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#FFF',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <PlusCircle size={13} /> + Invite HR
                    </button>
                  </div>
                </div>

                {/* Table */}
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>Recruiter</th>
                      <th>Designation</th>
                      <th>Verification Badge</th>
                      <th>Work Email</th>
                      <th style={{ textAlign: 'right' }}>Badge Governance Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHrs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No recruiters found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredHrs.map(hr => (
                        <tr key={hr.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '12px' }}>
                                {hr.firstName?.charAt(0) || 'H'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#F8FAFC' }}>{hr.firstName} {hr.lastName}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>Joined 2026</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: '#CBD5E1' }}>{hr.designation || 'Talent Acquisition Specialist'}</td>
                          <td>
                            {hr.companyVerified ? (
                              <span className="cmp-badge cmp-badge-success">
                                <ShieldCheck size={12} /> VERIFIED TALENT PARTNER
                              </span>
                            ) : (
                              <span className="cmp-badge cmp-badge-warning">
                                <AlertCircle size={12} /> UNVERIFIED / PENDING
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#94A3B8' }}>{hr.email}</td>
                          <td style={{ textAlign: 'right' }}>
                            {hr.companyVerified ? (
                              <button
                                onClick={() => handleToggleHrBadge(hr)}
                                disabled={badgeActionHrId === hr.id}
                                style={{
                                  padding: '5px 12px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  color: '#F87171',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {badgeActionHrId === hr.id ? 'Updating...' : 'Revoke Badge'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleHrBadge(hr)}
                                disabled={badgeActionHrId === hr.id}
                                style={{
                                  padding: '5px 14px',
                                  background: 'linear-gradient(135deg, #10B981, #059669)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#FFF',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                }}
                              >
                                {badgeActionHrId === hr.id ? 'Awarding...' : '⭐ Award Verified Badge'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {recruiterSubTab === 'INVITATIONS' && (
              <div className="cmp-table-container">
                <div className="cmp-table-header">
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Corporate Direct Invitations Roster
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                      Invitations dispatched to HR recruiters with auto-badge configuration.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInviteHrModal(true)}
                    style={{
                      padding: '6px 14px',
                      background: '#2563EB',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Send New Invite
                  </button>
                </div>

                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Target Role</th>
                      <th>Designation</th>
                      <th>Auto-Badge</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.filter(i => i.role === 'ROLE_HR').length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No pending HR invitations. Click "+ Send New Invite" to invite your first recruiter.
                        </td>
                      </tr>
                    ) : (
                      invitations.filter(i => i.role === 'ROLE_HR').map(inv => (
                        <tr key={inv.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#F8FAFC' }}>{inv.recipientName || 'Invited Recruiter'}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{inv.email}</div>
                          </td>
                          <td><span className="cmp-badge cmp-badge-info">HR Recruiter</span></td>
                          <td style={{ color: '#CBD5E1' }}>{inv.designation || '-'}</td>
                          <td>
                            {inv.autoVerifyBadge ? (
                              <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <ShieldCheck size={12} /> Auto-Award
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '11px' }}>Manual</span>
                            )}
                          </td>
                          <td>
                            <span className={`cmp-badge ${inv.status === 'ACCEPTED' ? 'cmp-badge-success' : inv.status === 'PENDING' ? 'cmp-badge-info' : 'cmp-badge-danger'}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => copyToClipboard(inv.inviteLink, `inv_${inv.id}`)}
                                title="Copy Link"
                                style={{ padding: '5px 8px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', color: '#38BDF8', cursor: 'pointer' }}
                              >
                                {copiedKey === `inv_${inv.id}` ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              {inv.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleResendInvite(inv.id)}
                                    title="Resend Invitation Email"
                                    style={{ padding: '5px 8px', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', color: '#60A5FA', cursor: 'pointer' }}
                                  >
                                    <Send size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    title="Revoke"
                                    style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#F87171', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {recruiterSubTab === 'APPROVAL_QUEUE' && (
              <CompanyTagApprovalQueue />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 5 & SCREEN 6: CANDIDATES (Search & Invite + Verifications)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'CANDIDATES' && (
          <div>
            {/* Subtabs for Candidates Section */}
            <div className="cmp-subtabs-nav">
              <button
                className={`cmp-subtab-btn ${candidateSubTab === 'SEARCH_INVITE' ? 'active' : ''}`}
                onClick={() => setCandidateSubTab('SEARCH_INVITE')}
              >
                <UserCheck size={14} /> <span>Search & Invite Talent (Screen 5)</span>
              </button>
              <button
                className={`cmp-subtab-btn ${candidateSubTab === 'VERIFICATIONS' ? 'active' : ''}`}
                onClick={() => setCandidateSubTab('VERIFICATIONS')}
              >
                <ShieldCheck size={14} /> <span>Verification Requests Queue (Screen 6)</span>
              </button>
              <button
                className={`cmp-subtab-btn ${candidateSubTab === 'INVITATIONS' ? 'active' : ''}`}
                onClick={() => setCandidateSubTab('INVITATIONS')}
              >
                <Mail size={14} /> <span>Sent Candidate Invitations</span>
              </button>
            </div>

            {/* SCREEN 5: SEARCH & INVITE TALENT */}
            {candidateSubTab === 'SEARCH_INVITE' && (
              <div>
                <div className="cmp-table-container" style={{ marginBottom: '24px' }}>
                  <div className="cmp-table-header">
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                        Candidate Discovery & Direct Corporate Invites
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                        Browse top platform engineering talent and invite them as HR Recruiters or Employees.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={fetchCandidatePool}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '6px',
                          color: '#38BDF8',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={11} /> Refresh Talent Pool
                      </button>
                      <button
                        onClick={() => setShowInviteCandModal(true)}
                        style={{
                          padding: '6px 14px',
                          background: '#10B981',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFF',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <PlusCircle size={13} /> + Direct Email Invite
                      </button>
                    </div>
                  </div>

                  {candidatePool.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                      <UserCheck size={36} color="#38BDF8" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>Talent Pool Ready for Discovery</div>
                      <div style={{ fontSize: '12px', marginTop: '4px', marginBottom: '14px' }}>
                        Click below to discover candidates looking for enterprise engineering opportunities.
                      </div>
                      <button
                        onClick={fetchCandidatePool}
                        style={{ padding: '8px 18px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Load Talent Pool
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', padding: '20px' }}>
                      {candidatePool.map(c => (
                        <div key={c.id} style={{ background: 'rgba(11, 20, 38, 0.8)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '14px' }}>
                                {c.firstName?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#F8FAFC', fontSize: '14px' }}>{c.firstName} {c.lastName}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>{c.email}</div>
                              </div>
                            </div>
                            <span className="cmp-badge cmp-badge-success">OPEN TO WORK</span>
                          </div>

                          <div style={{ fontSize: '11px', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.08)', padding: '6px 10px', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(56,189,248,0.2)' }}>
                            <strong>Skills:</strong> {c.skills || 'Full-Stack Software Engineering, React, Node.js, Cloud'}
                          </div>

                          {/* Dual Action Buttons from Reference Screen 5 */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setInviteHrEmail(c.email);
                                setInviteHrName(`${c.firstName} ${c.lastName}`.trim());
                                setShowInviteHrModal(true);
                              }}
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                background: 'rgba(37, 99, 235, 0.2)',
                                border: '1px solid #38BDF8',
                                borderRadius: '6px',
                                color: '#38BDF8',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              + Invite as HR
                            </button>
                            <button
                              onClick={() => {
                                setInviteCandEmail(c.email);
                                setInviteCandName(`${c.firstName} ${c.lastName}`.trim());
                                setShowInviteCandModal(true);
                              }}
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                background: '#10B981',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#FFF',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              + Invite as Employee
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 6: CANDIDATE VERIFICATION REQUESTS QUEUE */}
            {candidateSubTab === 'VERIFICATIONS' && (
              <div>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '6px' }}>
                  {['PENDING', 'APPROVED', 'REJECTED'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setCandVerifFilter(filter as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: candVerifFilter === filter ? '#2563EB' : 'rgba(255,255,255,0.06)',
                        color: candVerifFilter === filter ? '#FFF' : '#94A3B8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {filter} Requests
                    </button>
                  ))}
                </div>
                <CompanyTagApprovalQueue />
              </div>
            )}

            {/* SENT INVITATIONS */}
            {candidateSubTab === 'INVITATIONS' && (
              <div className="cmp-table-container">
                <div className="cmp-table-header">
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Candidate Corporate Direct Invitations
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                      Track candidate pipeline invitations with auto-verified badge links.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInviteCandModal(true)}
                    style={{
                      padding: '6px 14px',
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Direct Candidate Invite
                  </button>
                </div>

                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Applied Role</th>
                      <th>Auto-Badge</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.filter(i => i.role === 'ROLE_CANDIDATE').length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No candidate invitations sent yet. Click "+ Direct Candidate Invite" to invite your first candidate.
                        </td>
                      </tr>
                    ) : (
                      invitations.filter(i => i.role === 'ROLE_CANDIDATE').map(inv => (
                        <tr key={inv.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#F8FAFC' }}>{inv.recipientName || 'Candidate'}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{inv.email}</div>
                          </td>
                          <td style={{ color: '#CBD5E1' }}>{inv.designation || 'Software Engineer'}</td>
                          <td>
                            {inv.autoVerifyBadge ? (
                              <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <ShieldCheck size={12} /> Auto-Award
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '11px' }}>Manual</span>
                            )}
                          </td>
                          <td>
                            <span className={`cmp-badge ${inv.status === 'ACCEPTED' ? 'cmp-badge-success' : 'cmp-badge-info'}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => copyToClipboard(inv.inviteLink, `inv_${inv.id}`)}
                                style={{ padding: '5px 8px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', color: '#38BDF8', cursor: 'pointer' }}
                              >
                                {copiedKey === `inv_${inv.id}` ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              {inv.status === 'PENDING' && (
                                <button
                                  onClick={() => handleResendInvite(inv.id)}
                                  title="Resend Invitation Email"
                                  style={{ padding: '5px 8px', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', color: '#60A5FA', cursor: 'pointer' }}
                                >
                                  <Send size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#F87171', cursor: 'pointer' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 7 & SCREEN 9: EMPLOYEES (Directory + Performance & Reviews)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'EMPLOYEES' && (
          <div>
            {/* Subtabs for Workforce & Performance */}
            <div className="cmp-subtabs-nav">
              <button
                className={`cmp-subtab-btn ${employeeSubTab === 'DIRECTORY' ? 'active' : ''}`}
                onClick={() => setEmployeeSubTab('DIRECTORY')}
              >
                <Users size={14} /> <span>Company Directory (Screen 7)</span>
              </button>
              <button
                className={`cmp-subtab-btn ${employeeSubTab === 'PERFORMANCE' ? 'active' : ''}`}
                onClick={() => setEmployeeSubTab('PERFORMANCE')}
              >
                <Star size={14} /> <span>Performance & Feedback (Screen 9)</span>
              </button>
              <button
                className={`cmp-subtab-btn ${employeeSubTab === 'TERMINATIONS' ? 'active' : ''}`}
                onClick={() => setEmployeeSubTab('TERMINATIONS')}
              >
                <AlertCircle size={14} /> <span>Separation & Notice Reviews</span>
              </button>
            </div>

            {/* SCREEN 7: COMPANY DIRECTORY */}
            {employeeSubTab === 'DIRECTORY' && (
              <div className="cmp-table-container">
                <div className="cmp-table-header">
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      Verified Company Employees Directory
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                      All actively employed, ex-employees, and terminated staff members.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                      <input
                        type="text"
                        placeholder="Search workforce..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        style={{ padding: '6px 12px 6px 30px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', color: '#FFF', fontSize: '12px' }}
                      />
                    </div>

                    {/* Filter Pills from Reference Screen 7 */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { id: 'WORKING', label: 'Working' },
                        { id: 'EX', label: 'Ex-Employees' },
                        { id: 'TERMINATED', label: 'Terminated' }
                      ].map(pill => (
                        <button
                          key={pill.id}
                          onClick={() => setEmpDirectoryFilter(pill.id as any)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: empDirectoryFilter === pill.id ? '#2563EB' : 'rgba(255,255,255,0.06)',
                            color: empDirectoryFilter === pill.id ? '#FFF' : '#94A3B8',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Emp Code</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Base Salary</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No employees found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map(emp => (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '12px' }}>
                                {emp.candidateName?.charAt(0) || 'E'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#F8FAFC' }}>{emp.candidateName}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>{emp.candidateEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: '#38BDF8', fontWeight: 700 }}>{emp.employeeCode || `EMP-${emp.id}`}</td>
                          <td style={{ color: '#CBD5E1' }}>{emp.department || 'Engineering'}</td>
                          <td style={{ color: '#CBD5E1' }}>{emp.jobTitle || 'Software Engineer'}</td>
                          <td style={{ color: '#10B981', fontWeight: 700 }}>${(emp.baseSalary || 115000).toLocaleString()}</td>
                          <td>
                            <span className={`cmp-badge ${emp.status === 'EX_EMPLOYEE' ? 'cmp-badge-warning' : emp.status === 'TERMINATED' ? 'cmp-badge-danger' : 'cmp-badge-success'}`}>
                              {emp.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setShowEmployeeModal(true);
                              }}
                              style={{
                                padding: '5px 12px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '6px',
                                color: '#38BDF8',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} style={{ display: 'inline', marginRight: '4px' }} /> View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SCREEN 9: PERFORMANCE & FEEDBACK */}
            {employeeSubTab === 'PERFORMANCE' && (
              <div>
                {/* Performance Header KPI Cards */}
                <div className="cmp-kpi-grid">
                  <div className="cmp-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                      <span>AVG COMPANY RATING</span>
                      <Star size={18} color="#F59E0B" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B' }}>
                      {performanceStats?.averageRating ? `${performanceStats.averageRating.toFixed(1)} / 5.0` : '4.6 / 5.0'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px', fontWeight: 700 }}>
                      ⭐ Top 10% Industry Percentile
                    </div>
                  </div>

                  <div className="cmp-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                      <span>REVIEWS COMPLETED</span>
                      <CheckCircle2 size={18} color="#10B981" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#F8FAFC' }}>
                      {performanceStats?.totalReviews ?? performanceReviews.length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '6px', fontWeight: 700 }}>
                      Q3 2026 Cycle
                    </div>
                  </div>

                  <div className="cmp-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                      <span>HIGH PERFORMERS (4.5+)</span>
                      <Award size={18} color="#38BDF8" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#38BDF8' }}>
                      {performanceStats?.ratingDistribution?.['5_star'] || 8}
                    </div>
                    <div style={{ fontSize: '11px', color: '#34D399', marginTop: '6px', fontWeight: 700 }}>
                      Promotion Candidates
                    </div>
                  </div>

                  <div className="cmp-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                      <span>NEEDS IMPROVEMENT</span>
                      <AlertCircle size={18} color="#F87171" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#F87171' }}>
                      {performanceStats?.ratingDistribution?.['1_star'] || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                      PIP Guidance Active
                    </div>
                  </div>
                </div>

                {/* Multi-Bar Performance Trend SVG Chart */}
                <div className="cmp-chart-box" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                        Department Performance Ratings (Multi-Bar Comparison)
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                        Average ratings across Technical Skills, Leadership, and Communication by Department
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38BDF8' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38BDF8' }} /> Tech Skills
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }} /> Leadership
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' }} /> Communication
                      </span>
                    </div>
                  </div>

                  {/* Multi-bar Chart */}
                  <div style={{ width: '100%', height: '220px' }}>
                    <svg viewBox="0 0 500 180" style={{ width: '100%', height: '100%' }}>
                      {/* Grid lines */}
                      <line x1="30" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="30" y1="75" x2="480" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="30" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="30" y1="150" x2="480" y2="150" stroke="rgba(255,255,255,0.12)" />

                      {/* Departments */}
                      {[
                        { name: 'Engineering', tech: 140, lead: 125, comm: 120, x: 50 },
                        { name: 'Product', tech: 125, lead: 135, comm: 142, x: 140 },
                        { name: 'Sales', tech: 100, lead: 130, comm: 148, x: 230 },
                        { name: 'Marketing', tech: 110, lead: 120, comm: 140, x: 320 },
                        { name: 'HR Ops', tech: 115, lead: 135, comm: 145, x: 410 }
                      ].map((dept, i) => (
                        <g key={i}>
                          {/* Tech bar */}
                          <rect x={dept.x} y={150 - (dept.tech * 0.75)} width="16" height={dept.tech * 0.75} rx="3" fill="#38BDF8" />
                          {/* Lead bar */}
                          <rect x={dept.x + 18} y={150 - (dept.lead * 0.75)} width="16" height={dept.lead * 0.75} rx="3" fill="#10B981" />
                          {/* Comm bar */}
                          <rect x={dept.x + 36} y={150 - (dept.comm * 0.75)} width="16" height={dept.comm * 0.75} rx="3" fill="#F59E0B" />
                          {/* Dept Label */}
                          <text x={dept.x + 26} y="166" fill="#94A3B8" fontSize="10" textAnchor="middle">{dept.name}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Performance Reviews Roster Table */}
                <div className="cmp-table-container">
                  <div className="cmp-table-header">
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                        Quarterly Performance Reviews Log
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                        Executive reviews submitted with strengths, areas for improvement, and promotion recommendations.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNewReviewModal(true)}
                      style={{
                        padding: '7px 16px',
                        background: '#2563EB',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#FFF',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <PlusCircle size={13} /> + New Review
                    </button>
                  </div>

                  <table className="cmp-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Cycle</th>
                        <th>Overall Rating</th>
                        <th>Core Strengths</th>
                        <th>Promotion</th>
                        <th style={{ textAlign: 'right' }}>Reviewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceReviews.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                            No performance reviews submitted yet. Click "+ New Review" to submit your first quarterly review.
                          </td>
                        </tr>
                      ) : (
                        performanceReviews.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 800, color: '#F8FAFC' }}>{r.employeeName}</td>
                            <td style={{ color: '#38BDF8' }}>{r.reviewPeriod}</td>
                            <td>
                              <span style={{ color: '#F59E0B', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Star size={13} fill="#F59E0B" /> {r.overallRating} / 5.0
                              </span>
                            </td>
                            <td style={{ color: '#CBD5E1', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.strengths || 'Consistent delivery across sprint milestones.'}
                            </td>
                            <td>
                              {r.promotionRecommended ? (
                                <span className="cmp-badge cmp-badge-success">RECOMMENDED</span>
                              ) : (
                                <span className="cmp-badge cmp-badge-info">MAINTAIN</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', color: '#94A3B8' }}>
                              {r.reviewerName || 'Company Director'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEPARATION & NOTICE */}
            {employeeSubTab === 'TERMINATIONS' && (
              <CompanyEmployeeApprovalQueue initialSubTab="TERMINATIONS" />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 8: PAYROLL & PAYMENTS (Salary Disbursement Queue)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PAYROLL' && (
          <div>
            {/* Financial Summary Cards */}
            <div className="cmp-kpi-grid">
              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>TOTAL PAYROLL BUDGET</span>
                  <DollarSign size={18} color="#10B981" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#10B981' }}>
                  $248,500
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {payrollMonth} Allocation
                </div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>DISBURSED TO DATE</span>
                  <CreditCard size={18} color="#38BDF8" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#38BDF8' }}>
                  $184,200
                </div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px', fontWeight: 700 }}>
                  74% Disbursed
                </div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>PENDING APPROVAL</span>
                  <Clock size={18} color="#F59E0B" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B' }}>
                  $64,300
                </div>
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '6px', fontWeight: 700 }}>
                  Awaiting Director Sign-off
                </div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '8px' }}>
                  <span>PROCESSED RECORDS</span>
                  <CheckCircle size={18} color="#34D399" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#F8FAFC' }}>
                  {employeesList.length || 6} / {employeesList.length || 6}
                </div>
                <div style={{ fontSize: '11px', color: '#34D399', marginTop: '6px', fontWeight: 700 }}>
                  All Tax Forms Verified
                </div>
              </div>
            </div>

            {/* Reference Screen 8 Filters Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, marginRight: '4px' }}>Status:</span>
                {(['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setPayrollStatusFilter(st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: payrollStatusFilter === st ? '#2563EB' : 'rgba(255,255,255,0.06)',
                      color: payrollStatusFilter === st ? '#FFF' : '#94A3B8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Cycle:</span>
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '6px',
                    color: '#38BDF8',
                    fontSize: '12px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  <option value="September 2026">September 2026 (Active)</option>
                  <option value="August 2026">August 2026 (Completed)</option>
                  <option value="July 2026">July 2026 (Archived)</option>
                </select>
              </div>
            </div>

            {/* Embedded Company Payroll Queue Component */}
            <CompanyPayrollQueue initialFilter={payrollStatusFilter === 'PENDING' ? 'PENDING' : payrollStatusFilter === 'ALL' ? 'ALL' : 'COMPLETED'} key={payrollStatusFilter} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 10: REPORTS & ANALYTICS (Hiring, Workforce, Payroll, Perf)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ANALYTICS' && (
          <div>
            {/* Domain Subtabs from Reference Screen 10 */}
            <div className="cmp-subtabs-nav">
              <button
                className={`cmp-subtab-btn ${analyticsSubTab === 'HIRING' ? 'active' : ''}`}
                onClick={() => setAnalyticsSubTab('HIRING')}
              >
                <TrendingUp size={14} /> <span>Hiring Analytics</span>
              </button>
              <button
                className={`cmp-subtab-btn ${analyticsSubTab === 'EMPLOYEES' ? 'active' : ''}`}
                onClick={() => setAnalyticsSubTab('EMPLOYEES')}
              >
                <Users size={14} /> <span>Workforce & Retention</span>
              </button>
              <button
                className={`cmp-subtab-btn ${analyticsSubTab === 'PAYROLL' ? 'active' : ''}`}
                onClick={() => setAnalyticsSubTab('PAYROLL')}
              >
                <CreditCard size={14} /> <span>Payroll Breakdown</span>
              </button>
              <button
                className={`cmp-subtab-btn ${analyticsSubTab === 'PERFORMANCE' ? 'active' : ''}`}
                onClick={() => setAnalyticsSubTab('PERFORMANCE')}
              >
                <BarChart3 size={14} /> <span>Performance Telemetry</span>
              </button>
            </div>

            {/* 4 Domain Specific KPI Cards */}
            <div className="cmp-kpi-grid">
              <div className="cmp-kpi-card">
                <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>AVG TIME TO HIRE</div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: '#F8FAFC' }}>18 Days</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>-4 days vs benchmark</div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>OFFER ACCEPTANCE RATE</div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: '#38BDF8' }}>89.4%</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>+5.2% this quarter</div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>MONTHLY RETENTION</div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: '#10B981' }}>98.6%</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>Industry Leading</div>
              </div>

              <div className="cmp-kpi-card">
                <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>AVG COST PER HIRE</div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: '#F59E0B' }}>$1,420</div>
                <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '4px', fontWeight: 700 }}>-22% SaaS Optimized</div>
              </div>
            </div>

            {/* Visual Charts: Department Breakdown Bar Chart + Top Sources Donut Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Department Headcount Breakdown */}
              <div className="cmp-chart-box">
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} color="#38BDF8" /> Headcount & Open Positions by Department
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(analyticsData?.hiringByDepartment || [
                    { dept: 'Engineering & AI', count: 18, pct: 45, color: '#38BDF8' },
                    { dept: 'Product & Design', count: 8, pct: 20, color: '#60A5FA' },
                    { dept: 'Sales & Growth', count: 6, pct: 15, color: '#10B981' },
                    { dept: 'Operations & HR', count: 5, pct: 12, color: '#F59E0B' },
                    { dept: 'Legal & Finance', count: 3, pct: 8, color: '#A855F7' }
                  ]).map((item: any, idx: number) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{item.dept}</span>
                        <span style={{ color: '#94A3B8' }}>{item.count} team members ({item.pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Candidate Sources Donut Chart & Breakdown */}
              <div className="cmp-chart-box">
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#10B981" /> Top Candidate Inbound Sources
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  {/* SVG Donut Chart */}
                  <div style={{ width: '130px', height: '130px', flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#2563EB" strokeWidth="4" strokeDasharray="42, 100" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#38BDF8" strokeWidth="4" strokeDasharray="28, 100" strokeDashoffset="-42" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="18, 100" strokeDashoffset="-70" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="12, 100" strokeDashoffset="-88" />
                    </svg>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {(analyticsData?.topSources || [
                      { name: 'LinkedIn Inbound', pct: 42, color: '#2563EB' },
                      { name: 'Direct Career Portal', pct: 28, color: '#38BDF8' },
                      { name: 'Employee Referrals', pct: 18, color: '#10B981' },
                      { name: 'Tech Community Boards', pct: 12, color: '#F59E0B' }
                    ]).map((source: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: source.color || '#38BDF8' }} /> {source.name}
                        </span>
                        <strong style={{ color: '#F8FAFC' }}>{source.pct}%</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => showToast('Analytics CSV report generated and downloaded!')}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '8px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    color: '#38BDF8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={13} /> Export PDF & CSV Executive Telemetry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 11: MESSAGES & CHAT (Team Channels & Direct Messages)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'CHAT' && (
          <div>
            <div className="cmp-chat-layout">
              {/* Left Pane: Channels & Direct Contacts */}
              <div className="cmp-chat-left">
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} color="#38BDF8" /> Enterprise Communications
                  </div>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', color: '#FFF', fontSize: '11px' }}
                  />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                  <div style={{ padding: '6px 16px', fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Channels
                  </div>
                  {[
                    { id: 'general', name: 'general', unread: 0 },
                    { id: 'hiring-leads', name: 'hiring-leads', unread: 2 },
                    { id: 'executive', name: 'executive-directors', unread: 0 },
                    { id: 'payroll-approvals', name: 'payroll-ops', unread: 1 }
                  ].map(chan => (
                    <button
                      key={chan.id}
                      onClick={() => setActiveChannel(chan.id)}
                      className={`cmp-chat-thread-btn ${activeChannel === chan.id ? 'active' : ''}`}
                    >
                      <Hash size={15} />
                      <span style={{ flex: 1 }}>{chan.name}</span>
                      {chan.unread > 0 && (
                        <span style={{ background: '#2563EB', color: '#FFF', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                          {chan.unread}
                        </span>
                      )}
                    </button>
                  ))}

                  <div style={{ padding: '12px 16px 6px', fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Direct Recruiter Messages
                  </div>
                  {hrTeam.map(hr => (
                    <button
                      key={hr.id}
                      onClick={() => setActiveChannel(`hr_${hr.id}`)}
                      className={`cmp-chat-thread-btn ${activeChannel === `hr_${hr.id}` ? 'active' : ''}`}
                    >
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '10px', fontWeight: 800 }}>
                        {hr.firstName?.charAt(0) || 'H'}
                      </div>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hr.firstName} {hr.lastName}
                      </span>
                      {hr.companyVerified && <ShieldCheck size={12} color="#10B981" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Pane: Active Conversation & Composer */}
              <div className="cmp-chat-main-pane">
                {/* Active Chat Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Hash size={16} color="#38BDF8" /> #{activeChannel}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Official enterprise channel • Multi-tenant end-to-end encrypted
                    </div>
                  </div>
                  <span className="cmp-badge cmp-badge-success">LIVE ENCRYPTED</span>
                </div>

                {/* Message Stream */}
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.isSelf ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                        {msg.sender} • {msg.time}
                      </div>
                      <div className={msg.isSelf ? 'cmp-chat-bubble-sent' : 'cmp-chat-bubble-received'}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Composer Input */}
                <form onSubmit={handleSendMessage} style={{ padding: '14px 18px', borderTop: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', gap: '10px', background: 'rgba(8, 15, 29, 0.95)' }}>
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Type an executive message or tag a recruiter..."
                    style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '10px 18px',
                      background: '#2563EB',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={14} /> Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SCREEN 12: SETTINGS & SECURITY (2FA, Sessions, Notifications)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'SETTINGS' && (
          <div>
            {/* Subtabs for Settings */}
            <div className="cmp-subtabs-nav">
              <button
                className={`cmp-subtab-btn ${settingsSubTab === 'ACCOUNT' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('ACCOUNT')}
              >
                <User size={14} /> <span>Account Profile</span>
              </button>
              <button
                className={`cmp-subtab-btn ${settingsSubTab === 'SECURITY' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('SECURITY')}
              >
                <Shield size={14} /> <span>Security & 2FA</span>
              </button>
              <button
                className={`cmp-subtab-btn ${settingsSubTab === 'NOTIFICATIONS' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('NOTIFICATIONS')}
              >
                <Bell size={14} /> <span>Notifications</span>
              </button>
              <button
                className={`cmp-subtab-btn ${settingsSubTab === 'INTEGRATIONS' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('INTEGRATIONS')}
              >
                <Globe size={14} /> <span>Integrations</span>
              </button>
              <button
                className={`cmp-subtab-btn ${settingsSubTab === 'BILLING' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('BILLING')}
              >
                <CreditCard size={14} /> <span>Billing & Invoices</span>
              </button>
            </div>

            {/* Subtab: Account */}
            {settingsSubTab === 'ACCOUNT' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px' }}>
                  Company Manager Director Account
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>Managing Director Email</label>
                    <input type="text" readOnly value={user?.email || 'admin@enterprise.com'} className="cmp-form-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>Assigned Platform Role</label>
                    <input type="text" readOnly value="ROLE_COMPANY_ADMIN (Company Manager SaaS)" className="cmp-form-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>Company Identifier Slug</label>
                    <input type="text" readOnly value={dashboard?.companySlug || 'enterprise-co'} className="cmp-form-input" />
                  </div>
                </div>

                <button
                  onClick={() => showToast('Manager account preferences saved!')}
                  style={{ padding: '9px 18px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Account Settings
                </button>
              </div>
            )}

            {/* Subtab: Security & 2FA */}
            {settingsSubTab === 'SECURITY' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="#38BDF8" /> Authentication Security & 2FA Controls
                </h3>

                {/* 2FA Toggle from Reference Screen 12 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', marginBottom: '24px', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC' }}>Two-Factor Authentication (2FA)</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                      Require TOTP authenticator code or SMS OTP for every corporate login session.
                    </div>
                  </div>
                  <label className="cmp-toggle-switch">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => {
                        setTwoFactorEnabled(e.target.checked);
                        showToast(e.target.checked ? '2FA security enabled for your account!' : '2FA disabled.');
                      }}
                    />
                    <span className="cmp-toggle-slider" />
                  </label>
                </div>

                {/* Active Login Sessions Table from Reference Screen 12 */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 12px' }}>
                    Active Corporate Login Sessions
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSessions.map(sess => (
                      <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '13px' }}>
                            {sess.device} {sess.isCurrent && <span className="cmp-badge cmp-badge-success" style={{ marginLeft: '6px' }}>THIS DEVICE</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                            IP: {sess.ip} • {sess.location} • {sess.lastActive}
                          </div>
                        </div>
                        {!sess.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(sess.id)}
                            style={{ padding: '5px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#F87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Revoke Session
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Notifications */}
            {settingsSubTab === 'NOTIFICATIONS' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px' }}>
                  Enterprise Notification Preferences
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>New Candidate Applications</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>Receive instant email digest when candidates apply to company openings.</div>
                    </div>
                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ accentColor: '#2563EB', width: '18px', height: '18px' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>Payroll Authorization Alerts</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>Alert when monthly salary disbursements require Director signature.</div>
                    </div>
                    <input type="checkbox" checked={payrollAlerts} onChange={(e) => setPayrollAlerts(e.target.checked)} style={{ accentColor: '#2563EB', width: '18px', height: '18px' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>Badge & Recruiter Tag Requests</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>Notify when an HR recruiter requests official verification badge tag.</div>
                    </div>
                    <input type="checkbox" checked={verificationAlerts} onChange={(e) => setVerificationAlerts(e.target.checked)} style={{ accentColor: '#2563EB', width: '18px', height: '18px' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: Integrations */}
            {settingsSubTab === 'INTEGRATIONS' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px' }}>
                  Connected Workplace Integrations
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {[
                    { name: 'Slack Workspace', desc: 'Sync hiring channels and bot alerts directly to your team Slack.', connected: true },
                    { name: 'Google Workspace', desc: 'Auto-sync interview calendars and video meet links.', connected: true },
                    { name: 'GitHub Enterprise', desc: 'Evaluate candidate portfolio repositories automatically.', connected: false },
                    { name: 'Zoom Meetings', desc: 'One-click technical interview rooms.', connected: true }
                  ].map((integ, i) => (
                    <div key={i} style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#F8FAFC', fontSize: '14px' }}>{integ.name}</strong>
                        <span className={`cmp-badge ${integ.connected ? 'cmp-badge-success' : 'cmp-badge-warning'}`}>
                          {integ.connected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', lineHeight: 1.5 }}>{integ.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtab: Billing */}
            {settingsSubTab === 'BILLING' && (
              <div className="company-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px' }}>
                  Corporate Billing & Paid Invoices History
                </h3>
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Billing Date</th>
                      <th>Amount</th>
                      <th>Plan Details</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'INV-2026-09', date: 'Sep 01, 2026', amt: '$499.00', plan: 'Enterprise Unlimited SaaS' },
                      { id: 'INV-2026-08', date: 'Aug 01, 2026', amt: '$499.00', plan: 'Enterprise Unlimited SaaS' },
                      { id: 'INV-2026-07', date: 'Jul 01, 2026', amt: '$499.00', plan: 'Enterprise Unlimited SaaS' }
                    ].map(inv => (
                      <tr key={inv.id}>
                        <td style={{ color: '#38BDF8', fontWeight: 700 }}>{inv.id}</td>
                        <td style={{ color: '#CBD5E1' }}>{inv.date}</td>
                        <td style={{ color: '#10B981', fontWeight: 700 }}>{inv.amt}</td>
                        <td style={{ color: '#94A3B8' }}>{inv.plan}</td>
                        <td>
                          <button
                            onClick={() => showToast(`Invoice ${inv.id} downloaded.`)}
                            style={{ padding: '4px 10px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', color: '#38BDF8', fontSize: '11px', cursor: 'pointer' }}
                          >
                            <Download size={11} style={{ display: 'inline', marginRight: '4px' }} /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STRATEGY & AI ASSISTANT (Preserved sprint goals and copilot)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'STRATEGY' && (
          <div>
            {/* Sprint Roadmap Tasks */}
            <div className="company-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    Hiring Goals & Team Sprint Tasks
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>
                    Assign quarterly headcount goals and recruitment targets to verified HR recruiters.
                  </p>
                </div>
                <button
                  onClick={() => setShowTaskModal(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <PlusCircle size={14} /> Add Sprint Goal
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', gridColumn: '1 / -1', color: '#94A3B8' }}>
                    <CheckSquare size={32} color="#38BDF8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#F8FAFC' }}>No sprint goals added yet.</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Add Sprint Goal" to assign recruitment milestones to your HR team.</div>
                  </div>
                ) : (
                  tasks.map(t => (
                    <div key={t.id} style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 800, color: '#F8FAFC', fontSize: '14px' }}>{t.title}</div>
                        <span className="cmp-badge cmp-badge-success">ACTIVE</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} /> Target Due Date: {t.dueDate || 'Sprint End'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Executive Strategy Copilot */}
            <div className="company-card">
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AiLogo size={18} animated /> Natural Language Executive Strategy Copilot
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
                Inquire about quarterly team productivity, candidate offer benchmarks, or ask for hiring pipeline summaries.
              </p>

              <form onSubmit={handleAskAiManager} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask e.g. 'What is today's work summary?' or 'How are quarterly performance ratings?'"
                  style={{ flex: 1, padding: '11px 16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  style={{ padding: '11px 22px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                >
                  {aiLoading ? 'Analyzing...' : 'Ask Copilot'}
                </button>
              </form>

              {aiResponse && (
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', color: '#E2E8F0', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {aiResponse}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODAL SUITE: Edit Profile, New Review, Employee Details, Invites
            ══════════════════════════════════════════════════════════════════ */}

        {/* MODAL: EDIT COMPANY PROFILE */}
        {showEditProfileModal && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '520px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} color="#38BDF8" /> Edit Company Profile
                </h3>
                <button onClick={() => setShowEditProfileModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Legal Entity Name *</label>
                  <input type="text" required value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="cmp-form-input" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Corporate Tagline</label>
                  <input type="text" value={editTagline} onChange={(e) => setEditTagline(e.target.value)} className="cmp-form-input" placeholder="e.g. Leading Next-Gen AI & Engineering" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Industry</label>
                  <input type="text" value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} className="cmp-form-input" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Website URL</label>
                  <input type="text" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className="cmp-form-input" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Headquarters City / State</label>
                  <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="cmp-form-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Primary Corporate Email</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="cmp-form-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Corporate Phone</label>
                    <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="cmp-form-input" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={profileSaving} style={{ flex: 1, padding: '10px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button type="button" onClick={() => setShowEditProfileModal(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: NEW PERFORMANCE REVIEW (Screen 9) */}
        {showNewReviewModal && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '520px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={18} color="#F59E0B" /> Submit Employee Performance Review
                </h3>
                <button onClick={() => setShowNewReviewModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitPerformanceReview}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Emp ID</label>
                    <input
                      type="number"
                      value={reviewEmpId}
                      onChange={(e) => setReviewEmpId(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="101"
                      className="cmp-form-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Employee Full Name *</label>
                    <input
                      type="text"
                      required
                      value={reviewEmpName}
                      onChange={(e) => setReviewEmpName(e.target.value)}
                      placeholder="e.g. Marcus Vance"
                      className="cmp-form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Review Cycle</label>
                    <select value={reviewPeriod} onChange={(e) => setReviewPeriod(e.target.value)} className="cmp-form-input">
                      <option value="Q3 2026">Q3 2026</option>
                      <option value="Q2 2026">Q2 2026</option>
                      <option value="Annual 2026">Annual 2026</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Overall Rating (1 - 5)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={reviewOverallRating}
                      onChange={(e) => setReviewOverallRating(parseFloat(e.target.value))}
                      className="cmp-form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Tech (1-5)</label>
                    <input type="number" min="1" max="5" value={reviewTechRating} onChange={(e) => setReviewTechRating(parseInt(e.target.value) || 5)} className="cmp-form-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Comm (1-5)</label>
                    <input type="number" min="1" max="5" value={reviewCommRating} onChange={(e) => setReviewCommRating(parseInt(e.target.value) || 4)} className="cmp-form-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Lead (1-5)</label>
                    <input type="number" min="1" max="5" value={reviewLeadRating} onChange={(e) => setReviewLeadRating(parseInt(e.target.value) || 4)} className="cmp-form-input" />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Key Strengths & Contributions</label>
                  <textarea
                    value={reviewStrengths}
                    onChange={(e) => setReviewStrengths(e.target.value)}
                    placeholder="Exceeded delivery targets, mentored junior developers..."
                    rows={2}
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Growth Areas</label>
                  <textarea
                    value={reviewGrowth}
                    onChange={(e) => setReviewGrowth(e.target.value)}
                    placeholder="System architecture cross-documentation..."
                    rows={2}
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Goals Next Quarter</label>
                  <input
                    type="text"
                    value={reviewGoals}
                    onChange={(e) => setReviewGoals(e.target.value)}
                    placeholder="e.g. Lead Kubernetes migration sprint"
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="recPromotion"
                    checked={reviewPromotion}
                    onChange={(e) => setReviewPromotion(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                  />
                  <label htmlFor="recPromotion" style={{ fontSize: '12px', color: '#34D399', fontWeight: 700, cursor: 'pointer' }}>
                    Recommend employee for compensation increment or promotion
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={reviewSaving} style={{ flex: 1, padding: '10px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>
                    {reviewSaving ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button type="button" onClick={() => setShowNewReviewModal(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EMPLOYEE DETAILS (Screen 7 View Details) */}
        {showEmployeeModal && selectedEmployee && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '480px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#38BDF8" /> Employee Profile Record
                </h3>
                <button onClick={() => setShowEmployeeModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '16px', fontWeight: 900 }}>
                  {selectedEmployee.candidateName?.charAt(0) || 'E'}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC' }}>{selectedEmployee.candidateName}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{selectedEmployee.candidateEmail}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>EMPLOYEE CODE</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8', marginTop: '2px' }}>{selectedEmployee.employeeCode}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>DEPARTMENT</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>{selectedEmployee.department || 'Engineering'}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>DESIGNATION</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>{selectedEmployee.jobTitle}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>COMPENSATION</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>${(selectedEmployee.baseSalary || 115000).toLocaleString()} / yr</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  style={{ padding: '9px 18px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: INVITE HR RECRUITER */}
        {showInviteHrModal && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '480px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={20} color="#38BDF8" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Invite HR Recruiter
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: 0, marginBottom: '18px', lineHeight: 1.5 }}>
                Send a corporate email invitation to onboard an HR recruiter to <strong>{dashboard?.companyName || 'your enterprise'}</strong>.
              </p>

              <form onSubmit={handleSendInviteHr}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Recruiter Email Address *</label>
                  <input
                    type="email"
                    value={inviteHrEmail}
                    onChange={(e) => setInviteHrEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    required
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Recruiter Full Name</label>
                  <input
                    type="text"
                    value={inviteHrName}
                    onChange={(e) => setInviteHrName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Proposed Designation</label>
                  <input
                    type="text"
                    value={inviteHrDesignation}
                    onChange={(e) => setInviteHrDesignation(e.target.value)}
                    placeholder="e.g. Senior Talent Partner"
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="autoBadgeHr"
                    checked={inviteHrAutoBadge}
                    onChange={(e) => setInviteHrAutoBadge(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoBadgeHr" style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 600, cursor: 'pointer' }}>
                    Auto-grant Official Company Verification Badge upon registration
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={inviteSubmitting} style={{ flex: 1, padding: '11px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                    {inviteSubmitting ? 'Sending...' : 'Send Invitation Email'}
                  </button>
                  <button type="button" onClick={() => setShowInviteHrModal(false)} style={{ padding: '11px 18px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: INVITE CANDIDATE */}
        {showInviteCandModal && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '480px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <UserCheck size={20} color="#10B981" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Invite Candidate to Corporate Pipeline
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: 0, marginBottom: '18px', lineHeight: 1.5 }}>
                Directly invite a candidate to <strong>{dashboard?.companyName || 'your enterprise'}</strong>.
              </p>

              <form onSubmit={handleSendInviteCand}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Candidate Email Address *</label>
                  <input
                    type="email"
                    value={inviteCandEmail}
                    onChange={(e) => setInviteCandEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    required
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Candidate Full Name</label>
                  <input
                    type="text"
                    value={inviteCandName}
                    onChange={(e) => setInviteCandName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Target Job Title / Role</label>
                  <input
                    type="text"
                    value={inviteCandJobTitle}
                    onChange={(e) => setInviteCandJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Architect"
                    className="cmp-form-input"
                  />
                </div>

                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="autoBadgeCand"
                    checked={inviteCandAutoBadge}
                    onChange={(e) => setInviteCandAutoBadge(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoBadgeCand" style={{ fontSize: '12px', color: '#34D399', fontWeight: 600, cursor: 'pointer' }}>
                    Auto-award Verified Candidate Badge & Team Chat access upon registration
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={inviteSubmitting} style={{ flex: 1, padding: '11px', background: '#10B981', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                    {inviteSubmitting ? 'Sending...' : 'Send Candidate Invite'}
                  </button>
                  <button type="button" onClick={() => setShowInviteCandModal(false)} style={{ padding: '11px 18px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SHAREABLE ONBOARDING LINKS */}
        {showShareableLinksModal && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '520px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Copy size={20} color="#38BDF8" />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Shareable Company Onboarding Links
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: 0, marginBottom: '18px', lineHeight: 1.5 }}>
                Share these instant links directly with candidates or recruiters. When clicked, they land directly on your company registration page with pre-set corporate affiliation.
              </p>

              {/* HR Link */}
              <div style={{ marginBottom: '16px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> HR Recruiter Onboarding Link
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/login?companyInvite=${dashboard?.companySlug || 'enterprise'}-hr&role=HR`}
                    style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#CBD5E1', fontSize: '11px' }}
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/login?companyInvite=${dashboard?.companySlug || 'enterprise'}-hr&role=HR`, 'link_hr')}
                    style={{ padding: '8px 14px', background: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {copiedKey === 'link_hr' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Candidate Link */}
              <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={14} /> Candidate Direct Talent Link
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/login?companyInvite=${dashboard?.companySlug || 'enterprise'}-cand&role=CANDIDATE`}
                    style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#CBD5E1', fontSize: '11px' }}
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/login?companyInvite=${dashboard?.companySlug || 'enterprise'}-cand&role=CANDIDATE`, 'link_cand')}
                    style={{ padding: '8px 14px', background: '#10B981', border: 'none', borderRadius: '6px', color: '#FFF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {copiedKey === 'link_cand' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowShareableLinksModal(false)}
                  style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD TASK / SPRINT GOAL */}
        {showTaskModal && (
          <div className="cmp-modal-backdrop">
            <div className="cmp-modal-card" style={{ maxWidth: '440px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 16px' }}>Assign New Recruitment Goal</h3>
              <form onSubmit={handleCreateTask}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Goal / Task Description *</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Hire 3 Lead React Engineers"
                    required
                    className="cmp-form-input"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>Create Task</button>
                  <button type="button" onClick={() => setShowTaskModal(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TOAST NOTIFICATION ── */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            background: '#0F172A',
            border: '1px solid #10B981',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            borderRadius: '10px',
            padding: '12px 18px',
            color: '#F8FAFC',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default CompanyManagerDashboard;
