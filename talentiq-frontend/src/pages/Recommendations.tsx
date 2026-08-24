import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Moon3DCanvas } from '../components/Moon3DCanvas';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  Briefcase,
  MapPin,
  Building2,
  MessageSquare,
  RefreshCw,
  Zap,
  TrendingUp,
  DollarSign,
  Layers,
  X,
  Flame,
  Star,
  Send,
  Bot,
  User,
  ShieldAlert,
  ShieldBan,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import '../css/recommendations.css';

interface SkillDto {
  skillName: string;
  required?: boolean;
}

interface CompanyDto {
  name: string;
  logoUrl?: string;
  industry?: string;
  website?: string;
}

interface JobDto {
  id: number;
  title: string;
  slug?: string;
  company: CompanyDto;
  postedById?: number;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  location?: string;
  jobType?: string;
  remote?: boolean;
  hybrid?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  experienceLevel?: string;
  requiredSkills?: SkillDto[];
}

interface RecommendationItem {
  id: number;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore?: number;
  locationScore: number;
  semanticScore?: number;
  job: JobDto;
  matchingSkills: string[];
  missingSkills: string[];
  strengths: string[];
  improvementSuggestions?: string[];
}

interface RecommendationStatus {
  hasResume: boolean;
  resumeCount: number;
  activeResumeName?: string;
  activeResumeId?: number;
  parseStatus?: string;
  isParsed?: boolean;
  profileSkillsCount: number;
  candidateSkills: string[];
  extractedSkills: string[];
  profileCompletion: number;
  totalMatchingJobs: number;
  highMatchJobsCount: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  suggestedJobs?: JobDto[];
  intent?: string;
  warningCount?: number;
  isBlocked?: boolean;
  requiresResume?: boolean;
}

export const Recommendations: React.FC = () => {
  const navigate = useNavigate();

  // Recommendations Data
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [status, setStatus] = useState<RecommendationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'85_PLUS' | 'ALL' | 'REMOTE' | '90_PLUS'>('85_PLUS');

  // Resume Upload State
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatResumeInputRef = useRef<HTMLInputElement | null>(null);

  // Job Actions State
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [selectedModalJob, setSelectedModalJob] = useState<JobDto | null>(null);

  // ── AI Career Agent Chat State ──
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [securityBlocked, setSecurityBlocked] = useState(false);
  const [securityWarningCount, setSecurityWarningCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'agent',
      text: '👋 Hello! I am your **HireMind-AI Career Advisor**. I can instantly analyze recent HR job postings, match your resume for 85%+ opportunities, or find specific roles. How can I help your career today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchStatusAndRecs();
    fetchAppliedJobs();
  }, [selectedFilter]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const fetchAppliedJobs = async () => {
    try {
      const res = await apiClient.get('/applications/my');
      const apps = res.data?.content || res.data?.data?.content || res.data?.data || [];
      if (Array.isArray(apps)) {
        const ids = apps.map((a: any) => a.job?.id || a.jobId).filter(Boolean);
        setAppliedJobIds(ids);
      }
    } catch (e) {
      // Ignore fallback
    }
  };

  const fetchStatusAndRecs = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      // 1. Fetch Candidate Resume Status & Match Statistics
      try {
        const statusRes = await apiClient.get('/recommendations/status');
        const currentStatus = statusRes.data?.data || statusRes.data;
        setStatus(currentStatus);
      } catch (e) {
        console.warn('Could not fetch recommendation status:', e);
      }

      // Determine minScore based on active filter
      let minScoreParam: number | undefined;
      if (selectedFilter === '85_PLUS') minScoreParam = 85;
      else if (selectedFilter === '90_PLUS') minScoreParam = 90;

      // 2. Fetch First 10 Recommendations
      setCurrentPage(0);
      const url = `/recommendations/jobs?page=0&size=10${minScoreParam ? `&minScore=${minScoreParam}` : ''}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await apiClient.get(url);
      const content = res.data?.content || res.data?.data?.content || [];
      const totalP = res.data?.totalPages || res.data?.data?.totalPages || 1;
      const totalEl = res.data?.totalElements || res.data?.data?.totalElements || content.length;

      let filtered = content;
      if (selectedFilter === 'REMOTE') {
        filtered = content.filter((item: RecommendationItem) => item.job?.remote);
      }

      setRecommendations(filtered);
      setTotalPages(totalP);
      setTotalElements(totalEl);
    } catch (e) {
      console.warn('Recommendations fetch error:', e);
      setRecommendations([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || currentPage + 1 >= totalPages) return;
    setLoadingMore(true);

    const nextPage = currentPage + 1;
    let minScoreParam: number | undefined;
    if (selectedFilter === '85_PLUS') minScoreParam = 85;
    else if (selectedFilter === '90_PLUS') minScoreParam = 90;

    try {
      const url = `/recommendations/jobs?page=${nextPage}&size=10${minScoreParam ? `&minScore=${minScoreParam}` : ''}`;
      const res = await apiClient.get(url);
      const newItems = res.data?.content || res.data?.data?.content || [];
      
      let filtered = newItems;
      if (selectedFilter === 'REMOTE') {
        filtered = newItems.filter((item: RecommendationItem) => item.job?.remote);
      }

      setRecommendations(prev => [...prev, ...filtered]);
      setCurrentPage(nextPage);
      setTotalPages(res.data?.totalPages || res.data?.data?.totalPages || totalPages);
    } catch (e) {
      console.error('Error loading more recommendations:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRecalculateMatches = async () => {
    setRecalculating(true);
    await fetchStatusAndRecs(true);
  };

  // ── AI Career Agent Chat Messaging ───────────────────────────────────────
  const handleSendMessage = async (msgToSend?: string) => {
    const text = (msgToSend || chatInput).trim();
    if (!text || chatLoading || securityBlocked) return;

    const userMsgId = 'user-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await apiClient.post('/recommendations/chat', {
        message: text,
        history
      });

      const data = res.data?.data || res.data;
      if (data) {
        if (data.isBlocked) {
          setSecurityBlocked(true);
        }
        if (data.warningCount) {
          setSecurityWarningCount(data.warningCount);
        }

        const agentMsg: ChatMessage = {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: data.reply || 'Here are the job recommendations matching your request:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedJobs: data.suggestedJobs || [],
          intent: data.intent,
          warningCount: data.warningCount,
          isBlocked: data.isBlocked,
          requiresResume: data.requiresResume
        };

        setChatMessages(prev => [...prev, agentMsg]);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'AI Career Agent service temporarily offline. Please try again.';
      setChatMessages(prev => [
        ...prev,
        {
          id: 'agent-err-' + Date.now(),
          sender: 'agent',
          text: `⚠️ ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleInlineResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('versionName', file.name);

    setUploadingResume(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      await apiClient.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess(`"${file.name}" uploaded & parsed! Recalculating 85%+ job matches...`);
      // Update chat message
      setChatMessages(prev => [
        ...prev,
        {
          id: 'agent-upload-' + Date.now(),
          sender: 'agent',
          text: `🎉 **${file.name}** successfully parsed! Your verified skills matrix has been updated. Recalculating precision 85%+ matches now...`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
      setTimeout(() => {
        fetchStatusAndRecs(true);
      }, 1200);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Failed to upload resume. Please check file format.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleApply = async (jobId: number) => {
    if (appliedJobIds.includes(jobId) || applyingJobId === jobId) return;
    setApplyingJobId(jobId);
    try {
      await apiClient.post('/applications', { jobId });
      setAppliedJobIds(prev => [...prev, jobId]);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not submit application.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleChatWithRecruiter = (job: JobDto) => {
    const recipientId = job.postedById || '';
    const jobTitle = encodeURIComponent(job.title || '');
    navigate(`/messages?recipientId=${recipientId}&jobId=${job.id}&jobTitle=${jobTitle}`);
  };

  return (
    <div className="recs-page-wrapper">
      {/* ── FULL-SCREEN 3D MOON UNIVERSE CANVAS BACKGROUND ── */}
      <Moon3DCanvas interactive={true} orbitSpeedMultiplier={1.0} />

      <div className="recs-cosmic-container">
        {/* ── Page Header Banner ── */}
        <div className="recs-hero-panel">
        <div className="recs-hero-content">
          <div className="recs-hero-tag">
            <Sparkles size={15} /> AI Recommendation Engine 2.0
          </div>
          <h1 className="recs-hero-title">
            Personalized <span className="recs-title-gradient">Cosmic Job Matches</span>
          </h1>
          <p className="recs-hero-desc">
            Autonomous multi-factor AI matching calculated from your verified resume structure, skill matrix, and career trajectory against HR-posted opportunities.
          </p>

          {/* Quick Metrics Bar */}
          {status && (
            <div className="recs-metrics-strip">
              <div className="recs-metric-chip">
                <Flame size={15} color="#EC4899" />
                <span><strong>{status.highMatchJobsCount}</strong> 85%+ Super Matches</span>
              </div>
              <div className="recs-metric-chip">
                <Briefcase size={15} color="#A78BFA" />
                <span><strong>{status.totalMatchingJobs}</strong> Active Roles Analyzed</span>
              </div>
              {status.activeResumeName && (
                <div className="recs-metric-chip active-resume">
                  <FileText size={15} color="#10B981" />
                  <span>Resume: <strong>{status.activeResumeName}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="recs-hero-actions">
          <button
            onClick={handleRecalculateMatches}
            disabled={recalculating}
            className="cosmic-btn-primary recs-recalc-btn"
            title="Force refresh matches"
          >
            <RefreshCw size={16} className={recalculating ? 'spin-icon' : ''} />
            {recalculating ? 'Analyzing Matrix...' : 'Re-Analyze Matches'}
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE AI CAREER AGENT CHAT PANEL (Candidate Side Only) ── */}
      <div className="recs-agent-panel">
        <div className="recs-agent-header">
          <div className="recs-agent-header-left">
            <div className="recs-agent-orb">
              <Bot size={22} color="#FFFFFF" />
            </div>
            <div>
              <div className="recs-agent-title-row">
                <h3 className="recs-agent-name">HireMind-AI Career Advisor</h3>
                <span className="recs-agent-online-pill">
                  <span className="recs-pulse-dot" /> Neural Agent Active
                </span>
              </div>
              <p className="recs-agent-subtitle">
                Ask for specific roles, 10 recent HR postings, or resume-based 85%+ matching
              </p>
            </div>
          </div>

          <div className="recs-agent-header-actions">
            <button
              onClick={() => setChatMessages([
                {
                  id: 'welcome-msg-reset',
                  sender: 'agent',
                  text: 'Chat history cleared. How can I assist with your job search today?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ])}
              className="recs-agent-header-btn"
              title="Clear Chat History"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="recs-agent-header-btn"
              title={chatOpen ? 'Minimize Assistant' : 'Expand Assistant'}
            >
              {chatOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {chatOpen && (
          <div className="recs-agent-body">
            {/* Quick Prompt Suggestion Pills */}
            <div className="recs-quick-prompts-bar">
              <span className="recs-quick-prompts-label">⚡ Quick Queries:</span>
              <button
                onClick={() => handleSendMessage('Suggest me Java developer jobs')}
                className="recs-prompt-chip"
              >
                💡 Suggest me Java developer jobs
              </button>
              <button
                onClick={() => handleSendMessage('Based on my resume suggest me jobs')}
                className="recs-prompt-chip"
              >
                📄 Based on my resume suggest me jobs
              </button>
              <button
                onClick={() => handleSendMessage('Show recent Remote React developer roles')}
                className="recs-prompt-chip"
              >
                🚀 Remote React roles
              </button>
              <button
                onClick={() => handleSendMessage('Find Cloud & DevOps engineer openings')}
                className="recs-prompt-chip"
              >
                ☁️ DevOps & Cloud openings
              </button>
            </div>

            {/* Security Warning Alert Banner (if warning issued) */}
            {securityWarningCount > 0 && !securityBlocked && (
              <div className="recs-security-warning-banner">
                <ShieldAlert size={18} />
                <span>
                  <strong>Security Notice:</strong> You have received 1 policy warning for unauthorized command patterns. Further violations will trigger an automatic 24-hour block.
                </span>
              </div>
            )}

            {/* Security Blocked Alert Banner */}
            {securityBlocked && (
              <div className="recs-security-blocked-banner">
                <ShieldBan size={20} />
                <div>
                  <strong>🚫 Chat Access Temporarily Suspended:</strong> Repeated prohibited commands (destructive queries or internal probing) detected. Access is blocked for 24 hours.
                </div>
              </div>
            )}

            {/* Chat Timeline */}
            <div className="recs-chat-timeline">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`recs-chat-message-row ${msg.sender === 'user' ? 'user-side' : 'agent-side'}`}
                >
                  <div className="recs-chat-avatar">
                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  <div className="recs-chat-bubble-wrap">
                    <div className={`recs-chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'agent-bubble'}`}>
                      <div className="recs-chat-text">{msg.text}</div>

                      {/* If response requires resume upload */}
                      {msg.requiresResume && (
                        <div className="recs-chat-resume-action-box">
                          <input
                            type="file"
                            ref={chatResumeInputRef}
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx"
                            onChange={handleInlineResumeUpload}
                          />
                          <button
                            onClick={() => chatResumeInputRef.current?.click()}
                            disabled={uploadingResume}
                            className="cosmic-btn-primary recs-chat-resume-btn"
                          >
                            <UploadCloud size={15} />
                            {uploadingResume ? 'Uploading & Parsing...' : 'Upload Resume Now (PDF/DOCX)'}
                          </button>
                          <button
                            onClick={() => navigate('/portfolio')}
                            className="cosmic-btn-secondary recs-chat-resume-btn"
                          >
                            <FileText size={15} /> Open Resume Center
                          </button>
                        </div>
                      )}

                      {/* Embedded Job Suggestions Cards inside Chat Bubble */}
                      {msg.suggestedJobs && msg.suggestedJobs.length > 0 && (
                        <div className="recs-chat-jobs-grid">
                          {msg.suggestedJobs.map(job => (
                            <div key={job.id} className="recs-chat-job-mini-card">
                              <div className="recs-mini-job-top">
                                <div className="recs-mini-job-title-row">
                                  <h4 className="recs-mini-job-title">{job.title}</h4>
                                  {job.remote && <span className="recs-badge-remote mini">🚀 Remote</span>}
                                </div>
                                <div className="recs-mini-job-company">
                                  <Building2 size={13} /> {job.company?.name} · {job.location || 'Remote'}
                                </div>
                              </div>

                              {/* Skills chips */}
                              {job.requiredSkills && job.requiredSkills.length > 0 && (
                                <div className="recs-mini-skills-row">
                                  {job.requiredSkills.slice(0, 4).map((sk, idx) => (
                                    <span key={idx} className="recs-mini-skill-tag">
                                      {sk.skillName}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Mini Actions */}
                              <div className="recs-mini-actions-row">
                                <button
                                  onClick={() => setSelectedModalJob(job)}
                                  className="cosmic-btn-primary recs-mini-btn"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={() => handleChatWithRecruiter(job)}
                                  className="cosmic-btn-primary recs-mini-btn"
                                >
                                  <MessageSquare size={12} /> Message HR
                                </button>
                                {appliedJobIds.includes(job.id) ? (
                                  <span className="recs-mini-applied-tag">
                                    <CheckCircle2 size={13} /> Applied
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleApply(job.id)}
                                    disabled={applyingJobId === job.id}
                                    className="cosmic-btn-primary recs-mini-btn apply"
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="recs-chat-time">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="recs-chat-message-row agent-side">
                  <div className="recs-chat-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="recs-chat-bubble agent-bubble loading-dots">
                    <span className="recs-dot-pulse" />
                    <span className="recs-dot-pulse" />
                    <span className="recs-dot-pulse" />
                    <span style={{ fontSize: 13, color: '#A78BFA', marginLeft: 8 }}>
                      Searching indexed database & analyzing resume...
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="recs-chat-input-bar">
              <input
                type="text"
                placeholder={
                  securityBlocked
                    ? 'AI Career Advisor is currently suspended due to security policy violations.'
                    : 'Ask your AI Career Advisor (e.g. "Suggest me Java developer jobs" or "Based on my resume suggest me jobs")...'
                }
                value={chatInput}
                disabled={chatLoading || securityBlocked}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="recs-chat-input"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || chatLoading || securityBlocked}
                className="cosmic-btn-primary recs-chat-send-btn"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RESUME VERIFICATION PROMPT (If no resume is uploaded) ── */}
      {status && !status.hasResume && (
        <div className="recs-resume-guard-card">
          <div className="recs-resume-guard-badge">
            <AlertCircle size={16} /> Resume Required for Precision Matching
          </div>

          <div className="recs-resume-guard-body">
            <div className="recs-resume-guard-icon">
              <UploadCloud size={40} color="#EC4899" />
            </div>
            <div>
              <h3 className="recs-resume-guard-title">
                Upload Your Resume to Unlock 85%+ High-Precision Matches
              </h3>
              <p className="recs-resume-guard-desc">
                Our AI agent performs semantic parsing on your resume to extract skills, project achievements, and work history. Uploading your resume allows our model to rank HR-posted jobs with <strong>85%+ confidence</strong>.
              </p>

              {uploadError && <div className="recs-upload-error">{uploadError}</div>}
              {uploadSuccess && <div className="recs-upload-success">{uploadSuccess}</div>}

              <div className="recs-resume-guard-buttons">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx"
                  onChange={handleInlineResumeUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="cosmic-btn-primary recs-guard-action-btn"
                >
                  <UploadCloud size={16} />
                  {uploadingResume ? 'Uploading & Parsing Resume...' : 'Upload Resume Now (PDF/DOCX)'}
                </button>

                <button
                  onClick={() => navigate('/portfolio')}
                  className="cosmic-btn-secondary recs-guard-action-btn"
                >
                  <FileText size={16} /> Open Resume Center
                </button>

                <button
                  onClick={() => fetchStatusAndRecs(true)}
                  className="recs-guard-text-btn"
                >
                  <Zap size={14} /> Continue with Manual Profile Skills
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Orbit Row ── */}
      <div className="recs-filters-panel">
        <div className="recs-filters-label">
          <Layers size={15} /> Match Orbit Filter:
        </div>

        <div className="recs-pill-group">
          <button
            onClick={() => setSelectedFilter('85_PLUS')}
            className={`recs-filter-pill ${selectedFilter === '85_PLUS' ? 'active-super' : ''}`}
          >
            <Flame size={14} /> 🔥 85%+ Super Match
          </button>
          <button
            onClick={() => setSelectedFilter('90_PLUS')}
            className={`recs-filter-pill ${selectedFilter === '90_PLUS' ? 'active' : ''}`}
          >
            <Star size={14} /> ⚡ 90%+ Elite Tier
          </button>
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`recs-filter-pill ${selectedFilter === 'ALL' ? 'active' : ''}`}
          >
            <Sparkles size={14} /> ✨ All AI Matches
          </button>
          <button
            onClick={() => setSelectedFilter('REMOTE')}
            className={`recs-filter-pill ${selectedFilter === 'REMOTE' ? 'active' : ''}`}
          >
            🚀 Remote Only
          </button>
        </div>

        <div className="recs-results-count">
          Showing {recommendations.length} {totalElements > 0 ? `of ${totalElements}` : ''} matched opportunities
        </div>
      </div>

      {/* ── Recommendations List Grid ── */}
      {loading ? (
        <div className="recs-loading-box">
          <div className="recs-loading-spinner" />
          <h3 className="recs-loading-title">Neural Engine Computing Matches...</h3>
          <p className="recs-loading-sub">Analyzing skill matrices, title vectors, and experience levels</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="recs-empty-box">
          <Sparkles size={48} color="#7C3AED" style={{ margin: '0 auto 16px' }} />
          <h3 className="recs-empty-title">No Orbiting Roles in this Score Tier</h3>
          <p className="recs-empty-desc">
            Try switching to <strong>"All AI Matches"</strong> or ask the AI Career Advisor above to search for specific roles.
          </p>
          <button
            onClick={() => setSelectedFilter('ALL')}
            className="cosmic-btn-primary"
            style={{ marginTop: 16 }}
          >
            Show All AI Matches
          </button>
        </div>
      ) : (
        <div className="recs-cards-list">
          {recommendations.map(rec => {
            const isApplied = appliedJobIds.includes(rec.job.id);
            const isSuperMatch = rec.overallScore >= 85;

            return (
              <div
                key={rec.id}
                className={`recs-job-card ${isSuperMatch ? 'super-match-card' : ''}`}
              >
                {/* Top Section */}
                <div className="recs-card-top">
                  <div className="recs-card-title-block">
                    <div className="recs-badges-row">
                      {isSuperMatch && (
                        <span className="recs-badge-super">
                          <Flame size={13} /> 85%+ COSMIC MATCH
                        </span>
                      )}
                      {rec.job.remote && (
                        <span className="recs-badge-remote">🚀 Remote</span>
                      )}
                      {rec.job.hybrid && (
                        <span className="recs-badge-hybrid">🪐 Hybrid</span>
                      )}
                      {rec.job.experienceLevel && (
                        <span className="recs-badge-exp">{rec.job.experienceLevel}</span>
                      )}
                    </div>

                    <h2 className="recs-job-title">{rec.job.title}</h2>
                    <div className="recs-company-location">
                      <Building2 size={15} color="#C4B5FD" />
                      <span className="recs-company-name">{rec.job.company.name}</span>
                      <span className="recs-dot">•</span>
                      <MapPin size={15} color="#94A3B8" />
                      <span>{rec.job.location || 'Location Not Specified'}</span>
                    </div>

                    {/* Salary Range if present */}
                    {(rec.job.salaryMin || rec.job.salaryMax) && (
                      <div className="recs-salary-tag">
                        <DollarSign size={14} color="#10B981" />
                        <span>
                          {rec.job.salaryCurrency || '$'}{rec.job.salaryMin?.toLocaleString()} — {rec.job.salaryCurrency || '$'}{rec.job.salaryMax?.toLocaleString()} / {rec.job.salaryPeriod || 'yr'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Circular / Gradient Match Gauge */}
                  <div className={`recs-match-gauge ${isSuperMatch ? 'super-gauge' : ''}`}>
                    <div className="recs-gauge-number">{rec.overallScore.toFixed(0)}%</div>
                    <div className="recs-gauge-label">AI MATCH FIT</div>
                  </div>
                </div>

                {/* 3 Fit Meters Breakdown */}
                <div className="recs-fit-meters-panel">
                  <div className="recs-fit-col">
                    <div className="recs-meter-header">
                      <span>⚡ Skills Alignment</span>
                      <span className="recs-meter-val">{rec.skillScore}%</span>
                    </div>
                    <div className="recs-meter-bar-track">
                      <div className="recs-meter-bar-fill skills" style={{ width: `${Math.min(100, rec.skillScore)}%` }} />
                    </div>
                  </div>

                  <div className="recs-fit-col">
                    <div className="recs-meter-header">
                      <span>💼 Experience Fit</span>
                      <span className="recs-meter-val">{rec.experienceScore}%</span>
                    </div>
                    <div className="recs-meter-bar-track">
                      <div className="recs-meter-bar-fill experience" style={{ width: `${Math.min(100, rec.experienceScore)}%` }} />
                    </div>
                  </div>

                  <div className="recs-fit-col">
                    <div className="recs-meter-header">
                      <span>📍 Location / Remote</span>
                      <span className="recs-meter-val">{rec.locationScore}%</span>
                    </div>
                    <div className="recs-meter-bar-track">
                      <div className="recs-meter-bar-fill location" style={{ width: `${Math.min(100, rec.locationScore)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Skills Match Section */}
                <div className="recs-skills-breakdown">
                  {rec.matchingSkills && rec.matchingSkills.length > 0 && (
                    <div className="recs-matching-skills-row">
                      <span className="recs-skills-title">Matched Tech:</span>
                      <div className="recs-skills-chips-wrap">
                        {rec.matchingSkills.map((sk, idx) => (
                          <span key={idx} className="recs-chip-matched">
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rec.missingSkills && rec.missingSkills.length > 0 && (
                    <div className="recs-missing-skills-row">
                      <span className="recs-skills-title-missing">Recommended Additions:</span>
                      <div className="recs-skills-chips-wrap">
                        {rec.missingSkills.slice(0, 4).map((sk, idx) => (
                          <span key={idx} className="recs-chip-missing">
                            + {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Strengths & Improvement Insights */}
                <div className="recs-insights-block">
                  {rec.strengths && rec.strengths.length > 0 && (
                    <div className="recs-insight-col">
                      <div className="recs-insight-header emerald">
                        <CheckCircle2 size={16} /> Key Matching Strengths
                      </div>
                      <ul className="recs-insight-list">
                        {rec.strengths.map((str, idx) => (
                          <li key={idx} className="recs-insight-item">
                            <span className="recs-dot emerald" /> {str}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rec.improvementSuggestions && rec.improvementSuggestions.length > 0 && (
                    <div className="recs-insight-col">
                      <div className="recs-insight-header amber">
                        <TrendingUp size={16} /> AI Growth Recommendations
                      </div>
                      <ul className="recs-insight-list">
                        {rec.improvementSuggestions.map((imp, idx) => (
                          <li key={idx} className="recs-insight-item">
                            <span className="recs-dot amber" /> {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="recs-card-footer">
                  <button
                    onClick={() => setSelectedModalJob(rec.job)}
                    className="cosmic-btn-primary recs-btn-details"
                  >
                    Show Details
                  </button>

                  <button
                    onClick={() => handleChatWithRecruiter(rec.job)}
                    className="cosmic-btn-primary recs-btn-message"
                  >
                    <MessageSquare size={15} /> Message HR
                  </button>

                  {isApplied ? (
                    <span className="recs-applied-badge">
                      <CheckCircle2 size={16} /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(rec.job.id)}
                      disabled={applyingJobId === rec.job.id}
                      className="cosmic-btn-primary recs-btn-apply"
                    >
                      {applyingJobId === rec.job.id ? 'Submitting...' : 'Apply Now 🚀'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── INSTANT LOAD MORE BUTTON (Indexed Pagination) ── */}
      {!loading && currentPage + 1 < totalPages && (
        <div className="recs-load-more-wrap">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="cosmic-btn-primary recs-load-more-btn"
          >
            <Sparkles size={16} />
            {loadingMore ? 'Loading Next Batch...' : 'Load More Matches (10+)'}
          </button>
        </div>
      )}

      {/* ── JOB DETAILS MODAL ── */}
      {selectedModalJob && (
        <div className="recs-modal-backdrop" onClick={() => setSelectedModalJob(null)}>
          <div className="recs-modal-card" onClick={e => e.stopPropagation()}>
            <div className="recs-modal-header">
              <div>
                <h2 className="recs-modal-title">{selectedModalJob.title}</h2>
                <div className="recs-modal-sub">
                  <Building2 size={16} color="#A78BFA" />
                  <span>{selectedModalJob.company?.name}</span>
                  <span>•</span>
                  <MapPin size={16} color="#94A3B8" />
                  <span>{selectedModalJob.location || 'Remote'}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedModalJob(null)}
                className="recs-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="recs-modal-body">
              {/* Job Description */}
              {selectedModalJob.description && (
                <div className="recs-modal-section">
                  <h4 className="recs-modal-section-title">Overview & Role Purpose</h4>
                  <p className="recs-modal-text">{selectedModalJob.description}</p>
                </div>
              )}

              {/* Responsibilities */}
              {selectedModalJob.responsibilities && (
                <div className="recs-modal-section">
                  <h4 className="recs-modal-section-title">Key Responsibilities</h4>
                  <p className="recs-modal-text">{selectedModalJob.responsibilities}</p>
                </div>
              )}

              {/* Requirements */}
              {selectedModalJob.requirements && (
                <div className="recs-modal-section">
                  <h4 className="recs-modal-section-title">Qualifications & Requirements</h4>
                  <p className="recs-modal-text">{selectedModalJob.requirements}</p>
                </div>
              )}

              {/* Required Skills */}
              {selectedModalJob.requiredSkills && selectedModalJob.requiredSkills.length > 0 && (
                <div className="recs-modal-section">
                  <h4 className="recs-modal-section-title">Required Skills Matrix</h4>
                  <div className="recs-skills-chips-wrap">
                    {selectedModalJob.requiredSkills.map((sk, idx) => (
                      <span key={idx} className={`recs-chip-matched ${sk.required ? 'required' : ''}`}>
                        {sk.required ? '⚡ ' : '• '}{sk.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="recs-modal-footer">
              <button
                onClick={() => handleChatWithRecruiter(selectedModalJob)}
                className="cosmic-btn-primary recs-btn-message"
              >
                <MessageSquare size={15} /> Message HR
              </button>

              {appliedJobIds.includes(selectedModalJob.id) ? (
                <span className="recs-applied-badge">
                  <CheckCircle2 size={16} /> Already Applied
                </span>
              ) : (
                <button
                  onClick={() => {
                    handleApply(selectedModalJob.id);
                    setSelectedModalJob(null);
                  }}
                  className="cosmic-btn-primary recs-btn-apply"
                >
                  Apply to this Position 🚀
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
export default Recommendations;
