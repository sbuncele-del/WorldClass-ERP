-- Fix chart_of_accounts ID column
-- The id column exists but is NULL because it was added as UUID but account_id is INTEGER
-- We need to populate id with proper UUIDs

-- First, let's populate the id column with generated UUIDs where it's NULL
UPDATE chart_of_accounts 
SET id = gen_random_uuid() 
WHERE id IS NULL;

-- Verify the fix
SELECT account_id, id, code, name FROM chart_of_accounts LIMIT 10;

-- Also ensure the view is updated if it exists
DROP VIEW IF EXISTS financial.accounts CASCADE;

CREATE OR REPLACE VIEW financial.accounts AS 
SELECT 
    COALESCE(id, gen_random_uuid()) as id,
    account_id,
    tenant_id,
    COALESCE(account_code, code) as account_number,
    code,
    COALESCE(account_name, name) as name,
    account_type,
    description,
    is_active,
    parent_code as parent_id,
    normal_balance,
    current_balance as balance,
    is_header,
    created_at,
    updated_at
FROM chart_of_accounts;
