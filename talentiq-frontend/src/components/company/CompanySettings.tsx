import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { subscriptionApi, type PlanResponse, type SubscriptionResponse, type TransactionResponse } from '../../api/subscriptionApi';
import { PaymentCheckoutModal } from '../subscription/PaymentCheckoutModal';
import { useCompanyResource, useCompanyDebounce } from '../../hooks/useCompanyResource';
import { useCompanyWorkspace } from './CompanyWorkspace';
import { CompanyBadge, CompanyCard, CompanyPagination, CompanyState, CompanyTable, companyDate, companyMoney } from './CompanyUi';

export function CompanySubscription() {
  const [data, setData] = useState<{ subscription: SubscriptionResponse | null; plans: PlanResponse[] }>({ subscription: null, plans: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanResponse | null>(null);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    Promise.all([subscriptionApi.getMySubscription(), subscriptionApi.getPlans('COMPANY')]).then(([subscription, plans]) => { if (!cancelled) setData({ subscription: subscription.data.data, plans: plans.data.data || [] }); }).catch(err => { if (!cancelled) setError(err?.response?.data?.message || 'Subscription details could not be loaded.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);
  const refresh = () => setRevision(value => value + 1);
  return <CompanyCard title="Company subscription" description="Current plan and available company plans. Checkout uses the existing secure payment flow." action={<button className="cm-button" onClick={refresh} disabled={loading}>Refresh</button>}>
    {loading || error ? <CompanyState loading={loading} error={error} onRetry={refresh} /> : <div className="cm-stack">{data.subscription ? <div className="cm-welcome"><div><CompanyBadge value={data.subscription.status} /><h2>{data.subscription.plan.name}</h2><p>{companyMoney(data.subscription.plan.priceAmount, data.subscription.plan.currency)} / {data.subscription.plan.billingCycle.toLowerCase()} · Period ends {companyDate(data.subscription.currentPeriodEnd)}</p></div><button className="cm-button cm-button-primary" onClick={() => setCheckoutPlan(data.subscription!.plan)}>Renew plan</button></div> : <p className="cm-notice">No active subscription is recorded for this account. Review the available plans below.</p>}<div className="cm-grid">{data.plans.map(plan => <article className="cm-person" key={plan.planCode}><h3>{plan.name}</h3><div className="cm-kpi-value">{companyMoney(plan.priceAmount, plan.currency)}</div><p>per {plan.billingCycle.toLowerCase()}</p><p>{plan.description}</p><ul className="cm-plan-features">{plan.features?.map(feature => <li key={feature}><Check size={14} />{feature}</li>)}</ul><button className="cm-button cm-button-primary" onClick={() => setCheckoutPlan(plan)} disabled={data.subscription?.plan.planCode === plan.planCode}>{data.subscription?.plan.planCode === plan.planCode ? 'Current plan' : 'Choose plan'}</button></article>)}</div>{!data.plans.length && <CompanyState empty="No company plans are currently available" />}</div>}
    {checkoutPlan && <PaymentCheckoutModal plan={checkoutPlan} billingCycle={checkoutPlan.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY'} isOpen onClose={() => setCheckoutPlan(null)} onSuccess={() => { setCheckoutPlan(null); refresh(); }} />}
  </CompanyCard>;
}

export function CompanyBilling() {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]); const [totalPages, setTotalPages] = useState(0); const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(''); const query = useCompanyDebounce(search); const [status, setStatus] = useState(''); const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    subscriptionApi.getTransactions(page, 10, status || undefined, query || undefined).then(res => { if (!cancelled) { setTransactions(res.data.data?.content || []); setTotalPages(res.data.data?.totalPages || 0); setTotal(res.data.data?.totalElements || 0); } }).catch(err => { if (!cancelled) { setTransactions([]); setError(err?.response?.data?.message || 'Billing history could not be loaded.'); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, status, query, revision]);
  return <CompanyCard title="Billing history" description="Subscription transactions for this account. Amounts retain their recorded currency."><div className="cm-toolbar"><label className="cm-field">Search transactions<input type="search" value={search} placeholder="Order ID" onChange={event => { setSearch(event.target.value); setPage(0); }} /></label><label className="cm-field">Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="">All statuses</option>{['PAID', 'PENDING', 'PROCESSING', 'FAILED', 'EXPIRED', 'CANCELLED'].map(value => <option key={value}>{value}</option>)}</select></label><button className="cm-button" onClick={() => setRevision(value => value + 1)} disabled={loading}>Refresh</button></div>{loading || error || !transactions.length ? <CompanyState loading={loading} error={error} empty="No matching transactions" onRetry={() => setRevision(value => value + 1)} /> : <><CompanyTable label="Subscription billing history" headings={['Order ID', 'Date', 'Amount', 'Plan', 'Method', 'Status']}>{transactions.map(tx => <tr key={tx.orderId}><td>{tx.orderId}</td><td>{companyDate(tx.createdAt)}</td><td>{companyMoney(tx.amount, tx.currency)}</td><td>{tx.planName}</td><td>{tx.paymentMethod || 'Not recorded'}</td><td><CompanyBadge value={tx.status} /></td></tr>)}</CompanyTable><CompanyPagination page={{ currentPage: page, totalPages, totalElements: total, pageSize: 10 }} onChange={setPage} /></>}</CompanyCard>;
}

interface NotificationPreferences { emailNotificationsEnabled: boolean; inAppEnabled: boolean; marketingEnabled: boolean; jobAlertsEnabled: boolean }
function CompanyNotificationPreferences() {
  const resource = useCompanyResource<NotificationPreferences>('/notifications/preferences');
  const [draft, setDraft] = useState<NotificationPreferences | null>(null); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const preferences = draft || resource.data;
  return <CompanyCard title="Notification preferences" description="These preferences are saved to your account using the existing notification service.">{resource.loading || resource.error ? <CompanyState loading={resource.loading} error={resource.error} onRetry={resource.refresh} /> : preferences && <form className="cm-form" onSubmit={async e => { e.preventDefault(); setSaving(true); setError(''); setMessage(''); try { await apiClient.put('/notifications/preferences', preferences); setMessage('Notification preferences saved.'); setDraft(null); resource.refresh(); } catch (err: any) { setError(err?.response?.data?.message || 'Preferences could not be saved.'); } finally { setSaving(false); } }}>
    {([['emailNotificationsEnabled', 'Email notifications', 'Receive supported account and activity updates by email.'], ['inAppEnabled', 'In-app notifications', 'Show updates in your notification inbox.'], ['jobAlertsEnabled', 'Job alerts', 'Receive job alerts supported by the platform.'], ['marketingEnabled', 'Product announcements', 'Receive optional product and marketing updates.']] as const).map(([key, title, description]) => <label className="cm-list-row" key={key}><div><strong>{title}</strong><small>{description}</small></div><input type="checkbox" aria-label={title} checked={preferences[key]} onChange={e => setDraft({ ...preferences, [key]: e.target.checked })} /></label>)}{error && <p role="alert" className="cm-error-text">{error}</p>}{message && <p role="status" className="cm-notice">{message}</p>}<div className="cm-actions"><button className="cm-button cm-button-primary" disabled={saving || !draft}>{saving ? 'Saving…' : 'Save preferences'}</button></div>
  </form>}</CompanyCard>;
}

export function CompanySettings({ section }: { section: string }) {
  const { user } = useAuth(); const { data } = useCompanyWorkspace();
  if (section === 'billing') return <CompanyBilling />;
  if (section === 'notifications') return <CompanyNotificationPreferences />;
  if (section === 'security') return <CompanyCard title="Account security" description="Security enforcement stays on the server."><div className="cm-list"><div className="cm-list-row"><div><strong><ShieldCheck size={17} /> Company Manager sign-in</strong><small>The existing company login flow requires password verification and an emailed one-time code.</small></div><CompanyBadge value="Protected" /></div><div className="cm-list-row"><div><strong>Two-factor and session management</strong><small>Individual TOTP, SMS and device-session controls are not exposed by this application. No simulated security switches are shown here.</small></div></div></div><p className="cm-notice">To reset a forgotten password, sign out and use “Forgot Password?” in the Company Manager login portal. Authentication settings have not been weakened.</p></CompanyCard>;
  if (section === 'integrations') return <CompanyCard title="Workplace integrations" description="Only verified connection information should appear here."><CompanyState empty="No integration management service is available" /><p className="cm-notice">The current application does not expose company connection status for Slack, Google Workspace, GitHub or Zoom. Contact your platform administrator to manage supported integrations.</p></CompanyCard>;
  return <CompanyCard title="Manager account" description="Your signed-in identity and company workspace." action={<Link className="cm-button cm-button-primary" to="/profile">Edit my profile</Link>}><dl className="cm-details">{[['Name', `${user?.firstName || ''} ${user?.lastName || ''}`.trim()], ['Email', user?.email], ['Role', 'Company Manager'], ['Company', data?.companyName], ['Workspace identifier', data?.companySlug]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl></CompanyCard>;
}
