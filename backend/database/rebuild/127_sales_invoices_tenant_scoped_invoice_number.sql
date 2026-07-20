-- 127_sales_invoices_tenant_scoped_invoice_number.sql
--
-- Prerequisite for multi-client Xero sync: sales_invoices.invoice_number was
-- globally UNIQUE, not tenant-scoped. Two different client tenants each
-- connecting their own Xero org would collide the moment both had an
-- invoice numbered e.g. "INV-001" in their separate Xero books. Same hard
-- rule applied repeatedly this session - business-code uniqueness must be
-- per-tenant, never global. Confirmed no existing (tenant_id, invoice_number)
-- duplicates before applying.

ALTER TABLE public.sales_invoices DROP CONSTRAINT sales_invoices_invoice_number_key;
ALTER TABLE public.sales_invoices ADD CONSTRAINT sales_invoices_tenant_invoice_number_key UNIQUE (tenant_id, invoice_number);
