import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, Users, UserCheck, Briefcase, CreditCard, TrendingUp, MessageSquare, Settings, CheckSquare, Menu, X, LogOut, ArrowUpRight, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { HireMindLogo } from '../HireMindLogo';
import { NotificationBell } from '../NotificationBell';
import { useCompanyResource } from '../../hooks/useCompanyResource';
import { CompanyBadge, CompanyState } from './CompanyUi';
import '../../css/company-manager.css';

export const companyNavigation = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3, description: 'A clear view of your people, hiring and pending decisions.', sections: [] },
  { id: 'profile', label: 'Company profile', icon: Building2, description: 'Keep your company information accurate and up to date.', sections: [['overview', 'Overview'], ['contact', 'Contact & location'], ['branding', 'Brand identity'], ['subscription', 'Subscription'], ['verification', 'Verification']] },
  { id: 'recruiters', label: 'HR management', icon: Users, description: 'Manage your recruiters, invitations and company badges.', sections: [['roster', 'Recruiter roster'], ['invitations', 'Invitations'], ['approvals', 'Badge approvals']] },
  { id: 'candidates', label: 'Candidates', icon: UserCheck, description: 'Discover talent and review company verification requests.', sections: [['search', 'Discover talent'], ['verifications', 'Verification requests'], ['invitations', 'Invitations']] },
  { id: 'employees', label: 'Workforce', icon: Briefcase, description: 'Your company directory, performance reviews and employee decisions.', sections: [['directory', 'Directory'], ['performance', 'Performance reviews'], ['verifications', 'Onboarding approvals'], ['terminations', 'Separation & notice']] },
  { id: 'payroll', label: 'Payroll', icon: CreditCard, description: 'Review salary requests and follow disbursement history.', sections: [['disbursement', 'Disbursement queue'], ['history', 'Payroll history']] },
  { id: 'analytics', label: 'Reports & analytics', icon: TrendingUp, description: 'Reports based on recorded company activity. No estimated benchmarks.', sections: [['hiring', 'Hiring'], ['employees', 'Workforce'], ['payroll', 'Payroll'], ['performance', 'Performance']] },
  { id: 'chat', label: 'Messages', icon: MessageSquare, description: 'Your authorized team channels and direct conversations.', sections: [['channels', 'Team channels'], ['direct', 'Direct messages']] },
  { id: 'strategy', label: 'Goals & strategy', icon: CheckSquare, description: 'Track company goals and review your current priorities.', sections: [['tasks', 'Team goals'], ['copilot', 'Strategy summary']] },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Your account, security information, preferences and billing.', sections: [['account', 'Account'], ['security', 'Security'], ['notifications', 'Notifications'], ['integrations', 'Integrations'], ['billing', 'Billing history']] },
];

export interface CompanyDashboardData {
  companyId: number; companyName: string; companySlug: string; tagline?: string; industry?: string; companySize?: string; foundedYear?: number;
  website?: string; location?: string; email?: string; phone?: string; description?: string; logoUrl?: string; bannerUrl?: string; isVerified: boolean;
  totalEmployees: number; activeEmployees: number; totalHrMembers: number; verifiedHrMembers: number; activeJobsCount: number; pendingApprovalsCount: number;
  pendingVerifications: number; pendingSalaries: number; pendingOnboarding: number; pendingTerminations: number; totalTasks: number; completedTasks: number;
}

type WorkspaceData = ReturnType<typeof useCompanyResource<CompanyDashboardData>>;
const CompanyContext = createContext<WorkspaceData | null>(null);
export function useCompanyWorkspace() { const context = useContext(CompanyContext); if (!context) throw new Error('Company workspace is required'); return context; }
export function useCompanyNavigation() {
  const [params] = useSearchParams(); const location = useLocation();
  const view = ['/team-chat', '/messages'].includes(location.pathname) ? 'chat' : location.pathname === '/profile' ? 'settings' : params.get('view') || 'dashboard';
  const item = companyNavigation.find(item => item.id === view) || companyNavigation[0];
  const section = item.id === 'chat' ? (location.pathname === '/messages' ? 'direct' : 'channels') : item.sections.find(([id]) => id === params.get('section'))?.[0] || item.sections[0]?.[0] || '';
  return { item, section };
}
export function companyHref(view: string, section?: string) { return view === 'chat' ? (section === 'direct' ? '/messages' : '/team-chat') : `/admin/company${view === 'dashboard' ? '' : `?view=${view}${section ? `&section=${section}` : ''}`}`; }

export default function CompanyWorkspace({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const resource = useCompanyResource<CompanyDashboardData>('/admin/company/dashboard');
  const { item, section } = useCompanyNavigation();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    const dialog = drawer.current;
    if (menuOpen) { dialog?.showModal(); } else { dialog?.close(); }
    if (!menuOpen) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; dialog?.close(); };
  }, [menuOpen]);
  const navigation = <nav aria-label="Company navigation">{companyNavigation.map(({ id, label, icon: Icon }) => <Link key={id} to={companyHref(id)} className={`cm-nav-link ${item.id === id ? 'is-active' : ''}`} aria-current={item.id === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon size={19} /><span>{label}</span>{item.id === id && <ChevronRight size={16} />}</Link>)}</nav>;
  const branding = <Link to="/" className="cm-brand" aria-label="HireMind home"><HireMindLogo size="sm" theme="dark" animated={false} /></Link>;
  return <CompanyContext.Provider value={resource}><div className="cm-workspace">
    <a className="cm-skip" href="#company-content">Skip to content</a>
    <aside className="cm-sidebar">{branding}<div className="cm-company-name"><span>COMPANY WORKSPACE</span><strong>{resource.data?.companyName || user?.companyName || 'Your company'}</strong><CompanyBadge value={resource.data ? resource.data.isVerified : null} /></div>{navigation}<div className="cm-sidebar-footer"><span>Signed in as Company Manager</span><strong>{user?.email}</strong><button className="cm-nav-link" onClick={() => logout('/admin-login')}><LogOut size={17} /> Sign out</button></div></aside>
    <dialog ref={drawer} className="cm-drawer" aria-label="Company navigation" onCancel={event => { event.preventDefault(); setMenuOpen(false); menuButton.current?.focus(); }}><div className="cm-drawer-head">{branding}<button className="cm-icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={22} /></button></div>{navigation}<button className="cm-nav-link" onClick={() => logout('/admin-login')}><LogOut size={17} /> Sign out</button></dialog>
    <div className="cm-main"><header className="cm-topbar"><div className="cm-actions"><button ref={menuButton} className="cm-icon-button cm-menu-toggle" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={21} /></button><span className="cm-breadcrumb">Workspace <ChevronRight size={14} /> <strong>{item.label}</strong></span></div><div className="cm-actions"><Link to="/" className="cm-home-link">Public site <ArrowUpRight size={15} /></Link><NotificationBell /><Link to="/profile" className="cm-avatar" aria-label="My account">{(user?.firstName || user?.email || 'M').charAt(0).toUpperCase()}</Link></div></header>
    <div className="cm-content" id="company-content" tabIndex={-1}><header className="cm-page-head"><div><span className="cm-eyebrow">COMPANY MANAGEMENT</span><h1>{location.pathname === '/profile' ? 'My account' : item.label}</h1><p>{item.description}</p></div><button className="cm-button" onClick={resource.refresh} disabled={resource.loading} aria-label="Refresh company overview"><RefreshCw size={16} /> Refresh overview</button></header>
      {item.sections.length > 0 && (location.pathname === '/admin/company' || item.id === 'chat') && <nav className="cm-tabs" aria-label={`${item.label} sections`}>{item.sections.map(([id, label]) => <Link key={id} to={companyHref(item.id, id)} aria-current={section === id ? 'page' : undefined} className={section === id ? 'is-active' : ''}>{label}</Link>)}</nav>}
      {resource.error && item.id !== 'dashboard' && <CompanyState error={resource.error} onRetry={resource.refresh} />}
      {children}
      <footer className="cm-page-footer">HireMind · Company workspace <span>Access is controlled by your account permissions.</span></footer>
    </div></div>
  </div></CompanyContext.Provider>;
}
