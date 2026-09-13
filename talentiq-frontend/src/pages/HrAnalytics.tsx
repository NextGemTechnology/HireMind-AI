import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Users, UserCheck, Calendar, RefreshCw, Plus, Inbox, BarChart3, Download, Star, Settings, MessageSquare } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HrEmployeeManagement } from '../components/HrEmployeeManagement';
import { HrSubscriptionTab } from '../components/subscription/HrSubscriptionTab';

interface Analytics {
  companyName?: string; activeJobsCount: number; totalApplicationsCount: number;
  shortlistedCount: number; hiredCandidatesCount: number; conversionRate?: number;
  avgTimeToHireDays?: number; applicationsByStatus?: Record<string, number>;
  monthlyStats?: { month: string; applications: number; shortlisted: number; rejected: number }[];
}
interface Person { firstName?: string; lastName?: string; user?: { firstName?: string; lastName?: string } }
interface Application { id: number; candidate?: Person; job?: { title?: string }; status: string; appliedAt?: string }
interface Meeting { id: number; candidateName?: string; jobTitle?: string; scheduledAt: string; status: string; meetingLink?: string }
interface Job { id: number; title: string; location?: string; company?: { name: string } }
interface Contact { userId: number; name: string; lastMessage?: string; unreadCount: number }
const employeeStyles = {
  cardBg: '#fff', cardBorder: '1px solid #e2e8f0', cardShadow: '0 3px 12px #18243b05',
  heading: '#18243b', subtext: '#64748b', cardSubBg: '#f8fafc', inputBg: '#fff',
  inputBorder: '1px solid #cbd5e1', inputText: '#18243b',
};
function list<T>(response: { data: { data?: unknown } }): T[] {
  const data = response.data?.data ?? response.data;
  if (Array.isArray(data)) return data as T[];
  return data && typeof data === 'object' && 'content' in data && Array.isArray(data.content) ? data.content as T[] : [];
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="hr-state"><Inbox size={25} /><strong>{title}</strong><p>{detail}</p></div>;
}
function Badge({ status }: { status: string }) { return <span className="hr-badge" data-status={status}>{status.replaceAll('_', ' ')}</span>; }

export default function HrAnalytics() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const activeTab = params.get('tab')?.toLowerCase() || 'dashboard';
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [copyState, setCopyState] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiClient.get('/analytics/hr'), apiClient.get('/applications/hr?size=5&sort=appliedAt,desc'),
      apiClient.get('/interviews/calendar'), apiClient.get('/jobs?size=4'), apiClient.get('/chat/contacts'),
    ]);
    const names = ['Analytics', 'Applications', 'Interviews', 'Jobs', 'Messages'];
    setFailures(results.flatMap((r, i) => r.status === 'rejected' ? [names[i]] : []));
    if (results[0].status === 'fulfilled') setAnalytics(results[0].value.data?.data ?? results[0].value.data);
    if (results[1].status === 'fulfilled') setApplications(list<Application>(results[1].value));
    if (results[2].status === 'fulfilled') setMeetings(list<Meeting>(results[2].value));
    if (results[3].status === 'fulfilled') setJobs(list<Job>(results[3].value));
    if (results[4].status === 'fulfilled') setContacts(list<Contact>(results[4].value));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const client = new Client({ webSocketFactory: () => new SockJS(`${window.location.origin}/api/ws`), connectHeaders: { Authorization: `Bearer ${token}` }, reconnectDelay: 5000,
      onConnect: () => { client.subscribe('/user/queue/notifications', () => { void load(); }); },
    });
    client.activate();
    return () => { void client.deactivate(); };
  }, [load]);

  const exportReport = () => {
    if (!analytics) return;
    const rows = [['Metric', 'Value'], ['Applications', analytics.totalApplicationsCount], ['Active jobs', analytics.activeJobsCount], ['Shortlisted', analytics.shortlistedCount], ['Hired', analytics.hiredCandidatesCount], ['Conversion rate (%)', analytics.conversionRate ?? ''], ['Average time to hire (days)', analytics.avgTimeToHireDays ?? '']];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'hiremind-recruitment-report.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const nameOf = (app: Application) => { const person = app.candidate?.user || app.candidate; return `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Candidate'; };
  const upcoming = meetings.filter(m => new Date(m.scheduledAt).getTime() >= Date.now() && !['CANCELLED', 'COMPLETED'].includes(m.status)).sort((a,b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const filtered = applications.filter(app => `${nameOf(app)} ${app.job?.title || ''}`.toLowerCase().includes(search.toLowerCase()));
  const stats = [
    { label: 'Applications', value: analytics?.totalApplicationsCount, icon: Users, caption: 'Across your hiring pipeline' },
    { label: 'Open positions', value: analytics?.activeJobsCount, icon: Briefcase, caption: 'Active job postings' },
    { label: 'Shortlisted', value: analytics?.shortlistedCount, icon: UserCheck, caption: 'Candidates under consideration' },
    { label: 'Hired candidates', value: analytics?.hiredCandidatesCount, icon: UserCheck, caption: 'Completed hiring outcomes' },
  ];
  const statCards = <div className="hr-stat-grid">{stats.map(stat => <div className="hr-card hr-stat" key={stat.label}><div className="hr-stat-top"><span>{stat.label}</span><span className="hr-stat-icon"><stat.icon size={17} /></span></div><strong className="hr-stat-value">{stat.value ?? '—'}</strong><small>{stat.caption}</small></div>)}</div>;

  if (activeTab === 'employee') return <HrEmployeeManagement styles={employeeStyles} theme="light" />;
  if (activeTab === 'subscription') return <HrSubscriptionTab />;
  if (activeTab === 'settings') return <div className="hr-page">
    <div className="hr-page-heading"><div><span className="hr-eyebrow">Organization</span><h1>Workspace settings</h1><p>Manage your recruiter profile and workspace services.</p></div><Settings size={24} /></div>
    <section className="hr-card"><div className="hr-setting-row"><div><strong>Recruiter profile</strong><p className="hr-note">Update your name, contact details, designation and department.</p></div><Link className="hr-button" to="/profile">Edit profile</Link></div>
      <div className="hr-setting-row"><div><strong>Subscription & billing</strong><p className="hr-note">Review your plan, invoices and subscription status.</p></div><Link className="hr-button" to="/hr-analytics?tab=subscription">Manage billing</Link></div>
      <div className="hr-setting-row"><div><strong>Message notifications</strong><p className="hr-note">Incoming updates are available in the notification center and messages. Per-user notification preferences are not available yet.</p></div><Link className="hr-button" to="/hr-messages">Open messages</Link></div>
      <div className="hr-setting-row"><div><strong>Calendar connections</strong><p className="hr-note">Add a meeting link when scheduling an interview. Automatic calendar synchronization is not connected.</p></div><Link className="hr-button" to="/hr-calendar">Open calendar</Link></div>
    </section></div>;
  if (activeTab === 'referrals') return <div className="hr-page"><div className="hr-page-heading"><div><span className="hr-eyebrow">Talent network</span><h1>Candidate referrals</h1><p>Share your available opportunities with your network.</p></div><Star size={24} /></div><section className="hr-card"><Empty title="Referral tracking is not connected" detail="Referral counts, hiring attribution and rewards are not available. You can still share the jobs page with potential candidates." /><div className="hr-actions"><Link className="hr-button hr-button-primary" to="/jobs">View jobs</Link><button className="hr-button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/jobs`); setCopyState('Jobs link copied.'); } catch { setCopyState('Could not copy the link. Open jobs and copy the address.'); } }}>Copy jobs link</button><span role="status" className="hr-note">{copyState}</span></div></section></div>;

  return <div className="hr-page">
    <div className="hr-page-heading"><div><span className="hr-eyebrow">{analytics?.companyName || 'Your hiring workspace'}</span><h1>{activeTab === 'report' ? 'Recruitment reports' : `Good to see you, ${user?.firstName || 'recruiter'}`}</h1><p>{activeTab === 'report' ? 'A clear view of your hiring results, based on available workspace data.' : 'Your hiring pipeline, people and next steps in one place.'}</p></div>
      <div className="hr-actions"><button className="hr-button" onClick={() => void load()} disabled={loading} aria-label="Refresh dashboard"><RefreshCw size={15} />Refresh</button>{activeTab === 'report' ? <button className="hr-button hr-button-primary" onClick={exportReport} disabled={!analytics}><Download size={15} />Export CSV</button> : <Link className="hr-button hr-button-primary" to="/jobs"><Plus size={16} />Manage jobs</Link>}</div>
    </div>
    {failures.length > 0 && <div className="hr-error" role="alert"><span>Couldn’t refresh {failures.join(', ').toLowerCase()}. Previously loaded information may be out of date.</span><button className="hr-button" onClick={() => void load()} disabled={loading}>Try again</button></div>}
    {loading && !analytics ? <div className="hr-stat-grid" role="status" aria-label="Loading hiring statistics">{stats.map(s => <div className="hr-skeleton" key={s.label} />)}</div> : statCards}
    <div className="hr-dashboard-grid">
      <section className="hr-card"><div className="hr-card-heading"><h2>Application activity</h2><span className="hr-note">Monthly volume</span></div>
        {analytics?.monthlyStats?.length ? <div className="hr-chart" role="img" aria-label="Monthly application, shortlisted and rejected counts"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.monthlyStats} barGap={3}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#64748b'}} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={30} tick={{fontSize:11,fill:'#64748b'}} /><Tooltip /><Legend wrapperStyle={{fontSize:11}} /><Bar dataKey="applications" name="Applications" fill="#6366f1" radius={[4,4,0,0]} /><Bar dataKey="shortlisted" name="Shortlisted" fill="#14b8a6" radius={[4,4,0,0]} /><Bar dataKey="rejected" name="Rejected" fill="#f87171" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div> : <Empty title="No activity to chart yet" detail="Monthly hiring activity will appear when it is available." />}
      </section>
      <section className="hr-card"><div className="hr-card-heading"><h2>Candidate pipeline</h2><BarChart3 size={18} color="#64748b" /></div>{Object.keys(analytics?.applicationsByStatus || {}).length ? Object.entries(analytics?.applicationsByStatus || {}).map(([status,count]) => <div className="hr-pipeline-row" key={status}><span>{status.replaceAll('_',' ')}</span><div className="hr-pipeline-track"><div className="hr-pipeline-fill" style={{width:`${Math.min(100, count / Math.max(analytics?.totalApplicationsCount || 1,1) * 100)}%`}} /></div><strong>{count}</strong></div>) : <Empty title="Your pipeline starts here" detail="Application stages will appear as candidates apply." />}</section>
    </div>
    {activeTab === 'report' ? <section className="hr-card"><div className="hr-card-heading"><h2>Hiring performance</h2></div><div className="hr-setting-row"><span>Average time to hire</span><strong>{analytics?.avgTimeToHireDays == null ? 'Not available' : `${analytics.avgTimeToHireDays} days`}</strong></div><div className="hr-setting-row"><span>Conversion rate</span><strong>{analytics?.conversionRate == null ? 'Not available' : `${analytics.conversionRate}%`}</strong></div><div className="hr-setting-row"><span>Completed interviews</span><strong>{failures.includes('Interviews') ? 'Not available' : meetings.filter(m => m.status === 'COMPLETED').length}</strong></div></section> : <>
      <div className="hr-dashboard-grid"><section className="hr-card"><div className="hr-card-heading"><h2>Recent applications</h2><Link to="/hr-applications">View all →</Link></div><input aria-label="Search recent applications" placeholder="Search recent candidates or jobs" value={search} onChange={e => setSearch(e.target.value)} style={{width:'100%',padding:'10px 12px'}} />{filtered.length ? filtered.map(app => <div className="hr-list-row" key={app.id}><span className="hr-stat-icon"><Users size={16} /></span><div><strong>{nameOf(app)}</strong><p>{app.job?.title || 'Job application'}</p></div><Badge status={app.status} /></div>) : <Empty title={search ? 'No matching applications' : 'No recent applications'} detail={search ? 'Try another candidate name or job title.' : 'New candidates will appear here when they apply.'} />}</section>
      <section className="hr-card"><div className="hr-card-heading"><h2>Upcoming interviews</h2><Link to="/hr-calendar">Calendar →</Link></div>{upcoming.length ? upcoming.slice(0,4).map(m => <div className="hr-list-row" key={m.id}><span className="hr-stat-icon"><Calendar size={16} /></span><div><strong>{m.candidateName || 'Candidate interview'}</strong><p>{new Date(m.scheduledAt).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p><p>{m.jobTitle}</p></div><Badge status={m.status} /></div>) : <Empty title="Your calendar is clear" detail="Schedule an interview to keep the next stage of hiring moving." />}<Link className="hr-button" to="/hr-calendar"><Plus size={15} />Schedule interview</Link></section></div>
      <div className="hr-dashboard-grid"><section className="hr-card"><div className="hr-card-heading"><h2>Recent job postings</h2><Link to="/jobs">Manage jobs →</Link></div>{jobs.length ? jobs.slice(0,4).map(job => <div className="hr-list-row" key={job.id}><span className="hr-stat-icon"><Briefcase size={17} /></span><div><strong>{job.title}</strong><p>{job.company?.name}{job.location ? ` · ${job.location}` : ''}</p></div></div>) : <Empty title="No jobs available" detail="Create a job posting to start receiving applications." />}</section>
      <section className="hr-card"><div className="hr-card-heading"><h2>Candidate messages</h2><Link to="/hr-messages">Inbox →</Link></div>{contacts.length ? contacts.slice(0,3).map(contact => <Link key={contact.userId} className="hr-list-row" style={{textDecoration:'none',color:'inherit'}} to={`/hr-messages?contactId=${contact.userId}`}><MessageSquare size={17} color="#6366f1" /><div><strong>{contact.name}</strong><p>{contact.lastMessage || 'Open conversation'}</p></div>{contact.unreadCount > 0 && <span className="hr-badge">{contact.unreadCount} new</span>}</Link>) : <Empty title="No conversations yet" detail="Candidate conversations will appear in your inbox." />}</section></div>
    </>}
  </div>;
}
