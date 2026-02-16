-- ============================================================
-- Migration 025: Demo Leads & Analytics
-- Purpose: Track demo requests, leads, and usage analytics
-- ============================================================

-- 1. DEMO LEADS TABLE
-- Captures every person who requests a demo
CREATE TABLE IF NOT EXISTS demo_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Lead info (collected from form)
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    industry VARCHAR(100),
    
    -- Demo account info
    demo_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    demo_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    temp_password VARCHAR(100),  -- Stored temporarily, cleared after first login
    
    -- Lead status tracking
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, expired, converted, disqualified
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    first_login_at TIMESTAMP,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    total_time_spent_seconds INTEGER DEFAULT 0,
    
    -- Conversion tracking
    converted_to_trial BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP,
    trial_tenant_id UUID,
    
    -- Source tracking
    utm_source VARCHAR(200),
    utm_medium VARCHAR(200),
    utm_campaign VARCHAR(200),
    referrer_url TEXT,
    
    -- Sales follow-up
    assigned_to VARCHAR(200),
    follow_up_date TIMESTAMP,
    follow_up_notes TEXT,
    lead_score INTEGER DEFAULT 0,  -- Calculated from activity
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_demo_leads_email ON demo_leads(email);
CREATE INDEX IF NOT EXISTS idx_demo_leads_status ON demo_leads(status);
CREATE INDEX IF NOT EXISTS idx_demo_leads_created ON demo_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_leads_lead_score ON demo_leads(lead_score DESC);

-- 2. DEMO ANALYTICS TABLE
-- Tracks what modules/features demo users explore
CREATE TABLE IF NOT EXISTS demo_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES demo_leads(id) ON DELETE CASCADE,
    user_id UUID,
    
    -- Event tracking
    event_type VARCHAR(100) NOT NULL,  -- page_view, feature_used, module_visited, action_taken
    module VARCHAR(100),               -- sales, hr, accounting, cash-management, etc.
    feature VARCHAR(200),              -- create_invoice, run_payroll, bank_recon, etc.
    page_path TEXT,
    
    -- Session info
    session_id VARCHAR(100),
    duration_seconds INTEGER DEFAULT 0,
    
    -- Device info
    user_agent TEXT,
    device_type VARCHAR(50),  -- desktop, mobile, tablet
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_analytics_lead ON demo_analytics(lead_id);
CREATE INDEX IF NOT EXISTS idx_demo_analytics_event ON demo_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_demo_analytics_module ON demo_analytics(module);
CREATE INDEX IF NOT EXISTS idx_demo_analytics_created ON demo_analytics(created_at DESC);

-- 3. USEFUL VIEWS

-- Lead pipeline view
CREATE OR REPLACE VIEW demo_lead_pipeline AS
SELECT 
    dl.id,
    dl.full_name,
    dl.email,
    dl.company_name,
    dl.phone,
    dl.status,
    dl.created_at,
    dl.first_login_at,
    dl.last_login_at,
    dl.login_count,
    dl.lead_score,
    dl.converted_to_trial,
    dl.expires_at,
    CASE 
        WHEN dl.expires_at < NOW() AND dl.status = 'active' THEN 'expired'
        ELSE dl.status
    END as effective_status,
    -- Activity summary
    COALESCE(
        (SELECT COUNT(DISTINCT module) FROM demo_analytics da WHERE da.lead_id = dl.id AND da.module IS NOT NULL),
        0
    ) as modules_explored,
    COALESCE(
        (SELECT string_agg(DISTINCT module, ', ') FROM demo_analytics da WHERE da.lead_id = dl.id AND da.module IS NOT NULL),
        'None'
    ) as modules_list,
    COALESCE(
        (SELECT SUM(duration_seconds) FROM demo_analytics da WHERE da.lead_id = dl.id),
        0
    ) as total_time_seconds
FROM demo_leads dl
ORDER BY dl.created_at DESC;

COMMENT ON TABLE demo_leads IS 'Tracks all demo requests and lead information for sales follow-up';
COMMENT ON TABLE demo_analytics IS 'Tracks demo user activity for lead scoring and sales intelligence';

-- Done
SELECT 'Demo leads and analytics tables created successfully' as result;
