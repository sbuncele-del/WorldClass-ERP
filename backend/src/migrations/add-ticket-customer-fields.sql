-- Migration: Add customer fields to support_tickets table
-- Purpose: Link tickets to customers for client service desk functionality

-- Add customer columns to support_tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;

-- Add index for customer lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status ON support_tickets(tenant_id, status);
