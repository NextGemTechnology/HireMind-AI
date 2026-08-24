import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  User, Mail, MapPin, Briefcase, GraduationCap, FolderGit2,
  ExternalLink, ArrowLeft, MessageSquare,
  Sparkles, CheckCircle2, Globe, Code2,
  Building2, Calendar, Award, BookOpen
} from 'lucide-react';
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

  const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate Profile';

  return (
    <div className="candidate-profile-page theme-universe">
      <div className="candidate-profile-container">
        {/* Top navigation row */}
        <div className="cp-nav-bar">
          <button onClick={() => navigate(-1)} className="cp-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => navigate(`/messages?recipientId=${candidate.userId || candidate.id}&recruiterName=${encodeURIComponent(fullName)}`)}
            className="cp-message-btn"
          >
            <MessageSquare size={16} /> Message Candidate
          </button>
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
    </div>
  );
};

export default CandidateProfile;
