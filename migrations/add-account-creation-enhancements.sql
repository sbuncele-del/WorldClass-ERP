-- ============================================================
-- Account Creation Enhancements Migration
-- Date: 2026-05-18
-- Features: email verification, phone, referral codes, 
--           onboarding checklist, notification preferences,
--           terms acceptance, subdomain
-- ============================================================

-- ── Users: new columns ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10) DEFAULT '1.0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ceo_welcome_shown BOOLEAN DEFAULT FALSE;

-- Mark all existing users as already verified (no disruption to live accounts)
-- New signups will have email_verified = false until they click the link
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;

-- ── Tenants: subdomain + referral tracking ─────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(50);

-- Unique index on subdomain
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain) WHERE subdomain IS NOT NULL;

-- Auto-populate subdomain from slug for existing tenants
UPDATE tenants SET subdomain = slug WHERE subdomain IS NULL;

-- ── Referral codes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(50) UNIQUE NOT NULL,
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  description       VARCHAR(255),
  discount_percent  INT DEFAULT 0,
  discount_months   INT DEFAULT 1,       -- free months granted
  uses_count        INT DEFAULT 0,
  max_uses          INT,                 -- NULL = unlimited
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some launch referral codes
INSERT INTO referral_codes (code, description, discount_percent, discount_months, max_uses)
VALUES
  ('LAUNCH2026',  'Launch special — 2 free months',     0, 2, 500),
  ('FOUNDING50',  'Founding member — 50% off month 1',  50, 1, 100),
  ('ACCOUNTANT',  'Accounting firm partner code',       20, 3, NULL),
  ('SWITCH2SB',   'Switch from competitor — 3 months',  0, 3, 200)
ON CONFLICT (code) DO NOTHING;

-- ── Onboarding checklist ────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_key     VARCHAR(100) NOT NULL,
  task_label   VARCHAR(255) NOT NULL,
  task_url     VARCHAR(255),             -- deep link to complete the task
  task_icon    VARCHAR(50),              -- icon name
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_tenant ON onboarding_checklist(tenant_id);

-- ── Notification preferences ────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel      VARCHAR(50) NOT NULL,     -- 'email' | 'in_app' | 'sms'
  event_type   VARCHAR(100) NOT NULL,    -- e.g. 'invoice_due', 'low_stock'
  enabled      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
