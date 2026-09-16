import { useState } from 'react';
import { apiClient } from '../api/client';
import { useCompanyResource } from '../hooks/useCompanyResource';
import { CompanyBadge, CompanyCard, CompanyDecision, CompanyPagination, CompanyState, CompanyTable, companyDate, companyMoney } from './company/CompanyUi';
import { useCompanyWorkspace } from './company/CompanyWorkspace';

interface SalaryRecord { id: number; employeeName: string; employeeCode: string; amount: number; currency: string; periodLabel: string; status: string; submittedByName?: string; transactionRef?: string; paidAt?: string; notes?: string }
export function CompanyPayrollQueue({ initialFilter = 'ALL' }: { initialFilter?: 'ALL' | 'PENDING' | 'COMPLETED' }) {
  return <CompanyPayrollRecords key={initialFilter} initialFilter={initialFilter} />;
}
function CompanyPayrollRecords({ initialFilter }: { initialFilter: string }) {
  const [status, setStatus] = useState(initialFilter === 'PENDING' ? 'PENDING_APPROVAL' : initialFilter === 'COMPLETED' ? 'COMPLETED' : ''); const [page, setPage] = useState(0);
  const resource = useCompanyResource<SalaryRecord[]>(`/salary?page=${page}&size=15${status ? `&status=${status}` : ''}`); const workspace = useCompanyWorkspace();
  const [decision, setDecision] = useState<{ salary: SalaryRecord; approved: boolean } | null>(null);
  return <CompanyCard title={initialFilter === 'PENDING' ? 'Salary disbursement queue' : 'Payroll history'} description="Salary records and their actual processing status. Authorization uses the existing payroll service."><div className="cm-toolbar"><label className="cm-field">Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="">All records</option>{['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'].map(value => <option key={value}>{value}</option>)}</select></label><button className="cm-button" onClick={resource.refresh} disabled={resource.loading}>Refresh</button></div>
    {resource.loading || resource.error || !resource.data?.length ? <CompanyState loading={resource.loading} error={resource.error} empty="No payroll records for this status" onRetry={resource.refresh} /> : <><CompanyTable label="Company payroll records" headings={['Employee / period', 'Amount', 'Status', 'Transaction / date', 'Action']}>
      {resource.data.map(salary => <tr key={salary.id}><td><strong>{salary.employeeName}</strong><small>{salary.employeeCode} · {salary.periodLabel}</small>{salary.submittedByName && <small>Submitted by {salary.submittedByName}</small>}</td><td>{companyMoney(salary.amount, salary.currency)}</td><td><CompanyBadge value={salary.status} /></td><td>{salary.transactionRef || 'Not recorded'}<small>{companyDate(salary.paidAt)}</small></td><td>{salary.status === 'PENDING_APPROVAL' ? <div className="cm-actions"><button className="cm-button cm-button-teal" onClick={() => setDecision({ salary, approved: true })}>Authorize & pay</button><button className="cm-button" onClick={() => setDecision({ salary, approved: false })}>Reject</button></div> : '—'}</td></tr>)}
    </CompanyTable><CompanyPagination page={resource.page} onChange={setPage} /></>}
    {decision && <CompanyDecision title={decision.approved ? 'Authorize salary payment?' : 'Reject salary request?'} description={`${decision.salary.employeeName} · ${decision.salary.periodLabel} · ${companyMoney(decision.salary.amount, decision.salary.currency)}. ${decision.approved ? 'Approval immediately invokes the configured payment processing service.' : 'Provide a reason for the submitting recruiter.'}`} confirmLabel={decision.approved ? 'Authorize & pay' : 'Reject request'} requireReason={!decision.approved} onClose={() => setDecision(null)} onConfirm={async reason => { await apiClient.put(`/salary/${decision.salary.id}/approve`, { approved: decision.approved, rejectionReason: reason || undefined }); resource.refresh(); workspace.refresh(); }} />}
  </CompanyCard>;
}
