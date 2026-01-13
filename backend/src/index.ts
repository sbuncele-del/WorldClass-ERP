// MUST load dotenv FIRST before any other imports that use environment variables
import dotenv from 'dotenv';
import path from 'path';
// Use explicit path to ensure .env is found regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express, { Application } from 'express';
import http from 'http';
import { randomUUID } from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { validateEnv } from './config/env.validation';
import authRoutes from './auth/auth.routes';
import onboardingRoutes from './routes/onboarding.routes';
import emailPreferencesRoutes from './routes/email-preferences.routes';
import emailQueueRoutes from './routes/email-queue.routes';
import tenantSettingsRoutes from './routes/tenant-settings.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import subscriptionRoutes from './routes/subscription.routes';
import inventoryRoutes from './routes/inventory.routes';
import salesRoutes from './routes/sales.routes';
import purchaseRoutes from './routes/purchase.routes';
import financialRoutes from './routes/financial.routes';
import dimensionsRoutes from './routes/dimensions.routes';
import periodRoutes from './routes/period.routes';
import dashboardRoutes from './routes/dashboard.routes';
import approvalRoutes from './routes/approval.routes';
import hrRoutes from './routes/hr.routes';
import manufacturingRoutes from './modules/manufacturing/routes/manufacturing.routes';
import warehouseRoutes from './routes/warehouse.routes';
import sarsSentinelRoutes from './routes/sars-sentinel.routes';
import cashManagementRoutes from './routes/cash-management.routes';
import financialReportsRoutes from './routes/financial-reports.routes';
import recurringEntriesRoutes from './routes/recurring-entries.routes';
import importEntriesRoutes from './routes/import-entries.routes';
import glExplorerRoutes from './routes/gl-explorer.routes';
import auditTrailRoutes from './routes/audit-trail.routes';
import taxSettingsRoutes from './routes/tax-settings.routes';
import financialForecastingRoutes from './routes/financial-forecasting.routes';
import customReportsRoutes from './routes/custom-reports.routes';
import practiceRoutes from './routes/practice.routes';
import assetsRoutes from './routes/assets.routes';
// import demoResetRoutes from './routes/demo-reset.routes'; // DISABLED - causes Bull/Redis initialization
import superAdminRoutes from './routes/super-admin.routes';
import adminRoutes from './routes/admin.routes';
import complianceRoutes from './routes/compliance.routes';
import auditReadyRoutes from './routes/audit-ready.routes';

// V2 Routes - Tenant-Hardened Controllers (multi-tenant secure)
import v2Routes from './routes/v2.routes';
import reportsRoutes from './routes/reports.routes';
import treasuryRoutes from './routes/treasury.routes';
import aiAssistantRoutes from './routes/ai-assistant.routes';
import agentRoutes from './routes/agent.routes';
import multiEntityRoutes from './routes/multi-entity.routes';
import healthcareRoutes from './routes/healthcare.routes';
import superadminRoutes from './routes/superadmin.routes';
import modulesRoutes from './routes/modules.routes';
import messagesRoutes from './routes/messages.routes';
import deliveryRoutes from './routes/delivery.routes';
import meetingsRoutes from './routes/meetings.routes';
import DemoResetService from './services/demo-reset.service';
import { initializeLogisticsGateway } from './websocket/logistics.gateway';
import { securityHeaders, securityLogger } from './middleware/security';
import { apiLimiter, authLimiter, adminLimiter, webhookLimiter, demoLimiter } from './middleware/rateLimiter';
import logisticsRoutes from './modules/logistics/logistics.routes';
import { authenticateToken } from './middleware/auth';
import { auditMiddleware } from './middleware/audit.middleware';
import { tenantMiddleware } from './middleware/tenant';
import auditLogRoutes from './routes/audit-log.routes';
import { healthCheck as dbHealthCheck } from './config/database';
import { redisHealthCheck } from './services/redis.service';
import { createCacheMiddleware } from './middleware/cache.middleware';
// import gpsRoutes from './modules/logistics/gps.routes'; // May have issues
import chartOfAccountsRoutes from './modules/chart-of-accounts/routes';
import financialReportsRoutes2 from './modules/financial-reports/routes';
import salesInvoiceRoutes from './modules/sales/routes';
import purchaseInvoiceRoutes from './modules/purchases/routes';
import assetManagementRoutes from './modules/assets/routes';

// NEW API ROUTES - December 2025
import projectsRoutes from './routes/projects.routes';
import proposalsRoutes from './routes/proposals.routes';
import communicationsRoutes from './routes/communications.routes';
import calendarRoutes from './routes/calendar.routes';
import miningRoutes from './routes/mining.routes';
import agricultureRoutes from './routes/agriculture.routes';
import constructionRoutes from './routes/construction.routes';
import propertyRoutes from './routes/property.routes';

// Validate environment variables
validateEnv();

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration() as any,  // Type assertion for Sentry version mismatch
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// DEBUG: Log database connection info
console.log('=== ENVIRONMENT DEBUG ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('========================');

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const httpServer = http.createServer(app);

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'WorldClass ERP - Logistics API',
      version: '1.0.0',
      description: 'Logistics module endpoints for WorldClass ERP'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${PORT}`
      }
    ]
  },
  apis: ['src/modules/logistics/**/*.ts', 'dist/modules/logistics/**/*.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Trust proxy - required for rate limiting behind nginx
app.set('trust proxy', 1);

// Attach a request ID for traceability across logs and responses
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// Middleware
// Helmet disabled - CSP was blocking frontend API requests
// Security headers are handled by securityHeaders middleware instead
// app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration for Codespaces and local development
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow all GitHub Codespaces URLs
    if (origin.includes('.app.github.dev')) return callback(null, true);
    
    // Allow localhost for local development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    callback(null, true); // Allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('dev'));

// Security middleware
app.use(securityHeaders);
app.use(securityLogger);

// IMPORTANT: Stripe webhooks need raw body for signature verification
// Must come BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Standard JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

app.get('/health/db', async (_req, res) => {
  try {
    const healthy = await dbHealthCheck();
    if (healthy) {
      return res.status(200).json({ status: 'OK', message: 'Database reachable' });
    }
    return res.status(503).json({ status: 'UNAVAILABLE', message: 'Database unreachable' });
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(503).json({ status: 'UNAVAILABLE', message: 'Database health check failed', error: (error as Error).message });
  }
});

app.get('/health/redis', async (_req, res) => {
  try {
    const { status, latencyMs } = await redisHealthCheck();
    const code = status === 'up' ? 200 : 503;
    return res.status(code).json({ status: status.toUpperCase(), latencyMs });
  } catch (error) {
    console.error('Redis health check failed:', error);
    return res.status(503).json({ status: 'UNAVAILABLE', message: 'Redis health check failed', error: (error as Error).message });
  }
});

// Migration endpoint - no auth required, protected by secret header
app.post('/api/migrate/:module', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== 'worldclass-migrate-2026') {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  
  const { module } = req.params;
  try {
    let result;
    const pool = (await import('./config/database')).default;
    const fs = await import('fs');
    const path = await import('path');
    
    switch (module) {
      case 'financial':
        // Create financial/accounting tables from SQL migration
        const finSqlPath = path.join('/app', 'database', 'migrations', '011_financial_accounting_module.sql');
        const finSql = fs.readFileSync(finSqlPath, 'utf8');
        await pool.query(finSql);
        result = 'Financial Accounting tables created successfully';
        break;
      
      case 'financial-core':
        // Create just the essential GL tables (chart_of_accounts, journal_entries, journal_entry_lines)
        await pool.query(`
          -- Chart of Accounts
          CREATE TABLE IF NOT EXISTS chart_of_accounts (
            account_id SERIAL PRIMARY KEY,
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            code VARCHAR(50) NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            parent_code VARCHAR(50),
            account_level INTEGER NOT NULL DEFAULT 1,
            is_header BOOLEAN DEFAULT false,
            account_type VARCHAR(50) NOT NULL,
            account_subtype VARCHAR(50),
            category VARCHAR(100),
            normal_balance VARCHAR(10) NOT NULL DEFAULT 'DEBIT',
            is_control_account BOOLEAN DEFAULT false,
            allows_manual_entries BOOLEAN DEFAULT true,
            current_balance DECIMAL(15,2) DEFAULT 0,
            ytd_debit DECIMAL(15,2) DEFAULT 0,
            ytd_credit DECIMAL(15,2) DEFAULT 0,
            currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            is_active BOOLEAN DEFAULT true,
            is_system_account BOOLEAN DEFAULT false,
            display_order INTEGER DEFAULT 0,
            created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by UUID,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uk_coa_code UNIQUE (code)
          );
          CREATE INDEX IF NOT EXISTS idx_coa_tenant ON chart_of_accounts(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(code);
          CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
          
          -- Journal Entries Header
          CREATE TABLE IF NOT EXISTS journal_entries (
            journal_entry_id SERIAL PRIMARY KEY,
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            journal_number VARCHAR(50) NOT NULL,
            journal_date DATE NOT NULL,
            posting_date DATE,
            source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
            source_document_type VARCHAR(50),
            source_document_id INTEGER,
            description TEXT NOT NULL,
            reference VARCHAR(200),
            total_debit DECIMAL(15,2) NOT NULL,
            total_credit DECIMAL(15,2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
            posted_by UUID,
            posted_at TIMESTAMP,
            is_reversal BOOLEAN DEFAULT false,
            created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by UUID,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uk_je_number UNIQUE (journal_number)
          );
          CREATE INDEX IF NOT EXISTS idx_je_tenant ON journal_entries(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_je_number ON journal_entries(journal_number);
          CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(journal_date DESC);
          CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
          
          -- Journal Entry Lines
          CREATE TABLE IF NOT EXISTS journal_entry_lines (
            line_id SERIAL PRIMARY KEY,
            journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(journal_entry_id) ON DELETE CASCADE,
            line_number INTEGER NOT NULL DEFAULT 1,
            account_code VARCHAR(50) NOT NULL,
            debit_amount DECIMAL(15,2) DEFAULT 0,
            credit_amount DECIMAL(15,2) DEFAULT 0,
            currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            description TEXT,
            is_reconciled BOOLEAN DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_jel_entry ON journal_entry_lines(journal_entry_id);
          CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_code);
        `);
        result = 'Financial Core tables (chart_of_accounts, journal_entries, journal_entry_lines) created successfully';
        break;
        
      case 'cash-management':
        // Use the SQL migration file which has the correct table names
        // In Docker: /app/database/migrations/...
        const sqlPath = path.join('/app', 'database', 'migrations', '010_cash_management_module.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        result = 'Cash Management tables created successfully from SQL migration';
        break;
      case 'cash-views':
        // Create comprehensive compatibility views for services
        // First drop existing objects
        const drops = [
          'DROP VIEW IF EXISTS bank_accounts CASCADE',
          'DROP VIEW IF EXISTS bank_statements CASCADE', 
          'DROP VIEW IF EXISTS bank_statement_lines CASCADE',
          'DROP VIEW IF EXISTS bank_reconciliation_rules CASCADE',
          'DROP TABLE IF EXISTS bank_accounts CASCADE',
          'DROP TABLE IF EXISTS bank_statements CASCADE',
          'DROP TABLE IF EXISTS bank_statement_lines CASCADE',
          'DROP TABLE IF EXISTS bank_reconciliation_rules CASCADE',
          'DROP TABLE IF EXISTS bank_reconciliation_matches CASCADE'
        ];
        for (const sql of drops) {
          try { await pool.query(sql); } catch (e) { /* ignore */ }
        }
        
        // Create bank_reconciliation_matches table (doesn't exist in SQL migration)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS bank_reconciliation_matches (
            id SERIAL PRIMARY KEY,
            tenant_id UUID NOT NULL,
            bank_statement_line_id INTEGER REFERENCES cash_bank_statement_lines(line_id),
            transaction_id INTEGER REFERENCES cash_transactions(transaction_id),
            match_type VARCHAR(50) DEFAULT 'MANUAL',
            matched_by UUID,
            statement_amount DECIMAL(15,2),
            transaction_amount DECIMAL(15,2),
            status VARCHAR(20) DEFAULT 'ACTIVE',
            notes TEXT,
            match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            unmatched_at TIMESTAMP,
            unmatched_by UUID,
            unmatch_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_tenant ON bank_reconciliation_matches(tenant_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_line ON bank_reconciliation_matches(bank_statement_line_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_txn ON bank_reconciliation_matches(transaction_id)');
        
        // Create views with proper column mappings
        await pool.query(`
          CREATE VIEW bank_accounts AS 
          SELECT 
            ba.account_id as id,
            ba.tenant_id,
            ba.bank_id,
            ba.bank_code,
            ba.account_name,
            ba.account_number,
            ba.account_type,
            ba.branch_code,
            ba.swift_code,
            ba.iban,
            ba.currency,
            ba.opening_balance,
            ba.current_balance,
            ba.available_balance,
            ba.overdraft_limit,
            ba.last_reconciled_date,
            ba.last_reconciled_balance,
            ba.unreconciled_count,
            ba.gl_account_code,
            ba.is_primary,
            ba.is_active,
            ba.requires_approval,
            ba.created_by,
            ba.created_at,
            ba.updated_by,
            ba.updated_at,
            COALESCE(cb.bank_name, 'Unknown Bank') as bank_name
          FROM cash_bank_accounts ba
          LEFT JOIN cash_banks cb ON ba.bank_id = cb.bank_id
        `);
        
        await pool.query(`
          CREATE VIEW bank_statements AS
          SELECT 
            statement_id as id,
            tenant_id,
            account_id as bank_account_id,
            statement_date,
            statement_number,
            period_from,
            period_to,
            opening_balance,
            closing_balance,
            total_debits,
            total_credits,
            status,
            reconciliation_date,
            reconciled_by,
            imported_date,
            imported_by,
            import_source,
            total_lines,
            matched_lines,
            unmatched_lines,
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM cash_bank_statements
        `);
        
        await pool.query(`
          CREATE VIEW bank_statement_lines AS
          SELECT 
            bsl.line_id as id,
            bs.tenant_id,
            bsl.statement_id,
            bsl.line_number,
            bsl.transaction_date,
            bsl.value_date,
            bsl.description,
            bsl.reference,
            bsl.cheque_number,
            bsl.debit_amount,
            bsl.credit_amount,
            COALESCE(bsl.credit_amount, 0) - COALESCE(bsl.debit_amount, 0) as amount,
            bsl.balance,
            bsl.is_matched,
            bsl.is_matched as reconciled,
            CASE WHEN bsl.is_matched THEN 'MATCHED' ELSE 'UNMATCHED' END as status,
            bsl.matched_transaction_id,
            bsl.match_confidence,
            bsl.match_date,
            bsl.matched_by,
            bsl.suggested_matches,
            bsl.auto_category,
            bsl.confirmed_category,
            bsl.raw_data,
            bsl.parsing_errors,
            bsl.created_at
          FROM cash_bank_statement_lines bsl
          JOIN cash_bank_statements bs ON bsl.statement_id = bs.statement_id
        `);
        
        await pool.query(`
          CREATE VIEW bank_reconciliation_rules AS
          SELECT 
            rule_id as id,
            tenant_id,
            rule_name,
            rule_description as description,
            is_active,
            priority,
            auto_gl_account as target_gl_account,
            auto_category as target_category,
            auto_approve,
            conditions,
            matches_count as match_count,
            last_matched as last_match_date,
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM cash_reconciliation_rules
        `);
        
        result = 'Comprehensive compatibility views and tables created successfully';
        break;
      
      case 'unlock-admin':
        // Reset login attempts for admin user
        await pool.query(`
          UPDATE users SET 
            login_attempts = 0, 
            locked_until = NULL,
            is_locked = false
          WHERE email = 'admin@siyabusaerp.co.za'
        `);
        result = 'Admin account unlocked successfully';
        break;
      
      case 'gl-integration':
        // Setup GL integration for Cash Management
        // 1. Add missing columns to cash_transactions
        await pool.query(`
          ALTER TABLE cash_transactions 
          ADD COLUMN IF NOT EXISTS posted_to_gl BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS journal_entry_id UUID,
          ADD COLUMN IF NOT EXISTS posted_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS posted_by UUID,
          ADD COLUMN IF NOT EXISTS gl_posting_error TEXT
        `);
        
        // 2. Ensure journal_entries table has needed columns
        await pool.query(`
          ALTER TABLE journal_entries 
          ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
          ADD COLUMN IF NOT EXISTS source_id VARCHAR(100),
          ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
          ADD COLUMN IF NOT EXISTS fiscal_period INTEGER
        `);
        
        // 3. Ensure journal_entry_lines table has needed columns
        await pool.query(`
          ALTER TABLE journal_entry_lines 
          ADD COLUMN IF NOT EXISTS line_number INTEGER DEFAULT 1
        `);
        
        // 4. Ensure chart_of_accounts has needed columns
        await pool.query(`
          ALTER TABLE chart_of_accounts 
          ADD COLUMN IF NOT EXISTS normal_balance VARCHAR(10) DEFAULT 'DEBIT',
          ADD COLUMN IF NOT EXISTS is_header BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS allow_manual_entry BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR',
          ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 0
        `);
        
        result = 'GL Integration columns added successfully';
        break;
        
      case 'seed-chart-of-accounts':
        // Seed South African standard Chart of Accounts for all tenants
        const tenantIdParam = req.body?.tenantId || 'd0a49212-96f5-46c7-9d69-fec0f235a90c';
        
        // South African Standard Chart of Accounts
        const accounts = [
          // ASSETS (1xxx)
          { code: '1000', name: 'Current Assets', type: 'ASSET', balance: 'DEBIT', header: true },
          { code: '1100', name: 'Bank Accounts', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1110', name: 'FNB Current Account', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1120', name: 'FNB Savings Account', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1130', name: 'ABSA Current Account', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1140', name: 'Standard Bank Account', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1150', name: 'Nedbank Account', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1160', name: 'Capitec Account', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1200', name: 'Accounts Receivable (Debtors)', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1300', name: 'Inventory', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1400', name: 'Prepaid Expenses', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1500', name: 'Fixed Assets', type: 'ASSET', balance: 'DEBIT', header: true },
          { code: '1510', name: 'Property, Plant & Equipment', type: 'ASSET', balance: 'DEBIT', header: false },
          { code: '1520', name: 'Accumulated Depreciation', type: 'ASSET', balance: 'CREDIT', header: false },
          { code: '1600', name: 'Intangible Assets', type: 'ASSET', balance: 'DEBIT', header: false },
          
          // LIABILITIES (2xxx)
          { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', balance: 'CREDIT', header: true },
          { code: '2100', name: 'Accounts Payable (Creditors)', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2200', name: 'PAYE Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2210', name: 'UIF Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2220', name: 'SDL Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2230', name: 'VAT Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2240', name: 'Provisional Tax Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2250', name: 'Salaries Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2300', name: 'Accrued Expenses', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2400', name: 'Unearned Revenue', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2500', name: 'Long-term Liabilities', type: 'LIABILITY', balance: 'CREDIT', header: true },
          { code: '2510', name: 'Bank Loans', type: 'LIABILITY', balance: 'CREDIT', header: false },
          { code: '2520', name: 'Mortgage Payable', type: 'LIABILITY', balance: 'CREDIT', header: false },
          
          // EQUITY (3xxx)
          { code: '3000', name: 'Equity', type: 'EQUITY', balance: 'CREDIT', header: true },
          { code: '3100', name: 'Share Capital', type: 'EQUITY', balance: 'CREDIT', header: false },
          { code: '3200', name: 'Retained Earnings', type: 'EQUITY', balance: 'CREDIT', header: false },
          { code: '3300', name: 'Current Year Profit/Loss', type: 'EQUITY', balance: 'CREDIT', header: false },
          { code: '3400', name: 'Drawings', type: 'EQUITY', balance: 'DEBIT', header: false },
          
          // REVENUE (4xxx)
          { code: '4000', name: 'Revenue', type: 'REVENUE', balance: 'CREDIT', header: true },
          { code: '4100', name: 'Sales Revenue', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4110', name: 'Service Revenue', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4120', name: 'Product Sales', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4200', name: 'Interest Income', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4300', name: 'Other Income', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4400', name: 'Salary/Wages Received', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4500', name: 'Commission Income', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4600', name: 'Rental Income', type: 'REVENUE', balance: 'CREDIT', header: false },
          { code: '4900', name: 'Discounts Received', type: 'REVENUE', balance: 'CREDIT', header: false },
          
          // COST OF SALES (5xxx)
          { code: '5000', name: 'Cost of Sales', type: 'EXPENSE', balance: 'DEBIT', header: true },
          { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '5200', name: 'Purchases', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '5300', name: 'Freight & Delivery', type: 'EXPENSE', balance: 'DEBIT', header: false },
          
          // OPERATING EXPENSES (6xxx)
          { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', balance: 'DEBIT', header: true },
          { code: '6100', name: 'Salaries & Wages Expense', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6110', name: 'Employee Benefits', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6120', name: 'Employer UIF Contributions', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6130', name: 'Employer SDL Contributions', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6200', name: 'Rent Expense', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6210', name: 'Utilities - Electricity', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6220', name: 'Utilities - Water', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6230', name: 'Utilities - Gas', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6300', name: 'Telephone & Internet', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6400', name: 'Insurance', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6500', name: 'Bank Charges', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6600', name: 'Professional Fees', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6610', name: 'Accounting Fees', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6620', name: 'Legal Fees', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6630', name: 'Consulting Fees', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6700', name: 'Office Expenses', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6710', name: 'Office Supplies', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6720', name: 'Printing & Stationery', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6800', name: 'Travel & Entertainment', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6810', name: 'Motor Vehicle Expenses', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6820', name: 'Meals & Entertainment', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '6900', name: 'Advertising & Marketing', type: 'EXPENSE', balance: 'DEBIT', header: false },
          
          // OTHER EXPENSES (7xxx)
          { code: '7000', name: 'Other Expenses', type: 'EXPENSE', balance: 'DEBIT', header: true },
          { code: '7100', name: 'General Expenses', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7200', name: 'Repairs & Maintenance', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7300', name: 'Depreciation Expense', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7400', name: 'Amortization Expense', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7500', name: 'Bad Debts', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7600', name: 'Interest Expense', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7700', name: 'Foreign Exchange Loss', type: 'EXPENSE', balance: 'DEBIT', header: false },
          { code: '7800', name: 'Tax Expense', type: 'EXPENSE', balance: 'DEBIT', header: false },
          
          // SUSPENSE (9xxx)
          { code: '9000', name: 'Suspense Accounts', type: 'EXPENSE', balance: 'DEBIT', header: true },
          { code: '9999', name: 'Uncategorized - Review Required', type: 'EXPENSE', balance: 'DEBIT', header: false },
        ];
        
        for (const acc of accounts) {
          await pool.query(`
            INSERT INTO chart_of_accounts (
              tenant_id, code, name, account_type, 
              normal_balance, is_header, account_level, is_active,
              allows_manual_entries, is_system_account, currency,
              current_balance
            ) VALUES ($1, $2, $3, $4, $5, $6, 1, true, true, false, 'ZAR', 0)
            ON CONFLICT (code) DO NOTHING
          `, [tenantIdParam, acc.code, acc.name, acc.type, acc.balance, acc.header]);
        }
        
        const countResult = await pool.query(
          'SELECT COUNT(*) FROM chart_of_accounts WHERE tenant_id = $1',
          [tenantIdParam]
        );
        
        result = `Chart of Accounts seeded successfully. Total accounts: ${countResult.rows[0].count}`;
        break;
        
      default:
        return res.status(400).json({ success: false, error: `Unknown module: ${module}` });
    }
    res.json({ success: true, message: result });
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Intentional error route for local testing of the error handler (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-error', () => {
    throw new Error('Intentional test error');
  });
}

// Swagger/OpenAPI docs for Logistics module
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Versioning (GAP-014)
const v1Router = express.Router();

// API Routes
// Authentication (public routes with strict rate limiting)
v1Router.use('/auth', authLimiter, authRoutes);

// Onboarding routes (protected with API rate limiting)
v1Router.use('/onboarding', apiLimiter, onboardingRoutes);

// Module discovery routes (backend-driven UI)
v1Router.use('/modules', apiLimiter, modulesRoutes);

// Email preferences routes (mixed public/protected with API rate limiting)
v1Router.use('/email-preferences', apiLimiter, emailPreferencesRoutes);

// Email queue admin routes (protected with admin rate limiting) - DISABLED - uses Bull/Redis
// v1Router.use('/admin/email-queue', adminLimiter, emailQueueRoutes);

// Tenant settings routes (protected with API rate limiting)
v1Router.use('/tenant', apiLimiter, tenantSettingsRoutes);

// Payment routes (public and protected with API rate limiting)
// TEMPORARILY DISABLED - Missing Stripe API keys
// v1Router.use('/payment', apiLimiter, paymentRoutes);

// Subscription routes (protected with API rate limiting)
// TEMPORARILY DISABLED - Depends on payment routes
// v1Router.use('/subscription', apiLimiter, subscriptionRoutes);

// Webhook routes (public, no auth - for payment gateway callbacks with webhook rate limiting)
// TEMPORARILY DISABLED - Depends on payment services
// v1Router.use('/webhooks', webhookLimiter, webhookRoutes);

// Super Admin routes (protected by super admin auth with admin rate limiting)
v1Router.use('/admin', adminLimiter, superAdminRoutes);

// Admin routes (user management, roles, permissions, settings)
v1Router.use('/admin', adminLimiter, adminRoutes);

// Demo routes (with demo rate limiting) - DISABLED - causes Bull/Redis initialization
// v1Router.use('/demo', demoLimiter, demoResetRoutes);

// Protected module routes (with API rate limiting)
v1Router.use('/inventory', apiLimiter, inventoryRoutes);
v1Router.use('/sales', apiLimiter, salesRoutes);
v1Router.use('/purchase', apiLimiter, purchaseRoutes);
v1Router.use('/financial', apiLimiter, financialRoutes);
v1Router.use('/financial/dimensions', dimensionsRoutes);
v1Router.use('/financial/periods', periodRoutes);
v1Router.use(
  '/financial/dashboard',
  createCacheMiddleware({ prefix: 'financial:dashboard', ttlSeconds: 60 }),
  dashboardRoutes
);
v1Router.use('/financial/approvals', approvalRoutes);
v1Router.use('/hr', hrRoutes);
v1Router.use('/manufacturing', manufacturingRoutes);
v1Router.use('/warehouse', warehouseRoutes);
v1Router.use('/sars-sentinel', sarsSentinelRoutes);
v1Router.use('/cash-management', cashManagementRoutes);
// Old financial reports routes - replaced by new module routes below
// v1Router.use('/financial/reports', financialReportsRoutes);
v1Router.use('/financial/recurring-entries', recurringEntriesRoutes);
v1Router.use('/financial/import-entries', importEntriesRoutes);
v1Router.use('/financial/gl-explorer', glExplorerRoutes);
v1Router.use('/financial/audit-trail', auditTrailRoutes);
v1Router.use('/financial/tax-settings', taxSettingsRoutes);
v1Router.use('/financial/forecasting', financialForecastingRoutes);
v1Router.use('/financial/custom-reports', customReportsRoutes);
v1Router.use('/practice', practiceRoutes);
v1Router.use('/assets', assetsRoutes); // Legacy Asset Management routes (workspace, old controllers)
v1Router.use(
  '/logistics',
  authenticateToken,
  tenantMiddleware,
  apiLimiter,
  auditMiddleware({ entityType: 'logistics' }),
  logisticsRoutes
); // Logistics routes (RBAC protected + Audit)
v1Router.use('/audit-log', apiLimiter, auditLogRoutes); // Audit Log API (SOX compliance)
v1Router.use('/compliance', apiLimiter, complianceRoutes); // Compliance & Governance
v1Router.use('/audit', apiLimiter, auditReadyRoutes); // Audit-Ready Suite
v1Router.use('/reports', apiLimiter, reportsRoutes); // Reports & Analytics
v1Router.use('/ai', apiLimiter, aiAssistantRoutes); // AI Agents & Assistants
v1Router.use('/agent', agentRoutes); // Actionable AI Agent (can create invoices, etc.)
v1Router.use('/entities', apiLimiter, multiEntityRoutes); // Multi-Entity Management
v1Router.use('/healthcare', apiLimiter, healthcareRoutes); // Healthcare Operations Intelligence
v1Router.use('/super-admin', apiLimiter, superadminRoutes); // Super Admin & Multi-Tenant Support Portal
v1Router.use('/chart-of-accounts', apiLimiter, chartOfAccountsRoutes); // Chart of Accounts
// New Financial Reports Module - Trial Balance, P&L, Balance Sheet
v1Router.use('/financial', apiLimiter, financialReportsRoutes2); // Financial Reporting API
v1Router.use('/invoices/sales', apiLimiter, salesInvoiceRoutes); // Sales Invoice API
v1Router.use('/purchases', apiLimiter, purchaseInvoiceRoutes); // Purchase Invoice API
v1Router.use('/asset-management', apiLimiter, assetManagementRoutes); // Asset Management API
v1Router.use('/messages', apiLimiter, messagesRoutes); // Driver-Dispatch Messaging
v1Router.use('/delivery', apiLimiter, deliveryRoutes); // Delivery Verification & POD
v1Router.use('/meetings', apiLimiter, meetingsRoutes); // Video Conferencing (Daily.co)

// NEW API ROUTES - December 2025
v1Router.use('/projects', apiLimiter, projectsRoutes); // Project Management API
v1Router.use('/proposals', apiLimiter, proposalsRoutes); // Proposals & Quotes API
v1Router.use('/communications', apiLimiter, communicationsRoutes); // Communications Hub API
v1Router.use('/calendar', apiLimiter, calendarRoutes); // Calendar & Events API
v1Router.use('/mining', apiLimiter, miningRoutes); // Mining Industry API
v1Router.use('/agriculture', apiLimiter, agricultureRoutes); // Agriculture Industry API
v1Router.use('/construction', apiLimiter, constructionRoutes); // Construction Industry API
v1Router.use('/property', apiLimiter, propertyRoutes); // Property Management API

// V2 Routes - Tenant-Hardened API (multi-tenant secure)
// These routes use v2 controllers with proper tenant isolation
v1Router.use('/v2', apiLimiter, v2Routes);

// Mount v1 router
app.use('/api/v1', v1Router);
// Backward compatibility
app.use('/api', v1Router);

// Error handling middleware
// Error handling middleware
app.use(errorHandler);

// Initialize WebSocket gateway (GAP-010)
initializeLogisticsGateway(httpServer);

// Listen on all interfaces (0.0.0.0) to accept external connections
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Accepting connections on all interfaces (0.0.0.0:${PORT})`);
  console.log(`📊 ERP System initialized`);
  console.log(`🔌 Socket.IO gateway active at /logistics-ws`);
  
  // Initialize demo tenant auto-reset cron job (DISABLED - Redis not configured)
  // DemoResetService.initializeCronJob();
  // console.log(`🔄 Demo reset service initialized - Daily reset at 2:00 AM`);
  console.log(`⚠️  Demo reset service disabled (Redis not configured)`);
});

export default app;

