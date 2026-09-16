import { useState } from 'react';
import { apiClient } from '../api/client';
import { useCompanyResource } from '../hooks/useCompanyResource';
import { CompanyBadge, CompanyCard, CompanyDecision, CompanyPagination, CompanyState, CompanyTable, companyDate } from './company/CompanyUi';
import { CompanyRecruiters } from './company/CompanyPeople';
import { useCompanyWorkspace } from './company/CompanyWorkspace';

interface Verification { id: number; candidateName: string; candidateEmail: string; hrName: string; jobTitle: string; department?: string; status: string; requestedAt: string; notes?: string }
export function CompanyTagApprovalQueue({ initialTab = 'CANDIDATES' }: { initialTab?: 'CANDIDATES' | 'HR_TEAM' }) {
  return initialTab === 'HR_TEAM' ? <CompanyRecruiters approvals /> : <CandidateVerificationRecords />;
}
function CandidateVerificationRecords() {
  const [status, setStatus] = useState('PENDING'); const [page, setPage] = useState(0); const workspace = useCompanyWorkspace();
  const resource = useCompanyResource<Verification[]>(`/company/verifications/pending?status=${status}&page=${page}&size=15`);
  const [decision, setDecision] = useState<{ request: Verification; approved: boolean } | null>(null);
  return <CompanyCard title="Candidate verification requests" description="Review candidate badge requests submitted by your company’s recruiters."><div className="cm-toolbar"><label className="cm-field">Request status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></label><button className="cm-button" onClick={resource.refresh} disabled={resource.loading}>Refresh</button></div>
  {resource.loading || resource.error || !resource.data?.length ? <CompanyState loading={resource.loading} error={resource.error} empty="No verification requests for this status" onRetry={resource.refresh} /> : <><CompanyTable label="Company candidate verification requests" headings={['Candidate', 'Role / request', 'Recruiter', 'Status', 'Decision']}>{resource.data.map(request => <tr key={request.id}><td><strong>{request.candidateName}</strong><small>{request.candidateEmail}</small></td><td>{request.jobTitle}<small>{companyDate(request.requestedAt)}</small>{request.notes && <small>{request.notes}</small>}</td><td>{request.hrName}</td><td><CompanyBadge value={request.status} /></td><td>{request.status === 'PENDING' ? <div className="cm-actions"><button className="cm-button cm-button-teal" onClick={() => setDecision({ request, approved: true })}>Approve badge</button><button className="cm-button" onClick={() => setDecision({ request, approved: false })}>Reject</button></div> : 'Reviewed'}</td></tr>)}</CompanyTable><CompanyPagination page={resource.page} onChange={setPage} /></>}
  {decision && <CompanyDecision title={decision.approved ? 'Approve candidate badge?' : 'Reject verification request?'} description={`This decision applies to ${decision.request.candidateName} for ${decision.request.jobTitle}. A verified badge may grant access to company collaboration.`} confirmLabel={decision.approved ? 'Approve badge' : 'Reject request'} requireReason={!decision.approved} onClose={() => setDecision(null)} onConfirm={async reason => { await apiClient.put(`/company/verifications/${decision.request.id}/decision`, { approved: decision.approved, rejectionReason: reason || undefined }); resource.refresh(); workspace.refresh(); }} />}
  </CompanyCard>;
}
