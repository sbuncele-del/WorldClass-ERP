-- 110_audit_trail_reconcile.sql
-- audit_log has 182 real rows. Controller (audit-trail.controller.v2.ts) expects
-- entity_type/entity_id/user_email; real table has resource_type/resource_id and no
-- user_email at all. Rename (data-preserving) + add + backfill from users via user_id.
ALTER TABLE public.audit_log RENAME COLUMN resource_type TO entity_type;
ALTER TABLE public.audit_log RENAME COLUMN resource_id TO entity_id;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
UPDATE public.audit_log al SET user_email = u.email FROM public.users u WHERE al.user_id = u.id AND al.user_email IS NULL;
