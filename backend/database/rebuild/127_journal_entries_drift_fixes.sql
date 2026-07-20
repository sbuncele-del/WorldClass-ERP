-- 127_journal_entries_drift_fixes.sql
--
-- Schema-side fixes for journal_entries column drift found in
-- take-on-balances.controller.v2.ts, migration.controller.v2.ts, and
-- logistics-fuel.controller.v2.ts (application code fixed separately):
--
-- 1. sales.customers / purchase.suppliers have no opening_balance column,
--    but take-on-balances.controller.v2.ts reads/writes it throughout.
-- 2. logistics.fuel_transactions.journal_entry_id is UUID, but the real
--    journal_entries PK (journal_entry_id, aliased "id"/"entry_id") is
--    INTEGER - the same type mismatch pattern fixed earlier in
--    recurring_entry_history.journal_entry_id (118_...sql).

ALTER TABLE sales.customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase.suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) DEFAULT 0;

ALTER TABLE logistics.fuel_transactions ALTER COLUMN journal_entry_id TYPE INTEGER USING NULL;
