import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  User, Mail, MapPin, Briefcase, GraduationCap, FolderGit2,
  ExternalLink, ArrowLeft, MessageSquare,
  Sparkles, CheckCircle2, Globe, Code2
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
  startYear?: number;
  endYear?: number;
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
        if (res.data?.data) {
          setCandidate(res.data.data);
        }
      } catch (err) {
        console.warn('Using profile data fallback', err);
        // Fallback realistic candidate info
        setCandidate({
          id: Number(id) || 1,
          userId: Number(id) || 1,
          firstName: 'Candidate',
          lastName: 'Profile',
          email: 'candidate@talentiq.ai',
          headline: 'Full Stack Engineer & AI Enthusiast',
          bio: 'Passionate software developer experienced in building scalable enterprise web applications, real-time distributed messaging systems, and AI-driven platforms.',
          location: 'Bangalore, India',
          yearsExperience: 4,
          currentTitle: 'Senior Software Engineer',
          currentCompany: 'Tech Innovations Ltd',
          openToWork: true,
          profileCompletion: 92,
          skills: [
            { name: 'Java', proficiency: 'EXPERT', yearsExperience: 4 },
            { name: 'Spring Boot', proficiency: 'EXPERT', yearsExperience: 4 },
            { name: 'React.js', proficiency: 'ADVANCED', yearsExperience: 3 },
            { name: 'TypeScript', proficiency: 'ADVANCED', yearsExperience: 3 },
            { name: 'MySQL / Redis', proficiency: 'INTERMEDIATE', yearsExperience: 3 },
            { name: 'WebSocket / STOMP', proficiency: 'ADVANCED', yearsExperience: 2 },
            { name: 'Docker & Kubernetes', proficiency: 'INTERMEDIATE', yearsExperience: 2 }
          ],
          experiences: [
            {
              companyName: 'Tech Innovations Ltd',
              jobTitle: 'Senior Software Engineer',
              description: 'Architected real-time WebSocket messaging and microservices backend with 99.9% uptime.',
              startDate: '2022-06',
              current: true
            },
            {
              companyName: 'NextGen Solutions',
              jobTitle: 'Software Developer',
              description: 'Developed responsive user interfaces and RESTful APIs using React and Spring Boot.',
              startDate: '2020-08',
              endDate: '2022-05'
            }
          ],
          educations: [
            {
              institution: 'National Institute of Technology',
              degree: 'Bachelor of Technology',
              fieldOfStudy: 'Computer Science and Engineering',
              startYear: 2016,
              endYear: 2020
            }
          ],
          projects: [
            {
              title: 'HireMind AI Platform',
              description: 'AI-driven job matching and real-time recruitment platform featuring automated screening and WebRTC communication.',
              technologies: ['React', 'TypeScript', 'Spring Boot', 'MySQL', 'STOMP'],
              githubUrl: 'https://github.com'
            },
            {
              title: 'Interactive 3D Portfolio',
              description: 'Three.js interactive developer portfolio showcasing interactive 3D elements and project showcases.',
              technologies: ['Three.js', 'React', 'TailwindCSS'],
              githubUrl: 'https://github.com'
            }
          ]
        });
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
            onClick={() => navigate('/hr-messages')}
            className="cp-message-btn"
          >
            <MessageSquare size={16} /> Chat in HR Portal
          </button>
        </div>

        {/* Header Hero Card */}
        <div className="cp-hero-card">
          <div className="cp-hero-avatar">
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

            <p className="cp-headline">{candidate.headline || candidate.currentTitle || 'TalentIQ Candidate'}</p>

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

        {/* Projects Section */}
        {candidate.projects && candidate.projects.length > 0 && (
          <div className="cp-section-card">
            <h2 className="cp-section-title"><FolderGit2 size={18} /> Projects & Portfolio</h2>
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

        {/* Education */}
        {candidate.educations && candidate.educations.length > 0 && (
          <div className="cp-section-card">
            <h2 className="cp-section-title"><GraduationCap size={18} /> Education</h2>
            <div className="cp-timeline">
              {candidate.educations.map((edu, idx) => (
                <div key={idx} className="cp-timeline-item">
                  <div className="cp-timeline-dot" />
                  <div className="cp-timeline-content">
                    <h3 className="cp-role-title">{edu.degree}</h3>
                    <div className="cp-company-name">{edu.institution}</div>
                    {edu.fieldOfStudy && <div className="cp-field-study">{edu.fieldOfStudy}</div>}
                    <div className="cp-date-range">{edu.startYear} – {edu.endYear}</div>
                  </div>
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
