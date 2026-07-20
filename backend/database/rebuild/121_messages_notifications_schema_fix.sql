-- 121_messages_notifications_schema_fix.sql
--
-- messages.routes.ts (Driver-Dispatch Messaging) was written against a schema that
-- never matched what's live: public.messages is missing sender_name/sender_role/
-- recipient_name/is_emergency/trip_id, and public.notifications is missing
-- priority/metadata (both used by every INSERT in messages.routes.ts). The routes
-- also never set tenant_id (NOT NULL on messages) and reference a "trips" table
-- that doesn't exist anywhere - trip_id is kept as a plain nullable UUID with no FK.

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(200);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(50);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(200);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS trip_id UUID;
CREATE INDEX IF NOT EXISTS idx_messages_emergency ON public.messages(tenant_id, is_emergency) WHERE is_emergency = true;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
