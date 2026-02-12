-- Migration: Create missing tables that cause 500 errors
-- Date: 2026-02-12
-- Fixes:
--   - GET /api/v2/admin/users → 500 "relation user_roles does not exist"
--   - GET /api/v2/communications/notifications/unread-count → 500 "relation user_notifications does not exist"
--   - GET /api/v2/communications/messages/unread-count → 500 "relation direct_messages does not exist"
-- Also adds missing columns to users table for admin controller v2

-- ============================================================================
-- 1. ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    role_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    is_admin_role BOOLEAN DEFAULT false,
    role_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_code_tenant UNIQUE (tenant_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active) WHERE is_active = true;

INSERT INTO roles (role_name, role_code, description, is_system_role, is_admin_role, role_level) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full system access', true, true, 100),
('System Admin', 'SYSTEM_ADMIN', 'System administration', true, true, 90),
('Finance Manager', 'FINANCE_MANAGER', 'Financial management', true, false, 70),
('HR Manager', 'HR_MANAGER', 'HR and payroll management', true, false, 70),
('Sales Manager', 'SALES_MANAGER', 'Sales management', true, false, 60),
('Purchase Manager', 'PURCHASE_MANAGER', 'Purchase management', true, false, 60),
('Warehouse Manager', 'WAREHOUSE_MANAGER', 'Inventory and warehouse', true, false, 60),
('Accountant', 'ACCOUNTANT', 'Accounting functions', true, false, 50),
('Sales Rep', 'SALES_REP', 'Sales representative', true, false, 30),
('Project Manager', 'PROJECT_MANAGER', 'Project management', true, false, 60),
('Employee', 'EMPLOYEE', 'Standard employee', true, false, 10),
('Read Only', 'READ_ONLY', 'View-only access', true, false, 5)
ON CONFLICT (tenant_id, role_code) DO NOTHING;

-- ============================================================================
-- 2. USER_ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_by UUID,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- ============================================================================
-- 3. USER_NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    notification_type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    related_type VARCHAR(50),
    related_id UUID,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON user_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- 4. DIRECT_MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_tenant ON direct_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(recipient_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- 5. ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);

-- ============================================================================
-- 6. CHAT_CHANNELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    description TEXT,
    channel_type VARCHAR(20) DEFAULT 'public',
    is_archived BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_tenant ON chat_channels(tenant_id);

-- ============================================================================
-- 7. PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    permission_name VARCHAR(200) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_by UUID,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- 8. ADD MISSING COLUMNS TO USERS TABLE
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_suspended BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

UPDATE users SET is_active = (status = 'active' OR status IS NULL) WHERE is_active IS NULL;
UPDATE users SET is_super_admin = true WHERE role = 'super_admin' AND is_super_admin IS NULL;
UPDATE users SET display_name = COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') WHERE display_name IS NULL;
UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL AND email IS NOT NULL;
