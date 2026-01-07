# WorldClass ERP - System Architecture Document
## Version: 1.0 | Date: January 7, 2026

---

# TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Infrastructure Architecture](#3-infrastructure-architecture)
4. [Application Architecture](#4-application-architecture)
5. [Database Schema](#5-database-schema)
6. [API Architecture](#6-api-architecture)
7. [Module Structure](#7-module-structure)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Deployment Architecture](#9-deployment-architecture)
10. [File Structure](#10-file-structure)

---

# 1. SYSTEM OVERVIEW

WorldClass ERP is a comprehensive, multi-tenant Enterprise Resource Planning system designed for South African businesses. It provides:

- **25+ Business Modules** covering all aspects of business operations
- **Multi-Tenant Architecture** with complete data isolation
- **Industry Verticals** for Healthcare, Mining, Construction, Property, Agriculture
- **SARS Compliance** built-in for South African tax requirements
- **Real-time Dashboards** with AI-powered insights

## 1.1 Key Design Principles

1. **Tenant Isolation**: Every database query includes `tenant_id`
2. **API-First**: All functionality exposed via RESTful APIs
3. **Module Independence**: Each module can operate independently
4. **Audit Trail**: All changes are logged for compliance

---

# 2. TECHNOLOGY STACK

## 2.1 Backend
```
┌─────────────────────────────────────┐
│           BACKEND STACK             │
├─────────────────────────────────────┤
│ Runtime      │ Node.js 18.x LTS     │
│ Language     │ TypeScript 5.x       │
│ Framework    │ Express.js 4.x       │
│ ORM/Query    │ Raw SQL (pg pool)    │
│ Validation   │ Joi / Zod            │
│ Auth         │ JWT (jsonwebtoken)   │
└─────────────────────────────────────┘
```

## 2.2 Frontend
```
┌─────────────────────────────────────┐
│          FRONTEND STACK             │
├─────────────────────────────────────┤
│ Framework    │ React 18.x           │
│ Language     │ TypeScript 5.x       │
│ Build Tool   │ Vite                 │
│ State        │ React Context/Zustand│
│ Styling      │ Tailwind CSS         │
│ Components   │ Shadcn/UI            │
└─────────────────────────────────────┘
```

## 2.3 Database
```
┌─────────────────────────────────────┐
│          DATABASE STACK             │
├─────────────────────────────────────┤
│ Primary DB   │ PostgreSQL 15        │
│ Hosting      │ AWS RDS              │
│ Cache        │ Redis (planned)      │
│ Schemas      │ Multi-schema design  │
└─────────────────────────────────────┘
```

## 2.4 Infrastructure
```
┌─────────────────────────────────────┐
│       INFRASTRUCTURE STACK          │
├─────────────────────────────────────┤
│ Compute      │ AWS EC2 (t3.medium)  │
│ Database     │ AWS RDS PostgreSQL   │
│ Storage      │ AWS S3               │
│ Deployment   │ AWS SSM              │
│ Process Mgr  │ PM2                  │
│ Region       │ eu-north-1           │
└─────────────────────────────────────┘
```

---

# 3. INFRASTRUCTURE ARCHITECTURE

```
                    ┌─────────────────┐
                    │    INTERNET     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   CloudFlare    │
                    │   (DNS/CDN)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                          │
┌───────▼───────┐                        ┌────────▼────────┐
│   Frontend    │                        │    Backend      │
│   (Vercel)    │                        │    (EC2)        │
│               │                        │                 │
│ erp.world-    │◄──── API Calls ───────►│ 51.20.67.228   │
│ class.africa  │                        │ Port 3000       │
└───────────────┘                        └────────┬────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │   AWS RDS       │
                                         │   PostgreSQL    │
                                         │                 │
                                         │ aetheros-erp-db │
                                         └─────────────────┘
```

## 3.1 PRODUCTION DEPLOYMENT LOCATIONS (LOCKED)

### 🌐 FRONTEND (React)
| Property | Value |
|----------|-------|
| **Platform** | Vercel |
| **URL** | https://erp.world-class.africa |
| **Repository** | sbuncele-del/WorldClass-ERP |
| **Build Command** | `npm run build` |
| **Output Dir** | `frontend/dist` |
| **Framework** | React + Vite |

### 🖥️ BACKEND (Node.js)
| Property | Value |
|----------|-------|
| **Platform** | AWS EC2 |
| **Instance ID** | `i-0b20fd06fae7e84b1` |
| **Public IP** | `51.20.67.228` |
| **API URL** | http://51.20.67.228:3000/api |
| **Directory on Server** | `/home/ec2-user/erp-production` |
| **Process Manager** | PM2 (process name: `erp-backend`) |
| **Region** | eu-north-1 (Stockholm) |

### 🗄️ DATABASE (PostgreSQL)
| Property | Value |
|----------|-------|
| **Platform** | AWS RDS |
| **Endpoint** | `aetheros-erp-db.cxoqqoowwgxt.eu-north-1.rds.amazonaws.com` |
| **Port** | 5432 |
| **Database** | `postgres` |
| **Username** | `postgres` |
| **Password** | `caxMex-0putca-dyjnah` |
| **Engine** | PostgreSQL 15 |

### 📦 DEPLOYMENT ARTIFACTS (S3)
| Property | Value |
|----------|-------|
| **Bucket** | `s3://aetheros-erp-deployments` |
| **Region** | eu-north-1 |
| **Artifact** | `backend-dist.tar.gz` |

### 📁 SOURCE CODE LOCATIONS
| Component | Local Path | On Server |
|-----------|------------|-----------|
| Backend Source | `/workspaces/WorldClass-ERP/backend/src` | N/A (compiled) |
| Backend Compiled | `/workspaces/WorldClass-ERP/backend/dist` | `/home/ec2-user/erp-production/dist` |
| Frontend Source | `/workspaces/WorldClass-ERP/frontend/src` | N/A |
| Frontend Built | `/workspaces/WorldClass-ERP/frontend/dist` | Vercel CDN |
| Migrations | `/workspaces/WorldClass-ERP/migrations` | Run via SSM |

## 3.2 EC2 Instance Details
- **Instance ID**: `i-0b20fd06fae7e84b1`
- **Type**: t3.medium (2 vCPU, 4GB RAM)
- **OS**: Amazon Linux 2
- **Storage**: 30GB gp3 SSD

## 3.3 RDS Instance Details
- **Identifier**: aetheros-erp-db
- **Engine**: PostgreSQL 15
- **Instance Class**: db.t3.micro
- **Storage**: 20GB gp2 SSD
- **Multi-AZ**: No (single region)

---

# 4. APPLICATION ARCHITECTURE

## 4.1 Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     REQUEST LIFECYCLE                         │
└──────────────────────────────────────────────────────────────┘

  Client Request
       │
       ▼
┌──────────────┐
│   Express    │
│   Server     │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Security    │────►│   CORS       │
│  Middleware  │     │   Headers    │
└──────┬───────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│    Auth      │ ◄── JWT Verification
│  Middleware  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Tenant     │ ◄── Extract tenant_id from token
│  Middleware  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Router     │ ◄── v2.routes.ts
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Controller  │ ◄── Business Logic
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Database   │ ◄── PostgreSQL (with tenant_id)
│              │
└──────┬───────┘
       │
       ▼
  JSON Response
```

## 4.2 Multi-Tenant Request Pattern

```typescript
// Every V2 controller follows this pattern:
export const getResource = async (req: TenantRequest, res: Response) => {
  try {
    // 1. Extract tenant context (MANDATORY)
    const { tenantId } = getTenantContext(req);
    
    // 2. Query with tenant_id filter (MANDATORY)
    const result = await pool.query(
      `SELECT * FROM table WHERE tenant_id = $1`,
      [tenantId]
    );
    
    // 3. Return success response
    res.json({ success: true, data: result.rows });
  } catch (error) {
    // 4. Handle errors
    res.status(500).json({ success: false, error: 'Failed' });
  }
};
```

---

# 5. DATABASE SCHEMA

## 5.1 Schema Organization

```
PostgreSQL Database: postgres
├── public (default schema)
│   ├── tenants
│   ├── users
│   ├── customers
│   ├── invoices
│   ├── projects
│   └── ... (most tables)
│
├── hr (HR module schema)
│   ├── employees
│   ├── departments
│   ├── leave_types
│   ├── leave_requests
│   └── payroll_runs
│
├── inventory (Inventory schema)
│   ├── items
│   ├── categories
│   ├── warehouses
│   └── stock_levels
│
├── manufacturing (Manufacturing schema)
│   ├── boms
│   ├── work_orders
│   └── work_centers
│
└── compliance (Compliance schema)
    ├── requirements
    ├── sars_submissions
    └── filings
```

## 5.2 Core Tables

### tenants
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);
```

## 5.3 Multi-Tenant Rule

**CRITICAL**: Every table that stores tenant data MUST have:
1. A `tenant_id UUID NOT NULL` column
2. A reference to `tenants(id)` (when possible)
3. An index on `tenant_id` for query performance

---

# 6. API ARCHITECTURE

## 6.1 API Versioning

```
/api/auth/*          → Authentication (no version)
/api/v2/*            → V2 API (tenant-hardened) ✅ USE THIS
/api/superadmin/*    → Super admin endpoints
```

## 6.2 Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Human readable message"
}
```

## 6.3 Authentication

### Login Request
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@tenant.com",
  "password": "password123"
}
```

### Login Response
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 3600
    },
    "tenant": {
      "id": "uuid",
      "name": "Tenant Name"
    },
    "user": {
      "id": "uuid",
      "email": "user@tenant.com"
    }
  }
}
```

### Using the Token
```bash
GET /api/v2/inventory/items
Authorization: Bearer eyJ...
```

---

# 7. MODULE STRUCTURE

## 7.1 Backend Modules

```
backend/src/
├── auth/                    # Authentication
├── config/                  # Database & environment
├── controllers/             # V2 Controllers
│   ├── admin.controller.v2.ts
│   ├── assets.controller.v2.ts
│   ├── inventory.controller.v2.ts
│   ├── sales.controller.v2.ts
│   ├── purchase.controller.v2.ts
│   ├── healthcare.controller.v2.ts
│   ├── mining.controller.v2.ts
│   ├── construction.controller.v2.ts
│   ├── property.controller.v2.ts
│   ├── agriculture.controller.v2.ts
│   └── ...
├── middleware/              # Express middleware
│   ├── auth.ts
│   ├── tenant.ts
│   └── security.ts
├── modules/                 # Domain modules
│   ├── hr/
│   ├── financial/
│   ├── manufacturing/
│   ├── compliance/
│   └── logistics/
├── routes/                  # Route definitions
│   └── v2.routes.ts        # MAIN ROUTE FILE
├── services/               # Business logic services
└── types/                  # TypeScript types
    └── index.ts            # TenantRequest type
```

## 7.2 Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Main routes | `backend/src/routes/v2.routes.ts` |
| Tenant middleware | `backend/src/middleware/tenant.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| Database config | `backend/src/config/database.ts` |
| Type definitions | `backend/src/types/index.ts` |

---

# 8. AUTHENTICATION & AUTHORIZATION

## 8.1 JWT Token Structure

```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "email": "user@tenant.com",
  "role": "admin",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## 8.2 Middleware Chain

```
Request → auth.ts → tenant.ts → Controller
           │           │
           │           └── Extracts tenantId, attaches to req.tenant
           │
           └── Verifies JWT, attaches user to req.user
```

## 8.3 Role-Based Access

```
admin       → Full access to tenant
manager     → Department-level access
user        → Personal data only
readonly    → View only
```

---

# 9. DEPLOYMENT ARCHITECTURE

## 9.1 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT PIPELINE                        │
└─────────────────────────────────────────────────────────────┘

  Developer Machine (Codespace)
       │
       │ 1. npm run build
       ▼
  ┌──────────────┐
  │   TypeScript │ → JavaScript (dist/)
  │   Compile    │
  └──────┬───────┘
         │
         │ 2. tar -czvf backend-dist.tar.gz
         ▼
  ┌──────────────┐
  │   Package    │ → backend-dist.tar.gz
  │   Artifact   │
  └──────┬───────┘
         │
         │ 3. aws s3 cp
         ▼
  ┌──────────────┐
  │   AWS S3     │ → s3://aetheros-erp-deployments/
  │   Bucket     │
  └──────┬───────┘
         │
         │ 4. aws ssm send-command
         ▼
  ┌──────────────┐
  │   EC2        │ → Download from S3
  │   Instance   │ → Extract tarball
  │              │ → PM2 restart
  └──────────────┘
```

## 9.2 Deployment Commands

```bash
# Complete deployment script
cd /workspaces/WorldClass-ERP/backend
npm run build
tar -czvf /tmp/backend-dist.tar.gz dist/ package.json
aws s3 cp /tmp/backend-dist.tar.gz s3://aetheros-erp-deployments/
aws ssm send-command --instance-ids "i-0b20fd06fae7e84b1" ...
```

---

# 10. FILE STRUCTURE

## 10.1 Repository Root
```
WorldClass-ERP/
├── backend/                      # Node.js backend
│   ├── src/                     # TypeScript source
│   ├── dist/                    # Compiled JavaScript
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                    # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
│
├── migrations/                  # SQL migrations
│   └── COMPLETE-SCHEMA-JAN-2026.sql
│
├── scripts/                     # Utility scripts
│   └── test-all-endpoints.sh
│
├── docs/                        # Documentation
│
├── SYSTEM-STATUS-JAN-2026.md   # Current status
├── ARCHITECTURE.md              # This file
└── .github/
    └── copilot-instructions.md
```

## 10.2 Important Configuration Files

| File | Purpose |
|------|---------|
| `backend/.env` | Environment variables (local) |
| `backend/tsconfig.json` | TypeScript configuration |
| `backend/package.json` | Dependencies |
| `.github/copilot-instructions.md` | AI assistant context |

---

# APPENDIX A: QUICK REFERENCE

## A.1 Connect to Production Database

```bash
# Via EC2 (RDS not publicly accessible)
aws ssm send-command \
  --instance-ids "i-0b20fd06fae7e84b1" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["PGPASSWORD='\''caxMex-0putca-dyjnah'\'' psql -h aetheros-erp-db.cxoqqoowwgxt.eu-north-1.rds.amazonaws.com -U postgres -d postgres"]' \
  --region eu-north-1
```

## A.2 View Backend Logs

```bash
aws ssm send-command \
  --instance-ids "i-0b20fd06fae7e84b1" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["pm2 logs erp-backend --lines 100 --nostream"]' \
  --region eu-north-1
```

## A.3 Restart Backend

```bash
aws ssm send-command \
  --instance-ids "i-0b20fd06fae7e84b1" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["pm2 restart erp-backend"]' \
  --region eu-north-1
```

## A.4 Run Tests

```bash
API_BASE="http://51.20.67.228:3000" /workspaces/WorldClass-ERP/scripts/test-all-endpoints.sh
```

---

**Document Version**: 1.0
**Last Updated**: January 7, 2026
**Author**: GitHub Copilot
