import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Building, DollarSign, CheckCircle2, Plus, X, Sparkles, Filter, Rocket, Map, List, Globe, MessageSquare } from 'lucide-react';
import { JobMap, type JobItem } from '../components/JobMap';
import '../css/jobs-list.css';

/* ══════════════════════════
   STAR CANVAS BACKGROUND
══════════════════════════ */
const StarCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.25 + 0.05,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${s.opacity})`;
        ctx.fill();
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="jobs-star-canvas"
    />
  );
};

export const JobsList: React.FC = () => {
  const { isHr, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [mapRole, setMapRole] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Post Job / Edit Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState('');

  // Job Details Modal
  const [selectedJobIdForDetails, setSelectedJobIdForDetails] = useState<number | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [jobDetailsData, setJobDetailsData] = useState<JobItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [jobType, setJobType] = useState('FULL_TIME');
  const [experienceLevel, setExperienceLevel] = useState('SENIOR');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(true);
  const [hybrid, setHybrid] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await apiClient.get('/applications/my?page=0&size=100');
      const apps = res.data?.data?.content || res.data?.data || res.data?.content || [];
      const ids = apps.map((a: any) => a.job?.id || a.jobId).filter(Boolean);
      if (ids.length > 0) {
        setAppliedJobIds(prev => Array.from(new Set([...prev, ...ids])));
      }
    } catch {
      // Unauthenticated or not candidate, safe ignore
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/jobs?page=0&size=50');
      const jobList = Array.isArray(res.data.data) ? res.data.data : (res.data.content || res.data.data?.content || []);
      setJobs(Array.isArray(jobList) ? jobList : []);
    } catch (e) {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: number) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    setApplyingJobId(jobId);
    try {
      await apiClient.post('/applications', { jobId });
      setAppliedJobIds([...appliedJobIds, jobId]);
      setSuccessMessage('Application submitted successfully! Recruiter notified.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e: any) {
      const errDetail = e.response?.data?.message || 'Application submitted or already exists.';
      setSuccessMessage(errDetail);
      setAppliedJobIds([...appliedJobIds, jobId]);
      setTimeout(() => setSuccessMessage(''), 4000);
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleChatWithRecruiter = (job: JobItem) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    const recruiterId = job.postedById || job.company?.id || 2;
    const recruiterName = job.company?.name ? `${job.company.name} Recruiter` : 'Hiring Team';
    navigate(`/messages?recipientId=${recruiterId}&recruiterName=${encodeURIComponent(recruiterName)}&jobTitle=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company?.name || '')}`);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostLoading(true);
    setPostError('');

    const parsedSkills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => ({ skillName: s }));

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const payload = {
      title: title.trim(),
      slug,
      description: description.trim(),
      responsibilities: responsibilities.trim(),
      requirements: requirements.trim(),
      jobType,
      experienceLevel,
      location: location.trim() || 'Remote',
      remote,
      hybrid,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      salaryCurrency: 'USD',
      salaryPeriod: 'YEARLY',
      status: 'ACTIVE',
      requiredSkills: parsedSkills
    };

    try {
      if (editingJobId) {
        const res = await apiClient.put(`/jobs/${editingJobId}`, payload);
        const updated = res.data.data;
        setJobs(jobs.map(j => j.id === editingJobId ? (updated || { ...j, ...payload }) : j));
        setSuccessMessage(`Job posting updated successfully!`);
      } else {
        const res = await apiClient.post('/jobs', payload);
        const newJob = res.data.data;
        if (newJob) {
          setJobs([newJob, ...jobs]);
        } else {
          fetchJobs();
        }
        setSuccessMessage(`Job posting created successfully and published live!`);
      }
      setShowPostModal(false);
      resetForm();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save job posting';
      setPostError(errMsg);
    } finally {
      setPostLoading(false);
    }
  };

  const handleEditJob = (job: JobItem) => {
    setTitle(job.title);
    setDescription(job.description || '');
    setResponsibilities('');
    setRequirements('');
    setJobType(job.jobType);
    setExperienceLevel(job.experienceLevel);
    setLocation(job.location);
    setRemote(job.remote);
    setHybrid(job.hybrid);
    setSalaryMin(job.salaryMin ? String(job.salaryMin) : '');
    setSalaryMax(job.salaryMax ? String(job.salaryMax) : '');
    setSkillsInput(job.requiredSkills?.map(s => s.skillName).join(', ') || '');
    setEditingJobId(job.id);
    setShowPostModal(true);
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to archive/delete this job posting?')) return;
    try {
      await apiClient.delete(`/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setSuccessMessage('Job posting deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete job posting';
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleShowDetails = async (jobId: number) => {
    setSelectedJobIdForDetails(jobId);
    setJobDetailsLoading(true);
    try {
      const res = await apiClient.get(`/jobs/${jobId}`);
      setJobDetailsData(res.data.data);
    } catch (e) {
      setJobDetailsData(null);
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setResponsibilities('');
    setRequirements('');
    setLocation('');
    setSalaryMin('');
    setSalaryMax('');
    setSkillsInput('');
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.name.toLowerCase().includes(search.toLowerCase()) ||
      j.requiredSkills?.some(s => s.skillName.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      selectedType === 'ALL' ||
      (selectedType === 'REMOTE' && j.remote) ||
      (selectedType === 'HYBRID' && j.hybrid) ||
      j.jobType === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="jobs-page-wrapper">
      {/* Star Canvas */}
      <StarCanvas />

      {/* Cosmic Background Orbs */}
      <div className="jobs-orb-top-right" />
      <div className="jobs-orb-bottom-left" />

      <div className="jobs-content-container">
        {/* 🚀 Cosmic Header Hero Section */}
        <div className="jobs-hero-panel">
          {/* Orbital Decorative Ring */}
          <div className="jobs-orbital-ring">
            <div className="jobs-orbital-dot" />
          </div>

          <div className="jobs-hero-content">
            <div>
              <div className="jobs-badge-tag">
                <Sparkles size={14} /> Cosmic Tech Opportunities
              </div>
              <h1 className="jobs-hero-title">
                Explore <span className="jobs-gradient-text">Active Career Horizons</span> 🪐
              </h1>
              <p className="jobs-hero-desc">
                {isHr || isAdmin
                  ? 'Manage your corporate postings, recruit top engineering talent, or launch new career orbits.'
                  : 'Discover high-impact software, AI, and cloud roles matched directly with your technical profile.'}
              </p>
            </div>

            {(isHr || isAdmin) && (
              <button
                onClick={() => setShowPostModal(true)}
                className="cosmic-btn-primary jobs-post-btn-hero"
              >
                <Plus size={18} /> Post New Job
              </button>
            )}
          </div>

          {/* Success Banner Alert */}
          {successMessage && (
            <div className="jobs-alert-success">
              <CheckCircle2 size={18} /> {successMessage}
            </div>
          )}
        </div>

        {/* 🔍 Search & Filter Bar */}
        <div className="jobs-filter-panel">
          <div className="jobs-search-row">
            <div className="jobs-search-wrapper">
              <Search size={18} color="#94A3B8" className="jobs-search-icon" />
              <input
                type="text"
                placeholder="Search job title, company, location, or skills (e.g. Java, Python, React, Bangalore)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="jobs-search-input"
              />
            </div>
            {/* View Mode Toggle */}
            {(!isHr && !isAdmin) && (
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(30, 41, 59, 0.7)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('both')}
                  style={{
                    background: viewMode === 'both' ? '#7C3AED' : 'transparent',
                    color: viewMode === 'both' ? '#FFF' : '#94A3B8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Globe size={13} /> Map & List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  style={{
                    background: viewMode === 'map' ? '#7C3AED' : 'transparent',
                    color: viewMode === 'map' ? '#FFF' : '#94A3B8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Map size={13} /> Map Only
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    background: viewMode === 'list' ? '#7C3AED' : 'transparent',
                    color: viewMode === 'list' ? '#FFF' : '#94A3B8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <List size={13} /> List Only
                </button>
              </div>
            )}
          </div>

          {/* Planet Pills Filter Row */}
          <div className="jobs-pills-row">
            <span className="jobs-filter-label">
              <Filter size={14} /> Filter Orbit:
            </span>
            {[
              { id: 'ALL', label: '✨ All Roles' },
              { id: 'REMOTE', label: '🚀 Remote' },
              { id: 'HYBRID', label: '🪐 Hybrid' },
              { id: 'FULL_TIME', label: '⚡ Full-Time' },
              { id: 'CONTRACT', label: '💻 Contract' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setSelectedType(pill.id)}
                className={`cosmic-pill ${selectedType === pill.id ? 'active' : ''}`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🗺️ Interactive State-wise Job Map Section */}
        {(!isHr && !isAdmin) && (viewMode === 'both' || viewMode === 'map') && (
          <JobMap
            jobs={filteredJobs}
            appliedJobIds={appliedJobIds}
            onApply={handleApply}
            onShowDetails={handleShowDetails}
            onChatRecruiter={handleChatWithRecruiter}
            selectedSkillRole={mapRole}
            onSkillRoleChange={(role) => setMapRole(role)}
            activeSearchQuery={search}
            height="460px"
            title="Interactive Career Radar & State-wise Opportunities"
          />
        )}

        {/* 📋 Jobs List Grid */}
        {loading ? (
          <div className="jobs-loading">
            <Sparkles size={24} className="jobs-loading-icon" />
            <div>Scanning job orbits...</div>
          </div>
        ) : (viewMode === 'both' || viewMode === 'list') && (
          <div className="jobs-list-container">
            {filteredJobs.length === 0 ? (
              <div className="cosmic-card jobs-empty-card">
                <Rocket size={36} color="#7C3AED" className="jobs-empty-icon" />
                <h3 className="jobs-empty-title">
                  {isHr || isAdmin ? 'No Active Job Postings in Database' : 'No Orbiting Roles Found'}
                </h3>
                <p style={{ maxWidth: '500px', margin: '0 auto 16px' }}>
                  {isHr || isAdmin
                    ? 'Your database is currently clean with 0 jobs. Click "+ Post New Job" to publish corporate roles!'
                    : 'Try adjusting your keywords or clearing selected filters to find active positions.'}
                </p>
                {(isHr || isAdmin) && (
                  <button
                    onClick={() => { resetForm(); setEditingJobId(null); setShowPostModal(true); }}
                    className="cosmic-btn-primary jobs-post-btn-hero"
                    style={{ margin: '0 auto' }}
                  >
                    <Plus size={16} /> + Post New Job
                  </button>
                )}
              </div>
            ) : (
              filteredJobs.map(job => {
                const isApplied = appliedJobIds.includes(job.id);
                return (
                  <div key={job.id} className="cosmic-card jobs-item-card">
                    <div className="jobs-item-main">
                      <div className="jobs-item-title-row">
                        <h3 className="jobs-item-title">{job.title}</h3>
                        {job.remote && (
                          <span className="jobs-badge-remote">
                            🚀 Remote
                          </span>
                        )}
                        {job.hybrid && (
                          <span className="jobs-badge-hybrid">
                            🪐 Hybrid
                          </span>
                        )}
                        <span className="jobs-badge-level">
                          {job.experienceLevel}
                        </span>
                      </div>

                      <div className="jobs-meta-row">
                        <span className="jobs-company-name">
                          <Building size={15} color="#06B6D4" /> {job.company.name}
                        </span>
                        <span className="jobs-location-name">
                          <MapPin size={15} color="#A78BFA" /> {job.location}
                        </span>
                        {job.salaryMin && (
                          <span className="jobs-salary-text">
                            <DollarSign size={15} /> ${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax! / 1000).toFixed(0)}k / yr
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <p className="jobs-desc-snippet">
                          {job.description}
                        </p>
                      )}

                      <div className="jobs-skills-row">
                        {job.requiredSkills?.map((skill, idx) => (
                          <span key={idx} className="jobs-skill-chip">
                            ⚡ {skill.skillName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                      <button
                        onClick={() => handleShowDetails(job.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Show Details
                      </button>

                      {isHr || isAdmin ? (
                        <>
                          <button
                            onClick={() => navigate('/hr-applications')}
                            className="cosmic-btn-primary jobs-apply-btn"
                          >
                            View Applicants
                          </button>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleEditJob(job)}
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="btn btn-danger btn-sm"
                              style={{ flex: 1 }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleChatWithRecruiter(job)}
                            className="btn btn-secondary btn-sm"
                          >
                            <MessageSquare size={14} /> Message HR
                          </button>
                          {isApplied ? (
                            <span className="jobs-applied-badge">
                              <CheckCircle2 size={16} /> Applied
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApply(job.id)}
                              className="cosmic-btn-primary jobs-apply-btn"
                              disabled={applyingJobId === job.id}
                            >
                              {applyingJobId === job.id ? 'Submitting Orbit...' : 'Apply Now 🚀'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 📋 Job Details Modal */}
        {selectedJobIdForDetails && (
          <div className="jobs-modal-overlay">
            <div className="cosmic-card jobs-modal-card">
              <div className="jobs-modal-header">
                <h3 className="jobs-modal-title">
                  <Rocket color="#06B6D4" size={24} /> Job Details
                </h3>
                <button onClick={() => setSelectedJobIdForDetails(null)} className="jobs-modal-close-btn">
                  <X size={20} />
                </button>
              </div>
              {jobDetailsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading details...</div>
              ) : jobDetailsData ? (
                <div className="jobs-modal-form" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
                  <h2 style={{ color: 'white', marginBottom: '1rem' }}>{jobDetailsData.title}</h2>
                  <p style={{ color: '#94A3B8', marginBottom: '1rem' }}>{jobDetailsData.company?.name} • {jobDetailsData.location}</p>
                  
                  <h4 style={{ color: 'white', marginTop: '1rem' }}>Job Description</h4>
                  <p style={{ color: '#CBD5E1', whiteSpace: 'pre-wrap' }}>{jobDetailsData.description}</p>
                  
                  <h4 style={{ color: 'white', marginTop: '1rem' }}>Requirements</h4>
                  <div className="jobs-skills-row" style={{ marginTop: '0.5rem' }}>
                    {jobDetailsData.requiredSkills?.map((s, i) => (
                      <span key={i} className="jobs-skill-chip">⚡ {s.skillName}</span>
                    ))}
                  </div>

                  {/* Modal Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.8rem' }}>
                    {(!isHr && !isAdmin) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJobIdForDetails(null);
                          handleChatWithRecruiter(jobDetailsData);
                        }}
                        className="cosmic-btn-secondary"
                        style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <MessageSquare size={16} /> Message Recruiter 💬
                      </button>
                    )}
                    {!isHr && !isAdmin && (
                      appliedJobIds.includes(jobDetailsData.id) ? (
                        <span className="jobs-applied-badge" style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle2 size={16} /> Applied ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(jobDetailsData.id)}
                          className="cosmic-btn-primary"
                          style={{ flex: 1, padding: '10px' }}
                          disabled={applyingJobId === jobDetailsData.id}
                        >
                          {applyingJobId === jobDetailsData.id ? 'Submitting...' : 'Apply Now 🚀'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444' }}>Failed to load job details.</div>
              )}
            </div>
          </div>
        )}

        {/* 🏢 HR Post Job Modal */}
        {showPostModal && (
          <div className="jobs-modal-overlay">
            <div className="cosmic-card jobs-modal-card">
              <div className="jobs-modal-header">
                <h3 className="jobs-modal-title">
                  <Rocket color="#06B6D4" size={24} /> Post New Orbit Role
                </h3>
                <button onClick={() => setShowPostModal(false)} className="jobs-modal-close-btn">
                  <X size={20} />
                </button>
              </div>

              {postError && (
                <div className="jobs-modal-error">
                  ⚠️ {postError}
                </div>
              )}

              <form onSubmit={handlePostJob} className="jobs-modal-form">
                <div>
                  <label className="jobs-modal-label">Job Title *</label>
                  <input type="text" className="input-field" required placeholder="e.g. Senior Microservices Architect" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="jobs-modal-row-2col">
                  <div>
                    <label className="jobs-modal-label">Job Type *</label>
                    <select className="input-field" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                      <option value="FULL_TIME">Full-Time</option>
                      <option value="PART_TIME">Part-Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="REMOTE">Remote Contract</option>
                      <option value="INTERNSHIP">Internship</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className="jobs-modal-label">Experience Level *</label>
                    <select className="input-field" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                      <option value="ENTRY">Entry Level (0-1 yrs)</option>
                      <option value="JUNIOR">Junior (1-3 yrs)</option>
                      <option value="MID">Mid Level (3-5 yrs)</option>
                      <option value="SENIOR">Senior (5-8 yrs)</option>
                      <option value="LEAD">Tech Lead / Staff (8+ yrs)</option>
                      <option value="EXECUTIVE">Executive / VP</option>
                    </select>
                  </div>
                </div>

                <div className="jobs-modal-row-3col">
                  <div>
                    <label className="jobs-modal-label">Location</label>
                    <input type="text" className="input-field" placeholder="e.g. San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div>
                    <label className="jobs-modal-label">Min Salary ($/yr)</label>
                    <input type="number" className="input-field" placeholder="130000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                  </div>
                  <div>
                    <label className="jobs-modal-label">Max Salary ($/yr)</label>
                    <input type="number" className="input-field" placeholder="180000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                  </div>
                </div>

                <div className="jobs-modal-checkbox-row">
                  <label className="jobs-modal-checkbox-label">
                    <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Remote Position
                  </label>
                  <label className="jobs-modal-checkbox-label">
                    <input type="checkbox" checked={hybrid} onChange={(e) => setHybrid(e.target.checked)} /> Hybrid Position
                  </label>
                </div>

                <div>
                  <label className="jobs-modal-label">Required Skills (comma separated) *</label>
                  <input type="text" className="input-field" required placeholder="e.g. Java 17, Spring Boot, Kafka, Docker, PostgreSQL" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
                </div>

                <div>
                  <label className="jobs-modal-label">Job Description *</label>
                  <textarea className="input-field" rows={3} required placeholder="Detailed role responsibilities, team structure, and impact..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="jobs-modal-actions">
                  <button type="button" onClick={() => setShowPostModal(false)} className="btn btn-secondary jobs-modal-cancel-btn">Cancel</button>
                  <button type="submit" className="cosmic-btn-primary jobs-modal-submit-btn" disabled={postLoading}>
                    {postLoading ? 'Publishing...' : 'Publish Job Posting Live 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
