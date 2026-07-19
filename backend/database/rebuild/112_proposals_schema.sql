-- 112_proposals_schema.sql — proposals table never existed at all.
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  proposal_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  status VARCHAR(30) DEFAULT 'draft',
  value DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'ZAR',
  valid_until DATE,
  description TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, proposal_number)
);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON public.proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
