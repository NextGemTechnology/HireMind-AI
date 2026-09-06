import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { JobMap, type JobItem } from '../components/JobMap';
import { apiClient } from '../api/client';
import {
  Sparkles, ArrowRight, Search, MapPin, Zap,
  Brain, Bell, BarChart3, Sun, Moon,
  Star, Users, Briefcase, TrendingUp,
  ChevronDown, Play, Globe, Menu, X
} from 'lucide-react';
import { HireMindLogo } from '../components/HireMindLogo';
import { AiLogo } from '../components/AiLogo';
import '../css/home.css';

/* ─── Types ─── */
interface StarItem { x: number; y: number; r: number; opacity: number; speed: number; }
interface FloatingCard {
  id: number; company: string; role: string; location: string;
  salary: string; logo: string; logoBg: string;
  top: string; left?: string; right?: string; delay: number;
}

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
  { icon: <Brain size={22} />, title: 'AI-Powered Matching', desc: 'Advanced AI matches you with jobs that fit your skills and goals.', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  { icon: <Zap size={22} />, title: 'One-Click Apply', desc: 'Apply to multiple jobs instantly with your smart profile.', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { icon: <Bell size={22} />, title: 'Real-time Alerts', desc: 'Get instant notifications for new jobs that match you.', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  { icon: <BarChart3 size={22} />, title: 'Career Insights', desc: 'Get AI-powered insights to grow your career faster.', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
];

/* ══════════════════════════
   STAR CANVAS
══════════════════════════ */
const StarCanvas: React.FC<{ dark: boolean }> = ({ dark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<StarItem[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    starsRef.current = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      starsRef.current.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(255,255,255,${s.opacity})`
          : `rgba(100,120,255,${s.opacity * 0.4})`;
        ctx.fill();
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current); };
  }, [dark]);

  return <canvas ref={canvasRef} className="home-star-canvas" />;
};

/* ══════════════════════════
   FLOATING JOB CARD
══════════════════════════ */
const FloatCard: React.FC<{ card: FloatingCard; dark: boolean }> = ({ card, dark }) => (
  <div
    className="float-card-wrapper"
    style={{
      top: card.top,
      ...(card.left ? { left: card.left } : {}),
      ...(card.right ? { right: card.right } : {}),
      animationDelay: `${card.delay}s`,
    }}
  >
    <div className={`float-card-inner ${dark ? 'dark' : 'light'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div className="float-logo-box" style={{ background: card.logoBg }}>
          {card.logo}
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: dark ? '#F8FAFC' : '#1E293B' }}>{card.role}</div>
          <div style={{ fontSize: '10px', color: dark ? '#94A3B8' : '#64748B' }}>{card.company}</div>
        </div>
      </div>
      <div style={{ fontSize: '10px', color: dark ? '#94A3B8' : '#64748B', marginBottom: '4px' }}>{card.location}</div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: card.logoBg }}>{card.salary}</div>
    </div>
  </div>
);

/* ══════════════════════════
   MAIN COMPONENT
══════════════════════════ */
export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isUniverse } = useTheme();
  const dark = isUniverse;
  const [searchJob, setSearchJob] = useState('');
  const [searchLoc, setSearchLoc] = useState('');
  const [activeTab, setActiveTab] = useState<'jobs' | 'talent'>('jobs');
  const [counters, setCounters] = useState([0, 0, 0, 0]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [showMapInHero, setShowMapInHero] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  /* Fetch Public Platform Stats from Redis & Jobs */
  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const res = await apiClient.get('/public/stats');
        const data: PlatformStats = res.data?.data;
        if (data) {
          setPlatformStats(data);
          const targets = [
            data.activeCandidates || 1000000,
            data.companiesHiring || 25000,
            data.jobsLiveNow || 10000,
            Math.round(data.successRate || 98)
          ];
          const duration = 1800;
          const start = Date.now();
          const tick = () => {
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
        const list = Array.isArray(res.data.data) ? res.data.data : (res.data.content || res.data.data?.content || []);
        setJobs(Array.isArray(list) ? list : []);
      } catch {
        setJobs([]);
      }
    };

    const fetchMyApps = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const res = await apiClient.get('/applications/my?page=0&size=100');
        const apps = res.data?.data?.content || res.data?.data || res.data?.content || [];
        const ids = apps.map((a: any) => a.job?.id || a.jobId).filter(Boolean);
        if (ids.length > 0) setAppliedJobIds(ids);
      } catch {
        // safe ignore
      }
    };

    fetchPlatformStats();
    fetchHomeJobs();
    fetchMyApps();
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

  /* Parallax mouse tracking */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const formatStat = (val: number, idx: number) => {
    if (idx === 3) return val + '%';
    if (val >= 1000000) return (val / 1000000).toFixed(0) + 'M+';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K+';
    return val + '+';
  };

  /* Dynamic Floating Job Cards from Live Database */
  const dynamicFloatingCards: FloatingCard[] = jobs.length > 0
    ? jobs.slice(0, 5).map((job, idx) => {
        const colors = ['#4285F4', '#00A4EF', '#10A37F', '#FF9900', '#E50914'];
        const positions = [
          { top: '8%', left: '52%' },
          { top: '10%', right: '2%' },
          { top: '42%', left: '50%' },
          { top: '44%', right: '2%' },
          { top: '72%', right: '4%' },
        ];
        const pos = positions[idx % positions.length];
        const salaryText = job.salaryMin
          ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax! / 1000).toFixed(0)}k`
          : 'Competitive';
        return {
          id: job.id,
          company: job.company?.name || 'Tech Innovator',
          role: job.title,
          location: job.location || (job.remote ? 'Remote' : 'Hybrid'),
          salary: salaryText,
          logo: job.company?.name ? job.company.name.charAt(0).toUpperCase() : '⚡',
          logoBg: colors[idx % colors.length],
          top: pos.top,
          left: pos.left,
          right: pos.right,
          delay: idx * 0.3,
        };
      })
    : [
        { id: 1, company: 'Google', role: 'Staff Cloud Architect', location: 'Remote', salary: '$160k – $220k', logo: 'G', logoBg: '#4285F4', top: '8%', left: '52%', delay: 0 },
        { id: 2, company: 'Microsoft', role: 'Full Stack Engineer', location: 'Redmond, WA', salary: '$140k – $200k', logo: 'M', logoBg: '#00A4EF', top: '10%', right: '2%', delay: 0.6 },
        { id: 3, company: 'OpenAI', role: 'AI/ML Systems Lead', location: 'San Francisco, CA', salary: '$180k – $280k', logo: '✦', logoBg: '#10A37F', top: '42%', left: '50%', delay: 1.2 },
        { id: 4, company: 'Amazon', role: 'Principal PM', location: 'Seattle, WA', salary: '$150k – $210k', logo: 'A', logoBg: '#FF9900', top: '44%', right: '2%', delay: 0.3 },
        { id: 5, company: 'Netflix', role: 'Distributed Systems Engineer', location: 'Los Gatos, CA', salary: '$170k – $240k', logo: 'N', logoBg: '#E50914', top: '72%', right: '4%', delay: 0.9 },
      ];

  const dynamicStatCards = [
    {
      icon: <Users size={24} />,
      label: 'Active Candidates',
      color: '#7C3AED',
      displayValue: platformStats?.activeCandidatesFormatted || formatStat(counters[0], 0),
    },
    {
      icon: <Briefcase size={24} />,
      label: 'Companies Hiring',
      color: '#2563EB',
      displayValue: platformStats?.companiesHiringFormatted || formatStat(counters[1], 1),
    },
    {
      icon: <Star size={24} />,
      label: 'Jobs Live Now',
      color: '#DB2777',
      displayValue: platformStats?.jobsLiveNowFormatted || formatStat(counters[2], 2),
    },
    {
      icon: <TrendingUp size={24} />,
      label: 'Success Rate',
      color: '#059669',
      displayValue: platformStats?.successRateFormatted || formatStat(counters[3], 3),
    },
  ];

  /* Theme colors */
  const T = {
    bg: dark ? '#06071A' : '#F0F4FF',
    surface: dark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
    border: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    text: dark ? '#F8FAFC' : '#0F172A',
    muted: dark ? '#94A3B8' : '#475569',
    cardBg: dark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
    inputBg: dark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    statBg: dark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.9)',
    featBg: dark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    navBg: dark ? 'rgba(6,7,26,0.85)' : 'rgba(240,244,255,0.9)',
  };

  const orb1Style = {
    transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`,
  };
  const orb2Style = {
    transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
  };

  return (
    <div className="home-page-container" style={{ background: T.bg }}>

      {/* Star field */}
      <StarCanvas dark={dark} />

      {/* Glowing Orbs — Parallax */}
      <div className="home-orb orb-1" style={orb1Style} />
      <div className="home-orb orb-2" style={orb2Style} />
      <div className="home-orb orb-3" />

      {/* ══ NAVBAR ══ */}
      <nav className="home-navbar" style={{ background: T.navBg, borderBottom: `1px solid ${T.border}` }}>
        <div className="home-nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <HireMindLogo variant="navbar" size="md" />
        </div>

        {/* Desktop & Mobile Drawer Links */}
        <div className={`home-nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`} style={mobileMenuOpen ? { background: T.navBg, borderBottom: `1px solid ${T.border}` } : {}}>
          {['Home', 'Find Jobs', 'For Employers', 'AI Recruiter', 'Pricing'].map((item, i) => (
            <button
              key={item}
              onClick={() => {
                setMobileMenuOpen(false);
                if (item === 'Find Jobs') navigate('/jobs');
                else if (item === 'For Employers') navigate('/hr-login');
              }}
              className="home-nav-link-btn"
              style={{
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#7C3AED' : T.muted,
                borderBottom: i === 0 ? '2px solid #7C3AED' : '2px solid transparent',
              }}
            >
              {item}
            </button>
          ))}
          {/* Mobile-only action shortcuts inside drawer */}
          <div className="home-mobile-nav-cta">
            <button onClick={() => { setMobileMenuOpen(false); navigate('/hr-login'); }} className="home-hr-login-btn" style={{ width: '100%', textAlign: 'center' }}>
              HR Login
            </button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/user-login'); }} className="home-candidate-login-btn" style={{ width: '100%', border: `1px solid ${T.border}`, color: T.text, textAlign: 'center' }}>
              Candidate Login
            </button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/user-login'); }} className="home-signup-btn" style={{ width: '100%', textAlign: 'center' }}>
              Sign Up
            </button>
          </div>
        </div>

        <div className="home-nav-actions">
          {/* Dark/Light Toggle */}
          <button
            className="home-theme-btn"
            onClick={toggleTheme}
            style={{
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: dark ? '#F59E0B' : '#6366F1',
            }}
            aria-label="Toggle Theme"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={() => navigate('/hr-login')} className="home-hr-login-btn">
            HR Login
          </button>

          <button
            onClick={() => navigate('/user-login')}
            className="home-candidate-login-btn"
            style={{ border: `1px solid ${T.border}`, color: T.text }}
          >
            Candidate Login
          </button>

          <button onClick={() => navigate('/user-login')} className="home-signup-btn">
            Sign Up
          </button>

          {/* Mobile hamburger button */}
          <button
            className="home-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle Navigation Menu"
            style={{ border: `1px solid ${T.border}`, background: T.surface, color: T.text }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ══ HERO SECTION ══ */}
      <section ref={heroRef} className="home-hero-section">
        {/* Left Content */}
        <div className="home-hero-left">
          {/* Badge */}
          <div
            className="home-hero-badge"
            style={{ background: dark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)' }}
          >
            <div className="badge-dot" />
            AI-Powered Job Marketplace ✦
          </div>

          {/* Headline */}
          <h1 className="hero-title" style={{ color: T.text }}>
            Where Talent<br />Meets{' '}
            <span className="hero-gradient-text">Opportunity</span>
          </h1>

          <p className="hero-sub" style={{ color: T.muted }}>
            HireMind AI uses the power of AI to connect great people with great companies. Smarter matching, faster hiring.
          </p>

          {/* CTA Buttons */}
          <div className="hero-btns">
            <button className="cta-primary" onClick={() => navigate('/hr-register')}>
              Find Your Dream Job <ArrowRight size={16} />
            </button>
            <button
              className="cta-secondary"
              onClick={() => navigate('/hr-analytics')}
              style={{ border: `1px solid ${T.border}`, color: T.text }}
            >
              <Play size={15} fill={T.text} /> I'm Hiring Talent
            </button>
          </div>

          {/* Social proof */}
          <div className="social-proof-bar">
            <div className="social-avatars-group">
              {['#7C3AED', '#DB2777', '#059669', '#2563EB'].map((c, i) => (
                <div
                  key={i}
                  className="social-avatar-circle"
                  style={{
                    background: c,
                    border: `2px solid ${T.bg}`,
                    marginLeft: i > 0 ? '-10px' : 0,
                  }}
                >
                  {['J', 'S', 'A', 'M'][i]}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}
              </div>
              <span style={{ fontSize: '12px', color: T.muted }}>
                Join <strong style={{ color: T.text }}>{platformStats?.activeCandidatesFormatted || '1M+'}</strong> top professionals hired across <strong style={{ color: T.text }}>{platformStats?.companiesHiringFormatted || '25K+'}</strong> companies
              </span>
            </div>
          </div>
        </div>

        {/* Right — 3D Portal + Floating Cards */}
        <div className="home-hero-right">
          {/* Central glowing portal */}
          <div
            className="portal-center-box"
            style={{
              transform: `translate(-50%, -50%) translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`,
            }}
          >
            {/* Outer spinning ring */}
            <div className="portal-outer-ring" />
            {/* Inner glow portal */}
            <div className="portal-inner-glow">
              {/* Silhouette figure */}
              <div className="portal-silhouette">🧑‍💼</div>
            </div>
            {/* Glow rays */}
            {[0, 60, 120, 180, 240, 300].map(angle => (
              <div
                key={angle}
                className="portal-ray"
                style={{
                  transform: `rotate(${angle}deg) translateX(-50%)`,
                  animation: `pulseGlowHome ${2 + angle / 100}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>

          {/* Floating Job Cards */}
          {dynamicFloatingCards.map(card => (
            <FloatCard key={card.id} card={card} dark={dark} />
          ))}
        </div>
      </section>

      {/* ══ SEARCH BAR ══ */}
      <section className="home-search-section">
        <div
          className={`search-box-card ${dark ? 'dark' : 'light'}`}
          style={{ border: `1px solid ${T.border}` }}
        >
          {/* Tabs */}
          <div className="search-tabs-row">
            {(['jobs', 'talent'] as const).map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : 'inactive'}`}
                onClick={() => setActiveTab(tab)}
                style={{ color: activeTab === tab ? '#A78BFA' : T.muted }}
              >
                {tab === 'jobs' ? '🔍 Find Jobs' : '👥 Find Talent'}
              </button>
            ))}
          </div>

          {/* Search Inputs */}
          <div className="search-inputs-grid">
            <div className="search-input-wrapper" style={{ flex: 2, minWidth: '220px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Job title, keywords, or company"
                value={searchJob}
                onChange={e => setSearchJob(e.target.value)}
                className="search-input-field"
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.inputBg,
                  color: T.text,
                }}
              />
            </div>
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: '160px' }}>
              <MapPin size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Location"
                value={searchLoc}
                onChange={e => setSearchLoc(e.target.value)}
                className="search-input-field"
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.inputBg,
                  color: T.text,
                }}
              />
            </div>
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: '140px' }}>
              <select
                className="search-select-field"
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.inputBg,
                  color: T.muted,
                }}
              >
                {['All Categories', 'Engineering', 'Design', 'Product', 'Marketing', 'Data Science'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            <button
              className="search-btn"
              onClick={() => navigate(`/jobs${searchJob ? `?q=${searchJob}` : ''}`)}
            >
              <Search size={16} /> Search Jobs
            </button>
          </div>

          {/* Popular Tags */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: T.muted, fontWeight: 600 }}>Popular:</span>
              {['Software Engineer', 'Product Manager', 'Data Analyst', 'UI/UX Designer', 'DevOps Engineer', 'Java Developer'].map(tag => (
                <button
                  key={tag}
                  className="popular-tag"
                  onClick={() => setSearchJob(tag)}
                  style={{
                    border: `1px solid ${T.border}`,
                    background: searchJob === tag ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: searchJob === tag ? '#A78BFA' : T.muted,
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowMapInHero(!showMapInHero)}
              className="map-toggle-btn"
            >
              <Globe size={13} /> {showMapInHero ? 'Hide Interactive Map' : 'Show State-wise Job Map'}
            </button>
          </div>

          {/* 🗺️ Embedded Interactive State-wise Job Map */}
          {showMapInHero && (
            <div style={{ marginTop: '22px' }}>
              <JobMap
                jobs={jobs}
                appliedJobIds={appliedJobIds}
                onApply={handleHomeApply}
                onShowDetails={() => navigate(`/jobs`)}
                onChatRecruiter={handleHomeChat}
                activeSearchQuery={`${searchJob} ${searchLoc}`.trim()}
                height="380px"
                title="🗺️ Live Job Opportunities Map (State-wise Flags & Tech Hubs)"
              />
            </div>
          )}
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="home-stats-section">
        <div className="stats-grid-4">
          {dynamicStatCards.map((s, i) => (
            <div
              key={i}
              className="stat-card"
              style={{
                background: T.statBg,
                border: `1px solid ${T.border}`,
                boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <div
                className="stat-icon-circle"
                style={{ background: s.color + '20', color: s.color }}
              >
                {s.icon}
              </div>
              <div className="stat-card-value" style={{ color: T.text }}>
                {s.displayValue}
              </div>
              <div className="stat-card-label" style={{ color: T.muted }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ WHY HIREMIND ══ */}
      <section className="home-features-section">
        <div className="features-layout">
          <div className="features-side-intro">
            <h2 className="features-side-title" style={{ color: T.text }}>
              Why Choose<br />HireMind AI?
            </h2>
            <p className="features-side-desc" style={{ color: T.muted }}>
              HireMind AI makes your job search{' '}
              <span style={{ color: '#7C3AED', fontWeight: 700 }}>smarter</span>,{' '}
              <span style={{ color: '#DB2777', fontWeight: 700 }}>faster</span>, and{' '}
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>easier</span>.
            </p>
            <button onClick={() => navigate('/register')} className="features-side-btn">
              <AiLogo size={16} /> Try AI Matching <ArrowRight size={14} />
            </button>
          </div>
          <div className="features-grid-cards">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="feat-card"
                style={{
                  background: T.featBg,
                  border: `1px solid ${T.border}`,
                  boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="feat-icon-box"
                  style={{ background: f.bg, color: f.color }}
                >
                  {f.icon}
                </div>
                <h4 className="feat-card-title" style={{ color: T.text }}>{f.title}</h4>
                <p className="feat-card-desc" style={{ color: T.muted }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section className="home-cta-section">
        <div className="cta-banner-card">
          <div className="cta-glow-circle-1" />
          <div className="cta-glow-circle-2" />
          <h2 className="cta-banner-title" style={{ color: T.text }}>
            Ready to Land Your Dream Job?
          </h2>
          <p className="cta-banner-sub" style={{ color: T.muted }}>
            Join over 1 million professionals who found their perfect role using HireMind AI.
          </p>
          <div className="cta-banner-buttons">
            <button onClick={() => navigate('/register')} className="cta-get-started-btn">
              Get Started for Free →
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="cta-browse-jobs-btn"
              style={{ color: T.text }}
            >
              Browse Live Jobs
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer
        className="home-footer"
        style={{
          borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(6,7,26,0.6)' : 'rgba(240,244,255,0.6)',
        }}
      >
        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo-icon">
            <Sparkles size={14} color="#FFF" />
          </div>

          <span style={{ fontWeight: 800, fontSize: '16px', color: T.text }}>
            HireMind AI
          </span>
        </div>

        {/* Footer Links */}
        <div className="footer-links-row no-copy">
          <Link
            to="/contact"
            className="footer-link-item"
            style={{ color: T.muted }}
          >
            Contact Us
          </Link>

          <Link
            to="/about"
            className="footer-link-item"
            style={{ color: T.muted }}
          >
            About
          </Link>

          <Link
            to="/terms"
            className="footer-link-item"
            style={{ color: T.muted }}
          >
            Terms &amp; Conditions
          </Link>

          <Link
            to="/privacy"
            className="footer-link-item"
            style={{ color: T.muted }}
          >
            Privacy Policy
          </Link>

          <a
            href="https://github.com/NextGemTechnology"
            target="_blank"
            rel="noreferrer"
            className="footer-link-item"
            style={{ color: T.muted }}
          >
            GitHub
          </a>

          <a
            href="https://www.linkedin.com/company/139843904/admin/dashboard/"
            target="_blank"
            rel="noreferrer"
            className="footer-link-item"
            style={{ color: T.muted }}
          >
            LinkedIn
          </a>
        </div>

        {/* Official Email */}
        <div className="footer-support-email" style={{ color: T.muted }}>
          Official Support:{' '}
          <a href="mailto:nextgemtechno@gmail.com">
            nextgemtechno@gmail.com
          </a>
        </div>

        {/* Company & Copyright Notice */}
        <p className="footer-copyright no-copy" style={{ color: T.muted }}>
          &copy; {new Date().getFullYear()}{' '}
          <a
            href="https://github.com/NextGemTechnology"
            target="_blank"
            rel="noreferrer"
          >
            NextGem-Technology
          </a>
          . All rights reserved. Built by{' '}
          <a
            href="https://github.com/AbhayGupta002"
            target="_blank"
            rel="noreferrer"
          >
            Abhay Gupta
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Home;
