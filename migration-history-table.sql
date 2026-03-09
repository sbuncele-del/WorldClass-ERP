-- Migration History table — tracks all data imports from external platforms
CREATE TABLE IF NOT EXISTS migration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_id UUID,
  data_type VARCHAR(50) NOT NULL,
  source_platform VARCHAR(50) NOT NULL DEFAULT 'csv',
  file_name VARCHAR(255),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  imported_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_history_tenant ON migration_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_migration_history_type ON migration_history(tenant_id, data_type);
