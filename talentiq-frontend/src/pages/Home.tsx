import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiGuideChatbot } from '../components/AiGuideChatbot';
import { JobMap, type JobItem } from '../components/JobMap';
import { apiClient } from '../api/client';
import {
  Sparkles, ArrowRight, Search, MapPin, Zap,
  Brain, Bell, BarChart3, Sun, Moon,
  Star, Users, Briefcase, TrendingUp, Bot,
  ChevronDown, Play, Globe
} from 'lucide-react';
import '../css/home.css';

/* ─── Types ─── */
interface Star { x: number; y: number; r: number; opacity: number; speed: number; }
interface FloatingCard {
  id: number; company: string; role: string; location: string;
  salary: string; logo: string; logoBg: string;
  top: string; left?: string; right?: string; delay: number;
}

/* ─── Floating Job Cards Data ─── */
const JOB_CARDS: FloatingCard[] = [
  { id: 1, company: 'Google', role: 'Senior UI/UX Designer', location: 'Remote', salary: '$120k – $180k', logo: 'G', logoBg: '#4285F4', top: '8%', left: '52%', delay: 0 },
  { id: 2, company: 'Microsoft', role: 'Full Stack Developer', location: 'Redmond, WA', salary: '$130k – $200k', logo: 'M', logoBg: '#00A4EF', top: '10%', right: '2%', delay: 0.6 },
  { id: 3, company: 'OpenAI', role: 'AI/ML Engineer', location: 'San Francisco, CA', salary: '$150k – $250k', logo: '✦', logoBg: '#10A37F', top: '42%', left: '50%', delay: 1.2 },
  { id: 4, company: 'Amazon', role: 'Product Manager', location: 'New York, NY', salary: '$140k – $210k', logo: 'A', logoBg: '#FF9900', top: '44%', right: '2%', delay: 0.3 },
  { id: 5, company: 'Netflix', role: 'Data Scientist', location: 'Los Gatos, CA', salary: '$120k – $180k', logo: 'N', logoBg: '#E50914', top: '72%', right: '4%', delay: 0.9 },
];

const STATS = [
  { icon: <Users size={24} />, value: '1M+', label: 'Active Candidates', color: '#7C3AED' },
  { icon: <Briefcase size={24} />, value: '25K+', label: 'Companies Hiring', color: '#2563EB' },
  { icon: <Star size={24} />, value: '10K+', label: 'Jobs Live Now', color: '#DB2777' },
  { icon: <TrendingUp size={24} />, value: '98%', label: 'Success Rate', color: '#059669' },
];

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
  const starsRef = useRef<Star[]>([]);
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

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0,
    }} />
  );
};

/* ══════════════════════════
   FLOATING JOB CARD
══════════════════════════ */
const FloatCard: React.FC<{ card: FloatingCard; dark: boolean }> = ({ card, dark }) => (
  <div style={{
    position: 'absolute',
    top: card.top,
    ...(card.left ? { left: card.left } : {}),
    ...(card.right ? { right: card.right } : {}),
    animation: `floatY 4s ease-in-out infinite`,
    animationDelay: `${card.delay}s`,
    zIndex: 3,
    cursor: 'pointer',
    transform: 'perspective(800px) rotateY(-5deg)',
    transition: 'transform 0.3s ease',
  }}
    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateY(0deg) scale(1.05)'}
    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateY(-5deg)'}
  >
    <div style={{
      background: dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(14px)',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
      borderRadius: '14px',
      padding: '14px 16px',
      width: '210px',
      boxShadow: dark
        ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
        : '0 8px 32px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: card.logoBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF', fontWeight: 800, fontSize: '13px', flexShrink: 0,
        }}>{card.logo}</div>
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
  const [dark, setDark] = useState(true);
  const [searchJob, setSearchJob] = useState('');
  const [searchLoc, setSearchLoc] = useState('');
  const [activeTab, setActiveTab] = useState<'jobs' | 'talent'>('jobs');
  const [counters, setCounters] = useState([0, 0, 0, 0]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [showMapInHero, setShowMapInHero] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  /* Fetch Jobs & Candidate Applications for Map */
  useEffect(() => {
    const fetchHomeJobs = async () => {
      try {
        const res = await apiClient.get('/jobs?page=0&size=50');
        const list = Array.isArray(res.data.data) ? res.data.data : (res.data.content || []);
        if (list.length > 0) {
          setJobs(list);
        } else {
          throw new Error('No jobs');
        }
      } catch {
        // Mock fallback dataset with Bangalore/Whitefield (Karnataka), Mumbai, Hyderabad, Pune, SF, NYC
        setJobs([
          {
            id: 1,
            title: 'Senior Java Developer (Microservices & Spring Boot)',
            company: { id: 100, name: 'Infosys Horizon Labs', verified: true },
            location: 'Whitefield, Bangalore, Karnataka',
            jobType: 'FULL_TIME',
            experienceLevel: 'SENIOR',
            remote: false,
            hybrid: true,
            salaryMin: 140000,
            salaryMax: 185000,
            currency: 'USD',
            description: 'Architect and scale high-throughput Java microservices using Spring Boot 3, Kafka, Docker, and Redis caching.',
            requiredSkills: [{ skillName: 'Java' }, { skillName: 'Spring Boot' }, { skillName: 'Microservices' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 2,
            title: 'Full Stack Java & React Engineer',
            company: { id: 101, name: 'Flipkart Tech Dynamics', verified: true },
            location: 'Electronic City, Bangalore, Karnataka',
            jobType: 'FULL_TIME',
            experienceLevel: 'MID',
            remote: true,
            hybrid: false,
            salaryMin: 130000,
            salaryMax: 165000,
            currency: 'USD',
            description: 'Build enterprise-grade e-commerce microservices with Java Spring framework and modern responsive React/TypeScript interfaces.',
            requiredSkills: [{ skillName: 'Java' }, { skillName: 'React' }, { skillName: 'TypeScript' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 3,
            title: 'Lead Java Cloud Architect',
            company: { id: 102, name: 'Swiggy Cloud Platform', verified: true },
            location: 'Koramangala, Bangalore, Karnataka',
            jobType: 'FULL_TIME',
            experienceLevel: 'LEAD',
            remote: false,
            hybrid: true,
            salaryMin: 175000,
            salaryMax: 220000,
            currency: 'USD',
            description: 'Design distributed hyper-scalable backend systems with Java 17+, AWS ECS, Kubernetes, and high-speed Redis message brokers.',
            requiredSkills: [{ skillName: 'Java' }, { skillName: 'Kubernetes' }, { skillName: 'AWS' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 4,
            title: 'AI Machine Learning Architect',
            company: { id: 103, name: 'NeuralAI Labs', verified: true },
            location: 'HITEC City, Hyderabad, Telangana',
            jobType: 'FULL_TIME',
            experienceLevel: 'LEAD',
            remote: true,
            hybrid: true,
            salaryMin: 180000,
            salaryMax: 230000,
            currency: 'USD',
            description: 'Deploy state-of-the-art LLM fine-tuning pipelines, vector databases (Pinecone / Milvus), and scalable PyTorch inference microservices.',
            requiredSkills: [{ skillName: 'Python' }, { skillName: 'PyTorch' }, { skillName: 'AI' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 5,
            title: 'Senior Frontend Engineer (React & 3D WebGL)',
            company: { id: 104, name: 'Tata Digital Ventures', verified: true },
            location: 'Mumbai, Maharashtra',
            jobType: 'FULL_TIME',
            experienceLevel: 'SENIOR',
            remote: true,
            hybrid: false,
            salaryMin: 135000,
            salaryMax: 175000,
            currency: 'USD',
            description: 'Craft cutting-edge responsive UI web applications using React, Three.js 3D graphics, Tailwind CSS, and WebSockets.',
            requiredSkills: [{ skillName: 'React' }, { skillName: 'TypeScript' }, { skillName: 'Three.js' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 6,
            title: 'DevOps & Site Reliability Engineer',
            company: { id: 105, name: 'Cybage Cloud Systems', verified: true },
            location: 'Hinjawadi, Pune, Maharashtra',
            jobType: 'FULL_TIME',
            experienceLevel: 'MID',
            remote: false,
            hybrid: true,
            salaryMin: 125000,
            salaryMax: 160000,
            currency: 'USD',
            description: 'Manage automated CI/CD GitHub Actions pipelines, Terraform infrastructure-as-code, and Kubernetes clusters.',
            requiredSkills: [{ skillName: 'Docker' }, { skillName: 'Kubernetes' }, { skillName: 'CI/CD' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 7,
            title: 'Principal Distributed Systems Engineer',
            company: { id: 106, name: 'Stripe Horizon', verified: true },
            location: 'San Francisco, CA',
            jobType: 'FULL_TIME',
            experienceLevel: 'EXECUTIVE',
            remote: true,
            hybrid: false,
            salaryMin: 210000,
            salaryMax: 280000,
            currency: 'USD',
            description: 'Drive high-availability financial infrastructure processing millions of global API calls per minute.',
            requiredSkills: [{ skillName: 'Java' }, { skillName: 'Go' }, { skillName: 'Kafka' }],
            postedAt: new Date().toISOString()
          },
          {
            id: 8,
            title: 'Data Science & Analytics Lead',
            company: { id: 107, name: 'Bloomberg Quant Lab', verified: true },
            location: 'New York, NY',
            jobType: 'FULL_TIME',
            experienceLevel: 'LEAD',
            remote: false,
            hybrid: true,
            salaryMin: 190000,
            salaryMax: 245000,
            currency: 'USD',
            description: 'Build predictive statistical models and automated trading analytics dashboards using Python and SQL.',
            requiredSkills: [{ skillName: 'Python' }, { skillName: 'SQL' }, { skillName: 'Data' }],
            postedAt: new Date().toISOString()
          }
        ]);
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

    fetchHomeJobs();
    fetchMyApps();
  }, []);

  const handleHomeApply = async (jobId: number) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
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
      navigate('/login');
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

  /* Counter animation */
  useEffect(() => {
    const targets = [1000000, 25000, 10000, 98];
    const duration = 1800;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounters(targets.map(t => Math.floor(t * ease)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 600);
    return () => clearTimeout(t);
  }, []);

  const formatStat = (val: number, idx: number) => {
    if (idx === 3) return val + '%';
    if (val >= 1000000) return (val / 1000000).toFixed(0) + 'M+';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K+';
    return val + '+';
  };

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
    <div style={{ background: T.bg, minHeight: '100vh', transition: 'background 0.4s ease', position: 'relative', overflow: 'hidden' }}>

      {/* Star field */}
      <StarCanvas dark={dark} />

      {/* Glowing Orbs — Parallax */}
      <div style={{
        position: 'fixed', top: '10%', right: '15%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1, transition: 'transform 0.1s ease', ...orb1Style,
        animation: 'pulse-glow 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '5%', width: '400px', height: '400px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1, transition: 'transform 0.1s ease', ...orb2Style,
        animation: 'pulse-glow 8s ease-in-out infinite 2s',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '30%', width: '300px', height: '300px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(219,39,119,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 1,
        animation: 'pulse-glow 7s ease-in-out infinite 1s',
      }} />

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: T.navBg,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 40px', height: '68px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>
            <Sparkles size={18} color="#FFF" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', color: T.text, letterSpacing: '-0.02em' }}>
            Hire<span style={{ color: '#7C3AED' }}>Mind</span> AI
          </span>
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {['Home', 'Find Jobs', 'For Employers', 'AI Recruiter', 'Pricing'].map((item, i) => (
            <button key={item} onClick={() => { if (item === 'Find Jobs') navigate('/jobs'); else if (item === 'For Employers') navigate('/hr-login'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#7C3AED' : T.muted,
                borderBottom: i === 0 ? '2px solid #7C3AED' : '2px solid transparent',
                paddingBottom: '2px', transition: 'color 0.2s',
              }}
              onMouseEnter={e => { if (i !== 0) (e.currentTarget as HTMLButtonElement).style.color = T.text; }}
              onMouseLeave={e => { if (i !== 0) (e.currentTarget as HTMLButtonElement).style.color = T.muted; }}
            >{item}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dark/Light Toggle */}
          <button className="theme-btn" onClick={() => setDark(d => !d)} style={{
            width: '44px', height: '44px', borderRadius: '50%', border: `1px solid ${T.border}`,
            background: T.surface, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.3s ease', color: dark ? '#F59E0B' : '#6366F1',
          }}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={() => navigate('/hr-login')} style={{
            padding: '9px 16px', borderRadius: '10px', border: `1px solid rgba(129, 140, 248, 0.4)`,
            background: 'rgba(99, 102, 241, 0.12)', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            color: '#818CF8', transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#818CF8'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(129, 140, 248, 0.4)'}
          >HR Login</button>

          <button onClick={() => navigate('/login')} style={{
            padding: '9px 18px', borderRadius: '10px', border: `1px solid ${T.border}`,
            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            color: T.text, transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#7C3AED'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = T.border}
          >Candidate Login</button>

          <button onClick={() => navigate('/register')} style={{
            padding: '9px 20px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
            cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#FFF',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(124,58,237,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)'; }}
          >Sign Up</button>
        </div>
      </nav>

      {/* ══ HERO SECTION ══ */}
      <section ref={heroRef} style={{
        position: 'relative', zIndex: 2, maxWidth: '1280px', margin: '0 auto',
        padding: '80px 40px 40px', display: 'flex', gap: '48px', alignItems: 'center', minHeight: '82vh',
      }}>
        {/* Left Content */}
        <div style={{ flex: 1, maxWidth: '540px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '999px',
            background: dark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.35)',
            fontSize: '12px', fontWeight: 600, color: '#A78BFA',
            marginBottom: '24px', animation: 'badge-pop 0.6s ease forwards',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A78BFA', animation: 'pulse-glow 2s infinite' }} />
            AI-Powered Job Marketplace ✦
          </div>

          {/* Headline */}
          <h1 className="hero-title" style={{
            fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '24px', color: T.text,
          }}>
            Where Talent<br />Meets{' '}
            <span style={{
              background: 'linear-gradient(90deg, #7C3AED, #DB2777, #F59E0B)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
            }}>Opportunity</span>
          </h1>

          <p className="hero-sub" style={{
            fontSize: '17px', lineHeight: 1.7, color: T.muted, marginBottom: '36px', maxWidth: '460px',
          }}>
            HireMind AI uses the power of AI to connect great people with great companies. Smarter matching, faster hiring.
          </p>

          {/* CTA Buttons */}
          <div className="hero-btns" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button className="cta-primary" onClick={() => navigate('/register')} style={{
              padding: '14px 28px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
              color: '#FFF', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(124,58,237,0.4)', transition: 'all 0.25s ease',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              Find Your Dream Job <ArrowRight size={16} />
            </button>
            <button className="cta-secondary" onClick={() => navigate('/hr-analytics')} style={{
              padding: '14px 28px', borderRadius: '12px',
              border: `1px solid ${T.border}`,
              background: 'transparent', color: T.text,
              fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.25s ease',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Play size={15} fill={T.text} /> I'm Hiring Talent
            </button>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex' }}>
              {['#7C3AED', '#DB2777', '#059669', '#2563EB'].map((c, i) => (
                <div key={i} style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: c,
                  border: `2px solid ${T.bg}`, marginLeft: i > 0 ? '-10px' : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#FFF',
                }}>{['J', 'S', 'A', 'M'][i]}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}
              </div>
              <span style={{ fontSize: '12px', color: T.muted }}>
                <strong style={{ color: T.text }}>10K+</strong> Join 1M+ professionals already finding success
              </span>
            </div>
          </div>
        </div>

        {/* Right — 3D Portal + Floating Cards */}
        <div style={{ flex: 1, position: 'relative', height: '600px', minWidth: 0 }}>
          {/* Central glowing portal */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`,
            width: '220px', height: '320px', transition: 'transform 0.1s ease',
            zIndex: 2,
          }}>
            {/* Outer spinning ring */}
            <div style={{
              position: 'absolute', inset: '-30px', borderRadius: '50%',
              border: '1px solid transparent',
              background: 'linear-gradient(#06071A, #06071A) padding-box, linear-gradient(135deg, #7C3AED, #06B6D4, #DB2777) border-box',
              animation: 'spin-slow 8s linear infinite',
            }} />
            {/* Inner glow portal */}
            <div style={{
              width: '100%', height: '100%', borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%',
              background: 'linear-gradient(180deg, rgba(124,58,237,0.3) 0%, rgba(6,182,212,0.4) 50%, rgba(219,39,119,0.3) 100%)',
              boxShadow: '0 0 80px rgba(124,58,237,0.5), 0 0 120px rgba(6,182,212,0.3), inset 0 0 60px rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}>
              {/* Silhouette figure */}
              <div style={{ marginBottom: '20px', fontSize: '64px', filter: 'brightness(0) invert(0.1)' }}>🧑‍💼</div>
            </div>
            {/* Glow rays */}
            {[0, 60, 120, 180, 240, 300].map(angle => (
              <div key={angle} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '2px', height: '60px', background: 'linear-gradient(transparent, rgba(124,58,237,0.4))',
                transformOrigin: '50% 0',
                transform: `rotate(${angle}deg) translateX(-50%)`,
                animation: `pulse-glow ${2 + angle / 100}s ease-in-out infinite`,
              }} />
            ))}
          </div>

          {/* Floating Job Cards */}
          {JOB_CARDS.map(card => (
            <FloatCard key={card.id} card={card} dark={dark} />
          ))}
        </div>
      </section>

      {/* ══ SEARCH BAR ══ */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '0 40px 60px' }}>
        <div style={{
          background: dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${T.border}`,
          borderRadius: '20px', padding: '28px 32px',
          boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.12)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {(['jobs', 'talent'] as const).map(tab => (
              <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
                padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === tab ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: activeTab === tab ? '#A78BFA' : T.muted,
                borderBottom: activeTab === tab ? '2px solid #7C3AED' : '2px solid transparent',
              }}>
                {tab === 'jobs' ? '🔍 Find Jobs' : '👥 Find Talent'}
              </button>
            ))}
          </div>

          {/* Search Inputs */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, position: 'relative', minWidth: '220px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Job title, keywords, or company" value={searchJob}
                onChange={e => setSearchJob(e.target.value)}
                style={{
                  width: '100%', padding: '13px 14px 13px 42px', borderRadius: '12px',
                  border: `1px solid ${T.border}`, background: T.inputBg,
                  color: T.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  transition: 'border 0.2s',
                }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#7C3AED'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = T.border}
              />
            </div>
            <div style={{ flex: 1, position: 'relative', minWidth: '160px' }}>
              <MapPin size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Location" value={searchLoc}
                onChange={e => setSearchLoc(e.target.value)}
                style={{
                  width: '100%', padding: '13px 14px 13px 42px', borderRadius: '12px',
                  border: `1px solid ${T.border}`, background: T.inputBg,
                  color: T.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  transition: 'border 0.2s',
                }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#7C3AED'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = T.border}
              />
            </div>
            <div style={{ flex: 1, position: 'relative', minWidth: '140px' }}>
              <select style={{
                width: '100%', padding: '13px 36px 13px 14px', borderRadius: '12px',
                border: `1px solid ${T.border}`, background: T.inputBg,
                color: T.muted, fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer',
              }}>
                {['All Categories', 'Engineering', 'Design', 'Product', 'Marketing', 'Data Science'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            <button className="search-btn" onClick={() => navigate(`/jobs${searchJob ? `?q=${searchJob}` : ''}`)} style={{
              padding: '13px 28px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
              color: '#FFF', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)', transition: 'all 0.25s ease',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
            }}>
              <Search size={16} /> Search Jobs
            </button>
          </div>

          {/* Popular Tags */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: T.muted, fontWeight: 600 }}>Popular:</span>
              {['Software Engineer', 'Product Manager', 'Data Analyst', 'UI/UX Designer', 'DevOps Engineer', 'Java Developer'].map(tag => (
                <button key={tag} className="popular-tag" onClick={() => setSearchJob(tag)} style={{
                  padding: '4px 12px', borderRadius: '999px',
                  border: `1px solid ${T.border}`, background: searchJob === tag ? 'rgba(124,58,237,0.2)' : 'transparent',
                  color: searchJob === tag ? '#A78BFA' : T.muted, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                }}>{tag}</button>
              ))}
            </div>

            <button
              onClick={() => setShowMapInHero(!showMapInHero)}
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#C4B5FD',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
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
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '0 40px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-card" style={{
              background: T.statBg, backdropFilter: 'blur(16px)',
              border: `1px solid ${T.border}`, borderRadius: '16px',
              padding: '24px', textAlign: 'center', cursor: 'default',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: s.color + '20', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 14px', color: s.color,
              }}>{s.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: T.text, marginBottom: '4px' }}>
                {formatStat(counters[i], i)}
              </div>
              <div style={{ fontSize: '13px', color: T.muted, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ WHY HIREMIND ══ */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '0 40px 100px' }}>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 240px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: T.text, marginBottom: '12px' }}>
              Why Choose<br />HireMind AI?
            </h2>
            <p style={{ fontSize: '14px', color: T.muted, lineHeight: 1.7, marginBottom: '20px' }}>
              HireMind AI makes your job search{' '}
              <span style={{ color: '#7C3AED', fontWeight: 700 }}>smarter</span>,{' '}
              <span style={{ color: '#DB2777', fontWeight: 700 }}>faster</span>, and{' '}
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>easier</span>.
            </p>
            <button onClick={() => navigate('/register')} style={{
              padding: '12px 24px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
              color: '#FFF', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}>
              <Bot size={16} /> Try AI Matching <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', minWidth: '280px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feat-card" style={{
                background: T.featBg, backdropFilter: 'blur(16px)',
                border: `1px solid ${T.border}`, borderRadius: '16px',
                padding: '24px', cursor: 'default', transition: 'all 0.3s ease',
                boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: f.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: f.color, marginBottom: '14px',
                }}>{f.icon}</div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: T.text, marginBottom: '8px' }}>{f.title}</h4>
                <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '0 40px 100px' }}>
        <div style={{
          borderRadius: '24px', padding: '60px 48px', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(6,182,212,0.2) 50%, rgba(219,39,119,0.25) 100%)',
          border: `1px solid rgba(124,58,237,0.3)`,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 80px rgba(124,58,237,0.2)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px',
            borderRadius: '50%', background: 'rgba(124,58,237,0.15)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', left: '-30px', width: '150px', height: '150px',
            borderRadius: '50%', background: 'rgba(6,182,212,0.12)',
          }} />
          <h2 style={{ fontSize: '36px', fontWeight: 900, color: T.text, marginBottom: '14px', position: 'relative' }}>
            Ready to Land Your Dream Job?
          </h2>
          <p style={{ fontSize: '16px', color: T.muted, marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px', position: 'relative' }}>
            Join over 1 million professionals who found their perfect role using HireMind AI.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <button onClick={() => navigate('/register')} style={{
              padding: '14px 32px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
              color: '#FFF', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              boxShadow: '0 6px 25px rgba(124,58,237,0.45)', transition: 'all 0.25s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'}
            >Get Started for Free →</button>
            <button onClick={() => navigate('/jobs')} style={{
              padding: '14px 32px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: T.text,
              fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.25s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'}
            >Browse Live Jobs</button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        position: 'relative', zIndex: 2,
        borderTop: `1px solid ${T.border}`,
        padding: '32px 40px', textAlign: 'center',
        background: dark ? 'rgba(6,7,26,0.6)' : 'rgba(240,244,255,0.6)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={12} color="#FFF" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', color: T.text }}>HireMind AI</span>
        </div>
        <p style={{ fontSize: '13px', color: T.muted }}>
          © 2026 HireMind AI · Built by{' '}
          <a href="https://github.com/AbhayGupta002/HireMind-AI" target="_blank" rel="noreferrer" style={{ color: '#A78BFA', textDecoration: 'none', fontWeight: 600 }}>Abhay Gupta</a>
          {' '}· AI-powered recruitment, reimagined.
        </p>
      </footer>

      {/* ══ AI GUIDE CHATBOT WIDGET ══ */}
      <AiGuideChatbot dark={dark} />
    </div>
  );
};
