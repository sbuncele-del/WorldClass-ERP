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

