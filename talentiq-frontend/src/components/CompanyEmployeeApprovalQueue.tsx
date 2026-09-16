import { useState } from 'react';
import { apiClient } from '../api/client';
import { useCompanyResource } from '../hooks/useCompanyResource';
import { CompanyBadge, CompanyCard, CompanyDecision, CompanyPagination, CompanyState, CompanyTable } from './company/CompanyUi';
import { CompanyDirectory, type CompanyEmployee } from './company/CompanyPeople';
import { useCompanyWorkspace } from './company/CompanyWorkspace';

export function CompanyEmployeeApprovalQueue({ initialSubTab = 'VERIFICATIONS' }: { initialSubTab?: 'VERIFICATIONS' | 'TERMINATIONS' | 'ALL' }) {
  return initialSubTab === 'ALL' ? <CompanyDirectory /> : <EmployeeApprovalRecords key={initialSubTab} termination={initialSubTab === 'TERMINATIONS'} />;
}
function EmployeeApprovalRecords({ termination }: { termination: boolean }) {
  const [page, setPage] = useState(0); const workspace = useCompanyWorkspace();
  const resource = useCompanyResource<CompanyEmployee[]>(`/employees?page=${page}&size=15&${termination ? 'terminationStatus=PENDING_APPROVAL' : 'status=PENDING_VERIFICATION'}`);
  const [decision, setDecision] = useState<{ employee: CompanyEmployee; approved: boolean } | null>(null);
  return <CompanyCard title={termination ? 'Separation requests' : 'Employee onboarding approvals'} description={termination ? 'Review pending notice and separation requests before making a decision.' : 'Review employee onboarding records submitted for company approval.'} action={<button className="cm-button" onClick={resource.refresh} disabled={resource.loading}>Refresh</button>}>
    {resource.loading || resource.error || !resource.data?.length ? <CompanyState loading={resource.loading} error={resource.error} empty={termination ? 'No pending separation requests' : 'No pending employee verifications'} onRetry={resource.refresh} /> : <><CompanyTable label={termination ? 'Pending separation requests' : 'Pending employee verifications'} headings={['Employee', 'Role / department', termination ? 'Reason / notice' : 'Status', 'Decision']}>
      {resource.data.map(employee => <tr key={employee.id}><td><strong>{employee.candidateName}</strong><small>{employee.employeeCode} · {employee.candidateEmail}</small></td><td>{employee.jobTitle}<small>{employee.department || 'Not specified'}</small></td><td>{termination ? <>{employee.terminationReason || 'No reason recorded'}<small>Notice: {employee.noticePeriodDays ?? 'Not recorded'} days</small></> : <CompanyBadge value={employee.status} />}</td><td><div className="cm-actions"><button className="cm-button cm-button-teal" onClick={() => setDecision({ employee, approved: true })}>{termination ? 'Approve separation' : 'Verify employee'}</button><button className="cm-button" onClick={() => setDecision({ employee, approved: false })}>{termination ? 'Reject & retain' : 'Reject'}</button></div></td></tr>)}
    </CompanyTable><CompanyPagination page={resource.page} onChange={setPage} /></>}
    {decision && <CompanyDecision title={`${decision.approved ? 'Approve' : 'Reject'} ${termination ? 'separation' : 'onboarding'}?`} description={`This decision applies to ${decision.employee.candidateName} (${decision.employee.employeeCode}). ${termination && decision.approved ? 'Approval finalizes this employee’s termination.' : 'Review the record before confirming.'}`} confirmLabel={decision.approved ? 'Confirm approval' : 'Confirm rejection'} requireReason={!decision.approved} onClose={() => setDecision(null)} onConfirm={async reason => { await apiClient.put(`/employees/${decision.employee.id}/${termination ? 'terminate/decision' : 'verify'}`, termination ? { approved: decision.approved, notes: reason || undefined } : { approved: decision.approved, rejectionReason: reason || undefined }); resource.refresh(); workspace.refresh(); }} />}
  </CompanyCard>;
}
