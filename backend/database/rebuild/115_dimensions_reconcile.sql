-- 115_dimensions_reconcile.sql
--
-- Fixes the Dimensions module (cost centers, departments, projects, products, locations):
-- the entire service (dimensions.service.ts) never filtered by tenant_id at all — a real
-- cross-tenant data leak, not just a naming mismatch. Fixed in application code separately;
-- this migration just gets the schema itself into a workable shape.
--
-- cost_centers/departments already had tenant_id (just unused by the service) and are both
-- empty — safe to rename via ALTER. products/locations never existed at all.

-- --- cost_centers: rename to match service convention, add missing columns ---
ALTER TABLE public.cost_centers RENAME COLUMN cost_center_code TO code;
ALTER TABLE public.cost_centers RENAME COLUMN cost_center_name TO name;
ALTER TABLE public.cost_centers RENAME COLUMN budget_holder_id TO manager_id;
ALTER TABLE public.cost_centers RENAME COLUMN budget_holder_name TO manager_name;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS parent_cost_center_id INTEGER REFERENCES public.cost_centers(cost_center_id);
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.cost_centers DROP CONSTRAINT cost_centers_cost_center_code_key;
ALTER TABLE public.cost_centers ADD CONSTRAINT cost_centers_tenant_code_key UNIQUE (tenant_id, code);

-- --- departments (bare/public — distinct from hr.departments): same treatment ---
ALTER TABLE public.departments RENAME COLUMN department_code TO code;
ALTER TABLE public.departments RENAME COLUMN department_name TO name;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS parent_department_id INTEGER REFERENCES public.departments(department_id);
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.departments DROP CONSTRAINT departments_department_code_key;
ALTER TABLE public.departments ADD CONSTRAINT departments_tenant_code_key UNIQUE (tenant_id, code);

-- --- products: never existed ---
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  product_category VARCHAR(100),
  product_line VARCHAR(100),
  is_service BOOLEAN DEFAULT false,
  unit_of_measure VARCHAR(50),
  standard_cost DECIMAL(15,2) DEFAULT 0,
  standard_price DECIMAL(15,2) DEFAULT 0,
  supplier_id INTEGER,
  supplier_name VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);

-- --- locations: never existed ---
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  location_type VARCHAR(50),
  parent_location_id UUID REFERENCES public.locations(id),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'South Africa',
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID,
  manager_name VARCHAR(200),
  opening_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON public.locations(tenant_id);
