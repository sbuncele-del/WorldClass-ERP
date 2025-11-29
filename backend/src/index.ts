import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
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
import manufacturingRoutes from './routes/manufacturing.routes';
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
import reportsRoutes from './routes/reports.routes';
import treasuryRoutes from './routes/treasury.routes';
import aiAssistantRoutes from './routes/ai-assistant.routes';
import multiEntityRoutes from './routes/multi-entity.routes';
import healthcareRoutes from './routes/healthcare.routes';
import superadminRoutes from './routes/superadmin.routes';
import modulesRoutes from './routes/modules.routes';
import DemoResetService from './services/demo-reset.service';
import { securityHeaders, securityLogger } from './middleware/security';
import { apiLimiter, authLimiter, adminLimiter, webhookLimiter, demoLimiter } from './middleware/rateLimiter';
import logisticsRoutes from './modules/logistics/logistics.routes';
// import gpsRoutes from './modules/logistics/gps.routes'; // May have issues
import chartOfAccountsRoutes from './modules/chart-of-accounts/routes';
import financialReportsRoutes2 from './modules/financial-reports/routes';
import salesInvoiceRoutes from './modules/sales/routes';
import purchaseInvoiceRoutes from './modules/purchases/routes';
import assetManagementRoutes from './modules/assets/routes';

// Load environment variables with explicit path
dotenv.config({ path: __dirname + '/../.env' });

// Disable TLS certificate validation for AWS RDS (self-signed cert issue)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// DEBUG: Log database connection info
console.log('=== ENVIRONMENT DEBUG ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? `${process.env.JWT_SECRET.substring(0, 20)}...` : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
console.log('========================');

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy - required for rate limiting behind nginx
app.set('trust proxy', 1);

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

// API Routes
// Authentication (public routes with strict rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// Onboarding routes (protected with API rate limiting)
app.use('/api/onboarding', apiLimiter, onboardingRoutes);

// Module discovery routes (backend-driven UI)
app.use('/api/modules', apiLimiter, modulesRoutes);

// Email preferences routes (mixed public/protected with API rate limiting)
app.use('/api/email-preferences', apiLimiter, emailPreferencesRoutes);

// Email queue admin routes (protected with admin rate limiting) - DISABLED - uses Bull/Redis
// app.use('/api/admin/email-queue', adminLimiter, emailQueueRoutes);

// Tenant settings routes (protected with API rate limiting)
app.use('/api/tenant', apiLimiter, tenantSettingsRoutes);

// Payment routes (public and protected with API rate limiting)
// TEMPORARILY DISABLED - Missing Stripe API keys
// app.use('/api/payment', apiLimiter, paymentRoutes);

// Subscription routes (protected with API rate limiting)
// TEMPORARILY DISABLED - Depends on payment routes
// app.use('/api/subscription', apiLimiter, subscriptionRoutes);

// Webhook routes (public, no auth - for payment gateway callbacks with webhook rate limiting)
// TEMPORARILY DISABLED - Depends on payment services
// app.use('/api/webhooks', webhookLimiter, webhookRoutes);

// Super Admin routes (protected by super admin auth with admin rate limiting)
app.use('/api/admin', adminLimiter, superAdminRoutes);

// Admin routes (user management, roles, permissions, settings)
app.use('/api/admin', adminLimiter, adminRoutes);

// Demo routes (with demo rate limiting) - DISABLED - causes Bull/Redis initialization
// app.use('/api/demo', demoLimiter, demoResetRoutes);

// Protected module routes (with API rate limiting)
app.use('/api/inventory', apiLimiter, inventoryRoutes);
app.use('/api/sales', apiLimiter, salesRoutes);
app.use('/api/purchase', apiLimiter, purchaseRoutes);
app.use('/api/financial', apiLimiter, financialRoutes);
app.use('/api/financial/dimensions', dimensionsRoutes);
app.use('/api/financial/periods', periodRoutes);
app.use('/api/financial/dashboard', dashboardRoutes);
app.use('/api/financial/approvals', approvalRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/sars-sentinel', sarsSentinelRoutes);
app.use('/api/cash-management', cashManagementRoutes);
// Old financial reports routes - replaced by new module routes below
// app.use('/api/financial/reports', financialReportsRoutes);
app.use('/api/financial/recurring-entries', recurringEntriesRoutes);
app.use('/api/financial/import-entries', importEntriesRoutes);
app.use('/api/financial/gl-explorer', glExplorerRoutes);
app.use('/api/financial/audit-trail', auditTrailRoutes);
app.use('/api/financial/tax-settings', taxSettingsRoutes);
app.use('/api/financial/forecasting', financialForecastingRoutes);
app.use('/api/financial/custom-reports', customReportsRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/assets', assetsRoutes); // Legacy Asset Management routes (workspace, old controllers)
app.use('/api/logistics', logisticsRoutes); // Logistics routes
app.use('/api/compliance', apiLimiter, complianceRoutes); // Compliance & Governance
app.use('/api/audit', apiLimiter, auditReadyRoutes); // Audit-Ready Suite
app.use('/api/reports', apiLimiter, reportsRoutes); // Reports & Analytics
app.use('/api/ai', apiLimiter, aiAssistantRoutes); // AI Agents & Assistants
app.use('/api/entities', apiLimiter, multiEntityRoutes); // Multi-Entity Management
app.use('/api/healthcare', apiLimiter, healthcareRoutes); // Healthcare Operations Intelligence
app.use('/api/super-admin', apiLimiter, superadminRoutes); // Super Admin & Multi-Tenant Support Portal
app.use('/api/chart-of-accounts', apiLimiter, chartOfAccountsRoutes); // Chart of Accounts
// New Financial Reports Module - Trial Balance, P&L, Balance Sheet
app.use('/api/financial', apiLimiter, financialReportsRoutes2); // Financial Reporting API
app.use('/api/invoices/sales', apiLimiter, salesInvoiceRoutes); // Sales Invoice API
app.use('/api/purchases', apiLimiter, purchaseInvoiceRoutes); // Purchase Invoice API
app.use('/api/asset-management', apiLimiter, assetManagementRoutes); // Asset Management API

// Error handling middleware
// Error handling middleware
app.use(errorHandler);

// Listen on all interfaces (0.0.0.0) to accept external connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Accepting connections on all interfaces (0.0.0.0:${PORT})`);
  console.log(`📊 ERP System initialized`);
  
  // Initialize demo tenant auto-reset cron job (DISABLED - Redis not configured)
  // DemoResetService.initializeCronJob();
  // console.log(`🔄 Demo reset service initialized - Daily reset at 2:00 AM`);
  console.log(`⚠️  Demo reset service disabled (Redis not configured)`);
});

export default app;

