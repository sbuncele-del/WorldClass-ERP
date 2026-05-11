-- Migration 026: Add missing columns to audit_log
-- The production audit_log table is missing several columns that the
-- audit middleware and controllers expect to write to.
-- tenant_id and user_id are already UUID — no type changes needed.

-- Add columns used by audit.middleware.ts INSERT
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS changed_fields TEXT[];
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS request_method VARCHAR(10);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS request_path VARCHAR(500);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS status_code INTEGER;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Recreate useful indexes that may be missing after the failed run
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_entity ON audit_log(tenant_id, entity_type, created_at DESC);
