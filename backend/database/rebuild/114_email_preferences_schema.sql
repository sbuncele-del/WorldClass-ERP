-- 114_email_preferences_schema.sql — email_preferences/unsubscribe_tokens/email_send_log never
-- existed at all. Built with UUID user_id/tenant_id to match the rest of the app (the service
-- and controller were written assuming integer IDs — fixed separately in application code).
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  marketing_emails BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  subscription_notifications BOOLEAN DEFAULT true,
  inventory_alerts BOOLEAN DEFAULT true,
  team_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  unsubscribed_all BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMP,
  digest_frequency VARCHAR(20) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  category VARCHAR(50),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.unsubscribe_tokens(token);

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tenant_id UUID,
  email_address VARCHAR(255) NOT NULL,
  email_type VARCHAR(100),
  email_category VARCHAR(100),
  subject VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_tenant ON public.email_send_log(tenant_id);
