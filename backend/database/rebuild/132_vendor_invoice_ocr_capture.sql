-- Adds real invoice-capture (Hubdoc-style OCR) support to purchase.vendor_invoices.
-- The previous "OCR" feature (accounting.automation.service.ts's performOCR()) was a
-- hardcoded stub returning fake data ('Sample Vendor', totalAmount: 1000, etc.) regardless
-- of the uploaded document, writing into the unused/dead accounting.ap_invoices table, and
-- was never mounted on any live route. This replaces it with a real Claude-vision-based
-- extraction that writes into the actual live purchase.vendor_invoices table.

ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS source_document_url TEXT;
ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS extracted_vendor_name VARCHAR(255);
ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5,2);
ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS ocr_raw_response JSONB;
ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS capture_method VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_needs_review ON purchase.vendor_invoices(tenant_id, needs_review) WHERE needs_review = true;
