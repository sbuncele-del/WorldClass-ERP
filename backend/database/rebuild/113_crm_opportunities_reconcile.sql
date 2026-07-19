-- 113_crm_opportunities_reconcile.sql
-- sales.opportunities has 3 real rows. convertLeadToOpportunity/getOpportunities need a
-- `status` column that doesn't exist at all, and opportunity_number was globally UNIQUE
-- (same recurring bug found across every module this session), not per-tenant.
ALTER TABLE sales.opportunities ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'OPEN';
ALTER TABLE sales.opportunities DROP CONSTRAINT opportunities_opportunity_number_key;
ALTER TABLE sales.opportunities ADD CONSTRAINT opportunities_tenant_number_key UNIQUE (tenant_id, opportunity_number);
