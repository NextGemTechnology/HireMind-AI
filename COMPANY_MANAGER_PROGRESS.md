# Company-Manager improvement — local work record

Updated: 2026-09-15. Scope: Company-Manager (`ROLE_COMPANY_ADMIN`). No GitHub push, no commits requested, no production data changes. Existing Home, HR, candidate and other administrator designs are preserved; shared changes are role-gated presentation or access-control fixes.

## One-pass ecosystem analysis (completed before code changes)

| Area / navigation | Existing components / APIs | Data and access |
| --- | --- | --- |
| `/admin/company` → Executive dashboard | CompanyManagerDashboard; `/admin/company/dashboard` | Company, HR, employee, job, verification, salary and task counts; role guard + company resolution |
| Company profile → overview, contact, branding, subscription, verification | CompanyManagerDashboard; profile GET via dashboard and PUT `/admin/company/profile`; subscriptionApi + PaymentCheckoutModal | Company profile; authenticated subscription and public plans |
| HR management → roster, invitations, badge queue | CompanyTagApprovalQueue; `/admin/company/team/hrs`, invitations, `/company/verifications/hrs` | Company-scoped HR/invitation repositories; badge decisions |
| Candidates → search/invite, verifications, invitations | Same invitation form and approval queue; candidate pool; `/company/verifications/pending` and decision | Platform candidate discovery is intentional; private company verification requests must remain tenant-scoped |
| Workforce → directory, performance, separation | CompanyEmployeeApprovalQueue; `/employees`; manager performance and stats | PagedResponse uses `data[]` + `page`; employee ownership checks; review repository |
| Payroll → disbursement, history | CompanyPayrollQueue; `/salary`, approval and stats | Company/status paging; existing authorization and payment processing retained |
| Analytics → hiring, workforce, payroll, performance | `/admin/company/analytics`, employee/performance/salary aggregates | Existing hardcoded charts and metrics are not real business data |
| Messages → channels/direct contacts | Existing GroupCollaborationChat at `/team-chat`; group REST and STOMP | Group membership authorization, invitations and attachments; manager page currently simulates chat instead |
| Settings → account, security, notifications, integrations, billing | `/users/me`, notification preferences; existing CompanyBillingSubTab | ProfilePage is shared; real company admin login already uses email OTP; simulated TOTP/session controls have no backend |
| Strategy → tasks, copilot | Existing `/company/tasks` service; app AI guide | Current task creation points at a missing route; copilot returns fabricated company facts |
| Shared/direct routes | `/profile`, `/team-chat`; public jobs/company-candidate profile/info routes | Keep public and other-role designs unchanged; apply manager shell only to manager account/chat views |

### Concrete findings

- 4,064-line manager page repeats navigation, invite tables, forms, dark inline styles and simulated content. All menus are pinned open, leaving a narrow content column on phones.
- Fake employee/candidate fallback records, payroll totals, verification claims, charts, chat replies, 2FA/session/integration state, and pretend exports must not be represented as real.
- Missing/mismatched task and badge URLs; profile sends `companyName` while backend accepts `name`; review form sends fields the review DTO does not accept. Verification queue ignores actual paginated response shape. Payroll/analytics submenu choices are not respected.
- All manager datasets are requested at initial load and after unrelated mutations. Large lists are incompletely displayed without pagination; billing search fires every keystroke. Errors are frequently swallowed.
- Some services confuse independently generated user IDs and HR-profile IDs. Task update/delete omit company ownership checks. Candidate discovery loads all users before limiting and does not resolve manager company. Invitation role is an unrestricted Role enum and tokens are logged. Share links point at disabled `/login`.
- Employee/payroll mutation services already check target ownership, but their manager company resolution needs to use authenticated identity consistently. Shared HR behavior must remain intact.
- Existing security: JWT, method permissions, rate limiting, admin OTP, membership checks, user-scoped billing. These protections will not be removed. CSRF was already disabled for stateless JWT; no change planned.
- Existing indexes checked in migrations and local MySQL. Company owner/email lookups have no index and use full scans; performance list uses filesort. Employee/salary/company-verification status indexes already exist. No blanket indexing.
- Redis is already present. Subscription cache uses user keys and existing invalidation. Approval services invalidate tenant-specific keys but do not currently read a cached approval list. No evidence justifies adding another manager response cache to small, freshness-sensitive datasets.
- Local Docker services are running. Browser session supplied by user; no credentials copied into this record. The current manager is linked to an HR profile; baseline UI hides failures behind sample content.
- Existing Kafka producer reports a localhost broker connection problem. This infrastructure issue is separate from the manager redesign; do not silently change unrelated configuration.

## Implementation and verification

### Implemented locally

- Replaced the large simulated manager view with a responsive navy/blue/teal workspace, one primary navigation, active-section links, real counts and explicit empty/error/loading states. Desktop sidebar becomes an accessible native-dialog drawer on smaller screens.
- Retained profile, recruiter roster/invitations/badges, candidate discovery/invitations/verifications, workforce directory/reviews/onboarding/separation, payroll/history, analytics, goals, and settings sections. Reused existing profile, notification, chat, subscription and checkout components. Unsupported integrations and canned AI outputs are identified honestly instead of presented as live functionality.
- Added manager-specific styling for shared account and messaging screens. Direct messages reuse the existing component and endpoint; the manager `/messages` route no longer goes through a candidate dashboard. Existing candidate/HR routes retain their behavior. Notification links resolve to manager-accessible direct messages.
- Corrected task, badge, profile and review request contracts. Confirmations protect badge changes, invitations, payroll and employee decisions. No real invitation, badge decision, employment change, message or payment was submitted during visual testing.
- Added route-level manager code splitting, account-local cancellable requests, debounced searches, database-paged candidate/employee searches, and paged approvals/reviews/payroll. No global manager data cache was introduced.
- Removed fake fallback metrics and charts. Reporting uses company-scoped database aggregates, real review categories, and currency-separated payroll totals. Zero records stay zero.
- Centralized manager company resolution to avoid overlapping user/profile IDs; rejected inactive/restricted companies and mismatched caller IDs; used linked manager actor IDs for audit records. Added task ownership/assignee checks, restricted invitation roles, removed invitation tokens from logs, and corrected invitation destinations.
- Strengthened manager group access on REST paths and protected group WebSocket destinations with membership and manager-company checks. Existing business permissions and payment/authentication workflows are retained.
- Added migration V27 for company owner/email lookups and company/created-date review paging. Verified V27 success and all three indexes in local MySQL. Existing employee/payroll/status indexes were reused; no blanket indexing or extra Redis cache.

### Checks performed so far

- Frontend TypeScript + production builds pass; manager dashboard JavaScript is approximately 53 KB (13 KB gzip), loaded separately. The existing application-wide bundle still triggers Vite's large-chunk warning.
- Frontend lint exits successfully with warnings; most are pre-existing, plus development fast-refresh warnings for colocated manager helpers. No lint errors.
- Backend full regression run passed after updating test dependencies. Added tests cover manager company isolation, ID resolution, caller mismatch, inactive companies, cross-company task changes, invitation privilege escalation, zero-data review statistics, and group WebSocket authorization.
- Docker frontend/backend builds pass. Local containers are running; final build refresh and final responsive sweep are being verified.
- Signed-in browser shows NEXTGEM's recorded counts (0 employee records, 0 active jobs, 1 recruiter, 0 pending decisions) instead of sample data. Desktop navigation through all primary manager sections and their subsection links produced no visible API errors or page-wide overflow. Some rapidly sampled transitions are being rechecked after settling.
- Profile edit and badge-confirmation dialogs opened/cancelled without saving changes. Recruiter invitation form checked visually at 390 px; it fits within the viewport.

### Preserved user edits

- `talentiq-backend/src/main/java/com/talentiq/dto/interview/InterviewSlotDto.java`
- `talentiq-backend/src/main/java/com/talentiq/ai/model/AiConversation.java`

These files were already modified by the user during the work and were not edited or reverted by this task. No credentials or email verification codes are saved here.

### Limitations / final checks

- Complete the last phone/tablet/desktop sweep against the latest Docker build and record results below.
- Live account has few company records; populated pagination and business mutations rely on automated tests/source checks, not live transactions. Real payments and email delivery are intentionally not exercised.
- Existing Kafka localhost broker configuration emits connection warnings; no unrelated infrastructure settings were changed. Existing large global frontend bundle and unrelated lint warnings remain outside the manager scope.
