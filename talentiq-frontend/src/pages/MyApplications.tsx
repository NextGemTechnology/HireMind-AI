import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Moon3DCanvas } from '../components/Moon3DCanvas';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Building,
  Moon,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  MapPin,
  Award,
  Zap,
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';
import '../css/my-applications.css';

interface ApplicationItem {
  id: number;
  job: {
    id?: number;
    title: string;
    company: { name: string; logoUrl?: string };
    location: string;
    remote?: boolean;
    hybrid?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    description?: string;
    postedById?: number;
  };
  status: 'APPLIED' | 'SCREENED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';
  aiMatchScore: number;
  appliedAt: string;
  interviewDate?: string;
  offerAmount?: number;
  offerCurrency?: string;
  rejectionReason?: string;
  notes?: string;
}

export const MyApplications: React.FC = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'INTERVIEWING' | 'OFFERED' | 'SCREENED' | 'APPLIED'>('ALL');
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  const [selectedJobModal, setSelectedJobModal] = useState<any | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/applications/my?page=0&size=50');
      const data = res.data?.content || res.data?.data?.content || res.data?.data || [];
      setApplications(Array.isArray(data) ? data : []);
    } catch (e) {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (selectedFilter === 'ALL') return true;
    return app.status === selectedFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OFFERED':
        return (
          <span className="lunar-badge offer">
            <Award size={13} /> Offer Received
          </span>
        );
      case 'INTERVIEWING':
        return (
          <span className="lunar-badge interview">
            <Calendar size={13} /> Interview Scheduled
          </span>
        );
      case 'SCREENED':
        return (
          <span className="lunar-badge screened">
            <Sparkles size={13} /> Under Review / Screened
          </span>
        );
      case 'REJECTED':
        return (
          <span className="lunar-badge rejected">
            <XCircle size={13} /> Not Selected
          </span>
        );
      default:
        return (
          <span className="lunar-badge applied">
            <CheckCircle2 size={13} /> Application Submitted
          </span>
        );
    }
  };

  const getStageStep = (status: string): number => {
    switch (status) {
      case 'OFFERED': return 4;
      case 'INTERVIEWING': return 3;
      case 'SCREENED': return 2;
      case 'REJECTED': return 1;
      default: return 1;
    }
  };

  const handleChatWithRecruiter = (job: any) => {
    const recipientId = job.postedById || '';
    const jobTitle = encodeURIComponent(job.title || '');
    navigate(`/messages?recipientId=${recipientId}&jobId=${job.id || ''}&jobTitle=${jobTitle}`);
  };

  // Metrics Count
  const totalCount = applications.length;
  const interviewingCount = applications.filter(a => a.status === 'INTERVIEWING').length;
  const offeredCount = applications.filter(a => a.status === 'OFFERED').length;
  const inReviewCount = applications.filter(a => a.status === 'SCREENED' || a.status === 'APPLIED').length;

  return (
    <div className="lunar-page-wrapper">
      {/* ── FULL-SCREEN 3D MOON UNIVERSE CANVAS BACKGROUND ── */}
      <Moon3DCanvas interactive={true} orbitSpeedMultiplier={1.0} />

      {/* ── MAIN CONTENT CONTAINER (Z-INDEX 10) ── */}
      <div className="lunar-apps-container">
        {/* ── HERO HEADER DIV (Placed Cleanly Just Below Navigation Header) ── */}
        <div className="lunar-hero-panel">
          <div className="lunar-hero-content">
            <h1 className="lunar-hero-title">
              My <span className="lunar-gradient-text">Application Constellation</span>
            </h1>

            {/* Metric Chips inside the Hero Panel */}
            <div className="lunar-metrics-grid">
              <div
                className={`lunar-metric-card ${selectedFilter === 'ALL' ? 'active-metric' : ''}`}
                onClick={() => setSelectedFilter('ALL')}
              >
                <div className="lunar-metric-number">{totalCount}</div>
                <div className="lunar-metric-label">Total Applications</div>
              </div>

              <div
                className={`lunar-metric-card interview ${selectedFilter === 'INTERVIEWING' ? 'active-metric' : ''}`}
                onClick={() => setSelectedFilter('INTERVIEWING')}
              >
                <div className="lunar-metric-number">{interviewingCount}</div>
                <div className="lunar-metric-label">📅 Interviewing</div>
              </div>

              <div
                className={`lunar-metric-card offer ${selectedFilter === 'OFFERED' ? 'active-metric' : ''}`}
                onClick={() => setSelectedFilter('OFFERED')}
              >
                <div className="lunar-metric-number">{offeredCount}</div>
                <div className="lunar-metric-label">🎉 Offers Received</div>
              </div>

              <div
                className={`lunar-metric-card review ${selectedFilter === 'SCREENED' ? 'active-metric' : ''}`}
                onClick={() => setSelectedFilter('SCREENED')}
              >
                <div className="lunar-metric-number">{inReviewCount}</div>
                <div className="lunar-metric-label">⚡ In Review / Screened</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Horizon Pills ── */}
        <div className="lunar-filters-row">
          <button onClick={fetchApplications} className="lunar-refresh-btn" title="Refresh Pipeline">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* ── Motion Application Cards Feed ── */}
        {loading ? (
          <div className="lunar-loading-box">
            <div className="lunar-spinner" />
            <h3 className="lunar-loading-title">Scanning Lunar Orbit Pipelines...</h3>
            <p className="lunar-loading-sub">Synchronizing recruitment milestones and recruiter feedback</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="lunar-empty-box">
            <Moon size={48} color="#93C5FD" style={{ margin: '0 auto 16px' }} />
            <h3 className="lunar-empty-title">No Applications in this Phase</h3>
            <p className="lunar-empty-desc">
              Explore newly posted roles from HR recruiters on the Jobs Radar or check AI Recommendations!
            </p>
            <button onClick={() => navigate('/jobs')} className="cosmic-btn-primary" style={{ marginTop: 16 }}>
              Browse Active Job Orbits 🚀
            </button>
          </div>
        ) : (
          <div className="lunar-cards-list">
            {filteredApplications.map((app, index) => {
              const currentStep = getStageStep(app.status);
              const isExpanded = expandedAppId === app.id;

              return (
                <div
                  key={app.id}
                  className="lunar-app-card"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {/* Main Card Header */}
                  <div className="lunar-card-top">
                    <div className="lunar-card-info">
                      <div className="lunar-badge-row">
                        {getStatusBadge(app.status)}
                        {app.job.remote && <span className="lunar-badge remote">🚀 Remote</span>}
                        {app.job.hybrid && <span className="lunar-badge hybrid">🪐 Hybrid</span>}
                      </div>

                      <h2 className="lunar-job-title">{app.job.title}</h2>

                      <div className="lunar-meta-line">
                        <span className="lunar-company">
                          <Building size={15} color="#93C5FD" />
                          <strong>{app.job.company.name}</strong>
                        </span>
                        <span className="lunar-dot">•</span>
                        <span className="lunar-loc">
                          <MapPin size={15} color="#94A3B8" /> {app.job.location}
                        </span>
                        <span className="lunar-dot">•</span>
                        <span className="lunar-date">
                          Applied {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Salary or Offer Tag */}
                      {app.offerAmount ? (
                        <div className="lunar-offer-banner">
                          <Award size={15} />
                          <span>Offer Package: <strong>{app.offerCurrency || '$'}{app.offerAmount.toLocaleString()}</strong></span>
                        </div>
                      ) : app.job.salaryMin ? (
                        <div className="lunar-salary-tag">
                          <DollarSign size={13} />
                          <span>Est: {app.job.salaryCurrency || '$'}{app.job.salaryMin.toLocaleString()} — {app.job.salaryCurrency || '$'}{app.job.salaryMax?.toLocaleString()}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Lunar Score Ring */}
                    {app.aiMatchScore && (
                      <div className="lunar-score-ring">
                        <div className="lunar-score-val">{app.aiMatchScore}%</div>
                        <div className="lunar-score-lbl">AI FIT</div>
                      </div>
                    )}
                  </div>

                  {/* ── 4-Stage Motion Pipeline Tracker ── */}
                  <div className="lunar-pipeline-stepper">
                    <div className="lunar-step-line">
                      <div
                        className="lunar-step-progress"
                        style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                      />
                    </div>

                    <div className={`lunar-step-node ${currentStep >= 1 ? 'active' : ''}`}>
                      <div className="lunar-node-circle">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="lunar-node-title">1. Applied</span>
                    </div>

                    <div className={`lunar-step-node ${currentStep >= 2 ? 'active' : ''}`}>
                      <div className="lunar-node-circle">
                        {currentStep > 2 ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
                      </div>
                      <span className="lunar-node-title">2. Screened</span>
                    </div>

                    <div className={`lunar-step-node ${currentStep >= 3 ? 'active' : ''}`}>
                      <div className="lunar-node-circle">
                        {currentStep > 3 ? <CheckCircle2 size={14} /> : <Calendar size={14} />}
                      </div>
                      <span className="lunar-node-title">3. Interview</span>
                    </div>

                    <div className={`lunar-step-node ${currentStep >= 4 ? 'active' : ''}`}>
                      <div className="lunar-node-circle">
                        <Award size={14} />
                      </div>
                      <span className="lunar-node-title">4. Offer</span>
                    </div>
                  </div>

                  {/* Interview Countdown Banner */}
                  {app.interviewDate && (
                    <div className="lunar-interview-callout">
                      <Calendar size={16} color="#FBBF24" />
                      <div>
                        <strong>Interview Confirmed:</strong> {new Date(app.interviewDate).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}

                  {/* Expandable Audit Log & Recruiter Feedback */}
                  {isExpanded && (
                    <div className="lunar-expanded-drawer">
                      <h4 className="lunar-drawer-title">
                        <ShieldCheck size={16} /> Recruitment Timeline & Notes
                      </h4>
                      <p className="lunar-drawer-text">
                        {app.notes || 'Your application is currently advancing through recruiter evaluation stages. All interview invitations and assessments will be dispatched via direct messages.'}
                      </p>

                      <div className="lunar-drawer-tips">
                        <Zap size={15} color="#A78BFA" />
                        <span><strong>AI Recommendation:</strong> Review the core tech stack in your profile before the interview call.</span>
                      </div>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="lunar-card-footer">
                    <button
                      onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                      className="lunar-btn-secondary"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Hide Notes' : 'View Timeline & Notes'}
                    </button>

                    <button
                      onClick={() => setSelectedJobModal(app.job)}
                      className="lunar-btn-secondary"
                    >
                      <FileText size={14} /> Role Overview
                    </button>

                    <button
                      onClick={() => handleChatWithRecruiter(app.job)}
                      className="cosmic-btn-primary lunar-btn-primary"
                    >
                      <MessageSquare size={14} /> Message Recruiter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── JOB OVERVIEW MODAL ── */}
        {selectedJobModal && (
          <div className="lunar-modal-backdrop" onClick={() => setSelectedJobModal(null)}>
            <div className="lunar-modal-card" onClick={e => e.stopPropagation()}>
              <div className="lunar-modal-header">
                <div>
                  <h3 className="lunar-modal-title">{selectedJobModal.title}</h3>
                  <div className="lunar-modal-sub">
                    <Building size={14} color="#93C5FD" />
                    <span>{selectedJobModal.company?.name}</span>
                    <span>•</span>
                    <MapPin size={14} color="#94A3B8" />
                    <span>{selectedJobModal.location}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedJobModal(null)} className="lunar-modal-close">
                  <X size={18} />
                </button>
              </div>

              <div className="lunar-modal-body">
                <h4 className="lunar-modal-sec-title">Position Overview</h4>
                <p className="lunar-modal-desc">
                  {selectedJobModal.description || 'Full specifications and technical requirements for this position are available in the primary job catalog.'}
                </p>
              </div>

              <div className="lunar-modal-footer">
                <button onClick={() => setSelectedJobModal(null)} className="lunar-btn-secondary">
                  Close
                </button>
                <button
                  onClick={() => {
                    handleChatWithRecruiter(selectedJobModal);
                    setSelectedJobModal(null);
                  }}
                  className="cosmic-btn-primary lunar-btn-primary"
                >
                  <MessageSquare size={14} /> Message HR Team
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MyApplications;
