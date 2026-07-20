-- 120_tenants_payment_gateway_column.sql
-- subscription.service.ts reads/writes tenants.payment_gateway (getCurrentSubscription
-- SELECT, updatePaymentMethod UPDATE) but the column never existed - every subscription
-- GET call 500'd with "column payment_gateway does not exist".
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) DEFAULT 'stripe';
