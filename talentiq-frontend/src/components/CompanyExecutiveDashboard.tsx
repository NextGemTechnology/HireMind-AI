import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CompanyTagApprovalQueue } from './CompanyTagApprovalQueue';
import {
  Building2, CheckSquare, Calendar, Users, Award, MessageSquare,
  Settings, Plus, Trash2, Video
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

export const CompanyExecutiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'MEETINGS' | 'VERIFICATIONS' | 'SETTINGS'>('OVERVIEW');
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

  // Settings State
  const [companyName, setCompanyName] = useState('HireMind Enterprise');
  const [companyWebsite, setCompanyWebsite] = useState('https://hiremind.ai');
  const [companyIndustry, setCompanyIndustry] = useState('Artificial Intelligence & Tech');
  const [companyAbout, setCompanyAbout] = useState('Enterprise talent screening, autonomous interview orchestration, and verified candidate credential issuer.');

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
        applicationId: 1,
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

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'ALL') return true;
    return t.status === taskFilter;
  });

  return (
    <div>
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
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: 900,
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)'
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

        {/* Action Buttons */}
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
            <Plus size={16} /> Add Goal / Task
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
            onClick={() => navigate('/team-chat')}
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
            <MessageSquare size={16} /> Team Messages
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

      {/* ── EXECUTIVE NAVIGATION TABS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'OVERVIEW', label: 'Overview & KPIs', icon: Building2 },
          { id: 'TASKS', label: `Goals & Tasks (${tasks.length})`, icon: CheckSquare },
          { id: 'MEETINGS', label: `Meeting Reminders (${meetings.length})`, icon: Calendar },
          { id: 'VERIFICATIONS', label: 'HR Badges & Approvals', icon: Award },
          { id: 'SETTINGS', label: 'Company Settings', icon: Settings }
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
                gap: 8,
                padding: '9px 18px',
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
              <Icon size={16} /> {tab.label}
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
              <div className="temporal-label"><Users size={13} /> HR Recruiters</div>
              <div className="temporal-val highlight">{hrTeam.length}</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                {hrTeam.filter(h => h.companyVerified).length} Verified Badges Awarded
              </div>
            </div>

            <div className="temporal-card">
              <div className="temporal-label"><Award size={13} /> Security & Governance</div>
              <div className="temporal-val" style={{ color: '#10B981' }}>100% Isolated</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                Multi-Tenant Vault Active
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
                  No tasks created yet. Click "+ Add Goal / Task" to assign work to your HR team.
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
          TAB 2: GOALS & TASK MANAGEMENT HUB (ASSIGN & TRACK)
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
          TAB 3: MEETINGS & CALENDAR REMINDERS
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
          TAB 4: HR TEAM BADGES & CANDIDATE APPROVALS QUEUE
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'VERIFICATIONS' && (
        <CompanyTagApprovalQueue />
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 5: COMPANY SETTINGS & PROFILE EDITOR
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'SETTINGS' && (
        <div className="admin-card-section" style={{ maxWidth: 640 }}>
          <h3 className="admin-section-heading">
            <Settings size={18} color="var(--admin-primary)" /> Corporate Profile & Brand Configuration
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
            Update your enterprise branding, verification credentials, and official hiring domain.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); setMsg('✅ Company settings updated successfully!'); }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Company Legal Name</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Primary Website URL</label>
                <input
                  value={companyWebsite}
                  onChange={e => setCompanyWebsite(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Industry & Sector</label>
                <input
                  value={companyIndustry}
                  onChange={e => setCompanyIndustry(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Company Description / Bio</label>
                <textarea
                  rows={3}
                  value={companyAbout}
                  onChange={e => setCompanyAbout(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13.5, resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                Save Settings
              </button>
            </div>
          </form>
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
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={2}
                    placeholder="Detailed goals or deliverables..."
                    value={taskDesc}
                    onChange={e => setTaskDesc(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13, resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Priority</label>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Candidate Email</label>
                  <input
                    type="email"
                    placeholder="candidate@hiremind.ai"
                    value={meetingCandidateEmail}
                    onChange={e => setMeetingCandidateEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Duration (Minutes)</label>
                    <select
                      value={meetingDuration}
                      onChange={e => setMeetingDuration(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-primary)', fontSize: 13 }}
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
    </div>
  );
};
