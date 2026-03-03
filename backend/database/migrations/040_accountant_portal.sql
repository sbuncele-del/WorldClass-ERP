-- ============================================================================
-- Migration 040: Accountant Portal
-- QuickBooks-style multi-client management for accounting firms
-- ============================================================================

-- Accountant firms (HQ tenant for the accounting practice)
CREATE TABLE IF NOT EXISTS accountant_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  firm_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  tax_number VARCHAR(100),
  practice_number VARCHAR(100),
  firm_type VARCHAR(50) DEFAULT 'accounting', -- accounting, auditing, tax, bookkeeping, multi_service
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'South Africa',
  logo_url VARCHAR(500),
  subscription_tier VARCHAR(50) DEFAULT 'professional', -- starter, professional, enterprise
  max_clients INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mapping: which accountant firm manages which client tenant
CREATE TABLE IF NOT EXISTS accountant_client_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES accountant_firms(id) ON DELETE CASCADE,
  client_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_accountant_id UUID REFERENCES users(id), -- specific accountant user in the firm
  engagement_type VARCHAR(50) DEFAULT 'full_service', -- full_service, tax_only, bookkeeping, audit, advisory
  access_level VARCHAR(30) DEFAULT 'financial', -- financial, full, read_only, custom
  status VARCHAR(30) DEFAULT 'active', -- active, paused, terminated
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  billing_rate DECIMAL(10,2),
  billing_currency VARCHAR(3) DEFAULT 'ZAR',
  notes TEXT,
  permissions JSONB DEFAULT '["gl","ap","ar","reports","tax","bank_reconciliation"]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(firm_id, client_tenant_id)
);

-- Invitations for onboarding clients or accountants
CREATE TABLE IF NOT EXISTS accountant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES accountant_firms(id) ON DELETE CASCADE,
  invitation_type VARCHAR(30) NOT NULL, -- 'client' (inviting a client) or 'team' (inviting a team member)
  invitee_email VARCHAR(255) NOT NULL,
  invitee_name VARCHAR(255),
  invitee_company VARCHAR(255),
  invited_by UUID NOT NULL REFERENCES users(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(30) DEFAULT 'pending', -- pending, accepted, expired, declined
  engagement_type VARCHAR(50) DEFAULT 'full_service',
  message TEXT,
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  client_tenant_id UUID REFERENCES tenants(id), -- filled when accepted
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity log for accountant actions across clients
CREATE TABLE IF NOT EXISTS accountant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES accountant_firms(id),
  user_id UUID NOT NULL REFERENCES users(id),
  client_tenant_id UUID REFERENCES tenants(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acf_tenant ON accountant_firms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acm_firm ON accountant_client_mappings(firm_id);
CREATE INDEX IF NOT EXISTS idx_acm_client ON accountant_client_mappings(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_acm_accountant ON accountant_client_mappings(assigned_accountant_id);
CREATE INDEX IF NOT EXISTS idx_aci_token ON accountant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_aci_email ON accountant_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_aci_firm ON accountant_invitations(firm_id);
CREATE INDEX IF NOT EXISTS idx_aal_firm ON accountant_activity_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_aal_client ON accountant_activity_log(client_tenant_id);
