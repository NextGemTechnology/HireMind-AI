import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, MapPin, Briefcase, GraduationCap, FolderGit2,
  ExternalLink, ArrowLeft, MessageSquare,
  Sparkles, CheckCircle2, Globe, Code2,
  Building2, Calendar, Award, BookOpen, X
} from 'lucide-react';
import { CandidateVerifiedBadge } from '../components/CandidateVerifiedBadge';
import '../css/candidate-profile.css';

interface SkillItem {
  id?: number;
  skillName?: string;
  name?: string;
  proficiency?: string;
  yearsExperience?: number;
}

interface ProjectItem {
  id?: number;
  title: string;
  description: string;
  technologies?: string[];
  githubUrl?: string;
  liveUrl?: string;
}

interface ExperienceItem {
  id?: number;
  companyName: string;
  jobTitle: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
}

interface EducationItem {
  id?: number;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  gpa?: number | string;
  startDate?: string;
  endDate?: string;
  startYear?: number;
  endYear?: number;
  current?: boolean;
  description?: string;
}

interface CandidateData {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  location?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  yearsExperience?: number;
  currentTitle?: string;
  currentCompany?: string;
  openToWork?: boolean;
  profileCompletion?: number;
  skills?: SkillItem[];
  experiences?: ExperienceItem[];
  educations?: EducationItem[];
  projects?: ProjectItem[];
}

export const CandidateProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        // Try fetching by user ID first, then fallback to candidate ID
        let res;
        try {
          res = await apiClient.get(`/candidates/user/${id}`);
        } catch {
          res = await apiClient.get(`/candidates/${id}`);
        }
        if (res?.data?.data) {
          setCandidate(res.data.data);
        } else {
          setCandidate(null);
        }
      } catch (err) {
        console.warn('Candidate profile lookup error:', err);
        setCandidate(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCandidate();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="candidate-profile-page loading">
        <div className="candidate-spinner" />
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="candidate-profile-page error">
        <h2>Candidate Not Found</h2>
        <p>Could not locate the requested candidate profile.</p>
        <button onClick={() => navigate(-1)} className="cp-back-btn">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const { isHr, isAdmin } = useAuth();
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagJobTitle, setTagJobTitle] = useState('');
  const [tagDept, setTagDept] = useState('');
  const [tagNotes, setTagNotes] = useState('');
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [tagSuccessMsg, setTagSuccessMsg] = useState('');
  const [tagErrorMsg, setTagErrorMsg] = useState('');

  const handleSendTagRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagJobTitle.trim() || !candidate) return;
    setTagSubmitting(true);
    setTagErrorMsg('');
    try {
      await apiClient.post('/company/verifications/request', {
        candidateUserId: candidate.userId || candidate.id,
        jobTitle: tagJobTitle.trim(),
        department: tagDept.trim() || undefined,
        notes: tagNotes.trim() || undefined
      });
      setTagSuccessMsg('Verified tag request submitted to your Company Director for final issuance!');
      setTimeout(() => {
        setShowTagModal(false);
        setTagSuccessMsg('');
        setTagJobTitle('');
        setTagDept('');
        setTagNotes('');
      }, 2200);
    } catch (err: any) {
      setTagErrorMsg(err?.response?.data?.message || 'Failed to submit verification request.');
    } finally {
      setTagSubmitting(false);
    }
  };

  const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate Profile';

  return (
    <div className="candidate-profile-page theme-universe">
      <div className="candidate-profile-container">
        {/* Top navigation row */}
        <div className="cp-nav-bar">
          <button onClick={() => navigate(-1)} className="cp-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {(isHr || isAdmin) && (
              <button
                onClick={() => setShowTagModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Award size={16} /> Give Verified Tag
              </button>
            )}

            <button
              onClick={() => navigate(`/messages?recipientId=${candidate.userId || candidate.id}&recruiterName=${encodeURIComponent(fullName)}`)}
              className="cp-message-btn"
            >
              <MessageSquare size={16} /> Message Candidate
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="cp-hero-card">
          <div className="cp-avatar-box">
            {candidate.avatarUrl ? (
              <img src={candidate.avatarUrl} alt={fullName} />
            ) : (
              <div className="cp-avatar-fallback">{fullName.charAt(0)}</div>
            )}
          </div>

          <div className="cp-hero-info">
            <div className="cp-name-row">
              <h1 className="cp-candidate-name">{fullName}</h1>
              {candidate.openToWork && (
                <span className="cp-badge-open">
                  <CheckCircle2 size={13} /> Open to Work
                </span>
              )}
            </div>

            <p className="cp-headline">{candidate.headline || candidate.currentTitle || 'HireMind Candidate'}</p>

            <div className="cp-meta-row">
              {candidate.location && (
                <span className="cp-meta-item">
                  <MapPin size={14} /> {candidate.location}
                </span>
              )}
              {candidate.email && (
                <span className="cp-meta-item">
                  <Mail size={14} /> {candidate.email}
                </span>
              )}
              {candidate.yearsExperience !== undefined && (
                <span className="cp-meta-item">
                  <Briefcase size={14} /> {candidate.yearsExperience} yrs exp
                </span>
              )}
            </div>

            {/* Social / External Links */}
            <div className="cp-social-links">
              {candidate.githubUrl && (
                <a href={candidate.githubUrl} target="_blank" rel="noreferrer" className="cp-link-chip">
                  <Code2 size={14} /> GitHub
                </a>
              )}
              {candidate.linkedinUrl && (
                <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="cp-link-chip">
                  <Globe size={14} /> LinkedIn
                </a>
              )}
              {candidate.websiteUrl && (
                <a href={candidate.websiteUrl} target="_blank" rel="noreferrer" className="cp-link-chip">
                  <ExternalLink size={14} /> Portfolio
                </a>
              )}
            </div>

            {/* Official Company Verified Badges */}
            <CandidateVerifiedBadge candidateUserId={candidate.userId || candidate.id} />
          </div>
        </div>

        {/* Bio / Summary */}
        {candidate.bio && (
          <div className="cp-section-card">
            <h2 className="cp-section-title"><User size={18} /> About Candidate</h2>
            <p className="cp-bio-text">{candidate.bio}</p>
          </div>
        )}

        {/* Skills Section */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="cp-section-card">
            <h2 className="cp-section-title"><Sparkles size={18} /> Verified Skills</h2>
            <div className="cp-skills-grid">
              {candidate.skills.map((skill, idx) => (
                <div key={idx} className="cp-skill-badge">
                  <span className="cp-skill-name">{skill.name || skill.skillName}</span>
                  {skill.proficiency && (
                    <span className="cp-skill-level">{skill.proficiency}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎓 Academic Qualifications & Education */}
        {candidate.educations && candidate.educations.length > 0 && (
          <div className="cp-section-card">
            <h2 className="cp-section-title">
              <GraduationCap size={20} style={{ color: '#10B981' }} /> Academic Qualifications &amp; Education
            </h2>
            <div className="cp-timeline">
              {candidate.educations.map((edu, idx) => {
                const getLevelInfo = (deg: string, field?: string) => {
                  const d = (deg || '').toLowerCase();
                  const f = (field || '').toLowerCase();
                  if (d.includes('master') || d.includes('m.') || d.includes('mtech') || d.includes('mba') || d.includes('msc') || d.includes('mca')) {
                    return { label: "Master's Degree", icon: '🎓' };
                  }
                  if (d.includes('bachelor') || d.includes('b.') || d.includes('btech') || d.includes('be') || d.includes('bsc') || d.includes('bca') || d.includes('bba')) {
                    return { label: "Bachelor's Degree", icon: '🏛️' };
                  }
                  if (d.includes('12') || d.includes('twelfth') || d.includes('senior secondary') || d.includes('intermediate') || d.includes('hsc') || f.includes('pcm') || f.includes('pcb')) {
                    return { label: 'Class 12th (Senior Secondary)', icon: '🏫' };
                  }
                  if (d.includes('10') || d.includes('tenth') || d.includes('secondary') || d.includes('matriculation') || d.includes('ssc')) {
                    return { label: 'Class 10th (Secondary School)', icon: '🎒' };
                  }
                  return { label: 'Academic Qualification', icon: '📜' };
                };

                const info = getLevelInfo(edu.degree, edu.fieldOfStudy);
                const formatYearRange = () => {
                  if (edu.startDate && edu.endDate) {
                    const s = edu.startDate.slice(0, 4);
                    const e = edu.current ? 'Present' : edu.endDate.slice(0, 4);
                    return `${s} – ${e}`;
                  }
                  if (edu.startYear && edu.endYear) {
                    return `${edu.startYear} – ${edu.endYear}`;
                  }
                  if (edu.endDate) return `Completed ${edu.endDate.slice(0, 4)}`;
                  if (edu.endYear) return `Completed ${edu.endYear}`;
                  if (edu.current) return 'Currently Pursuing';
                  return 'Completed';
                };

                return (
                  <div key={idx} className="cp-edu-timeline-item">
                    <div className="cp-edu-icon-box">{info.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div className="cp-edu-header-row">
                        <h3 className="cp-edu-degree-title">{edu.degree}</h3>
                        <span className="cp-edu-badge level">{info.label}</span>
                      </div>

                      <div className="cp-edu-inst-name">
                        <Building2 size={14} /> {edu.institution}
                      </div>

                      <div className="cp-edu-meta-badges">
                        {edu.fieldOfStudy && (
                          <span className="cp-edu-badge stream">
                            <BookOpen size={12} /> {edu.fieldOfStudy}
                          </span>
                        )}
                        <span className="cp-edu-badge year">
                          <Calendar size={12} /> {formatYearRange()}
                        </span>
                        {edu.gpa && (
                          <span className="cp-edu-badge grade">
                            <Award size={12} /> {edu.gpa.toString().includes('%') || edu.gpa.toString().toLowerCase().includes('cgpa') ? edu.gpa : `${edu.gpa} CGPA / Score`}
                          </span>
                        )}
                      </div>

                      {edu.description && (
                        <p className="cp-timeline-desc" style={{ marginTop: 6 }}>
                          {edu.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {candidate.experiences && candidate.experiences.length > 0 && (
          <div className="cp-section-card">
            <h2 className="cp-section-title"><Briefcase size={18} /> Experience</h2>
            <div className="cp-timeline">
              {candidate.experiences.map((exp, idx) => (
                <div key={idx} className="cp-timeline-item">
                  <div className="cp-timeline-dot" />
                  <div className="cp-timeline-content">
                    <h3 className="cp-role-title">{exp.jobTitle}</h3>
                    <div className="cp-company-name">{exp.companyName}</div>
                    <div className="cp-date-range">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </div>
                    {exp.description && <p className="cp-exp-desc">{exp.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Section */}
        {candidate.projects && candidate.projects.length > 0 && (
          <div className="cp-section-card">
            <h2 className="cp-section-title"><FolderGit2 size={18} /> Projects &amp; Portfolio</h2>
            <div className="cp-projects-grid">
              {candidate.projects.map((proj, idx) => (
                <div key={idx} className="cp-project-card">
                  <h3 className="cp-project-title">{proj.title}</h3>
                  <p className="cp-project-desc">{proj.description}</p>
                  {proj.technologies && (
                    <div className="cp-tech-chips">
                      {proj.technologies.map((tech, tIdx) => (
                        <span key={tIdx} className="cp-tech-chip">{tech}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Give Verified Tag / Badge Modal (For HR Recruiters) */}
      {showTagModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 18, width: 460, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.85)', color: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Give Company Verified Tag</h3>
              </div>
              <button onClick={() => setShowTagModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94A3B8', lineHeight: 1.4 }}>
              Tag <strong style={{ color: '#F8FAFC' }}>{fullName}</strong> with an official verified corporate credential. Your company director will review and approve the issuance.
            </p>

            {tagSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#34D399', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
                ✓ {tagSuccessMsg}
              </div>
            )}

            {tagErrorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
                ⚠️ {tagErrorMsg}
              </div>
            )}

            <form onSubmit={handleSendTagRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Verified Role / Job Title *
                </label>
                <input
                  required
                  placeholder="e.g. Lead Full-Stack Architect, Senior Backend Engineer"
                  value={tagJobTitle}
                  onChange={e => setTagJobTitle(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Department / Business Unit (Optional)
                </label>
                <input
                  placeholder="e.g. Core Engineering, AI Platforms"
                  value={tagDept}
                  onChange={e => setTagDept(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Endorsement / Screening Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Completed 5 rigorous technical interview rounds with outstanding problem-solving skills."
                  value={tagNotes}
                  onChange={e => setTagNotes(e.target.value)}
                  style={{ width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#FFFFFF', fontSize: 13.5, outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowTagModal(false)} style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tagSubmitting || !tagJobTitle.trim()}
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: tagSubmitting ? 0.7 : 1 }}
                >
                  {tagSubmitting ? 'Submitting...' : 'Submit Verified Tag 🏷️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateProfile;
