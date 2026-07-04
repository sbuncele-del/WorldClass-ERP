-- 100_gap_fixes.sql — final schema alignment (see REBUILD-ORDER.md)
-- Safe to re-run: everything is IF NOT EXISTS / conditional.

ALTER TABLE tenants DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE tenants ADD CONSTRAINT valid_plan CHECK (subscription_plan IN
  ('trial','starter','business','professional','premium','accountant','enterprise'));

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS company_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS province VARCHAR(100), ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT 'ZA',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(60) DEFAULT 'Africa/Johannesburg',
  ADD COLUMN IF NOT EXISTS fiscal_year_end VARCHAR(20), ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100), ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tenant_code VARCHAR(50), ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
  ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ceo_welcome_shown BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS terms_accepted_ip VARCHAR(60),
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);

CREATE TABLE IF NOT EXISTS sales.retainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, customer_id INTEGER,
  retainer_name VARCHAR(255) NOT NULL, description TEXT, service_type VARCHAR(100),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0, currency VARCHAR(10) DEFAULT 'ZAR',
  billing_frequency VARCHAR(50), start_date DATE, end_date DATE, next_invoice_date DATE,
  hours_included NUMERIC(10,2), hours_used NUMERIC(10,2) DEFAULT 0,
  auto_invoice BOOLEAN DEFAULT false, notes TEXT, terms TEXT,
  status VARCHAR(30) DEFAULT 'active',
  created_by UUID, updated_by UUID, deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retainers_tenant ON sales.retainers(tenant_id);

CREATE TABLE IF NOT EXISTS sales.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, credit_note_number VARCHAR(60) NOT NULL,
  customer_id INTEGER, invoice_id INTEGER,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0, reason TEXT, notes TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant ON sales.credit_notes(tenant_id);

CREATE TABLE IF NOT EXISTS invoice_payments (
  payment_id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES sales_invoices(invoice_id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(50), reference VARCHAR(100),
  bank_account_id INTEGER, journal_entry_id INTEGER,
  notes TEXT, tenant_id UUID NOT NULL, created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_tenant ON invoice_payments(tenant_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, user_id UUID,
  title VARCHAR(255), message TEXT, type VARCHAR(50),
  is_read BOOLEAN DEFAULT false, read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
