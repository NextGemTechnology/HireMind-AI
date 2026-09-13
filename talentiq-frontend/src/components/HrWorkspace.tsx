import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Calendar, MessageSquare, Sparkles, UserPlus, Wallet, LogOut, PanelLeftClose, PanelLeftOpen, Menu, X, Star, BarChart3, Settings, CreditCard, UserRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HireMindLogo } from './HireMindLogo';
import { NotificationBell } from './NotificationBell';
import '../css/hr-workspace.css';

const WorkspaceContext = createContext(false);
export const useHrWorkspace = () => useContext(WorkspaceContext);
const groups = [
  { label: 'Workspace', items: [
    { label: 'Overview', path: '/hr-analytics', icon: LayoutDashboard },
    { label: 'Applications', path: '/hr-applications', icon: Users },
    { label: 'Jobs', path: '/jobs', icon: Briefcase },
    { label: 'Interviews', path: '/hr-calendar', icon: Calendar },
    { label: 'AI Copilot', path: '/copilot', icon: Sparkles },
  ] },
  { label: 'People & communication', items: [
    { label: 'Candidate messages', path: '/hr-messages', icon: MessageSquare },
    { label: 'Team channels', path: '/team-chat', icon: Users },
    { label: 'Employees', path: '/hr-analytics?tab=employee', icon: ShieldCheck },
    { label: 'Onboard candidate', path: '/hr-analytics?tab=employee&open=onboard', icon: UserPlus },
    { label: 'Salary requests', path: '/hr-analytics?tab=employee&filter=ACTIVE', icon: Wallet },
    { label: 'Notices & separations', path: '/hr-analytics?tab=employee&filter=ON_NOTICE', icon: Users },
  ] },
  { label: 'Organization', items: [
    { label: 'Referrals', path: '/hr-analytics?tab=referrals', icon: Star },
    { label: 'Reports', path: '/hr-analytics?tab=report', icon: BarChart3 },
    { label: 'Subscription & billing', path: '/hr-analytics?tab=subscription', icon: CreditCard },
    { label: 'Settings', path: '/hr-analytics?tab=settings', icon: Settings },
    { label: 'My profile', path: '/profile', icon: UserRound },
  ] },
];

export function HrWorkspace({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  return enabled ? <WorkspaceShell>{children}</WorkspaceShell> : <>{children}</>;
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const fullPath = location.pathname + location.search;
  const active = groups.flatMap(group => group.items).find(item => item.path === fullPath)
    || groups.flatMap(group => group.items).find(item => item.path === location.pathname);
  const title = location.pathname.startsWith('/candidate-profile/') ? 'Candidate profile' : active?.label || 'HR workspace';

  useEffect(() => { setOpen(false); }, [fullPath]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    navRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); openerRef.current?.focus(); }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a, button') || []).filter(el => el.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); };
  }, [open]);

  return <WorkspaceContext.Provider value={true}>
    <div className={`hr-workspace ${collapsed ? 'hr-is-collapsed' : ''} ${open ? 'hr-nav-open' : ''}`}>
      <a className="hr-skip" href="#hr-content">Skip to content</a>
      {open && <button className="hr-nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside ref={navRef} className="hr-workspace-nav" id="hr-navigation" aria-label="HR navigation" role={open ? 'dialog' : undefined} aria-modal={open || undefined}>
        <div className="hr-nav-brand">
          <Link to="/hr-analytics" aria-label="HireMind home">
            <span className="hr-brand-full"><HireMindLogo variant="navbar" size="sm" theme="light" animated={false} /></span>
            <span className="hr-brand-compact" aria-hidden="true"><HireMindLogo variant="icon" size="sm" theme="light" animated={false} /></span>
          </Link>
          <button className="hr-mobile-close hr-icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <div className="hr-company"><span className="hr-company-icon"><Briefcase size={18} /></span><div><strong>{user?.companyName || 'Hiring workspace'}</strong><small>HR team</small></div></div>
        <nav>{groups.map(group => <section key={group.label} className="hr-nav-group">
          <p>{group.label}</p>
          {group.items.map(item => <Link key={item.path} to={item.path} className={`hr-nav-link ${active?.path === item.path ? 'is-active' : ''}`} aria-current={active?.path === item.path ? 'page' : undefined} title={item.label}>
            <item.icon size={18} aria-hidden="true" /><span>{item.label}</span>
          </Link>)}
        </section>)}</nav>
        <div className="hr-nav-footer"><button className="hr-nav-link" onClick={() => logout()} title="Sign out"><LogOut size={18} /><span>Sign out</span></button></div>
      </aside>
      <div className="hr-workspace-body" inert={open || undefined}>
        <header className="hr-workspace-header">
          <button ref={openerRef} className="hr-icon-button hr-mobile-menu" aria-label="Open navigation" aria-controls="hr-navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button>
          <button className="hr-icon-button hr-desktop-collapse" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}</button>
          <div className="hr-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
          <div className="hr-header-end"><span className="hr-role-pill">HR</span><NotificationBell /><Link className="hr-user-avatar" to="/profile" aria-label="Open my profile">{user?.firstName?.[0]?.toUpperCase() || 'H'}</Link></div>
        </header>
        <div id="hr-content" className="hr-workspace-content" tabIndex={-1}>{children}</div>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}
