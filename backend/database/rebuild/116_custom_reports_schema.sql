-- 116_custom_reports_schema.sql — report_templates/report_columns/report_filters/
-- report_groups never existed at all. The old backend/src/config/custom-reports-migration.ts
-- creates a differently-shaped schema (no tenant_id, data_source instead of base_table,
-- no run_count/updated_by usage matching the live controller) and was never applied anyway.
-- Built to match what custom-reports.controller.v2.ts actually reads/writes.

CREATE TABLE IF NOT EXISTS public.report_templates (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'CUSTOM',
  base_table VARCHAR(100) NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON public.report_templates(tenant_id);

CREATE TABLE IF NOT EXISTS public.report_columns (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(50) DEFAULT 'text',
  sort_order INTEGER DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  aggregate_function VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_columns_template ON public.report_columns(template_id);

CREATE TABLE IF NOT EXISTS public.report_filters (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  filter_type VARCHAR(50) DEFAULT 'text',
  operator VARCHAR(20) DEFAULT '=',
  default_value TEXT,
  filter_order INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_filters_template ON public.report_filters(template_id);

CREATE TABLE IF NOT EXISTS public.report_groups (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  group_order INTEGER DEFAULT 1,
  show_subtotal BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_groups_template ON public.report_groups(template_id);
