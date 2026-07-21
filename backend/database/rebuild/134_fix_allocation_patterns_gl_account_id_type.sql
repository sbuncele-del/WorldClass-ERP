-- allocation_patterns.gl_account_id was declared UUID, but chart_of_accounts
-- has only ever used an INTEGER PK (account_id, aliased as the generated
-- column "id"). Every call to allocation-learning.service.ts's
-- recordAllocation() therefore threw "invalid input syntax for type uuid"
-- on the INSERT/UPDATE, silently swallowed by a try/catch in
-- bank-allocation.service.ts ("Allocation learning recording failed
-- (non-critical)") - so no pattern was EVER successfully created or
-- reinforced. This is why AI suggestion confidence never grew past the
-- static rule-based fallback score and why accepted suggestions never
-- became eligible for auto-allocation (which requires a learned,
-- human-confirmed pattern at 97%+ confidence).
--
-- Table is confirmed empty (0 rows) on the live DB, so this is a pure type
-- fix with nothing to migrate.

ALTER TABLE allocation_patterns ALTER COLUMN gl_account_id TYPE INTEGER USING gl_account_id::text::integer;
ALTER TABLE allocation_patterns ADD CONSTRAINT fk_allocation_patterns_gl_account
  FOREIGN KEY (gl_account_id) REFERENCES chart_of_accounts(account_id);
