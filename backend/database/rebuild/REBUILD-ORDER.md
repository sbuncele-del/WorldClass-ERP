# Database Rebuild Guide (verified against Neon PostgreSQL 17 — July 2026)

Full schema rebuild from scratch, in this exact order. Verified working after the
DigitalOcean loss of July 2026 (293 tables, all code-critical tables present).

## Order
1. Extensions & schemas:
   `CREATE EXTENSION pgcrypto; CREATE EXTENSION "uuid-ossp";`
   `CREATE SCHEMA sales, accounting, sars, hr, logistics, financial;`
2. `backend/src/config/multi-tenant-schema.sql` (tenants, users, audit core)
3. `backend/src/config/super-admin-schema.sql`, `subscription-management-schema.sql`,
   `invoices-schema.sql`, `logistics-migration.sql`, `logistics-accounting-migration.sql`
4. `backend/database/migrations/0*.sql` in numeric order (009 → 041, 999)
5. Root keystone files: `comprehensive-production-migration.sql`,
   `fix-sales-customers.sql`, `database-migration-20251112.sql`
6. `backend/database/migrations/create-*.sql` (sales, purchases, gl-postings)
   — strip `REFERENCES journal_entries(...)` FKs if they fail (app doesn't need them)
7. `backend/database/rebuild/100_gap_fixes.sql` (this folder — final alignment)

## Known drift fixed by 100_gap_fixes.sql
- `valid_plan` CHECK missing 'accountant'/'business' plans (broke registrations)
- `tenants`/`users` missing prod-era columns (industry, company_email, lockout fields…)
- Missing tables code expects: sales.retainers, sales.credit_notes,
  invoice_payments, notifications, compliance_requirements, account_balances

## Current production DB (since July 2026)
Neon PostgreSQL — project `neon-red-zebra`, database `siyabusa_erp`.
Connection string lives in Render/Vercel env vars only. Never commit it.
