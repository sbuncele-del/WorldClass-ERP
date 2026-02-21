-- ============================================================================
-- Multi-Entity Module — Alignment Migration
-- February 2026
-- Ensures all tables match what the V2 controller expects
-- ============================================================================

-- 1. Ensure legal_entities has ownership_percentage
ALTER TABLE legal_entities ADD COLUMN IF NOT EXISTS ownership_percentage DECIMAL(5,2) DEFAULT 100.00;

-- 2. Ensure intercompany_transactions has target_entity_id column
-- (019b uses dest_entity_id, but V2 controller uses target_entity_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intercompany_transactions' AND column_name = 'dest_entity_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intercompany_transactions' AND column_name = 'target_entity_id'
  ) THEN
    ALTER TABLE intercompany_transactions RENAME COLUMN dest_entity_id TO target_entity_id;
  END IF;
END $$;

-- 3. Ensure intercompany_transactions has all required columns
ALTER TABLE intercompany_transactions ADD COLUMN IF NOT EXISTS elimination_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE intercompany_transactions ADD COLUMN IF NOT EXISTS elimination_journal_id UUID;
ALTER TABLE intercompany_transactions ADD COLUMN IF NOT EXISTS requires_elimination BOOLEAN DEFAULT true;
ALTER TABLE intercompany_transactions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE intercompany_transactions ADD COLUMN IF NOT EXISTS approved_by UUID;

-- 4. Ensure entity_permissions has all V2 controller columns
-- V2 controller uses: can_view, can_edit, can_post, can_approve
ALTER TABLE entity_permissions ADD COLUMN IF NOT EXISTS can_view BOOLEAN DEFAULT true;
ALTER TABLE entity_permissions ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT false;
ALTER TABLE entity_permissions ADD COLUMN IF NOT EXISTS can_post BOOLEAN DEFAULT false;
ALTER TABLE entity_permissions ADD COLUMN IF NOT EXISTS can_approve BOOLEAN DEFAULT false;
ALTER TABLE entity_permissions ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE entity_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Ensure consolidation_elimination_rules exists (from 019b)
CREATE TABLE IF NOT EXISTS consolidation_elimination_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    entity_ids UUID[],
    transaction_types VARCHAR(50)[],
    source_account_pattern VARCHAR(100),
    target_account VARCHAR(50),
    percentage DECIMAL(5,2) DEFAULT 100.00,
    conditions JSONB,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- 6. Ensure consolidation_periods exists
CREATE TABLE IF NOT EXISTS consolidation_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_name VARCHAR(100),
    fiscal_year INTEGER,
    period_number INTEGER,
    status VARCHAR(50) DEFAULT 'open',
    consolidated_at TIMESTAMP,
    consolidated_by UUID,
    total_eliminations DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, period_start, period_end)
);

-- 7. Ensure entity_config exists
CREATE TABLE IF NOT EXISTS entity_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
    chart_template VARCHAR(100),
    numbering_prefix VARCHAR(20),
    default_payment_terms INTEGER DEFAULT 30,
    default_tax_rate DECIMAL(5,2),
    default_warehouse_id UUID,
    default_price_list VARCHAR(100),
    logo_url VARCHAR(500),
    reporting_currency VARCHAR(10) DEFAULT 'ZAR',
    translation_method VARCHAR(50) DEFAULT 'current_rate',
    enabled_modules JSONB DEFAULT '["sales", "purchase", "financial", "inventory"]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, entity_id)
);

-- 8. Optional: Exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    source VARCHAR(50) DEFAULT 'manual',
    created_by UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, base_currency, target_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant ON exchange_rates(tenant_id);

-- Done
DO $$
BEGIN
    RAISE NOTICE 'Multi-Entity alignment migration complete';
    RAISE NOTICE 'Tables verified: legal_entities, intercompany_transactions, entity_permissions,';
    RAISE NOTICE '  consolidation_elimination_rules, consolidation_periods, entity_config, exchange_rates';
END $$;
