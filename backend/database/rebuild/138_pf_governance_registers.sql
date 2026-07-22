-- 138_pf_governance_registers.sql
-- ProjectFlow PM Engine — Phase 5 (governance registers)
--
-- Five independent registers from the L2 layer of the architecture brief.
-- None of these feed the scheduling/EVA engine (Phases 1-4) - they're
-- parallel governance surfaces, which is why this phase could ship
-- independently of the computational core.

CREATE TABLE IF NOT EXISTS pf_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_number INTEGER NOT NULL,        -- auto-numbered per project by the app layer

  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),

  probability SMALLINT NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact SMALLINT NOT NULL CHECK (impact BETWEEN 1 AND 5),
  score SMALLINT GENERATED ALWAYS AS (probability * impact) STORED,  -- 5x5 matrix score, 1-25

  response_strategy VARCHAR(20) CHECK (response_strategy IN ('avoid', 'mitigate', 'transfer', 'accept')),
  response_plan TEXT,
  owner VARCHAR(255),

  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'closed')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, risk_number)
);
CREATE INDEX IF NOT EXISTS idx_pf_risk_project ON pf_risk(project_id);

CREATE TABLE IF NOT EXISTS pf_stakeholder (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  power VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (power IN ('low', 'medium', 'high')),
  interest VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (interest IN ('low', 'medium', 'high')),

  engagement_current VARCHAR(20) NOT NULL DEFAULT 'unaware'
    CHECK (engagement_current IN ('unaware', 'resistant', 'neutral', 'supportive', 'leading')),
  engagement_desired VARCHAR(20) NOT NULL DEFAULT 'supportive'
    CHECK (engagement_desired IN ('unaware', 'resistant', 'neutral', 'supportive', 'leading')),

  strategy TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_stakeholder_project ON pf_stakeholder(project_id);

CREATE TABLE IF NOT EXISTS pf_comms_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES pf_stakeholder(id) ON DELETE SET NULL,

  audience VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  method VARCHAR(100),
  frequency VARCHAR(100),
  owner VARCHAR(255),
  next_due DATE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_comms_item_project ON pf_comms_item(project_id);

-- RACI is a flat matrix: one row per (task, person) cell. The grid itself
-- (distinct task_label x distinct person) is derived on read, not modelled
-- as separate tables - matches how small a real RACI actually is.
CREATE TABLE IF NOT EXISTS pf_raci_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  task_label VARCHAR(255) NOT NULL,
  person VARCHAR(255) NOT NULL,
  role_code CHAR(1) NOT NULL CHECK (role_code IN ('R', 'A', 'C', 'I')),

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, task_label, person)
);
CREATE INDEX IF NOT EXISTS idx_pf_raci_entry_project ON pf_raci_entry(project_id);

CREATE TABLE IF NOT EXISTS pf_procurement_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  procurement_type VARCHAR(10) NOT NULL DEFAULT 'buy' CHECK (procurement_type IN ('make', 'buy')),
  estimated_value NUMERIC(15,2),

  -- vendor_options: [{ vendor, price, quality_score (1-5), delivery_score (1-5) }]
  -- Best-value score is computed in the app layer (weighted formula), not
  -- stored generated - the weighting is a policy choice, not a fixed rule.
  vendor_options JSONB NOT NULL DEFAULT '[]',
  selected_vendor VARCHAR(255),

  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'rfq', 'awarded', 'closed')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_procurement_item_project ON pf_procurement_item(project_id);
