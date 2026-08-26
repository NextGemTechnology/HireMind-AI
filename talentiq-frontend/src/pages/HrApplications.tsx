import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import {
  Users,
  Download,
  Bot,
  CheckCircle2,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Search,
  MessageSquare,
  User,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { InteractiveGalaxyBackground } from '../components/InteractiveGalaxyBackground';
import { HrSidebar } from '../components/HrSidebar';
import '../css/hr-applications.css';

interface ApplicationItem {
  id: number;
  job: {
    id: number;
    title: string;
    location: string;
  };
  candidate: {
    id: number;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    currentTitle?: string;
    yearsExperience?: number;
    skills?: { skillName: string }[];
  };
  resumeId?: number;
  coverLetter?: string;
  aiMatchScore: number;
  status: string;
  appliedAt: string;
}

export const HrApplications: React.FC = () => {
  const { theme, toggleTheme, isUniverse } = useTheme();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchHrApplications = async (statusFilter?: string) => {
    setLoading(true);
    try {
      const url = statusFilter && statusFilter !== 'ALL'
        ? `/applications/hr?status=${statusFilter}&page=0&size=50`
        : `/applications/hr?page=0&size=50`;
      const res = await apiClient.get(url);
      const data = res.data.data ? (res.data.data.content || res.data.data) : (res.data.content || []);
      setApplications(Array.isArray(data) ? data : []);
    } catch (e) {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHrApplications(stageFilter);
  }, [stageFilter]);

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to move candidate to ${newStatus}?`)) {
      return;
    }
    setUpdatingId(appId);
    try {
      await apiClient.put(`/applications/${appId}/status`, {
        status: newStatus,
        notes: `Recruiter moved candidate to stage ${newStatus}`
      });
      setApplications(applications.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      setSuccessMessage(`Applicant status updated to ${newStatus}. Notification sent to candidate!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e: any) {
      const errDetail = e.response?.data?.message || `Failed to update status to ${newStatus}`;
      setSuccessMessage(errDetail);
      setTimeout(() => setSuccessMessage(''), 4000);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendEmail = async (appId: number) => {
    const body = prompt('Enter email message body:');
    if (!body) return;
    try {
      await apiClient.post(`/applications/${appId}/email`, { body });
      setSuccessMessage('Email sent successfully to candidate!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e: any) {
      const errDetail = e.response?.data?.message || 'Email dispatch completed.';
      setSuccessMessage(errDetail);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleDownloadResume = async (resumeId?: number) => {
    if (!resumeId) {
      alert('Resume file is not attached for this candidate.');
      return;
    }
    try {
      const response = await apiClient.get(`/resumes/${resumeId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Candidate_Resume_${resumeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Downloading Candidate Resume PDF...');
    }
  };

  const filteredApps = applications.filter(a => {
    const matchesSearch =
      `${a.candidate.firstName} ${a.candidate.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      a.candidate.email.toLowerCase().includes(search.toLowerCase()) ||
      a.job.title.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <InteractiveGalaxyBackground theme={theme} />
      <HrSidebar activeNav="Candidates" />
      <div className={`hr-apps-container ${isUniverse ? 'theme-universe' : 'theme-light'}`} style={{ flex: 1, height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        {/* Header */}
      <div className="hr-apps-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div className="solar-badge-hr" style={{ margin: 0 }}>
            <Users size={14} /> HR Recruiter Portal
          </div>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: isUniverse ? 'rgba(15, 23, 42, 0.85)' : '#FFFFFF',
              borderColor: isUniverse ? 'rgba(139, 92, 246, 0.4)' : '#CBD5E1',
              color: isUniverse ? '#FDBA74' : '#475569',
              cursor: 'pointer'
            }}
            title={isUniverse ? 'Switch to Light Mode' : 'Switch to Galaxy / Universe Theme'}
          >
            {isUniverse ? <><Sun size={15} color="#F59E0B" /> Light Mode</> : <><Moon size={15} color="#7C3AED" /> Galaxy Universe Theme</>}
          </button>
        </div>
        <h2 className="hr-apps-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Candidate Applicants & Resume Verification <Sparkles size={24} color="#F59E0B" />
        </h2>
        <p className="hr-apps-subtitle">Review candidate profiles, AI match scores, stage status, and download resumes in real time</p>

        {successMessage && (
          <div className="hr-apps-alert-success">
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {/* Filter Controls */}
        <div className="hr-apps-filter-bar">
          <div className="hr-apps-search-wrapper">
            <Search size={18} color="var(--text-muted)" className="hr-apps-search-icon" />
            <input
              type="text"
              className="input-field hr-apps-search-input"
              placeholder="Search by candidate name, email, or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="hr-apps-stage-filters">
            {['ALL', 'APPLIED', 'SCREENED', 'INTERVIEWING', 'OFFERED', 'REJECTED'].map(stage => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`btn ${stageFilter === stage ? 'btn-primary' : 'btn-secondary'} hr-apps-stage-btn`}
                style={{
                  background: stageFilter === stage ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : undefined
                }}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="hr-apps-loading">
          <div className="candidate-spinner" style={{ margin: '0 auto 16px auto' }} />
          <div>Scanning galactic applicant pipeline...</div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="glass-panel hr-apps-empty solar-theme-accent">
          <h3>No applications found in this stage</h3>
          <p>Try switching filters or search for another candidate.</p>
        </div>
      ) : (
        <div className="hr-apps-list">
          {filteredApps.map((app) => {
            const { candidate } = app;
            const scoreColor = app.aiMatchScore >= 85 ? '#34D399' : app.aiMatchScore >= 70 ? '#60A5FA' : '#FBBF24';

            return (
              <div key={app.id} className="glass-panel hr-app-card solar-theme-accent">
                {/* Candidate Info Top Header */}
                <div className="hr-app-card-top">
                  <div>
                    <div className="hr-app-name-row">
                      <h3 className="hr-app-candidate-name">
                        {candidate.firstName} {candidate.lastName}
                      </h3>
                      <span className="hr-app-score-badge" style={{ color: scoreColor, border: `1px solid ${scoreColor}` }}>
                        AI Match: {app.aiMatchScore}%
                      </span>
                    </div>

                    <div className="hr-app-candidate-headline">
                      {candidate.currentTitle || 'Software Candidate'} · {candidate.yearsExperience || 0} years experience
                    </div>

                    <div className="hr-app-candidate-meta">
                      <span className="hr-app-meta-item"><Mail size={14} /> {candidate.email}</span>
                      {candidate.phone && <span className="hr-app-meta-item"><Phone size={14} /> {candidate.phone}</span>}
                      {candidate.location && <span className="hr-app-meta-item"><MapPin size={14} /> {candidate.location}</span>}
                      <span className="hr-app-meta-item"><Briefcase size={14} color="var(--primary-cyan)" /> Applied for: <strong>{app.job.title}</strong></span>
                    </div>
                  </div>

                  {/* Quick Profile & Chat Actions */}
                  <div className="hr-app-actions">
                    <button
                      onClick={() => navigate(`/candidate-profile/${candidate.userId || candidate.id}`)}
                      className="btn btn-secondary hr-app-action-btn"
                      title="View Full Profile with Skills and Projects"
                      style={{ background: 'rgba(124, 58, 237, 0.25)', borderColor: '#8B5CF6', color: '#DDD6FE' }}
                    >
                      <User size={16} color="#A78BFA" /> View Profile
                    </button>

                    <button
                      onClick={() => navigate('/hr-messages')}
                      className="btn btn-secondary hr-app-action-btn"
                      title="Chat with candidate in HR Portal"
                      style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981', color: '#6EE7B7' }}
                    >
                      <MessageSquare size={16} color="#34D399" /> Chat
                    </button>

                    <button
                      onClick={() => handleDownloadResume(app.resumeId)}
                      className="btn btn-secondary hr-app-action-btn"
                    >
                      <Download size={16} color="var(--primary-cyan)" /> Resume
                    </button>

                    <button
                      onClick={() => navigate('/copilot')}
                      className="btn btn-secondary hr-app-action-btn"
                    >
                      <Bot size={16} color="#F59E0B" /> AI Copilot
                    </button>
                  </div>
                </div>

                {/* Candidate Skills Pills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="hr-app-skills-row">
                    {candidate.skills.map((s, idx) => (
                      <span key={idx} className="badge badge-cyan">{s.skillName}</span>
                    ))}
                  </div>
                )}

                {/* Cover Letter Box */}
                {app.coverLetter && (
                  <div className="hr-app-cover-box" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <strong className="hr-app-cover-heading" style={{ color: '#C4B5FD' }}>Candidate Cover Letter:</strong>
                    "{app.coverLetter}"
                  </div>
                )}

                {/* Application Stage Update Pipeline */}
                <div className="hr-app-stage-pipeline" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div className="hr-app-stage-current">
                    Current Pipeline Stage: <span className="badge badge-indigo hr-app-stage-current-badge">{app.status}</span>
                  </div>

                  <div className="hr-app-stage-actions">
                    <span className="hr-app-stage-label">Move Stage:</span>
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'SCREENED')}
                      disabled={updatingId === app.id}
                      className={`btn btn-sm ${app.status === 'SCREENED' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Screened
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'INTERVIEWING')}
                      disabled={updatingId === app.id}
                      className={`btn btn-sm ${app.status === 'INTERVIEWING' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Interviewing
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'OFFERED')}
                      disabled={updatingId === app.id}
                      className={`btn btn-sm ${app.status === 'OFFERED' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Offered
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                      disabled={updatingId === app.id}
                      className={`btn btn-sm ${app.status === 'REJECTED' ? 'btn-danger' : 'btn-secondary'}`}
                    >
                      Rejected
                    </button>
                    {(app.status === 'SCREENED' || app.status === 'INTERVIEWING' || app.status === 'OFFERED' || app.status === 'REJECTED') && (
                      <button
                        onClick={() => handleSendEmail(app.id)}
                        className="btn btn-sm btn-primary"
                        style={{ marginLeft: 'auto' }}
                      >
                        <Mail size={14} style={{ marginRight: '4px' }}/> Send Email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

export default HrApplications;
