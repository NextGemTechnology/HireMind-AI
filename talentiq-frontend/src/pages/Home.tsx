import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { JobMap, type JobItem } from '../components/JobMap';
import { apiClient } from '../api/client';
import {
  ArrowRight, Search, MapPin,
  Brain, Sun, Moon,
  Star, Users, Briefcase, TrendingUp,
  ChevronDown, Globe, Menu, X,
  Shield, MessageSquare, FileText, ArrowUpRight,
  Lock, Zap, CheckCircle2
} from 'lucide-react';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/home.css';

/* ─── Types ─── */
export interface PlatformStats {
  activeCandidates: number;
  activeCandidatesFormatted: string;
  companiesHiring: number;
  companiesHiringFormatted: string;
  jobsLiveNow: number;
  jobsLiveNowFormatted: string;
  successRate: number;
  successRateFormatted: string;
  totalApplications: number;
  aiMatchesMade: number;
  cacheSource?: string;
}

const FEATURES = [
  {
    icon: <Brain size={24} />,
    title: 'AI Match Engine',
    desc: 'Our algorithm analyzes skills, experience, and preferences to deliver highly relevant job-candidate pairings.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Verified Company Badges',
    desc: 'Every recruiter and company goes through a rigorous verification pipeline to ensure authenticity.',
  },
  {
    icon: <MessageSquare size={24} />,
    title: 'Real-Time Recruiter Chat',
    desc: 'Engage directly with hiring managers via encrypted WebSocket messaging with delivery receipts.',
  },
  {
    icon: <FileText size={24} />,
    title: 'Smart Portfolio Builder',
    desc: 'Build a professional portfolio, track applications, and manage your career pipeline in one place.',
  },
];

/* ══════════════════════════
   MAIN COMPONENT
══════════════════════════ */
export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isUniverse } = useTheme();
  const dark = isUniverse;
  const [searchJob, setSearchJob] = useState('');
  const [searchLoc, setSearchLoc] = useState('');
  const [counters, setCounters] = useState([0, 0, 0, 0]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [showMapInHero, setShowMapInHero] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  /* Detect scroll to instantly show elevated navbar */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Fetch Public Platform Stats from Redis & Jobs */
  useEffect(() => {
    let isMounted = true;
    const fetchPlatformStats = async () => {
      try {
        let res;
        try {
          res = await apiClient.get('/public/stats');
        } catch {
          res = await apiClient.get('/analytics/public-stats');
        }
        const data: PlatformStats = res?.data?.data || res?.data;
        if (data && isMounted) {
          setPlatformStats(data);
          const targets = [
            Number(data.activeCandidates) || 1,
            Number(data.companiesHiring) || 1,
            Number(data.jobsLiveNow) || 1,
            Math.round(Number(data.successRate) || 98)
          ];
          const duration = 1200;
          const start = Date.now();
          const tick = () => {
            if (!isMounted) return;
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCounters(targets.map(t => Math.floor(t * ease)));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.warn('Could not load public platform stats:', err);
      }
    };

    const fetchHomeJobs = async () => {
      try {
        const res = await apiClient.get('/jobs?page=0&size=50');
        const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.content || res.data?.data?.content || []);
        if (isMounted) setJobs(Array.isArray(list) ? list : []);
      } catch {
        if (isMounted) setJobs([]);
      }
    };

    const fetchMyApps = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const res = await apiClient.get('/applications/my?page=0&size=100');
        const apps = res.data?.data?.content || res.data?.data || res.data?.content || [];
        const ids = apps.map((a: any) => a.job?.id || a.jobId).filter(Boolean);
        if (ids.length > 0 && isMounted) setAppliedJobIds(ids);
      } catch {
        // safe ignore
      }
    };

    fetchPlatformStats();
    fetchHomeJobs();
    fetchMyApps();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleHomeApply = async (jobId: number) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/user-login');
      return;
    }
    try {
      await apiClient.post('/applications', { jobId });
      setAppliedJobIds(prev => [...prev, jobId]);
    } catch {
      setAppliedJobIds(prev => [...prev, jobId]);
    }
  };

  const handleHomeChat = (job: JobItem) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/user-login');
      return;
    }
    const recruiterId = job.postedById || job.company?.id || 2;
    const recruiterName = job.company?.name ? `${job.company.name} Recruiter` : 'Hiring Team';
    navigate(`/messages?recipientId=${recruiterId}&recruiterName=${encodeURIComponent(recruiterName)}&jobTitle=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company?.name || '')}`);
  };

  const formatStat = (val: number, idx: number) => {
    if (idx === 3) return val + '%';
    if (val >= 1000000) return (val / 1000000).toFixed(0) + 'M+';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K+';
    return val + '+';
  };

  const statItems = [
    {
      icon: <Users size={20} />,
      label: 'Active Candidates',
      value: platformStats?.activeCandidatesFormatted || (counters[0] > 0 ? formatStat(counters[0], 0) : '1M+'),
    },
    {
      icon: <Briefcase size={20} />,
      label: 'Companies Hiring',
      value: platformStats?.companiesHiringFormatted || (counters[1] > 0 ? formatStat(counters[1], 1) : '25K+'),
    },
    {
      icon: <Star size={20} />,
      label: 'Jobs Live Now',
      value: platformStats?.jobsLiveNowFormatted || (counters[2] > 0 ? formatStat(counters[2], 2) : '10K+'),
    },
    {
      icon: <TrendingUp size={20} />,
      label: 'Success Rate',
      value: platformStats?.successRateFormatted || (counters[3] > 0 ? formatStat(counters[3], 3) : '98%'),
    },
  ];

  /* Close mobile menu on nav */
  const navTo = useCallback((path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <div className={`hp ${dark ? 'hp--dark' : 'hp--light'}`}>

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav className={`hp-nav ${isScrolled ? 'hp-nav--scrolled' : ''}`}>
        <div className="hp-nav__inner">
          <div className="hp-nav__brand" onClick={() => navTo('/')}>
            <HireMindLogo variant="navbar" size="md" />
          </div>

          {/* Desktop Links */}
          <div className={`hp-nav__links ${mobileMenuOpen ? 'hp-nav__links--open' : ''}`}>
            <button onClick={() => navTo('/')} className="hp-nav__link hp-nav__link--active">Home</button>
            <button onClick={() => navTo('/jobs')} className="hp-nav__link">Find Jobs</button>
            <button onClick={() => navTo('/about')} className="hp-nav__link">About</button>
            <button onClick={() => navTo('/contact')} className="hp-nav__link">Contact</button>

            {/* Mobile-only CTA inside drawer */}
            <div className="hp-nav__mobile-cta">
              <button onClick={() => navTo('/user-login')} className="hp-btn hp-btn--outline hp-btn--full">Log In</button>
              <button onClick={() => navTo('/user-login')} className="hp-btn hp-btn--primary hp-btn--full">Sign Up</button>
            </div>
          </div>

          <div className="hp-nav__actions">
            <button className="hp-nav__theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => navTo('/user-login')} className="hp-btn hp-btn--outline hp-nav__desktop-only">Log In</button>
            <button onClick={() => navTo('/user-login')} className="hp-btn hp-btn--primary hp-nav__desktop-only">Sign Up</button>
            <button className="hp-nav__hamburger" onClick={() => setMobileMenuOpen(p => !p)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hp-hero">
        <div className="hp-hero__content">
          <span className="hp-hero__badge">▪ AI-POWERED TALENT INTELLIGENCE</span>
          <h1 className="hp-hero__title">
            Where Elite Talent Meets<br />
            <span className="hp-hero__title-accent">Intelligent Opportunity</span>
          </h1>
          <p className="hp-hero__subtitle">
            HireMind AI connects professionals with verified companies through intelligent matching,
            real-time communication, and data-driven career insights. Smarter hiring starts here.
          </p>
          <div className="hp-hero__actions">
            <button className="hp-btn hp-btn--primary hp-btn--lg" onClick={() => navTo('/jobs')}>
              Explore Live Jobs <ArrowUpRight size={16} />
            </button>
            <button className="hp-btn hp-btn--outline hp-btn--lg" onClick={() => navTo('/hr-login')}>
              For Employers <ArrowRight size={16} />
            </button>
          </div>
          <div className="hp-hero__proof">
            <div className="hp-hero__avatars">
              {['A', 'S', 'M', 'J'].map((c, i) => (
                <div key={i} className="hp-hero__avatar">{c}</div>
              ))}
            </div>
            <p className="hp-hero__proof-text">
              Trusted by tech professionals and verified enterprise hiring teams worldwide
            </p>
          </div>
        </div>

        {/* Product Preview Card */}
        <div className="hp-hero__visual">
          <div className="hp-preview">
            <div className="hp-preview__header">
              <div className="hp-preview__dots">
                <span /><span /><span />
              </div>
              <span className="hp-preview__label">HireMind AI — Live Dashboard</span>
            </div>
            <div className="hp-preview__body">
              <div className="hp-preview__match">
                <div className="hp-preview__match-score">92%</div>
                <div>
                  <div className="hp-preview__match-title">AI Match Score</div>
                  <div className="hp-preview__match-sub">Senior Full-Stack Engineer</div>
                </div>
              </div>
              <div className="hp-preview__stats-row">
                <div className="hp-preview__stat">
                  <span className="hp-preview__stat-val">{platformStats?.jobsLiveNowFormatted || '10K+'}</span>
                  <span className="hp-preview__stat-lbl">Live Jobs</span>
                </div>
                <div className="hp-preview__stat">
                  <span className="hp-preview__stat-val">98%</span>
                  <span className="hp-preview__stat-lbl">Match Rate</span>
                </div>
              </div>
              <div className="hp-preview__tags">
                <span className="hp-preview__tag hp-preview__tag--verified"><Shield size={11} /> Verified</span>
                <span className="hp-preview__tag">React</span>
                <span className="hp-preview__tag">Node.js</span>
                <span className="hp-preview__tag">AWS</span>
              </div>
              <div className="hp-preview__bar-chart">
                {[65, 80, 92, 75, 88, 95, 82].map((h, i) => (
                  <div key={i} className="hp-preview__bar" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="hp-section">
        <div className="hp-section__inner">
          <div className="hp-section__header">
            <span className="hp-section__tag">PLATFORM CAPABILITIES</span>
            <h2 className="hp-section__title">Enterprise-Grade Recruitment Intelligence</h2>
            <p className="hp-section__desc">
              Everything you need to streamline hiring and accelerate career growth, built on modern technology.
            </p>
          </div>
          <div className="hp-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="hp-feature">
                <div className="hp-feature__icon">{f.icon}</div>
                <h3 className="hp-feature__title">{f.title}</h3>
                <p className="hp-feature__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS STRIP ═══════════════ */}
      <section className="hp-stats">
        <div className="hp-stats__inner">
          {statItems.map((s, i) => (
            <div key={i} className="hp-stat">
              <div className="hp-stat__icon">{s.icon}</div>
              <div className="hp-stat__value">{s.value}</div>
              <div className="hp-stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ JOB SEARCH & MAP ═══════════════ */}
      <section className="hp-section">
        <div className="hp-section__inner">
          <div className="hp-section__header">
            <span className="hp-section__tag">JOB DISCOVERY</span>
            <h2 className="hp-section__title">Find Your Next Opportunity</h2>
            <p className="hp-section__desc">
              Search thousands of verified positions by role, location, or category.
            </p>
          </div>

          <div className="hp-search">
            <div className="hp-search__row">
              <div className="hp-search__field hp-search__field--wide">
                <Search size={16} className="hp-search__icon" />
                <input
                  type="text"
                  placeholder="Job title, keywords, or company"
                  value={searchJob}
                  onChange={e => setSearchJob(e.target.value)}
                  className="hp-search__input"
                />
              </div>
              <div className="hp-search__field">
                <MapPin size={16} className="hp-search__icon" />
                <input
                  type="text"
                  placeholder="Location"
                  value={searchLoc}
                  onChange={e => setSearchLoc(e.target.value)}
                  className="hp-search__input"
                />
              </div>
              <div className="hp-search__field hp-search__field--select">
                <select className="hp-search__select">
                  {['All Categories', 'Engineering', 'Design', 'Product', 'Marketing', 'Data Science'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="hp-search__chevron" />
              </div>
              <button
                className="hp-btn hp-btn--primary"
                onClick={() => navigate(`/jobs${searchJob ? `?q=${searchJob}` : ''}`)}
              >
                <Search size={16} /> Search
              </button>
            </div>

            <div className="hp-search__tags">
              <span className="hp-search__tags-label">Popular:</span>
              {['Software Engineer', 'Product Manager', 'Data Analyst', 'UI/UX Designer', 'DevOps Engineer', 'Java Developer'].map(tag => (
                <button
                  key={tag}
                  className={`hp-search__tag ${searchJob === tag ? 'hp-search__tag--active' : ''}`}
                  onClick={() => setSearchJob(tag)}
                >
                  {tag}
                </button>
              ))}
              <button className="hp-search__map-toggle" onClick={() => setShowMapInHero(!showMapInHero)}>
                <Globe size={13} /> {showMapInHero ? 'Hide Map' : 'Show Job Map'}
              </button>
            </div>

            {showMapInHero && (
              <div className="hp-search__map">
                <JobMap
                  jobs={jobs}
                  appliedJobIds={appliedJobIds}
                  onApply={handleHomeApply}
                  onShowDetails={() => navigate(`/jobs`)}
                  onChatRecruiter={handleHomeChat}
                  activeSearchQuery={`${searchJob} ${searchLoc}`.trim()}
                  height="380px"
                  title="Live Job Opportunities — State-wise Map"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="hp-section">
        <div className="hp-section__inner">
          <div className="hp-section__header">
            <span className="hp-section__tag">HOW IT WORKS</span>
            <h2 className="hp-section__title">Intelligent Recruitment in Three Steps</h2>
            <p className="hp-section__desc">
              From automated resume ingestion to verified job placement, our pipeline removes friction at every stage.
            </p>
          </div>

          <div className="hp-process">
            <div className="hp-process__card">
              <div className="hp-process__step">01</div>
              <div className="hp-process__icon"><FileText size={22} /></div>
              <h3 className="hp-process__title">Semantic Profile Ingestion</h3>
              <p className="hp-process__desc">
                Upload your resume or build your candidate profile. Our parser automatically structures technical skills, work history, and portfolio credentials.
              </p>
            </div>

            <div className="hp-process__card">
              <div className="hp-process__step">02</div>
              <div className="hp-process__icon"><Brain size={22} /></div>
              <h3 className="hp-process__title">Neural AI Matching</h3>
              <p className="hp-process__desc">
                Proprietary AI analyzes requirements and calculates multi-dimensional compatibility scores against verified corporate openings with zero bias.
              </p>
            </div>

            <div className="hp-process__card">
              <div className="hp-process__step">03</div>
              <div className="hp-process__icon"><MessageSquare size={22} /></div>
              <h3 className="hp-process__title">Direct Recruiter Connect</h3>
              <p className="hp-process__desc">
                Engage directly with decision makers via secure WebSocket messaging, coordinate interviews, and track application milestones in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ ENTERPRISE SECURITY & RELIABILITY ═══════════════ */}
      <section className="hp-section hp-section--alt">
        <div className="hp-section__inner">
          <div className="hp-section__header">
            <span className="hp-section__tag">SECURITY & RELIABILITY</span>
            <h2 className="hp-section__title">Enterprise Infrastructure You Can Rely On</h2>
            <p className="hp-section__desc">
              Built from the ground up with enterprise security protocols, authentic verification seals, and high-concurrency performance.
            </p>
          </div>

          <div className="hp-trust">
            <div className="hp-trust__card">
              <div className="hp-trust__icon"><Shield size={22} /></div>
              <h4 className="hp-trust__title">Verified Employer Seals</h4>
              <p className="hp-trust__desc">Every recruiter and corporate domain is authenticated to prevent phantom postings and spam.</p>
            </div>

            <div className="hp-trust__card">
              <div className="hp-trust__icon"><Zap size={22} /></div>
              <h4 className="hp-trust__title">Sub-50ms Redis Telemetry</h4>
              <p className="hp-trust__desc">Distributed in-memory caching powers instant candidate searches, job discovery, and metrics.</p>
            </div>

            <div className="hp-trust__card">
              <div className="hp-trust__icon"><Lock size={22} /></div>
              <h4 className="hp-trust__title">Role-Based Access & MFA</h4>
              <p className="hp-trust__desc">Strict RBAC across Candidate, HR, Developer, and SuperAdmin tiers with RFC 6238 TOTP two-factor security.</p>
            </div>

            <div className="hp-trust__card">
              <div className="hp-trust__icon"><CheckCircle2 size={22} /></div>
              <h4 className="hp-trust__title">Audit Trail & Integrity</h4>
              <p className="hp-trust__desc">Immutable forensic audit logging for applications, interview scheduling, and official credential verification.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ REFINED CTA BANNER ═══════════════ */}
      <section className="hp-cta">
        <div className="hp-cta__inner">
          <h2 className="hp-cta__title">
            Ready to Experience Modern<br />Recruitment Intelligence?
          </h2>
          <p className="hp-cta__desc">
            Discover verified opportunities, connect directly with decision makers, and elevate your hiring journey with HireMind AI.
          </p>
          <div className="hp-cta__actions">
            <button className="hp-btn hp-btn--primary hp-btn--lg" onClick={() => navTo('/jobs')}>
              Explore Opportunities <ArrowUpRight size={16} />
            </button>
            <button className="hp-btn hp-btn--outline hp-btn--lg" onClick={() => navTo('/hr-login')}>
              Employer Solutions <ArrowRight size={16} />
            </button>
          </div>
          <div className="hp-cta__trust-row">
            <span className="hp-cta__trust-item"><CheckCircle2 size={13} /> Verified Employers</span>
            <span className="hp-cta__trust-dot">•</span>
            <span className="hp-cta__trust-item"><CheckCircle2 size={13} /> Direct Recruiter Access</span>
            <span className="hp-cta__trust-dot">•</span>
            <span className="hp-cta__trust-item"><CheckCircle2 size={13} /> Zero Spam Guarantee</span>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="hp-footer">
        <div className="hp-footer__inner">
          <div className="hp-footer__brand">
            <HireMindLogo variant="navbar" size="sm" />
            <p className="hp-footer__brand-desc">
              AI-powered recruitment intelligence platform connecting elite talent with verified companies.
            </p>
          </div>

          <div className="hp-footer__col">
            <h4 className="hp-footer__col-title">Platform</h4>
            <Link to="/jobs" className="hp-footer__link">Find Jobs</Link>
            <Link to="/hr-login" className="hp-footer__link">For Employers</Link>
            <Link to="/user-login" className="hp-footer__link">Candidate Portal</Link>
          </div>

          <div className="hp-footer__col">
            <h4 className="hp-footer__col-title">Company</h4>
            <Link to="/about" className="hp-footer__link">About</Link>
            <Link to="/contact" className="hp-footer__link">Contact</Link>
            <a href="https://github.com/NextGemTechnology" target="_blank" rel="noreferrer" className="hp-footer__link">GitHub</a>
            <a href="https://www.linkedin.com/company/139843904/admin/dashboard/" target="_blank" rel="noreferrer" className="hp-footer__link">LinkedIn</a>
          </div>

          <div className="hp-footer__col">
            <h4 className="hp-footer__col-title">Legal</h4>
            <Link to="/terms" className="hp-footer__link">Terms & Conditions</Link>
            <Link to="/privacy" className="hp-footer__link">Privacy Policy</Link>
          </div>
        </div>

        <div className="hp-footer__bottom">
          <span className="hp-footer__email">
            Support: <a href="mailto:nextgemtechno@gmail.com">nextgemtechno@gmail.com</a>
          </span>
          <p className="hp-footer__copyright">
            &copy; {new Date().getFullYear()}{' '}
            <a href="https://github.com/NextGemTechnology" target="_blank" rel="noreferrer">NextGem-Technology</a>.
            All rights reserved. Built by{' '}
            <a href="https://github.com/AbhayGupta002" target="_blank" rel="noreferrer">Abhay Gupta</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
