-- Targeted, non-destructive indexes for manager tenant resolution and paged reviews.
-- Existing company/status indexes already cover employee, salary and approval queues.
CREATE INDEX idx_companies_registered_owner ON companies (registered_by_user_id);
CREATE INDEX idx_companies_contact_email ON companies (email);
CREATE INDEX idx_performance_company_created ON employee_performance_reviews (company_id, created_at, id);
