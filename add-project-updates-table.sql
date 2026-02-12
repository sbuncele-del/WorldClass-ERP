-- Migration: Create project_updates table for project activity feed
-- Run this on the production database

CREATE TABLE IF NOT EXISTS project_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL,
    update_type VARCHAR(50) DEFAULT 'general',  -- general, milestone, status_change, budget, risk, deliverable
    title VARCHAR(500) NOT NULL,
    content TEXT DEFAULT '',
    is_client_visible BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_project_updates_tenant ON project_updates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created ON project_updates(created_at DESC);
