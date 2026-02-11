# Bank Reconciliation Module - Status & Deployment Guide

**Last Updated:** February 3, 2026

## Current Status: 🟡 Partially Working

### What Works ✅
- Bank statement CSV import (parsing works)
- GL accounts dropdown loads from `/api/v2/financial/accounts`
- Bank account exists: Main Account (310341434)
- API endpoints exist for statement lines
- UI loads and displays

### What's Broken ❌
1. **Transactions disappear on refresh** - Tenant mismatch issue
2. **Entity Switcher not functional** - "Sbue Golden Business Solutions" not selectable
3. **AI Auto-Match button** - May have filterOption TypeError
4. **Allocate to GL modal** - filterOption error with Select children

---

## Root Cause Analysis

### Tenant/Entity Mismatch Problem
```
Bank Account Tenant:  e5e381c0-5e46-4149-bb8a-21f187f6d317 (Masaphokati Equity Holdings)
Admin User Tenant:    00000000-0000-0000-0000-000000000001 (Default Tenant)
```

When user imports transactions, they're saved with their token's tenant_id (Default), but the bank account belongs to a different tenant (Masaphokati). Query filtering by tenant causes data to not appear.

### filterOption TypeError
In `BankReconciliationHub.tsx`, the Select component uses:
```tsx
filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}
```
But `children` can be JSX (not string), causing `.toLowerCase()` to fail.

**Fix needed:** Use `option?.label` instead of `option?.children`

---

## Database State

### Key Tables & Records

**Tenants:**
```sql
-- Check tenants
SELECT id, name FROM tenants;
-- e5e381c0-5e46-4149-bb8a-21f187f6d317 | Masaphokati Equity Holdings
-- 00000000-0000-0000-0000-000000000001 | Default Tenant
```

**Bank Account:**
```sql
-- Only 1 bank account should exist
SELECT id, account_name, account_number, tenant_id FROM bank_accounts;
-- e64240db-e376-4896-a354-74bd527453c0 | Main Account | 310341434 | e5e381c0-...
```

**Entities:**
```sql
-- Check legal_entities table
SELECT id, name, type FROM legal_entities WHERE tenant_id = 'e5e381c0-5e46-4149-bb8a-21f187f6d317';
```

**Chart of Accounts:**
```sql
-- Common expense accounts were added
SELECT code, name FROM chart_of_accounts WHERE type = 'Expense' AND tenant_id = 'e5e381c0-...';
```

---

## Server Access

### SSH Connection
```bash
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221
```

### Docker Containers
```bash
# Backend container
docker exec -it worldclass-backend bash

# Database container
docker exec -it worldclass-db psql -U postgres -d worldclass_erp

# Check logs
docker logs worldclass-backend --tail 100
docker logs worldclass-db --tail 50
```

### Backend Restart
```bash
docker restart worldclass-backend
```

---

## Deployment Commands

### Frontend Build & Deploy
```bash
# From local machine
cd /workspaces/WorldClass-ERP/frontend

# Build
npm run build

# Deploy to server
sshpass -p '3X.mJLdbHBpgsLFx' scp -r dist/* root@139.84.243.221:/var/www/html/
```

### Backend Deploy
```bash
# Copy changed files
sshpass -p '3X.mJLdbHBpgsLFx' scp backend/dist/routes/v2.routes.js root@139.84.243.221:/app/dist/routes/

# Or copy entire dist folder
sshpass -p '3X.mJLdbHBpgsLFx' scp -r backend/dist/* root@139.84.243.221:/app/dist/

# Restart backend
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221 "docker restart worldclass-backend"
```

### Database Changes
```bash
# Run SQL on production
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221 "docker exec worldclass-db psql -U postgres -d worldclass_erp -c \"
YOUR SQL HERE
\""
```

---

## Files to Fix

### 1. BankReconciliationHub.tsx
**Path:** `frontend/src/components/BankReconciliationHub.tsx`

**Fix filterOption error (~line 1680-1700):**
```tsx
// BEFORE (broken):
filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}

// AFTER (fixed):
filterOption={(input, option) => {
  const label = option?.label || option?.children;
  if (typeof label === 'string') {
    return label.toLowerCase().includes(input.toLowerCase());
  }
  return false;
}}
```

### 2. Fix Admin User Tenant
```sql
-- Update admin to use correct tenant
UPDATE users 
SET tenant_id = 'e5e381c0-5e46-4149-bb8a-21f187f6d317' 
WHERE email = 'admin@worldclass.co.za';
```

### 3. Create Entity for Sbue Golden Business Solutions
```sql
-- Add the entity
INSERT INTO legal_entities (id, tenant_id, name, type, code, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'e5e381c0-5e46-4149-bb8a-21f187f6d317',
  'Sbue Golden Business Solutions',
  'subsidiary',
  'SGBS',
  'active',
  NOW(),
  NOW()
);
```

---

## API Endpoints Reference

### Bank Reconciliation
```
GET  /api/v2/cash-management/bank-accounts
POST /api/v2/cash-management/bank-accounts
GET  /api/v2/cash-management/bank-accounts/:id/statement-lines
POST /api/v2/cash-management/bank-accounts/:id/statement-lines
GET  /api/v2/cash-management/reconciliation/history
POST /api/v2/cash-management/reconciliation/rules
```

### GL Accounts
```
GET  /api/v2/financial/accounts  (NOT /accounting/accounts)
```

### Entities
```
GET  /api/v2/entities/hierarchy
GET  /api/v2/multi-entity/entities
```

---

## Authentication

### Login Credentials
```
URL:      https://siyabusaerp.co.za
Email:    admin@worldclass.co.za
Password: admin123
```

### Get Token for API Testing
```bash
# Login and get token
curl -s -X POST "https://siyabusaerp.co.za/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@worldclass.co.za","password":"admin123"}' | jq -r '.token'

# Store in variable
TOKEN=$(curl -s -X POST "https://siyabusaerp.co.za/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@worldclass.co.za","password":"admin123"}' | jq -r '.token')
```

---

## Next Steps (Priority Order)

1. **Fix admin user tenant** - Change to Masaphokati tenant so data persists
2. **Fix filterOption** - Use label instead of children in Select
3. **Create Sbue entity** - Add to legal_entities table
4. **Test full flow** - Import → Match → Allocate → Save
5. **Add Grok AI** - User wants Grok API for intelligent matching (xai.com)

---

## Quick Diagnostic Commands

```bash
# Check if backend is running
curl -s https://siyabusaerp.co.za/api/v1/health

# Check bank accounts
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221 "docker exec worldclass-db psql -U postgres -d worldclass_erp -c 'SELECT id, account_name, tenant_id FROM bank_accounts;'"

# Check admin user tenant
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221 "docker exec worldclass-db psql -U postgres -d worldclass_erp -c \"SELECT id, email, tenant_id FROM users WHERE email = 'admin@worldclass.co.za';\""

# Check statement lines
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221 "docker exec worldclass-db psql -U postgres -d worldclass_erp -c 'SELECT COUNT(*) FROM bank_statement_lines;'"

# Check entities
sshpass -p '3X.mJLdbHBpgsLFx' ssh root@139.84.243.221 "docker exec worldclass-db psql -U postgres -d worldclass_erp -c 'SELECT id, name, type FROM legal_entities;'"
```

---

## Notes

- **Xero references removed** - User complained about competitor mentions
- **Mock data removed** - History tab now uses real state data
- **AI matching rewritten** - Checks AP/AR invoices with scoring algorithm
- **Multi-tenant constraint fixed** - chart_of_accounts now unique on (tenant_id, code)
- **Grok API** - User wants to integrate xAI's Grok for AI features (15k free requests)
