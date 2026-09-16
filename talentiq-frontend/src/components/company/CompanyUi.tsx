import { useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Inbox, X } from 'lucide-react';
import { HrModalFrame as ModalFrame } from '../HrModalFrame';
import type { CompanyPageMeta } from '../../hooks/useCompanyResource';

export function CompanyCard({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`cm-card ${className}`}>{title && <header className="cm-card-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>}{children}</section>;
}

export function CompanyState({ loading, error, empty, onRetry }: { loading?: boolean; error?: string; empty?: string; onRetry?: () => void }) {
  if (loading) return <div className="cm-loading" role="status" aria-label="Loading information"><span /><span /><span /><p>Loading information…</p></div>;
  if (error) return <div className="cm-state cm-error" role="alert"><AlertCircle size={24} /><h3>We couldn’t load this information</h3><p>{error}</p>{onRetry && <button className="cm-button" onClick={onRetry}>Try again</button>}</div>;
  if (empty) return <div className="cm-state"><Inbox size={28} /><h3>{empty}</h3><p>Records will appear here when they are available.</p></div>;
  return null;
}

export function CompanyBadge({ value }: { value?: string | boolean | null }) {
  const text = typeof value === 'boolean' ? (value ? 'Verified' : 'Not verified') : value || 'Not specified';
  const positive = /^(verified|active|approved|completed|paid|excellent|good|accepted)$/i.test(text);
  const warning = /pending|notice|draft|progress/i.test(text);
  return <span className={`cm-badge ${positive ? 'cm-badge-positive' : warning ? 'cm-badge-warning' : ''}`}>{text.replaceAll('_', ' ')}</span>;
}

export function CompanyPagination({ page, onChange, loading }: { page?: CompanyPageMeta; onChange: (page: number) => void; loading?: boolean }) {
  if (!page || page.totalPages <= 1) return null;
  return <nav className="cm-pagination" aria-label="Table pages"><span>{page.totalElements.toLocaleString()} records · Page {page.currentPage + 1} of {page.totalPages}</span><div className="cm-actions"><button className="cm-button" disabled={loading || page.currentPage === 0} onClick={() => onChange(page.currentPage - 1)}><ArrowLeft size={15} /> Previous</button><button className="cm-button" disabled={loading || page.currentPage + 1 >= page.totalPages} onClick={() => onChange(page.currentPage + 1)}>Next <ArrowRight size={15} /></button></div></nav>;
}

export function CompanyTable({ headings, children, label }: { headings: string[]; children: ReactNode; label: string }) {
  return <div className="cm-table-scroll" tabIndex={0} role="region" aria-label={label}><table className="cm-table"><caption className="cm-sr-only">{label}</caption><thead><tr>{headings.map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function CompanyDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <ModalFrame title={title} onClose={onClose} className="cm-dialog"><header className="cm-card-head"><h2>{title}</h2><button className="cm-icon-button" type="button" aria-label={`Close ${title}`} onClick={onClose}><X size={20} /></button></header>{children}</ModalFrame>;
}

export function CompanyDecision({ title, description, confirmLabel, requireReason = false, onConfirm, onClose }: { title: string; description: string; confirmLabel: string; requireReason?: boolean; onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <CompanyDialog title={title} onClose={() => { if (!busy) onClose(); }}><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await onConfirm(reason.trim()); onClose(); } catch (err: any) { setError(err?.response?.data?.message || 'The change could not be saved. Please try again.'); } finally { setBusy(false); } }}><p>{description}</p>{requireReason && <label className="cm-field">Reason <span aria-hidden="true">*</span><textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} rows={3} /></label>}{error && <p role="alert" className="cm-error-text">{error}</p>}<footer className="cm-actions cm-form-actions"><button className="cm-button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="cm-button cm-button-primary" disabled={busy || (requireReason && !reason.trim())}>{busy ? 'Saving…' : confirmLabel}</button></footer></form></CompanyDialog>;
}

export function companyDate(value?: string | null) { return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded'; }
export function companyMoney(value?: number | null, currency?: string | null) { return value == null ? 'Not recorded' : currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value) : value.toLocaleString(); }
