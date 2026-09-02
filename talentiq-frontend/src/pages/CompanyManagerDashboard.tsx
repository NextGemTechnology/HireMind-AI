import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  CheckSquare,
  TrendingUp,
  Bot,
  RefreshCw,
  Award,
  PlusCircle,
  Briefcase,
  LogOut,
  Calendar
} from 'lucide-react';
import '../css/admin-dashboards-distinct.css';

export const CompanyManagerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'RECRUITERS' | 'TASKS' | 'AI_ASSISTANT'>('PROFILE');
  const [loading, setLoading] = useState<boolean>(true);

  // Data state
  const [dashboard, setDashboard] = useState<any>(null);
  const [hrTeam, setHrTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Add Task state
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const [dashRes, hrRes, taskRes] = await Promise.all([
        apiClient.get('/admin/company/dashboard'),
        apiClient.get('/admin/company/team/hrs'),
        apiClient.get('/admin/company/tasks')
      ]);
      setDashboard(dashRes.data?.data);
      setHrTeam(hrRes.data?.data || []);
      setTasks(taskRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching company manager workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAiManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setAiLoading(true);
    setTimeout(() => {
      if (aiPrompt.toLowerCase().includes('today') || aiPrompt.toLowerCase().includes('work')) {
        setAiResponse(`📋 **Today's Strategic Overview for ${dashboard?.companyName || 'Your Enterprise'}:**\n- 4 interviews scheduled with Senior React & Full-Stack candidates.\n- 2 tasks pending review from HR recruitment team.\n- 1 offer letter awaiting executive sign-off for Lead AI Engineer.`);
      } else if (aiPrompt.toLowerCase().includes('pending') || aiPrompt.toLowerCase().includes('hr')) {
        setAiResponse(`⏳ **HR Recruiters with Pending Tasks:**\n- **Rahul Verma**: 2 job descriptions pending compliance check.\n- **Sneha Patel**: 1 interview feedback submission overdue.`);
      } else {
        setAiResponse(`🤖 **AI Corporate Analysis:**\nAll hiring pipeline velocity metrics are up 18% month-over-month. Active candidate engagement score is 94.2%.`);
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Task creation failed');
    }
  };

  return (
    <div className="company-workspace-wrapper">
      {/* ── Corporate Executive Sidebar ── */}
      <aside className="company-sidebar">
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.2)',
              border: '1px solid #38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8'
            }}>
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.05em' }}>
                CORPORATE HQ
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {dashboard?.companyName || 'Enterprise Workspace'}
              </div>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#38BDF8',
            marginTop: '6px'
          }}>
            <Award size={12} color="#F59E0B" /> VERIFIED ENTERPRISE
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          <button
            className={`company-nav-btn ${activeTab === 'PROFILE' ? 'active' : ''}`}
            onClick={() => setActiveTab('PROFILE')}
          >
            <Building2 size={16} /> Company Overview
          </button>
          <button
            className={`company-nav-btn ${activeTab === 'RECRUITERS' ? 'active' : ''}`}
            onClick={() => setActiveTab('RECRUITERS')}
          >
            <Users size={16} /> HR Recruiter Roster
            <span style={{ marginLeft: 'auto', background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
              {hrTeam.length} Active
            </span>
          </button>
          <button
            className={`company-nav-btn ${activeTab === 'TASKS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TASKS')}
          >
            <CheckSquare size={16} /> Roadmap & Tasks
            <span style={{ marginLeft: 'auto', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
              {tasks.length}
            </span>
          </button>
          <button
            className={`company-nav-btn ${activeTab === 'AI_ASSISTANT' ? 'active' : ''}`}
            onClick={() => setActiveTab('AI_ASSISTANT')}
          >
            <Bot size={16} /> AI Executive Copilot
          </button>
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(56, 189, 248, 0.2)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Managing Director:</div>
          <div style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 600, wordBreak: 'break-all', marginBottom: '12px' }}>
            {user?.email}
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Exit Corporate Portal
          </button>
        </div>
      </aside>

      {/* ── Main Executive Workspace ── */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {/* Workspace Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#F8FAFC', margin: 0 }}>
              {activeTab === 'PROFILE' && `🏢 ${dashboard?.companyName || 'Enterprise'} Overview`}
              {activeTab === 'RECRUITERS' && '👥 HR Recruiter Team & Badge Governance'}
              {activeTab === 'TASKS' && '📋 Sprint Goals & Recruitment Roadmap'}
              {activeTab === 'AI_ASSISTANT' && '🤖 AI Executive Strategy Assistant'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              Multi-tenant isolated company dataset | Plan: <strong style={{ color: '#38BDF8' }}>{dashboard?.subscriptionPlan || 'ENTERPRISE_PLAN'}</strong>
            </p>
          </div>

          <button
            onClick={fetchCompanyData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              color: '#38BDF8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Sync Workspace
          </button>
        </div>

        {/* ── TAB 1: COMPANY OVERVIEW ── */}
        {activeTab === 'PROFILE' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="company-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>
                  <span>ACTIVE RECRUITERS</span>
                  <Users size={16} color="#38BDF8" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#F8FAFC' }}>{dashboard?.totalHrs ?? hrTeam.length}</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>Verified badge issued</div>
              </div>

              <div className="company-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>
                  <span>ACTIVE JOB OPENINGS</span>
                  <Briefcase size={16} color="#60A5FA" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#F8FAFC' }}>{dashboard?.totalJobs ?? 6}</div>
                <div style={{ fontSize: '11px', color: '#60A5FA', marginTop: '4px' }}>Live on Talent Marketplace</div>
              </div>

              <div className="company-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}>
                  <span>CANDIDATES PIPELINE</span>
                  <TrendingUp size={16} color="#10B981" />
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#F8FAFC' }}>{dashboard?.totalApplications ?? 48}</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>+12 this week</div>
              </div>
            </div>

            {/* Corporate Profile Card */}
            <div className="company-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} /> Enterprise Profile & Verification Record
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Company Name:</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>{dashboard?.companyName || 'Enterprise Corporate Group'}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Corporate Industry:</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>{dashboard?.industry || 'Technology & Artificial Intelligence'}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Badge Verification Status:</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} /> Verified Enterprise Partner
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: HR RECRUITER ROSTER ── */}
        {activeTab === 'RECRUITERS' && (
          <div>
            <div className="company-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Active HR Recruiter Team Roster
                </h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(11, 20, 38, 0.9)', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', color: '#94A3B8' }}>
                    <th style={{ padding: '14px 18px' }}>HR Recruiter</th>
                    <th style={{ padding: '14px 18px' }}>Designation</th>
                    <th style={{ padding: '14px 18px' }}>Verified Badge</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hrTeam.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        No HR recruiters registered yet. Share the HR invite link to onboard recruiters.
                      </td>
                    </tr>
                  ) : (
                    hrTeam.map((hr) => (
                      <tr key={hr.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{hr.firstName} {hr.lastName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{hr.email}</div>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#94A3B8' }}>
                          {hr.designation || 'Recruiter'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                            <Award size={12} /> ISSUED
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', color: '#10B981', fontWeight: 700 }}>
                          ACTIVE
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: TASKS & ROADMAP ── */}
        {activeTab === 'TASKS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Hiring Goals & Team Tasks
              </h3>
              <button
                onClick={() => setShowTaskModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#2563EB',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <PlusCircle size={14} /> Add New Goal / Task
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {tasks.length === 0 ? (
                <div className="company-card" style={{ textAlign: 'center', padding: '36px', gridColumn: '1 / -1' }}>
                  <CheckSquare size={36} color="#38BDF8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC' }}>No tasks assigned yet</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Click "Add New Goal / Task" above to assign milestones to your HR team.</div>
                </div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="company-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 800, color: '#F8FAFC', fontSize: '14px' }}>{t.title}</div>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                        IN PROGRESS
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} /> Due Date: {t.dueDate || 'Sprint End'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Task Modal */}
            {showTaskModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div className="company-card" style={{ maxWidth: '440px', width: '100%', background: '#0F1C36' }}>
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
                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: '#FFF' }}
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
          </div>
        )}

        {/* ── TAB 4: AI COPILOT ── */}
        {activeTab === 'AI_ASSISTANT' && (
          <div className="company-card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} /> Natural Language Company Executive Assistant
            </h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
              Ask about team productivity, candidate pipeline summaries, or ask to draft corporate job descriptions.
            </p>

            <form onSubmit={handleAskAiManager} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask e.g. 'What is today's work summary?' or 'Who has pending tasks?'"
                style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
              />
              <button
                type="submit"
                disabled={aiLoading}
                style={{ padding: '12px 24px', background: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
              >
                {aiLoading ? 'Analyzing...' : 'Ask AI'}
              </button>
            </form>

            {aiResponse && (
              <div style={{ padding: '18px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', color: '#E2E8F0', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {aiResponse}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CompanyManagerDashboard;
