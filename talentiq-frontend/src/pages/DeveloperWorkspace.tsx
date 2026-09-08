import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Home,
  CheckSquare,
  FileText,
  Folder,
  BarChart2,
  MessageSquare,
  User,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Check,
  Clock,
  Target,
  Star,
  Sparkles,
  Calendar,
  Send,
  ChevronRight,
  Code2,
  AlertCircle
} from 'lucide-react';
import '../css/developer-workspace.css';

type DevTabKey =
  | 'my-work'
  | 'tasks-sprints'
  | 'daily-updates'
  | 'projects'
  | 'my-performance'
  | 'team-channels'
  | 'work-profile';

interface DevTask {
  id: number;
  taskCode: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  dueDate?: string;
  completedAt?: string;
}

interface DevSprint {
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  description: string;
  completedTasks: number;
  totalTasks: number;
  progressPercentage: number;
  focusTags: string[];
}

interface DevChannel {
  id: number;
  name: string;
  description: string;
  unreadCount: number;
  activityStatus: string;
  isPrivate: boolean;
}

interface DevPerformance {
  tasksCompleted: number;
  tasksCompletedPeriod: string;
  avgResponseTime: string;
  avgResponsePeriod: string;
  sprintStatus: string;
  sprintStatusNote: string;
  managerRating: string;
  managerRatingPeriod: string;
  motivationalQuote: string;
}

interface DevEmployee {
  employeeId: number;
  companyId: number;
  companyName: string;
  companyLogoUrl?: string;
  jobTitle: string;
  department: string;
  employeeCode: string;
  employmentType: string;
  joinDate?: string;
  verifiedAt?: string;
  badgeCertificateId?: string;
}

export const DeveloperWorkspace: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DevTabKey>('my-work');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  // Overview Data
  const [employee, setEmployee] = useState<DevEmployee | null>(null);
  const [todayTasks, setTodayTasks] = useState<DevTask[]>([]);
  const [currentSprint, setCurrentSprint] = useState<DevSprint | null>(null);
  const [teamChannels, setTeamChannels] = useState<DevChannel[]>([]);
  const [performance, setPerformance] = useState<DevPerformance | null>(null);

  // Daily Update State
  const [dailyUpdateText, setDailyUpdateText] = useState<string>('');
  const [dailyUpdateBlockers, setDailyUpdateBlockers] = useState<string>('');
  const [submittingUpdate, setSubmittingUpdate] = useState<boolean>(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string>('');
  const [pastUpdates, setPastUpdates] = useState<any[]>([]);

  // Task Filter
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Selected Channel for Chat View
  const [selectedChannel, setSelectedChannel] = useState<string>('engineering');
  const [chatMessages, setChatMessages] = useState<{ id: number; sender: string; time: string; text: string }[]>([
    { id: 1, sender: 'Tech Lead (David)', time: '09:15 AM', text: 'Good morning team! Please submit your daily standup notes before 11 AM.' },
    { id: 2, sender: 'DevOps (Sarah)', time: '09:42 AM', text: 'Staging environment is updated with latest auth patches.' },
    { id: 3, sender: 'Product (Emily)', time: '10:05 AM', text: 'Sprint velocity looks on track for Friday release.' }
  ]);
  const [newChatInput, setNewChatInput] = useState<string>('');

  // 1. Check Eligibility & Load Workspace
  useEffect(() => {
    const loadWorkspace = async () => {
      setIsLoading(true);
      try {
        // Direct-URL security check
        const eligRes = await apiClient.get('/developer-workspace/eligibility');
        const eligData = eligRes.data?.data;
        if (!eligData || !eligData.eligible) {
          setAccessDenied(eligData?.message || 'Access Denied: You do not have verified developer workspace privileges.');
          setIsLoading(false);
          return;
        }

        // Fetch Overview
        const overviewRes = await apiClient.get('/developer-workspace/overview');
        const overview = overviewRes.data?.data;
        if (overview) {
          setEmployee(overview.employee);
          setTodayTasks(overview.todayTasks || []);
          setCurrentSprint(overview.currentSprint);
          setTeamChannels(overview.teamChannels || []);
          setPerformance(overview.performance);
          if (overview.todayDailyUpdate) {
            setDailyUpdateText(overview.todayDailyUpdate.workSummary || '');
            setDailyUpdateBlockers(overview.todayDailyUpdate.blockers || '');
          }
        }
      } catch (err: any) {
        console.error('Failed to load developer workspace:', err);
        setAccessDenied(err.response?.data?.message || 'Failed to authenticate developer workspace.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspace();
  }, []);

  // Fetch Past Daily Updates when tab is switched
  useEffect(() => {
    if (activeTab === 'daily-updates') {
      apiClient.get('/developer-workspace/daily-updates')
        .then(res => setPastUpdates(res.data?.data || []))
        .catch(err => console.warn('Could not fetch daily updates:', err));
    }
  }, [activeTab]);

  // Handle Task Checkbox Toggle
  const handleToggleTask = async (task: DevTask) => {
    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    // Optimistic UI update
    setTodayTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await apiClient.put(`/developer-workspace/tasks/${task.id}/status`, {
        status: newStatus
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on error
      setTodayTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  // Handle Daily Update Submission
  const handleSubmitDailyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyUpdateText.trim()) return;

    setSubmittingUpdate(true);
    setUpdateSuccessMsg('');
    try {
      await apiClient.post('/developer-workspace/daily-updates', {
        workSummary: dailyUpdateText.trim(),
        blockers: dailyUpdateBlockers.trim()
      });
      setUpdateSuccessMsg('✔ Daily update submitted successfully!');
      setTimeout(() => setUpdateSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to submit daily update:', err);
      alert(err.response?.data?.message || 'Failed to submit daily update');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Handle Chat message send
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatInput.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: user?.firstName || 'Me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: newChatInput.trim()
    };
    setChatMessages(prev => [...prev, newMsg]);
    setNewChatInput('');
  };

  // Loading State
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E2E8F0',
            borderTop: '3px solid #2563EB',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>Connecting to Developer Workspace...</p>
        </div>
      </div>
    );
  }

  // Access Denied / Non-Eligible Screen
  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '24px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '36px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>Developer Workspace Locked</h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
            {accessDenied}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: '#2563EB', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px' }}
          >
            ← Return to Candidate Dashboard
          </button>
        </div>
      </div>
    );
  }

  const candidateFirstName = user?.firstName || 'Developer';
  const companyName = employee?.companyName || 'BrightStack Technologies';
  const jobTitle = employee?.jobTitle || 'Software Engineer';
  const todayFormattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="dev-workspace-root">
      {/* ── Left Sidebar (Only Developer Items, No Candidate Menus) ── */}
      <aside className="dev-workspace-sidebar">
        <div className="dev-sidebar-brand">
          <h1 className="dev-brand-title">
            Hire<span>Mind</span>
          </h1>
          <div className="dev-brand-subtitle">Developer Workspace</div>
        </div>

        <nav className="dev-sidebar-nav">
          <button
            onClick={() => setActiveTab('my-work')}
            className={`dev-nav-btn ${activeTab === 'my-work' ? 'active' : ''}`}
          >
            <Home size={18} />
            <span>My Work</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks-sprints')}
            className={`dev-nav-btn ${activeTab === 'tasks-sprints' ? 'active' : ''}`}
          >
            <CheckSquare size={18} />
            <span>Tasks & Sprints</span>
          </button>

          <button
            onClick={() => setActiveTab('daily-updates')}
            className={`dev-nav-btn ${activeTab === 'daily-updates' ? 'active' : ''}`}
          >
            <FileText size={18} />
            <span>Daily Updates</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`dev-nav-btn ${activeTab === 'projects' ? 'active' : ''}`}
          >
            <Folder size={18} />
            <span>Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('my-performance')}
            className={`dev-nav-btn ${activeTab === 'my-performance' ? 'active' : ''}`}
          >
            <BarChart2 size={18} />
            <span>My Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('team-channels')}
            className={`dev-nav-btn ${activeTab === 'team-channels' ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            <span>Team Channels</span>
          </button>

          <button
            onClick={() => setActiveTab('work-profile')}
            className={`dev-nav-btn ${activeTab === 'work-profile' ? 'active' : ''}`}
          >
            <User size={18} />
            <span>Work Profile</span>
          </button>
        </nav>

        <div className="dev-sidebar-footer">
          <Lock size={14} />
          <span>You see only work assigned to you.</span>
        </div>
      </aside>

      {/* ── Main Workspace Area ── */}
      <main className="dev-workspace-main">
        {/* Top Bar with Switch to Candidate Mode Button */}
        <div className="dev-topbar">
          <button
            onClick={() => navigate('/dashboard')}
            className="dev-btn-switch-candidate"
            title="Return to Candidate Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Switch to Candidate Mode</span>
          </button>
        </div>

        <div className="dev-content-wrap">
          {/* ── TAB 1: MY WORK (Matches Image Mockup Exactly) ── */}
          {activeTab === 'my-work' && (
            <div>
              {/* Welcome Header */}
              <div className="dev-welcome-header">
                <div>
                  <h1 className="dev-welcome-title">
                    Welcome back, {candidateFirstName}! 👋
                  </h1>
                  <p className="dev-welcome-subtitle">
                    Good work builds great software. Let's make progress today.
                  </p>
                </div>
                <div className="dev-date-meta">
                  <div className="dev-date-text">
                    <Calendar size={14} color="#64748B" />
                    <span>{todayFormattedDate}</span>
                  </div>
                  <div className="dev-date-caption">
                    Same focused you. A brighter tomorrow.
                  </div>
                </div>
              </div>

              {/* Verified Employment Banner */}
              <div className="dev-verified-banner">
                <div className="dev-verified-left">
                  <div className="dev-verified-shield-icon">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="dev-verified-title">Verified Employment</h2>
                    <p className="dev-verified-desc">
                      You're working with <strong>{companyName}</strong> as a <strong>{jobTitle}</strong>.
                    </p>
                  </div>
                </div>
                <div className="dev-verified-badge-pill">
                  <Check size={14} />
                  <span>Verified</span>
                </div>
              </div>

              {/* Grid Row 1: Today's Work, Current Sprint, Daily Update */}
              <div className="dev-grid-row-1">
                {/* Card 1: Today's Work */}
                <div className="dev-card">
                  <div className="dev-card-header">
                    <div className="dev-card-title-group">
                      <CheckSquare size={16} color="#2563EB" />
                      <span>Today's Work</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('tasks-sprints')}
                      className="dev-card-link"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="dev-tasks-list">
                    {todayTasks.slice(0, 4).map(task => {
                      const isCompleted = task.status === 'COMPLETED';
                      return (
                        <div key={task.id} className="dev-task-item">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task)}
                            className={`dev-task-checkbox ${isCompleted ? 'checked' : ''}`}
                            aria-label={`Mark ${task.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
                          >
                            {isCompleted && <Check size={12} strokeWidth={3} />}
                          </button>
                          <div className="dev-task-info">
                            <h3 className={`dev-task-title ${isCompleted ? 'completed' : ''}`}>
                              {task.title}
                            </h3>
                            <div className="dev-task-meta">
                              <span>{task.taskCode}</span>
                              <span className="dev-task-dot">•</span>
                              <span style={{
                                color: task.priority === 'HIGH' ? '#EF4444' : task.priority === 'LOW' ? '#64748B' : '#3B82F6'
                              }}>
                                {task.priority === 'HIGH' ? 'High priority' : task.status === 'IN_PROGRESS' ? 'In progress' : task.priority === 'LOW' ? 'Low' : 'Normal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card 2: Current Sprint */}
                <div className="dev-card">
                  <div className="dev-card-header">
                    <div className="dev-card-title-group">
                      <Folder size={16} color="#2563EB" />
                      <span>Current Sprint</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className="dev-card-link"
                    >
                      View project →
                    </button>
                  </div>

                  <div className="dev-sprint-title-row">
                    <span className="dev-sprint-name">{currentSprint?.name || 'Platform Improvement Sprint'}</span>
                    <span className="dev-sprint-badge">
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                      {currentSprint?.status || 'In Progress'}
                    </span>
                  </div>
                  <div className="dev-sprint-date">
                    {currentSprint?.startDate || 'Apr 15'} – {currentSprint?.endDate || 'Apr 28, 2024'}
                  </div>
                  <p className="dev-sprint-desc">
                    {currentSprint?.description || 'Improve platform stability, performance and user experience.'}
                  </p>

                  <div className="dev-sprint-progress-bg">
                    <div
                      className="dev-sprint-progress-bar"
                      style={{ width: `${currentSprint?.progressPercentage || 60}%` }}
                    />
                  </div>

                  <div className="dev-sprint-stats-row">
                    <span>{currentSprint?.completedTasks || 6} of {currentSprint?.totalTasks || 10} tasks completed</span>
                    <span>{currentSprint?.progressPercentage || 60}%</span>
                  </div>

                  <div className="dev-sprint-focus-label">Key Focus This Sprint</div>
                  <div className="dev-sprint-tags">
                    {(currentSprint?.focusTags || ['Stability', 'Performance', 'User Experience']).map((tag, i) => (
                      <span key={i} className="dev-sprint-tag-pill">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Card 3: Daily Update */}
                <div className="dev-card">
                  <div className="dev-card-header">
                    <div className="dev-card-title-group">
                      <FileText size={16} color="#2563EB" />
                      <span>Daily Update</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitDailyUpdate} className="dev-update-form">
                    <textarea
                      value={dailyUpdateText}
                      onChange={e => setDailyUpdateText(e.target.value.slice(0, 500))}
                      placeholder="What did you work on today? Any blockers or help needed?"
                      className="dev-update-textarea"
                      maxLength={500}
                    />

                    {updateSuccessMsg && (
                      <div className="dev-update-success-msg">{updateSuccessMsg}</div>
                    )}

                    <div className="dev-update-bottom">
                      <span className="dev-update-counter">
                        {dailyUpdateText.length}/500
                      </span>
                      <button
                        type="submit"
                        disabled={submittingUpdate || !dailyUpdateText.trim()}
                        className="dev-btn-submit-update"
                      >
                        {submittingUpdate ? 'Submitting...' : 'Submit Update'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Grid Row 2: Team Channels & My Performance */}
              <div className="dev-grid-row-2">
                {/* Card 4: Team Channels */}
                <div className="dev-card">
                  <div className="dev-card-header">
                    <div className="dev-card-title-group">
                      <MessageSquare size={16} color="#2563EB" />
                      <span>Team Channels</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('team-channels')}
                      className="dev-card-link"
                    >
                      Open in Chat →
                    </button>
                  </div>

                  <div className="dev-channels-list">
                    {teamChannels.map(ch => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setSelectedChannel(ch.name);
                          setActiveTab('team-channels');
                        }}
                        className="dev-channel-item"
                      >
                        <div className="dev-channel-left">
                          <span className="dev-channel-hash">#</span>
                          <span>{ch.name}</span>
                        </div>
                        <div className="dev-channel-status-msg">
                          <span className={`dev-channel-indicator ${ch.unreadCount > 0 ? 'active' : ''}`} />
                          <span>{ch.activityStatus}</span>
                          <ChevronRight size={14} className="dev-channel-chevron" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card 5: My Performance */}
                <div className="dev-card">
                  <div className="dev-card-header">
                    <div className="dev-card-title-group">
                      <BarChart2 size={16} color="#2563EB" />
                      <span>My Performance</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('my-performance')}
                      className="dev-card-link"
                    >
                      View details →
                    </button>
                  </div>

                  <div className="dev-perf-grid">
                    {/* Tile 1 */}
                    <div className="dev-perf-tile">
                      <div className="dev-perf-icon-wrap green">
                        <Check size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="dev-perf-value">{performance?.tasksCompleted || 8}</div>
                        <div className="dev-perf-label">Tasks completed</div>
                        <div className="dev-perf-period">{performance?.tasksCompletedPeriod || 'This sprint'}</div>
                      </div>
                    </div>

                    {/* Tile 2 */}
                    <div className="dev-perf-tile">
                      <div className="dev-perf-icon-wrap blue">
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className="dev-perf-value">{performance?.avgResponseTime || '24h'}</div>
                        <div className="dev-perf-label">Avg. response time</div>
                        <div className="dev-perf-period">{performance?.avgResponsePeriod || 'This week'}</div>
                      </div>
                    </div>

                    {/* Tile 3 */}
                    <div className="dev-perf-tile">
                      <div className="dev-perf-icon-wrap cyan">
                        <Target size={18} />
                      </div>
                      <div>
                        <div className="dev-perf-value">{performance?.sprintStatus || 'On track'}</div>
                        <div className="dev-perf-label">Sprint status</div>
                        <div className="dev-perf-period">{performance?.sprintStatusNote || 'Great progress'}</div>
                      </div>
                    </div>

                    {/* Tile 4 */}
                    <div className="dev-perf-tile">
                      <div className="dev-perf-icon-wrap gold">
                        <Star size={18} />
                      </div>
                      <div>
                        <div className="dev-perf-value">{performance?.managerRating || '4.8 / 5'}</div>
                        <div className="dev-perf-label">Manager feedback</div>
                        <div className="dev-perf-period">{performance?.managerRatingPeriod || 'Last 30 days'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="dev-perf-footer-quote">
                    <Sparkles size={16} color="#2563EB" />
                    <span>{performance?.motivationalQuote || 'Consistent effort leads to outstanding results. Keep it up!'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: TASKS & SPRINTS ── */}
          {activeTab === 'tasks-sprints' && (
            <div className="dev-tab-container">
              <div className="dev-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="dev-tab-title">Tasks & Sprints</h2>
                  <p className="dev-tab-desc">All engineering work assigned to your developer profile in {companyName}.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'] as const).map(filterKey => (
                    <button
                      key={filterKey}
                      onClick={() => setTaskFilter(filterKey)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        background: taskFilter === filterKey ? '#2563EB' : '#FFFFFF',
                        color: taskFilter === filterKey ? '#FFFFFF' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {filterKey.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dev-tasks-list" style={{ gap: '16px' }}>
                {todayTasks
                  .filter(t => taskFilter === 'ALL' || t.status === taskFilter)
                  .map(task => {
                    const isCompleted = task.status === 'COMPLETED';
                    return (
                      <div key={task.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        padding: '16px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        background: isCompleted ? '#F8FAFC' : '#FFFFFF'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className={`dev-task-checkbox ${isCompleted ? 'checked' : ''}`}
                          style={{ marginTop: '3px' }}
                          aria-label={`Toggle ${task.title}`}
                        >
                          {isCompleted && <Check size={12} strokeWidth={3} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <h3 style={{
                              margin: 0,
                              fontSize: '15px',
                              fontWeight: 700,
                              color: isCompleted ? '#94A3B8' : '#0F172A',
                              textDecoration: isCompleted ? 'line-through' : 'none'
                            }}>
                              {task.title}
                            </h3>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: isCompleted ? '#DCFCE7' : task.status === 'IN_PROGRESS' ? '#DBEAFE' : '#F1F5F9',
                              color: isCompleted ? '#15803D' : task.status === 'IN_PROGRESS' ? '#1E40AF' : '#475569'
                            }}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748B' }}>
                            {task.description || 'Sprint task committed for continuous delivery.'}
                          </p>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#94A3B8' }}>
                            <span>Code: <strong style={{ color: '#475569' }}>{task.taskCode}</strong></span>
                            <span>•</span>
                            <span>Priority: <strong style={{ color: task.priority === 'HIGH' ? '#EF4444' : '#3B82F6' }}>{task.priority}</strong></span>
                            <span>•</span>
                            <span>Sprint: Platform Improvement</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── TAB 3: DAILY UPDATES ── */}
          {activeTab === 'daily-updates' && (
            <div className="dev-tab-container">
              <div className="dev-tab-header">
                <h2 className="dev-tab-title">Daily Standup Updates</h2>
                <p className="dev-tab-desc">Log your progress and blockers for transparent engineering alignment.</p>
              </div>

              {/* Submission Form */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>Post Today's Update</h3>
                <form onSubmit={handleSubmitDailyUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    value={dailyUpdateText}
                    onChange={e => setDailyUpdateText(e.target.value)}
                    placeholder="Summary of work completed today..."
                    style={{ minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  <input
                    type="text"
                    value={dailyUpdateBlockers}
                    onChange={e => setDailyUpdateBlockers(e.target.value)}
                    placeholder="Blockers or support required (optional)..."
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submittingUpdate || !dailyUpdateText.trim()}
                      className="dev-btn-submit-update"
                    >
                      {submittingUpdate ? 'Submitting...' : 'Post Standup Update'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Historical Log */}
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>Recent Submissions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastUpdates.length > 0 ? pastUpdates.map(u => (
                  <div key={u.id} style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>{u.dateStr || 'Today'}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>Verified Engineer Log</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '13.5px', color: '#1E293B', lineHeight: 1.4 }}>{u.workSummary}</p>
                    {u.blockers && (
                      <div style={{ fontSize: '12px', color: '#DC2626', background: '#FEF2F2', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        Blocker: {u.blockers}
                      </div>
                    )}
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748B', fontSize: '13px' }}>
                    No previous standup updates submitted yet. Post your first update above!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: PROJECTS ── */}
          {activeTab === 'projects' && (
            <div className="dev-tab-container">
              <div className="dev-tab-header">
                <h2 className="dev-tab-title">Assigned Projects</h2>
                <p className="dev-tab-desc">Core repositories, service modules, and documentation for {companyName}.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Folder size={20} color="#2563EB" />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>TalentIQ Core Platform</h3>
                    </div>
                    <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>Active</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                    Main web platform, recruitment automation pipeline, and role-based access engine.
                  </p>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
                    <strong>Stack:</strong> Java, Spring Boot, MySQL, Redis, React, TypeScript
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                    <span>4 Open Issues</span>
                    <span>2 Pull Requests</span>
                  </div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Code2 size={20} color="#0891B2" />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Developer SDK & Webhooks</h3>
                    </div>
                    <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>In Dev</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                    Client libraries, external integrations, event listeners, and API gateways.
                  </p>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
                    <strong>Stack:</strong> TypeScript, Node.js, WebSockets, REST
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                    <span>2 Open Issues</span>
                    <span>1 Pull Request</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: MY PERFORMANCE ── */}
          {activeTab === 'my-performance' && (
            <div className="dev-tab-container">
              <div className="dev-tab-header">
                <h2 className="dev-tab-title">Engineering Performance & Reviews</h2>
                <p className="dev-tab-desc">Objective metrics, velocity, and manager feedback on completed sprints.</p>
              </div>

              <div className="dev-perf-grid" style={{ marginBottom: '28px' }}>
                <div className="dev-perf-tile">
                  <div className="dev-perf-icon-wrap green"><Check size={18} /></div>
                  <div>
                    <div className="dev-perf-value">8</div>
                    <div className="dev-perf-label">Tasks completed</div>
                    <div className="dev-perf-period">This sprint</div>
                  </div>
                </div>
                <div className="dev-perf-tile">
                  <div className="dev-perf-icon-wrap blue"><Clock size={18} /></div>
                  <div>
                    <div className="dev-perf-value">24h</div>
                    <div className="dev-perf-label">Avg response time</div>
                    <div className="dev-perf-period">This week</div>
                  </div>
                </div>
                <div className="dev-perf-tile">
                  <div className="dev-perf-icon-wrap cyan"><Target size={18} /></div>
                  <div>
                    <div className="dev-perf-value">On track</div>
                    <div className="dev-perf-label">Sprint status</div>
                    <div className="dev-perf-period">Great progress</div>
                  </div>
                </div>
                <div className="dev-perf-tile">
                  <div className="dev-perf-icon-wrap gold"><Star size={18} /></div>
                  <div>
                    <div className="dev-perf-value">4.8 / 5</div>
                    <div className="dev-perf-label">Manager feedback</div>
                    <div className="dev-perf-period">Last 30 days</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>Latest Performance Appraisal</h3>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '14px' }}>
                  "Demonstrated exceptional problem-solving in refactoring authentication flows and hardening session boundaries. High coding velocity with clean documentation and test coverage."
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748B' }}>
                  <span>Reviewer: <strong>Engineering Director</strong></span>
                  <span>Period: <strong>Q3 Sprint Cycle</strong></span>
                  <span>Rating: <strong style={{ color: '#059669' }}>EXCELLENT (4.8 / 5)</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 6: TEAM CHANNELS ── */}
          {activeTab === 'team-channels' && (
            <div className="dev-tab-container" style={{ padding: '0', display: 'flex', height: '620px', overflow: 'hidden' }}>
              {/* Channel List */}
              <div style={{ width: '220px', borderRight: '1px solid #E2E8F0', background: '#F8FAFC', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Channels ({companyName})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {['engineering', 'platform', 'frontend', 'general'].map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedChannel(ch)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedChannel === ch ? '#EFF6FF' : 'transparent',
                        color: selectedChannel === ch ? '#2563EB' : '#475569',
                        fontWeight: selectedChannel === ch ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span>#</span> {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>#{selectedChannel}</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>• Company-scoped secure developer room</span>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {chatMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#0F172A' }}>{msg.sender}</strong>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{msg.time}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', width: 'fit-content' }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChatMessage} style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={newChatInput}
                    onChange={e => setNewChatInput(e.target.value)}
                    placeholder={`Message #${selectedChannel}...`}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    style={{ background: '#2563EB', color: '#FFF', border: 'none', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── TAB 7: WORK PROFILE ── */}
          {activeTab === 'work-profile' && (
            <div className="dev-tab-container">
              <div className="dev-tab-header">
                <h2 className="dev-tab-title">Verified Work Profile</h2>
                <p className="dev-tab-desc">Official corporate credentials authorized by {companyName}.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Employee Code</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{employee?.employeeCode || 'EMP-102'}</div>
                </div>

                <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Designation</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{jobTitle}</div>
                </div>

                <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Department</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{employee?.department || 'Engineering'}</div>
                </div>

                <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Employment Status</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={16} /> Active Verified Employee
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px', border: '1px solid #A7F3D0', background: '#ECFDF5', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={20} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#065F46' }}>Verified Company Credential Badge</h3>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#047857' }}>
                  This credential is cryptographically tied to {companyName} and permanently verified on HireMind AI.
                </p>
                <div style={{ fontSize: '12px', color: '#064E3B' }}>
                  Certificate ID: <code style={{ background: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>{employee?.badgeCertificateId || 'HM-NGT178-79787FE7'}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DeveloperWorkspace;
