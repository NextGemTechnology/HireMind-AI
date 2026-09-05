import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { InteractiveGalaxyBackground } from '../components/InteractiveGalaxyBackground';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  MapPin,
  Building2,
  MessageSquare,
  DollarSign,
  X,
  Flame,
  Send,
  User,
  ChevronDown,
  Trash2,
  RefreshCw,
  Search,
  ArrowUpDown,
  LayoutGrid,
  ListFilter,
  Globe,
  Check,
  Maximize2,
  Minimize2,
  ShieldCheck
} from 'lucide-react';
import { AiChatSettings } from '../components/AiChatSettings';
import { AiLogo } from '../components/AiLogo';
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
  const { theme } = useTheme();

  // Recommendations Data
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [status, setStatus] = useState<RecommendationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Search & Filter Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'85_PLUS' | '90_PLUS' | '75_PLUS' | 'ALL'>('85_PLUS');
  const [locationFilter, setLocationFilter] = useState<'ALL' | 'REMOTE' | 'HYBRID' | 'ONSITE'>('ALL');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'RECENT' | 'SALARY_DESC'>('SCORE_DESC');
  const [viewMode, setViewMode] = useState<'CARDS' | 'COMPACT' | 'CHAT'>('CARDS');

  // Accordion Expand State for Job Details Breakdown
  const [expandedCardIds, setExpandedCardIds] = useState<Set<number>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

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

  // ── AI Career Copilot Chat State ──
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [securityBlocked, setSecurityBlocked] = useState(false);
  const [securityWarningCount, setSecurityWarningCount] = useState(0);
  const [isPrivacySettingsOpen, setIsPrivacySettingsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
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
  }, [scoreFilter]);

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
      try {
        const statusRes = await apiClient.get('/recommendations/status');
        const currentStatus = statusRes.data?.data || statusRes.data;
        setStatus(currentStatus);
      } catch (e) {
        console.warn('Could not fetch recommendation status:', e);
      }

      let minScoreParam: number | undefined;
      if (scoreFilter === '85_PLUS') minScoreParam = 85;
      else if (scoreFilter === '90_PLUS') minScoreParam = 90;
      else if (scoreFilter === '75_PLUS') minScoreParam = 75;

      setCurrentPage(0);
      const url = `/recommendations/jobs?page=0&size=12${minScoreParam ? `&minScore=${minScoreParam}` : ''}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await apiClient.get(url);
      const content = res.data?.content || res.data?.data?.content || [];
      const totalP = res.data?.totalPages || res.data?.data?.totalPages || 1;
      const totalEl = res.data?.totalElements || res.data?.data?.totalElements || content.length;

      setRecommendations(content);
      setTotalPages(totalP);
      setTotalElements(totalEl);
    } catch (e) {
      console.warn('Recommendations fetch error:', e);
      setRecommendations([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      await apiClient.post('/recommendations/recalculate');
      await fetchStatusAndRecs(true);
    } catch (e) {
      console.warn('Recalculate error:', e);
      await fetchStatusAndRecs(true);
    } finally {
      setRecalculating(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || currentPage + 1 >= totalPages) return;
    setLoadingMore(true);

    const nextPage = currentPage + 1;
    let minScoreParam: number | undefined;
    if (scoreFilter === '85_PLUS') minScoreParam = 85;
    else if (scoreFilter === '90_PLUS') minScoreParam = 90;
    else if (scoreFilter === '75_PLUS') minScoreParam = 75;

    try {
      const url = `/recommendations/jobs?page=${nextPage}&size=12${minScoreParam ? `&minScore=${minScoreParam}` : ''}`;
      const res = await apiClient.get(url);
      const newItems = res.data?.content || res.data?.data?.content || [];

      setRecommendations(prev => [...prev, ...newItems]);
      setCurrentPage(nextPage);
      setTotalPages(res.data?.totalPages || res.data?.data?.totalPages || totalPages);
    } catch (e) {
      console.error('Error loading more recommendations:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleCardExpansion = (recId: number) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(recId)) {
        next.delete(recId);
      } else {
        next.add(recId);
      }
      return next;
    });
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
        conversationId: activeConversationId,
        history
      });

      const data = res.data?.data || res.data;
      if (data) {
        if (data.conversationId) {
          setActiveConversationId(data.conversationId);
        }
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
      setUploadSuccess(`"${file.name}" uploaded & parsed! Recalculating AI matches...`);
      setChatMessages(prev => [
        ...prev,
        {
          id: 'agent-upload-' + Date.now(),
          sender: 'agent',
          text: `🎉 **${file.name}** successfully parsed! Your skills matrix is updated. Recalculating precision 85%+ matches now...`,
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

  // Client-side filtering & sorting
  const filteredAndSortedRecommendations = recommendations.filter(rec => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      rec.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.job.company?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.matchingSkills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      rec.job.requiredSkills?.some(s => s.skillName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLocation =
      locationFilter === 'ALL' ||
      (locationFilter === 'REMOTE' && rec.job.remote) ||
      (locationFilter === 'HYBRID' && rec.job.hybrid) ||
      (locationFilter === 'ONSITE' && !rec.job.remote && !rec.job.hybrid);

    return matchesSearch && matchesLocation;
  }).sort((a, b) => {
    if (sortBy === 'SCORE_DESC') {
      return b.overallScore - a.overallScore;
    }
    if (sortBy === 'SALARY_DESC') {
      return (b.job.salaryMax || b.job.salaryMin || 0) - (a.job.salaryMax || a.job.salaryMin || 0);
    }
    if (sortBy === 'RECENT') {
      return b.id - a.id;
    }
    return 0;
  });

  return (
    <div className="recs-page-wrapper">
      {/* ── Interactive Cosmic Galaxy Background ── */}
      <InteractiveGalaxyBackground theme={theme} />

      {/* ═══════════════════════════════════════════════════════════
          1 SINGLE UNIFIED DASHBOARD CONTAINER (1 hi div me sab kuch)
         ═══════════════════════════════════════════════════════════ */}
      <div className="recs-unified-dashboard">

        {/* ── DIV 1: Unified Top Bar (Brand + Search + Dropdowns + Actions) ── */}
        <div className="recs-unified-topbar">
          {/* Left: Brand Identity & Status */}
          <div className="recs-topbar-brand">
            <div className="recs-topbar-logo">
              <Sparkles size={16} />
            </div>
            <div className="recs-topbar-text">
              <div className="recs-topbar-title-row">
                <span className="recs-topbar-title">AI Job Match Engine</span>
                <span className="recs-match-badge-pill">
                  <Flame size={12} color="#F43F5E" /> 85%+ Match
                </span>
                {status?.hasResume && (
                  <span className="recs-resume-pill-tag">
                    <FileText size={11} /> {status?.activeResumeName || 'Resume Active'}
                  </span>
                )}
              </div>
              <span className="recs-topbar-sub">
                {totalElements > 0 ? `${totalElements} opportunities indexed • ` : ''}{filteredAndSortedRecommendations.length} {filteredAndSortedRecommendations.length === 1 ? 'match' : 'matches'} found
              </span>
            </div>
          </div>

          {/* Center & Right: Unified Controls */}
          <div className="recs-topbar-controls">
            {/* Live Search */}
            <div className="recs-search-input-wrap">
              <Search size={15} className="recs-search-icon" />
              <input
                type="text"
                placeholder="Search role, company, skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="recs-search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="recs-search-clear-btn">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown 1: Match Tier */}
            <div className="recs-select-wrapper">
              <Flame size={13} className="recs-select-icon red" />
              <select
                value={scoreFilter}
                onChange={e => setScoreFilter(e.target.value as any)}
                className="recs-native-select"
              >
                <option value="85_PLUS">🔥 85%+ Super Match</option>
                <option value="90_PLUS">⚡ 90%+ Elite Tier</option>
                <option value="75_PLUS">✨ 75%+ Strong Match</option>
                <option value="ALL">🪐 All AI Matches</option>
              </select>
              <ChevronDown size={13} className="recs-select-arrow" />
            </div>

            {/* Dropdown 2: Work Mode */}
            <div className="recs-select-wrapper">
              <Globe size={13} className="recs-select-icon blue" />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value as any)}
                className="recs-native-select"
              >
                <option value="ALL">🌍 All Locations</option>
                <option value="REMOTE">🚀 Remote Only</option>
                <option value="HYBRID">🪐 Hybrid Only</option>
                <option value="ONSITE">🏢 On-Site Only</option>
              </select>
              <ChevronDown size={13} className="recs-select-arrow" />
            </div>

            {/* Dropdown 3: Sort */}
            <div className="recs-select-wrapper">
              <ArrowUpDown size={13} className="recs-select-icon purple" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="recs-native-select"
              >
                <option value="SCORE_DESC">🎯 Match Score</option>
                <option value="SALARY_DESC">💰 Highest Salary</option>
                <option value="RECENT">🕒 Most Recent</option>
              </select>
              <ChevronDown size={13} className="recs-select-arrow" />
            </div>

            {/* View Mode Switcher */}
            <div className="recs-view-toggle-group">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`recs-view-pill-btn ${viewMode === 'CARDS' ? 'active' : ''}`}
                title="Cards View"
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('COMPACT')}
                className={`recs-view-pill-btn ${viewMode === 'COMPACT' ? 'active' : ''}`}
                title="Compact View"
              >
                <ListFilter size={14} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('CHAT')}
                className={`recs-view-pill-btn ${viewMode === 'CHAT' ? 'active' : ''}`}
                title="AI Chat"
              >
                <AiLogo size={14} />
                <span>AI Chat</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="recs-topbar-actions">
              <button
                onClick={handleRecalculateAll}
                disabled={recalculating || loading}
                className="cosmic-btn-secondary recs-topbar-action-btn"
                title="Recalculate AI matches"
              >
                <RefreshCw size={14} className={recalculating ? 'spin-icon' : ''} />
              </button>

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
                className="cosmic-btn-primary recs-topbar-action-btn"
                title="Upload resume for 85%+ precision"
              >
                <UploadCloud size={14} />
                <span>{uploadingResume ? '...' : 'Upload Resume'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Notifications / Security Notices */}
        {uploadSuccess && (
          <div className="recs-notification-bar success">
            <CheckCircle2 size={16} color="#10B981" />
            <span>{uploadSuccess}</span>
            <button onClick={() => setUploadSuccess('')} className="recs-search-clear-btn"><X size={14} /></button>
          </div>
        )}

        {uploadError && (
          <div className="recs-notification-bar error">
            <AlertCircle size={16} color="#EF4444" />
            <span>{uploadError}</span>
            <button onClick={() => setUploadError('')} className="recs-search-clear-btn"><X size={14} /></button>
          </div>
        )}

        {securityWarningCount > 0 && !securityBlocked && (
          <div className="recs-notification-bar warning">
            <AlertCircle size={16} color="#F59E0B" />
            <span><strong>Notice:</strong> 1 security policy warning detected. Prohibited queries will suspend chat access.</span>
          </div>
        )}

        {/* ── DIV 2: Unified Main Content & AI Workspace ── */}
        <div className="recs-unified-content">
          {viewMode === 'CHAT' ? (
            /* A. DYNAMIC EXPANDABLE AI CAREER AGENT WORKSPACE */
            <div className={`recs-chat-workspace ${isChatFullscreen ? 'fullscreen' : ''}`}>
              <div className="recs-chat-top-header">
                <div className="recs-chat-bot-info">
                  <div className="recs-chat-bot-avatar">
                    <AiLogo size={18} animated />
                  </div>
                  <div>
                    <span className="recs-chat-bot-title">HireMind AI Career Agent</span>
                    <span className="recs-chat-bot-sub">Neural Match Assistant & Career Advisor</span>
                  </div>
                </div>

                <div className="recs-chat-header-actions-group">
                  <button
                    onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                    className="recs-chat-header-btn"
                    title={isChatFullscreen ? 'Exit Fullscreen' : 'Expand Agent to Fullscreen'}
                  >
                    {isChatFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    <span>{isChatFullscreen ? 'Collapse' : 'Expand'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsChatFullscreen(false);
                      setViewMode('CARDS');
                    }}
                    className="recs-chat-header-btn"
                    title="Minimize Agent to Floating Badge"
                  >
                    <ChevronDown size={14} />
                    <span>Minimize</span>
                  </button>

                  <button
                    onClick={() => setIsPrivacySettingsOpen(true)}
                    className="recs-chat-header-btn"
                    title="AI Privacy, Retention and Storage Settings"
                  >
                    <ShieldCheck size={13} />
                    <span>Privacy</span>
                  </button>

                  <button
                    onClick={() => setChatMessages([
                      {
                        id: 'reset-msg',
                        sender: 'agent',
                        text: 'Chat history cleared. What kind of roles or companies can I find for you?',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ])}
                    className="recs-chat-reset-btn"
                    title="Clear conversation"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                </div>
              </div>

              {/* Quick Prompts */}
              <div className="recs-chat-prompts-bar">
                <span className="recs-prompts-label">⚡ Quick Queries:</span>
                <button onClick={() => handleSendMessage('Suggest me Java developer jobs')} className="recs-prompt-chip">
                  💡 Java roles
                </button>
                <button onClick={() => handleSendMessage('Based on my resume suggest me jobs')} className="recs-prompt-chip">
                  📄 Resume Match
                </button>
                <button onClick={() => handleSendMessage('Show recent Remote React developer roles')} className="recs-prompt-chip">
                  🚀 Remote React
                </button>
                <button onClick={() => handleSendMessage('Find Cloud & DevOps engineer openings')} className="recs-prompt-chip">
                  ☁️ DevOps & Cloud
                </button>
              </div>

              {/* Messages Timeline */}
              <div className="recs-chat-timeline">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`recs-chat-row ${msg.sender === 'user' ? 'user-row' : 'agent-row'}`}>
                    <div className="recs-chat-avatar-bubble">
                      {msg.sender === 'user' ? <User size={14} /> : <AiLogo size={15} />}
                    </div>
                    <div className="recs-chat-content-wrap">
                      <div className={`recs-chat-bubble-text ${msg.sender === 'user' ? 'user-msg' : 'agent-msg'}`}>
                        <div>{msg.text}</div>

                        {/* Resume upload in chat */}
                        {msg.requiresResume && (
                          <div className="recs-chat-inline-upload">
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
                              className="cosmic-btn-primary recs-chat-btn"
                            >
                              <UploadCloud size={13} />
                              {uploadingResume ? 'Uploading...' : 'Upload PDF Resume'}
                            </button>
                            <button
                              onClick={() => navigate('/portfolio')}
                              className="cosmic-btn-secondary recs-chat-btn"
                            >
                              <FileText size={13} /> Resume Center
                            </button>
                          </div>
                        )}

                        {/* Suggested jobs */}
                        {msg.suggestedJobs && msg.suggestedJobs.length > 0 && (
                          <div className="recs-chat-embedded-jobs-grid">
                            {msg.suggestedJobs.map(job => (
                              <div key={job.id} className="recs-chat-embedded-job-card">
                                <div className="recs-embed-job-header">
                                  <div>
                                    <h4 className="recs-embed-job-title">{job.title}</h4>
                                    <div className="recs-embed-job-company">
                                      <Building2 size={12} /> {job.company?.name} · {job.location || 'Remote'}
                                    </div>
                                  </div>
                                  {job.remote && <span className="recs-pill-badge blue">🚀 Remote</span>}
                                </div>

                                <div className="recs-embed-actions-row">
                                  <button
                                    onClick={() => setSelectedModalJob(job)}
                                    className="cosmic-btn-secondary recs-embed-btn"
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={() => handleChatWithRecruiter(job)}
                                    className="cosmic-btn-secondary recs-embed-btn"
                                  >
                                    <MessageSquare size={12} /> Message HR
                                  </button>
                                  {appliedJobIds.includes(job.id) ? (
                                    <span className="recs-applied-pill-tag mini">
                                      <CheckCircle2 size={12} /> Applied
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleApply(job.id)}
                                      disabled={applyingJobId === job.id}
                                      className="cosmic-btn-primary recs-embed-btn"
                                    >
                                      Apply 🚀
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="recs-chat-timestamp">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="recs-chat-row agent-row">
                    <div className="recs-chat-avatar-bubble"><AiLogo size={15} /></div>
                    <div className="recs-chat-bubble-text agent-msg loading-msg">
                      <span className="recs-pulse-dot" />
                      <span style={{ fontSize: 13, color: '#A78BFA' }}>Analyzing candidate match profile...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="recs-chat-bottom-input">
                <input
                  type="text"
                  placeholder="Ask AI Career Copilot (e.g. 'Suggest remote roles with 85%+ match' or 'Find React jobs')..."
                  value={chatInput}
                  disabled={chatLoading || securityBlocked}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="recs-chat-text-input"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || chatLoading || securityBlocked}
                  className="cosmic-btn-primary recs-chat-send-action-btn"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          ) : loading ? (
            /* B. LOADING STATE */
            <div className="recs-loading-card">
              <div className="recs-loading-spinner" />
              <h3 className="recs-loading-headline">Computing 85%+ Match Vector Matrix...</h3>
              <p className="recs-loading-subtext">Evaluating skills alignment, experience depth, and semantic proximity</p>
            </div>
          ) : filteredAndSortedRecommendations.length === 0 ? (
            /* C. NO MATCHES NOTICE (No extra div box) */
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8', fontSize: '13px' }}>
              No roles matched your current search or filter criteria.{' '}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setScoreFilter('ALL');
                  setLocationFilter('ALL');
                }}
                style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* D. JOB RECOMMENDATION CARDS */
            <div className={viewMode === 'COMPACT' ? 'recs-compact-list' : 'recs-cards-grid'}>
              {filteredAndSortedRecommendations.map(rec => {
                const isApplied = appliedJobIds.includes(rec.job.id);
                const isSuperMatch = rec.overallScore >= 85;
                const isExpanded = expandedCardIds.has(rec.id);

                return (
                  <article
                    key={rec.id}
                    className={`recs-job-unified-card ${isSuperMatch ? 'super-match-border' : ''} ${viewMode === 'COMPACT' ? 'compact-layout' : ''}`}
                  >
                    {/* Header Row */}
                    <div className="recs-card-header-row">
                      <div className="recs-card-left-info">
                        <div className="recs-company-avatar">
                          {rec.job.company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="recs-job-headings">
                          <div className="recs-badge-strip">
                            {isSuperMatch && (
                              <span className="recs-pill-badge flame">
                                <Flame size={11} /> 85%+ MATCH
                              </span>
                            )}
                            {rec.job.remote && (
                              <span className="recs-pill-badge blue">🚀 Remote</span>
                            )}
                            {rec.job.hybrid && (
                              <span className="recs-pill-badge purple">🪐 Hybrid</span>
                            )}
                            {rec.job.experienceLevel && (
                              <span className="recs-pill-badge grey">{rec.job.experienceLevel}</span>
                            )}
                          </div>
                          <h2 className="recs-card-job-title">{rec.job.title}</h2>
                          <div className="recs-card-meta-line">
                            <Building2 size={13} className="recs-meta-icon" />
                            <span className="recs-meta-company">{rec.job.company.name}</span>
                            <span className="recs-meta-separator">•</span>
                            <MapPin size={13} className="recs-meta-icon" />
                            <span>{rec.job.location || 'Remote'}</span>
                            {(rec.job.salaryMin || rec.job.salaryMax) && (
                              <>
                                <span className="recs-meta-separator">•</span>
                                <DollarSign size={13} className="recs-meta-icon green" />
                                <span className="recs-salary-text">
                                  {rec.job.salaryCurrency || '$'}{rec.job.salaryMin?.toLocaleString()} - {rec.job.salaryCurrency || '$'}{rec.job.salaryMax?.toLocaleString()}/{rec.job.salaryPeriod || 'yr'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Match Score Gauge */}
                      <div className={`recs-circular-gauge ${isSuperMatch ? 'super-gauge' : ''}`}>
                        <div className="recs-gauge-val">{rec.overallScore.toFixed(0)}%</div>
                        <div className="recs-gauge-sub">AI FIT</div>
                      </div>
                    </div>

                    {/* Matched Skills Chips */}
                    {rec.matchingSkills && rec.matchingSkills.length > 0 && (
                      <div className="recs-card-skills-row">
                        <span className="recs-skills-lead-label">Matched Skills:</span>
                        <div className="recs-skills-chips-list">
                          {rec.matchingSkills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="recs-skill-chip-tag">
                              <Check size={11} className="recs-check-icon" /> {skill}
                            </span>
                          ))}
                          {rec.matchingSkills.length > 5 && (
                            <span className="recs-skill-chip-more">+{rec.matchingSkills.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expandable Dropdown Accordion Button */}
                    <div className="recs-accordion-toggle-wrap">
                      <button
                        onClick={() => toggleCardExpansion(rec.id)}
                        className={`recs-accordion-btn ${isExpanded ? 'expanded' : ''}`}
                      >
                        <span>
                          {isExpanded ? '▲ Hide AI Match Analysis & Insights' : '▼ View AI Match Analysis & Insights'}
                        </span>
                      </button>
                    </div>

                    {/* Collapsible Analysis Breakdown (1-div) */}
                    {isExpanded && (
                      <div className="recs-expanded-analysis-box">
                        <div className="recs-fit-meters-grid">
                          <div className="recs-meter-card">
                            <div className="recs-meter-top">
                              <span>⚡ Skills Alignment</span>
                              <strong>{rec.skillScore}%</strong>
                            </div>
                            <div className="recs-progress-track">
                              <div className="recs-progress-fill skills" style={{ width: `${Math.min(100, rec.skillScore)}%` }} />
                            </div>
                          </div>

                          <div className="recs-meter-card">
                            <div className="recs-meter-top">
                              <span>💼 Experience Depth</span>
                              <strong>{rec.experienceScore}%</strong>
                            </div>
                            <div className="recs-progress-track">
                              <div className="recs-progress-fill experience" style={{ width: `${Math.min(100, rec.experienceScore)}%` }} />
                            </div>
                          </div>

                          <div className="recs-meter-card">
                            <div className="recs-meter-top">
                              <span>📍 Location / Work Fit</span>
                              <strong>{rec.locationScore}%</strong>
                            </div>
                            <div className="recs-progress-track">
                              <div className="recs-progress-fill location" style={{ width: `${Math.min(100, rec.locationScore)}%` }} />
                            </div>
                          </div>
                        </div>

                        {rec.missingSkills && rec.missingSkills.length > 0 && (
                          <div className="recs-missing-skills-box">
                            <span className="recs-missing-label">+ Recommended Skill Additions:</span>
                            <div className="recs-missing-chips">
                              {rec.missingSkills.slice(0, 4).map((s, idx) => (
                                <span key={idx} className="recs-chip-addition">+{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="recs-insights-columns">
                          {rec.strengths && rec.strengths.length > 0 && (
                            <div className="recs-insights-column strengths">
                              <div className="recs-column-header">
                                <CheckCircle2 size={14} color="#10B981" />
                                <span>Key Matching Strengths</span>
                              </div>
                              <ul className="recs-column-list">
                                {rec.strengths.map((str, idx) => (
                                  <li key={idx}>• {str}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {rec.improvementSuggestions && rec.improvementSuggestions.length > 0 && (
                            <div className="recs-insights-column growth">
                              <div className="recs-column-header">
                                <Flame size={14} color="#F59E0B" />
                                <span>AI Growth Suggestions</span>
                              </div>
                              <ul className="recs-column-list">
                                {rec.improvementSuggestions.map((imp, idx) => (
                                  <li key={idx}>• {imp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="recs-card-actions-bar">
                      <button
                        onClick={() => setSelectedModalJob(rec.job)}
                        className="cosmic-btn-secondary recs-card-btn"
                      >
                        Show Details
                      </button>

                      <button
                        onClick={() => handleChatWithRecruiter(rec.job)}
                        className="cosmic-btn-secondary recs-card-btn"
                      >
                        <MessageSquare size={13} /> Message Recruiter
                      </button>

                      {isApplied ? (
                        <span className="recs-applied-pill-tag">
                          <CheckCircle2 size={14} /> Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(rec.job.id)}
                          disabled={applyingJobId === rec.job.id}
                          className="cosmic-btn-primary recs-card-apply-btn"
                        >
                          {applyingJobId === rec.job.id ? 'Submitting...' : 'Apply Now 🚀'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {!loading && viewMode !== 'CHAT' && currentPage + 1 < totalPages && (
            <div className="recs-load-more-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="cosmic-btn-primary recs-load-more-action"
              >
                <Sparkles size={15} />
                <span>{loadingMore ? 'Fetching Next Batch...' : 'Load More Recommendations (12+)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── DIV 3: Unified Job Details Modal ── */}
        {selectedModalJob && (
          <div className="recs-modal-backdrop" onClick={() => setSelectedModalJob(null)}>
            <div className="recs-modal-card" onClick={e => e.stopPropagation()}>
              <div className="recs-modal-header">
                <div>
                  <h2 className="recs-modal-title">{selectedModalJob.title}</h2>
                  <div className="recs-modal-sub">
                    <Building2 size={15} color="#A78BFA" />
                    <span>{selectedModalJob.company?.name}</span>
                    <span>•</span>
                    <MapPin size={15} color="#94A3B8" />
                    <span>{selectedModalJob.location || 'Remote'}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedModalJob(null)} className="recs-modal-close">
                  <X size={18} />
                </button>
              </div>

              <div className="recs-modal-body">
                {selectedModalJob.description && (
                  <div className="recs-modal-section">
                    <h4 className="recs-modal-section-title">Overview & Role Purpose</h4>
                    <p className="recs-modal-text">{selectedModalJob.description}</p>
                  </div>
                )}

                {selectedModalJob.responsibilities && (
                  <div className="recs-modal-section">
                    <h4 className="recs-modal-section-title">Key Responsibilities</h4>
                    <p className="recs-modal-text">{selectedModalJob.responsibilities}</p>
                  </div>
                )}

                {selectedModalJob.requirements && (
                  <div className="recs-modal-section">
                    <h4 className="recs-modal-section-title">Qualifications & Requirements</h4>
                    <p className="recs-modal-text">{selectedModalJob.requirements}</p>
                  </div>
                )}

                {selectedModalJob.requiredSkills && selectedModalJob.requiredSkills.length > 0 && (
                  <div className="recs-modal-section">
                    <h4 className="recs-modal-section-title">Required Skills Matrix</h4>
                    <div className="recs-skills-chips-wrap">
                      {selectedModalJob.requiredSkills.map((sk, idx) => (
                        <span key={idx} className="recs-chip-matched">
                          • {sk.skillName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="recs-modal-footer">
                <button
                  onClick={() => handleChatWithRecruiter(selectedModalJob)}
                  className="cosmic-btn-secondary recs-btn-message"
                >
                  <MessageSquare size={14} /> Message HR
                </button>

                {appliedJobIds.includes(selectedModalJob.id) ? (
                  <span className="recs-applied-badge">
                    <CheckCircle2 size={15} /> Already Applied
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

        {/* Floating AI Agent Trigger Pill (Appears when minimized) */}
        {viewMode !== 'CHAT' && (
          <button
            onClick={() => setViewMode('CHAT')}
            className="recs-floating-ai-agent-btn"
            title="Open AI Career Agent Chat"
          >
            <div className="recs-pulse-dot" />
            <AiLogo size={28} animated title="HireMind AI Career Agent" />
            <div className="recs-floating-agent-info">
              <span className="recs-floating-agent-title">AI Career Agent</span>
              <span className="recs-floating-agent-sub">Expand AI Assistant 🚀</span>
            </div>
          </button>
        )}

        {/* AI Privacy & Retention Settings Modal */}
        <AiChatSettings
          isOpen={isPrivacySettingsOpen}
          onClose={() => setIsPrivacySettingsOpen(false)}
        />

      </div>
    </div>
  );
};

export default Recommendations;
