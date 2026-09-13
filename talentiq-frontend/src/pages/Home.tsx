import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getPostLoginRoute } from '../utils/roleRoutes';
import { ArrowRight, ArrowUpRight, Brain, Briefcase, Check, CheckCircle2, FileText, Layers3, Menu, MessageSquare, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/home.css';

interface PlatformStats {
  activeCandidates: number;
  companiesHiring: number;
  jobsLiveNow: number;
}

const FEATURES = [
  { icon: Brain, title: 'Find your fit', label: 'Intelligent matching', desc: 'Discover opportunities that connect your skills and experience with what teams need.' },
  { icon: ShieldCheck, title: 'Know who’s hiring', label: 'Company verification', desc: 'See company details and verification badges as you explore your next move.' },
  { icon: MessageSquare, title: 'Start a conversation', label: 'Recruiter messaging', desc: 'Connect with recruiters, share your work and keep the conversation in one place.' },
  { icon: FileText, title: 'Show the whole story', label: 'Your professional profile', desc: 'Bring your experience, skills and portfolio together. Make your next introduction count.' },
];
const STEPS = [
  { icon: FileText, title: 'Tell your story', desc: 'Build your profile with your skills, experience and the work you’re proud of.' },
  { icon: Brain, title: 'Discover the possibilities', desc: 'Explore roles and use match insights to focus on opportunities that fit.' },
  { icon: MessageSquare, title: 'Make the connection', desc: 'Apply, speak with recruiters and follow your progress from one workspace.' },
];

/** Home owns its light palette and never changes the shared app theme. */
export function Home() {
  const { isAuthenticated, user, isHr } = useAuth();
  const hasWorkspace = isAuthenticated && !!user;
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsState, setStatsState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let mounted = true;
    // Preserve the existing public endpoint and compatibility fallback.
    const loadStats = async () => {
      try {
        let response;
        try { response = await apiClient.get('/public/stats'); }
        catch { response = await apiClient.get('/analytics/public-stats'); }
        const data = response.data?.data ?? response.data;
        if (!mounted) return;
        if (data && ['activeCandidates', 'companiesHiring', 'jobsLiveNow'].every(key =>
          typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0)) {
          setStats(data);
          setStatsState('ready');
        } else { setStatsState('unavailable'); }
      } catch { if (mounted) setStatsState('unavailable'); }
    };
    void loadStats();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sections = rootRef.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!sections || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.reveal = 'visible';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    const revealAll = () => {
      if (!media.matches) return;
      sections.forEach(section => { section.dataset.reveal = 'visible'; });
      observer.disconnect();
    };
    if (!media.matches) sections.forEach(section => {
      // Above-the-fold content stays visible from the first paint.
      if (section.getBoundingClientRect().top >= window.innerHeight) {
        section.dataset.reveal = 'pending';
        observer.observe(section);
      }
    });
    media.addEventListener('change', revealAll);
    return () => { observer.disconnect(); media.removeEventListener('change', revealAll); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    const onOutsideClick = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 769px)');
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutsideClick);
    desktop.addEventListener('change', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutsideClick);
      desktop.removeEventListener('change', onResize);
    };
  }, [menuOpen]);

  const goToSection = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.currentTarget.hash === '#home'
      ? rootRef.current
      : rootRef.current?.querySelector<HTMLElement>(event.currentTarget.hash);
    if (!target) return;
    event.preventDefault();
    setMenuOpen(false);
    target.dataset.reveal = 'visible';
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const metrics = [
    { label: 'Candidate profiles', value: stats?.activeCandidates, icon: Users },
    { label: 'Companies hiring', value: stats?.companiesHiring, icon: Briefcase },
    { label: 'Live opportunities', value: stats?.jobsLiveNow, icon: Layers3 },
  ];

  return <div ref={rootRef} className="hp" id="home" tabIndex={-1}>
    <a className="hp-skip" href="#home-content" onClick={goToSection}>Skip to content</a>
    <header ref={headerRef} className="hp-nav" onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
    }}>
      <div className="hp-container hp-nav__inner">
        <a href="#home" className="hp-nav__brand" aria-label="HireMind home" onClick={goToSection}>
          <HireMindLogo variant="navbar" size="md" theme="light" animated={false} />
        </a>
        <button ref={menuButtonRef} type="button" className="hp-nav__menu" aria-controls="home-navigation" aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="home-navigation" aria-label="Home navigation" className={`hp-nav__links${menuOpen ? ' is-open' : ''}`}>
          <a href="#platform" onClick={goToSection}>The platform</a>
          <a href="#how-it-works" onClick={goToSection}>How it works</a>
          <a href="#teams" onClick={goToSection}>For hiring teams</a>
          <Link to={hasWorkspace ? getPostLoginRoute(user.roles || []) : '/user-login'} className="hp-btn hp-btn--small" onClick={() => setMenuOpen(false)}>{hasWorkspace ? 'Open workspace' : 'Candidate access'} <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </div>
    </header>

    <div id="home-content" tabIndex={-1} className="hp-content">
      <section className="hp-hero hp-container" aria-labelledby="home-title">
        <div className="hp-hero__content">
          <span className="hp-eyebrow hp-hero__badge"><Sparkles size={14} aria-hidden="true" /> A little intelligence. A world of possibility.</span>
          <h1 id="home-title">Your next chapter.<br /><span>A smarter start.</span></h1>
          <p className="hp-hero__subtitle">Great careers start with the right connection. Meet the companies, people and opportunities that move you forward—with HireMind AI.</p>
          <Link to="/jobs" className="hp-btn hp-btn--primary hp-btn--large">Explore opportunities <ArrowUpRight size={19} aria-hidden="true" /></Link>
          <div className="hp-hero__note"><span className="hp-note-icon"><Check size={14} aria-hidden="true" /></span>Real opportunities. More meaningful connections.</div>
        </div>
        <figure className="hp-hero__visual" aria-label="Illustration of a candidate match and hiring workflow">
          <div className="hp-orbit hp-orbit--one" aria-hidden="true" /><div className="hp-orbit hp-orbit--two" aria-hidden="true" />
          <div className="hp-preview">
            <div className="hp-preview__header"><span><span className="hp-preview__dot" /> Your career workspace</span><Layers3 size={17} aria-hidden="true" /></div>
            <div className="hp-preview__body">
              <div className="hp-preview__intro"><span className="hp-eyebrow">THE RIGHT CONNECTION</span><span className="hp-preview__sample">Illustrative preview</span></div>
              <div className="hp-preview__match">
                <div className="hp-preview__score"><span>92<small>%</small></span></div>
                <div><strong>A promising match</strong><p>Skills aligned. Possibilities open.</p><span className="hp-preview__pill"><Sparkles size={12} aria-hidden="true" /> AI-powered insights</span></div>
              </div>
              <div className="hp-preview__role"><span className="hp-preview__role-icon"><Briefcase size={22} aria-hidden="true" /></span><div><strong>Product Engineer</strong><p>Engineering · Remote-friendly</p></div><ArrowUpRight size={18} aria-hidden="true" /></div>
              <div className="hp-preview__tags" aria-label="Example skills"><span>React</span><span>TypeScript</span><span>Product thinking</span></div>
              <div className="hp-preview__progress"><span><CheckCircle2 size={15} aria-hidden="true" /> Profile</span><i aria-hidden="true" /><span><Brain size={15} aria-hidden="true" /> Match</span><i aria-hidden="true" /><span><MessageSquare size={15} aria-hidden="true" /> Connect</span></div>
            </div>
          </div>
          <div className="hp-float hp-float--top"><span className="hp-float__icon"><ShieldCheck size={20} aria-hidden="true" /></span><div><strong>People, not just profiles.</strong><small>A more connected hiring journey</small></div></div>
          <div className="hp-float hp-float--bottom"><span className="hp-float__icon hp-float__icon--purple"><MessageSquare size={19} aria-hidden="true" /></span><div><strong>Your next conversation</strong><small>Could be your next beginning</small></div><span className="hp-float__spark" aria-hidden="true">✦</span></div>
          <figcaption>From potential to possibility.</figcaption>
        </figure>
      </section>

      <section className="hp-stats hp-container" aria-label="Platform activity">
        <div className="hp-stats__intro"><span className="hp-eyebrow">A GROWING COMMUNITY</span><p>Different ambitions.<br /><strong>One place to connect.</strong></p></div>
        <dl className="hp-stats__list">{metrics.map(metric => <div className="hp-stat" key={metric.label}>
          <dt><metric.icon size={16} aria-hidden="true" />{metric.label}</dt>
          <dd>{metric.value === undefined ? '—' : new Intl.NumberFormat('en').format(metric.value)}</dd>
        </div>)}</dl>
        <p className="hp-stats__status" role="status">{statsState === 'loading' ? 'Loading platform activity…' : statsState === 'unavailable' ? 'Live activity is temporarily unavailable.' : 'Current activity reported by the platform.'}</p>
      </section>

      <section id="platform" className="hp-section hp-container" tabIndex={-1} aria-labelledby="platform-title" data-reveal="visible">
        <div className="hp-section__header"><span className="hp-eyebrow">BUILT AROUND YOUR NEXT MOVE</span><h2 id="platform-title">Less searching.<br />More <span>possibility.</span></h2><p>A thoughtful set of tools for the whole journey—not just the next application.</p></div>
        <div className="hp-features">{FEATURES.map((feature, index) => <article key={feature.title} className="hp-feature">
          <div className="hp-feature__top"><span className="hp-feature__icon"><feature.icon size={24} aria-hidden="true" /></span><span className="hp-feature__number">0{index + 1}</span></div>
          <span className="hp-feature__label">{feature.label}</span><h3>{feature.title}</h3><p>{feature.desc}</p>
        </article>)}</div>
      </section>

      <section id="how-it-works" className="hp-process-section" tabIndex={-1} aria-labelledby="process-title" data-reveal="visible">
        <div className="hp-container"><div className="hp-section__header hp-section__header--center"><span className="hp-eyebrow">SIMPLE BY DESIGN</span><h2 id="process-title">Big ambitions.<br />Three small steps.</h2><p>A clearer path from “what’s next?” to your next conversation.</p></div>
          <ol className="hp-process">{STEPS.map((step, index) => <li key={step.title}><div className="hp-process__marker"><step.icon size={22} aria-hidden="true" /><span>0{index + 1}</span></div><h3>{step.title}</h3><p>{step.desc}</p></li>)}</ol>
        </div>
      </section>

      <section id="teams" className="hp-section hp-container" tabIndex={-1} aria-labelledby="teams-title" data-reveal="visible">
        <div className="hp-teams">
          <div><span className="hp-eyebrow">FOR TEAMS THAT SEE POTENTIAL</span><h2 id="teams-title">Your next great hire<br />starts with a connection.</h2><p>Give your hiring team room to focus on people. Bring job postings, candidate conversations and interview planning into one workspace.</p>{hasWorkspace ? <p className="hp-teams__account-note">{isHr ? 'Your recruiter tools are ready. Choose Open workspace in the menu to continue.' : 'Recruiter access requires an HR account. To switch accounts, sign out from your workspace first.'}</p> : <Link to="/hr-login" className="hp-btn hp-btn--primary">Open recruiter access <ArrowRight size={17} aria-hidden="true" /></Link>}</div>
          <div className="hp-teams__visual" aria-label="Recruiter workspace capabilities"><div className="hp-teams__heading"><span className="hp-feature__icon"><Users size={24} aria-hidden="true" /></span><div><strong>A little more clarity.</strong><p>At every hiring stage.</p></div></div><ul>{['Keep your openings organized', 'Review candidate match insights', 'Plan interviews and stay in touch'].map(item => <li key={item}><CheckCircle2 size={17} aria-hidden="true" />{item}</li>)}</ul><div className="hp-teams__foot"><span aria-hidden="true" /> One workspace. A shared purpose.</div></div>
        </div>
      </section>
    </div>

    <footer className="hp-footer">
      <div className="hp-container hp-footer__inner"><div className="hp-footer__brand"><strong>Better connections.<br /><span>Brighter beginnings.</span></strong><p>HireMind AI · Talent meets opportunity.</p></div>
        <nav aria-label="Company and legal"><Link to="/about">About us</Link><Link to="/contact">Contact the team</Link><Link to="/terms">Terms & conditions</Link><Link to="/privacy">Privacy policy</Link></nav>
      </div>
      <div className="hp-container hp-footer__bottom"><p>© {new Date().getFullYear()} NextGem-Technology. Built by Abhay Gupta.</p><a href="mailto:nextgemtechno@gmail.com">Email support <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    </footer>
  </div>;
}

export default Home;
