-- Migration: Usage Caps & Tracking
-- Description: Tracks per-tenant usage for AI queries, video meetings, emails, and storage.
-- Enforces plan limits with overage billing support.

-- ─── Usage Limits per Tenant (configurable) ───────────────────────────

CREATE TABLE IF NOT EXISTS usage_limits (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  resource_type   VARCHAR(50) NOT NULL,   -- 'ai_queries', 'video_minutes', 'emails', 'storage_gb'
  monthly_limit   INTEGER NOT NULL,        -- e.g., 50 AI queries, 200 video minutes
  overage_rate    NUMERIC(10,4) DEFAULT 0, -- R per unit overage (e.g., R0.25/query)
  is_hard_cap     BOOLEAN DEFAULT FALSE,   -- TRUE = block at limit, FALSE = allow overage
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, resource_type)
);

-- ─── Usage Tracking (monthly rollup) ────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_tracking (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  user_id         UUID,                    -- NULL = tenant-wide resource
  resource_type   VARCHAR(50) NOT NULL,
  period_start    DATE NOT NULL,           -- first of month
  usage_count     INTEGER DEFAULT 0,       -- units consumed
  overage_count   INTEGER DEFAULT 0,       -- units over limit
  overage_cost    NUMERIC(10,2) DEFAULT 0, -- R charged for overage
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, resource_type, period_start)
);

-- ─── Usage Events (audit log of every usage event) ──────────────────

CREATE TABLE IF NOT EXISTS usage_events (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  user_id         UUID,
  resource_type   VARCHAR(50) NOT NULL,
  units           INTEGER DEFAULT 1,       -- how many units consumed (1 query, 5 minutes, etc.)
  metadata        JSONB,                   -- extra context (tool name, meeting id, etc.)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_period ON usage_tracking(tenant_id, period_start);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_lookup ON usage_tracking(tenant_id, resource_type, period_start);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_created ON usage_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(tenant_id, resource_type, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_limits_tenant ON usage_limits(tenant_id);

-- ─── Default limits for all existing tenants ────────────────────────

INSERT INTO usage_limits (tenant_id, resource_type, monthly_limit, overage_rate, is_hard_cap)
SELECT t.id, r.resource_type, r.monthly_limit, r.overage_rate, r.is_hard_cap
FROM tenants t
CROSS JOIN (VALUES
  ('ai_queries',    50,   0.2500, FALSE),
  ('video_minutes', 200,  0.5000, FALSE),
  ('emails',        1000, 0.0500, FALSE),
  ('storage_gb',    5,    10.0000, FALSE)
) AS r(resource_type, monthly_limit, overage_rate, is_hard_cap)
ON CONFLICT (tenant_id, resource_type) DO NOTHING;
