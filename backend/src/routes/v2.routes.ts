/**
 * V2 Routes - Tenant-Hardened API Routes
 * 
 * Consolidated route definitions for all v2 controllers.
 * All routes require tenant authentication and are multi-tenant secure.
 */

import { Router } from 'express';
import { tenantMiddleware } from '../middleware/tenant';

// Financial Reporting Controllers (use default exports)
import BalanceSheetControllerV2 from '../controllers/balance-sheet.controller.v2';
import IncomeStatementControllerV2 from '../controllers/income-statement.controller.v2';
import CashFlowControllerV2 from '../controllers/cash-flow.controller.v2';
import GLExplorerControllerV2 from '../controllers/gl-explorer.controller.v2';
import ReportsControllerV2 from '../controllers/reports.controller.v2';
import CustomReportsControllerV2 from '../controllers/custom-reports.controller.v2';
import RecurringEntriesControllerV2 from '../controllers/recurring-entries.controller.v2';
import ImportEntriesControllerV2 from '../controllers/import-entries.controller.v2';
import DashboardControllerV2 from '../controllers/dashboard.controller.v2';

// Admin & Profile Controllers
import AdminControllerV2 from '../controllers/admin.controller.v2';
import ProfileControllerV2 from '../controllers/profile.controller.v2';
import AuditTrailControllerV2 from '../controllers/audit-trail.controller.v2';

// Operations Controllers - named exports
import * as InventoryV2 from '../controllers/inventory.controller.v2';
import * as SalesV2 from '../controllers/sales.controller.v2';
import * as PurchaseV2 from '../controllers/purchase.controller.v2';
import AssetsControllerV2 from '../controllers/assets.controller.v2';
import * as ApprovalV2 from '../controllers/approval.controller.v2';

// Module Controllers (use default exports)
import LogisticsControllerV2 from '../modules/logistics/logistics.controller.v2';
import ManufacturingControllerV2 from '../modules/manufacturing/controllers/manufacturing.controller.v2';
import * as HRV2 from '../modules/hr/controllers/hr.controller.v2';
import ComplianceControllerV2 from '../modules/compliance/compliance.controller.v2';
import SARSSentinelControllerV2 from '../modules/compliance/sars-sentinel.controller.v2';
import TreasuryControllerV2 from '../modules/financial/treasury.controller.v2';
import * as FinancialV2 from '../modules/financial/controllers/financial.controller.v2';

// Practice Controllers (use named exports)
import * as ProjectsV2 from '../controllers/practice/projects.controller.v2';
import * as TasksV2 from '../controllers/practice/tasks.controller.v2';
import * as TimeTrackingV2 from '../controllers/practice/time-tracking.controller.v2';
import * as ClientHealthV2 from '../controllers/practice/client-health.controller.v2';

// Industry Vertical Controllers
import AgricultureControllerV2 from '../controllers/agriculture.controller.v2';
import MiningControllerV2 from '../controllers/mining.controller.v2';
import ConstructionControllerV2 from '../controllers/construction.controller.v2';
import PropertyControllerV2 from '../controllers/property.controller.v2';
import CommunicationsControllerV2 from '../controllers/communications.controller.v2';
import ProposalsControllerV2 from '../controllers/proposals.controller.v2';

// Payment & Subscription Controllers
import PaymentControllerV2 from '../controllers/payment.controller.v2';
import SubscriptionControllerV2 from '../controllers/subscription.controller.v2';
import TaxSettingsControllerV2 from '../controllers/tax-settings.controller.v2';
import TenantSettingsControllerV2 from '../controllers/tenant-settings.controller.v2';
import MultiEntityControllerV2 from '../controllers/multi-entity.controller.v2';
import ForecastingControllerV2 from '../controllers/forecasting.controller.v2';

// AI & Specialized Controllers
import AIAssistantControllerV2 from '../controllers/ai-assistant.controller.v2';
import SalesLiveControllerV2 from '../controllers/sales-live.controller.v2';
import HealthcareControllerV2 from '../controllers/healthcare.controller.v2';
import OnboardingControllerV2 from '../controllers/onboarding.controller.v2';

// Audit & Admin Controllers
import AuditReadyControllerV2 from '../controllers/audit-ready.controller.v2';
import EmailPreferencesControllerV2 from '../controllers/email-preferences.controller.v2';
import EmailQueueControllerV2 from '../controllers/email-queue.controller.v2';
import ModuleManagementControllerV2 from '../controllers/module-management.controller.v2';

// Compliance, Auth & Treasury Controllers (V2)
import * as ComplianceV2 from '../controllers/v2/compliance.controller.v2';
import * as EmailVerificationV2 from '../controllers/v2/email-verification.controller.v2';
import * as PasswordResetV2 from '../controllers/v2/password-reset.controller.v2';
import * as SARSSentinelV2 from '../controllers/v2/sars-sentinel.controller.v2';
import * as TreasuryV2 from '../controllers/v2/treasury.controller.v2';

// V2 Subdirectory Controllers (newly wired)
import * as AgentV2 from '../controllers/v2/agent.controller.v2';
import * as AIChatV2 from '../controllers/v2/ai-chat.controller.v2';
import * as DeliveryV2 from '../controllers/v2/delivery.controller.v2';
import * as FinancialForecastingV2 from '../controllers/v2/financial-forecasting.controller.v2';
import * as LogisticsFuelV2 from '../controllers/v2/logistics-fuel.controller.v2';
import * as LogisticsTrackingV2 from '../controllers/v2/logistics-tracking.controller.v2';
import * as LogisticsTripsV2 from '../controllers/v2/logistics-trips.controller.v2';
import * as MeetingsV2 from '../controllers/v2/meetings.controller.v2';
import * as MessagesV2 from '../controllers/v2/messages.controller.v2';
import * as ProjectsModuleV2 from '../controllers/v2/projects.controller.v2';
import * as RoutesIncidentsGeofencesV2 from '../controllers/v2/routes-incidents-geofences.controller.v2';

const router = Router();

// Apply tenant middleware to all v2 routes
router.use(tenantMiddleware);

// ============================================================================
// DASHBOARD
// ============================================================================
router.get('/dashboard/stats', DashboardControllerV2.getDashboardStats);
router.get('/dashboard/revenue-trend', DashboardControllerV2.getRevenueTrend);
router.get('/dashboard/expense-breakdown', DashboardControllerV2.getExpenseBreakdown);
router.get('/dashboard/recent-entries', DashboardControllerV2.getRecentEntries);
router.get('/dashboard/cash-position', DashboardControllerV2.getCashPosition);
router.get('/dashboard/aging-summary', DashboardControllerV2.getAgingSummary);
router.get('/dashboard/kpis', DashboardControllerV2.getKPIs);

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================
router.get('/financial/reports/balance-sheet', BalanceSheetControllerV2.generateBalanceSheet);
router.get('/financial/reports/trial-balance', BalanceSheetControllerV2.getTrialBalance);
router.post('/financial/reports/balance-sheet/export', BalanceSheetControllerV2.exportToPDF);

router.get('/financial/reports/income-statement', IncomeStatementControllerV2.generateIncomeStatement);
router.get('/financial/reports/revenue-breakdown', IncomeStatementControllerV2.getRevenueBreakdown);
router.get('/financial/reports/expense-breakdown', IncomeStatementControllerV2.getExpenseBreakdown);
router.post('/financial/reports/income-statement/export', IncomeStatementControllerV2.exportToPDF);

router.get('/financial/reports/cash-flow', CashFlowControllerV2.generateCashFlowStatement);
router.get('/financial/reports/cash-position', CashFlowControllerV2.getCashPosition);
router.post('/financial/reports/cash-flow/export', CashFlowControllerV2.exportToPDF);

// ============================================================================
// GL EXPLORER
// ============================================================================
router.get('/financial/gl-explorer/search', GLExplorerControllerV2.search);
router.get('/financial/gl-explorer/account-summary', GLExplorerControllerV2.getAccountSummary);
router.get('/financial/gl-explorer/account-ledger/:accountCode', GLExplorerControllerV2.getAccountLedger);
router.get('/financial/gl-explorer/filter-options', GLExplorerControllerV2.getFilterOptions);
router.post('/financial/gl-explorer/export', GLExplorerControllerV2.exportResults);

// ============================================================================
// RECURRING ENTRIES
// ============================================================================
router.get('/financial/recurring-entries', RecurringEntriesControllerV2.getRecurringEntries);
router.get('/financial/recurring-entries/pending', RecurringEntriesControllerV2.getPendingEntries);
router.get('/financial/recurring-entries/:id', RecurringEntriesControllerV2.getRecurringEntryById);
router.post('/financial/recurring-entries', RecurringEntriesControllerV2.createRecurringEntry);
router.put('/financial/recurring-entries/:id', RecurringEntriesControllerV2.updateRecurringEntry);
router.delete('/financial/recurring-entries/:id', RecurringEntriesControllerV2.deleteRecurringEntry);
router.post('/financial/recurring-entries/:id/generate', RecurringEntriesControllerV2.generateEntry);

// ============================================================================
// IMPORT ENTRIES
// ============================================================================
router.post('/financial/import-entries/validate', ImportEntriesControllerV2.validateImport);
router.post('/financial/import-entries/execute', ImportEntriesControllerV2.executeImport);
router.get('/financial/import-entries/templates', ImportEntriesControllerV2.getImportTemplates);
router.post('/financial/import-entries/templates', ImportEntriesControllerV2.saveImportTemplate);
router.get('/financial/import-entries/history', ImportEntriesControllerV2.getImportHistory);
router.get('/financial/import-entries/sample', ImportEntriesControllerV2.downloadSample);

// ============================================================================
// FINANCIAL CORE (Chart of Accounts, Journal Entries, Fiscal Periods)
// ============================================================================
router.get('/financial/dashboard', FinancialV2.getDashboard);
router.get('/financial/chart-of-accounts', FinancialV2.getChartOfAccounts);
router.get('/financial/journal-entries', FinancialV2.listJournalEntries);
router.get('/financial/fiscal-periods', FinancialV2.getFiscalPeriods);
router.get('/reports/balance-sheet', BalanceSheetControllerV2.generateBalanceSheet);
router.get('/reports/income-statement', IncomeStatementControllerV2.generateIncomeStatement);
router.get('/reports/cash-flow', CashFlowControllerV2.generateCashFlowStatement);

// ============================================================================
// REPORTS
// ============================================================================
router.get('/reports/definitions', ReportsControllerV2.getReportDefinitions);
router.get('/reports/definitions/:id', ReportsControllerV2.getReportDefinitionById);
router.post('/reports/definitions', ReportsControllerV2.createReportDefinition);
router.post('/reports/execute/:id', ReportsControllerV2.executeReport);
router.get('/reports/history', ReportsControllerV2.getExecutionHistory);
router.post('/reports/schedule', ReportsControllerV2.scheduleReport);
router.get('/reports/schedules', ReportsControllerV2.getScheduledReports);
router.delete('/reports/schedules/:id', ReportsControllerV2.deleteSchedule);

// ============================================================================
// CUSTOM REPORTS
// ============================================================================
router.get('/custom-reports/templates', CustomReportsControllerV2.getReportTemplates);
router.get('/custom-reports/templates/:id', CustomReportsControllerV2.getReportTemplateById);
router.post('/custom-reports/templates', CustomReportsControllerV2.createReportTemplate);
router.put('/custom-reports/templates/:id', CustomReportsControllerV2.updateReportTemplate);
router.delete('/custom-reports/templates/:id', CustomReportsControllerV2.deleteReportTemplate);
router.post('/custom-reports/run/:id', CustomReportsControllerV2.runReport);
router.get('/custom-reports/categories', CustomReportsControllerV2.getCategories);

// ============================================================================
// TREASURY
// ============================================================================
router.get('/treasury/cash-positions', TreasuryControllerV2.getCashPositions);
router.get('/treasury/forecasts', TreasuryControllerV2.getCashForecasts);
router.post('/treasury/forecasts', TreasuryControllerV2.createCashForecast);
router.get('/treasury/intercompany-transfers', TreasuryControllerV2.getIntercompanyTransfers);
router.post('/treasury/intercompany-transfers', TreasuryControllerV2.createIntercompanyTransfer);
router.get('/treasury/dashboard', TreasuryControllerV2.getTreasuryDashboard);

// ============================================================================
// ADMIN
// ============================================================================
router.get('/admin/users', AdminControllerV2.getAllUsers);
router.get('/admin/users/:id', AdminControllerV2.getUserById);
router.post('/admin/users', AdminControllerV2.createUser);
router.post('/admin/users/invite', AdminControllerV2.inviteUser);
router.post('/admin/users/accept-invite', AdminControllerV2.acceptInvitation);
router.post('/admin/users/:id/resend-invite', AdminControllerV2.resendInvitation);
router.put('/admin/users/:id', AdminControllerV2.updateUser);
router.delete('/admin/users/:id', AdminControllerV2.deleteUser);
router.get('/admin/roles', AdminControllerV2.getRoles);
router.post('/admin/roles', AdminControllerV2.createRole);
router.get('/admin/audit-log', AdminControllerV2.getAuditLog);
router.get('/admin/settings', AdminControllerV2.getSettings);
router.put('/admin/settings', AdminControllerV2.updateSettings);
router.get('/admin/modules', ModuleManagementControllerV2.getModules);

// ============================================================================
// PROFILE
// ============================================================================
router.get('/profile', ProfileControllerV2.getProfile);
router.put('/profile', ProfileControllerV2.updateProfile);
router.put('/profile/password', ProfileControllerV2.changePassword);
router.put('/profile/avatar', ProfileControllerV2.updateAvatar);
router.get('/profile/preferences', ProfileControllerV2.getPreferences);
router.put('/profile/preferences', ProfileControllerV2.updatePreferences);
router.get('/profile/notifications', ProfileControllerV2.getNotificationSettings);
router.put('/profile/notifications', ProfileControllerV2.updateNotificationSettings);
router.get('/profile/sessions', ProfileControllerV2.getSessions);
router.delete('/profile/sessions/:sessionId', ProfileControllerV2.terminateSession);

// ============================================================================
// AUDIT TRAIL
// ============================================================================
router.get('/audit/trail', AuditTrailControllerV2.getAuditTrail);
router.get('/audit/entity/:type/:id', AuditTrailControllerV2.getEntityHistory);
router.get('/audit/user-activity/:userId', AuditTrailControllerV2.getUserActivity);
router.get('/audit/summary', AuditTrailControllerV2.getAuditSummary);
router.post('/audit/export', AuditTrailControllerV2.exportAuditTrail);
router.post('/audit/log', AuditTrailControllerV2.logAuditEntry);
router.get('/audit/compare/:id', AuditTrailControllerV2.getChangeComparison);

// ============================================================================
// INVENTORY
// ============================================================================
router.get('/inventory/items', InventoryV2.getItems);
router.get('/inventory/items/:id', InventoryV2.getItem);
router.post('/inventory/items', InventoryV2.createItem);
router.put('/inventory/items/:id', InventoryV2.updateItem);
router.delete('/inventory/items/:id', InventoryV2.deleteItem);
router.get('/inventory/categories', InventoryV2.getItemCategories);
router.get('/inventory/categories/tree', InventoryV2.getItemCategoryTree);
router.get('/inventory/categories/:id', InventoryV2.getItemCategory);
router.post('/inventory/categories', InventoryV2.createItemCategory);
router.put('/inventory/categories/:id', InventoryV2.updateItemCategory);
router.delete('/inventory/categories/:id', InventoryV2.deleteItemCategory);
router.get('/inventory/low-stock', InventoryV2.getLowStockItems);
router.get('/inventory/stock-levels', InventoryV2.getStockLevels);
router.get('/inventory/stock-movements', InventoryV2.getStockMovements);
router.get('/inventory/dashboard', InventoryV2.getInventoryDashboard);
router.get('/inventory/warehouses', InventoryV2.getWarehouses);
router.get('/inventory/warehouses/:id', InventoryV2.getWarehouse);
router.post('/inventory/warehouses', InventoryV2.createWarehouse);

// ============================================================================
// SALES
// ============================================================================
router.get('/sales/customers', SalesV2.getCustomers);
router.get('/sales/customers/:id', SalesV2.getCustomer);
router.post('/sales/customers', SalesV2.createCustomer);
router.put('/sales/customers/:id', SalesV2.updateCustomer);
router.delete('/sales/customers/:id', SalesV2.deleteCustomer);
router.get('/sales/customers/:id/orders', SalesV2.getCustomerOrders);
router.get('/sales/customers/:id/invoices', SalesV2.getCustomerInvoices);
router.get('/sales/orders', SalesV2.getSalesOrders);
router.get('/sales/orders/:id', SalesV2.getSalesOrder);
router.post('/sales/orders', SalesV2.createSalesOrder);
router.put('/sales/orders/:id', SalesV2.updateSalesOrder);
router.post('/sales/orders/:id/confirm', SalesV2.confirmSalesOrder);
router.post('/sales/orders/:id/cancel', SalesV2.cancelSalesOrder);
router.get('/sales/invoices', SalesV2.getInvoices);
router.get('/sales/invoices/:id', SalesV2.getInvoice);
// GL Posting - Sales Invoice Integration
router.post('/sales/invoices/:id/post-to-gl', SalesV2.postInvoiceToGL);
router.get('/sales/invoices/:id/gl-status', SalesV2.getInvoiceGLStatus);
router.post('/sales/invoices/:id/record-payment', SalesV2.recordPaymentReceived);
// Leads
router.get('/sales/leads', SalesV2.getLeads);
router.get('/sales/leads/:id', SalesV2.getLeadById);
router.post('/sales/leads', SalesV2.createLead);
router.put('/sales/leads/:id', SalesV2.updateLead);
router.delete('/sales/leads/:id', SalesV2.deleteLead);
router.post('/sales/leads/:id/convert', SalesV2.convertLeadToOpportunity);
// Opportunities
router.get('/sales/opportunities', SalesV2.getOpportunities);
router.get('/sales/opportunities/:id', SalesV2.getOpportunityById);
router.post('/sales/opportunities', SalesV2.createOpportunity);
router.put('/sales/opportunities/:id', SalesV2.updateOpportunity);
router.delete('/sales/opportunities/:id', SalesV2.deleteOpportunity);
// Quotations
router.get('/sales/quotations', SalesV2.getQuotations);
router.get('/sales/quotations/:id', SalesV2.getQuotation);
router.post('/sales/quotations', SalesV2.createQuotation);
router.put('/sales/quotations/:id', SalesV2.updateQuotation);
router.delete('/sales/quotations/:id', SalesV2.deleteQuotation);
router.post('/sales/quotations/:id/convert', SalesV2.convertQuotationToOrder);
// Dashboard & Pipeline
router.get('/sales/dashboard', SalesV2.getSalesDashboard);
router.get('/sales/pipeline', SalesV2.getOpportunities);

// ============================================================================
// PURCHASE
// ============================================================================
// Suppliers
router.get('/purchase/suppliers', PurchaseV2.getSuppliers);
router.get('/purchase/suppliers/:id', PurchaseV2.getSupplier);
router.post('/purchase/suppliers', PurchaseV2.createSupplier);
router.put('/purchase/suppliers/:id', PurchaseV2.updateSupplier);
router.delete('/purchase/suppliers/:id', PurchaseV2.deleteSupplier);
// Vendors (Aliases for Suppliers)
router.get('/purchase/vendors', PurchaseV2.getSuppliers);
router.get('/purchase/vendors/:id', PurchaseV2.getSupplier);
router.post('/purchase/vendors', PurchaseV2.createSupplier);
router.put('/purchase/vendors/:id', PurchaseV2.updateSupplier);
router.delete('/purchase/vendors/:id', PurchaseV2.deleteSupplier);
// Requisitions
router.get('/purchase/requisitions', PurchaseV2.getRequisitions);
router.get('/purchase/requisitions/:id', PurchaseV2.getRequisition);
router.post('/purchase/requisitions', PurchaseV2.createRequisition);
router.put('/purchase/requisitions/:id', PurchaseV2.updateRequisition);
router.delete('/purchase/requisitions/:id', PurchaseV2.deleteRequisition);
router.post('/purchase/requisitions/:id/approve', PurchaseV2.approveRequisition);
router.post('/purchase/requisitions/:id/reject', PurchaseV2.rejectRequisition);
// Purchase Orders
router.get('/purchase/orders', PurchaseV2.getPurchaseOrders);
router.get('/purchase/orders/:id', PurchaseV2.getPurchaseOrder);
router.post('/purchase/orders', PurchaseV2.createPurchaseOrder);
router.put('/purchase/orders/:id', PurchaseV2.updatePurchaseOrder);
router.post('/purchase/orders/:id/send', PurchaseV2.sendPurchaseOrder);
router.post('/purchase/orders/:id/acknowledge', PurchaseV2.acknowledgePurchaseOrder);
router.post('/purchase/orders/:id/cancel', PurchaseV2.cancelPurchaseOrder);
// Purchase Orders (alternate path)
router.get('/purchase/purchase-orders', PurchaseV2.getPurchaseOrders);
router.get('/purchase/purchase-orders/:id', PurchaseV2.getPurchaseOrder);
router.post('/purchase/purchase-orders', PurchaseV2.createPurchaseOrder);
router.put('/purchase/purchase-orders/:id', PurchaseV2.updatePurchaseOrder);
router.post('/purchase/purchase-orders/:id/send', PurchaseV2.sendPurchaseOrder);
router.post('/purchase/purchase-orders/:id/acknowledge', PurchaseV2.acknowledgePurchaseOrder);
router.post('/purchase/purchase-orders/:id/cancel', PurchaseV2.cancelPurchaseOrder);
// Goods Receipts
router.get('/purchase/goods-receipts', PurchaseV2.getGoodsReceipts);
router.get('/purchase/goods-receipts/:id', PurchaseV2.getGoodsReceipt);
router.post('/purchase/goods-receipts', PurchaseV2.createGoodsReceipt);
router.put('/purchase/goods-receipts/:id', PurchaseV2.updateGoodsReceipt);
router.delete('/purchase/goods-receipts/:id', PurchaseV2.deleteGoodsReceipt);
router.post('/purchase/goods-receipts/:id/confirm', PurchaseV2.confirmGoodsReceipt);
// Vendor Invoices
router.get('/purchase/invoices', PurchaseV2.getVendorInvoices);
router.get('/purchase/invoices/:id', PurchaseV2.getVendorInvoice);
router.post('/purchase/invoices', PurchaseV2.createVendorInvoice);
router.put('/purchase/invoices/:id', PurchaseV2.updateVendorInvoice);
router.delete('/purchase/invoices/:id', PurchaseV2.deleteVendorInvoice);
router.post('/purchase/invoices/:id/approve', PurchaseV2.approveVendorInvoice);
router.post('/purchase/invoices/:id/reject', PurchaseV2.rejectVendorInvoice);
router.post('/purchase/invoices/:id/pay', PurchaseV2.payVendorInvoice);
// Vendor Invoices (alternate path)
router.get('/purchase/vendor-invoices', PurchaseV2.getVendorInvoices);
router.get('/purchase/vendor-invoices/:id', PurchaseV2.getVendorInvoice);
router.post('/purchase/vendor-invoices', PurchaseV2.createVendorInvoice);
router.put('/purchase/vendor-invoices/:id', PurchaseV2.updateVendorInvoice);
router.delete('/purchase/vendor-invoices/:id', PurchaseV2.deleteVendorInvoice);
router.post('/purchase/vendor-invoices/:id/approve', PurchaseV2.approveVendorInvoice);
router.post('/purchase/vendor-invoices/:id/reject', PurchaseV2.rejectVendorInvoice);
router.post('/purchase/vendor-invoices/:id/pay', PurchaseV2.payVendorInvoice);
// GL Posting - Purchase Bill Integration
router.post('/purchase/invoices/:id/post-to-gl', PurchaseV2.postBillToGL);
router.get('/purchase/invoices/:id/gl-status', PurchaseV2.getBillGLStatus);
router.post('/purchase/invoices/:id/record-payment', PurchaseV2.recordPaymentMade);
router.post('/purchase/vendor-invoices/:id/post-to-gl', PurchaseV2.postBillToGL);
router.get('/purchase/vendor-invoices/:id/gl-status', PurchaseV2.getBillGLStatus);
router.post('/purchase/vendor-invoices/:id/record-payment', PurchaseV2.recordPaymentMade);
// Dashboard
router.get('/purchase/dashboard', PurchaseV2.getPurchaseDashboard);

// ============================================================================
// ASSETS
// ============================================================================
router.get('/assets', AssetsControllerV2.getAllAssets);
router.get('/assets/categories', AssetsControllerV2.getAssetCategories);
router.post('/assets/categories', AssetsControllerV2.createAssetCategory);
router.get('/assets/locations', AssetsControllerV2.getAssetLocations);
router.get('/assets/dashboard', AssetsControllerV2.getAssetDashboard);
router.get('/assets/disposals', AssetsControllerV2.getAssetDisposals);
router.post('/assets/disposals', AssetsControllerV2.createAssetDisposal);
router.get('/assets/transfers', AssetsControllerV2.getAssetTransfers);
router.post('/assets/transfers', AssetsControllerV2.createAssetTransfer);
router.post('/assets/depreciation/run', AssetsControllerV2.runDepreciation);
router.get('/assets/:id', AssetsControllerV2.getAssetById);
router.post('/assets', AssetsControllerV2.createAsset);
router.put('/assets/:id', AssetsControllerV2.updateAsset);
router.delete('/assets/:id', AssetsControllerV2.deleteAsset);
router.get('/assets/:id/maintenance', AssetsControllerV2.getAssetMaintenance);
router.post('/assets/:id/maintenance', AssetsControllerV2.createAssetMaintenance);

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================
router.post('/approvals/submit', ApprovalV2.submitForApproval);
router.post('/approvals/:id/approve', ApprovalV2.approveEntry);
router.post('/approvals/:id/reject', ApprovalV2.rejectEntry);
router.get('/approvals/pending', ApprovalV2.getPendingApprovals);
router.get('/approvals/history/:type/:id', ApprovalV2.getApprovalHistory);

// ============================================================================
// LOGISTICS
// ============================================================================
router.get('/logistics/vehicles', LogisticsControllerV2.getVehicles);
router.get('/logistics/vehicles/:id', LogisticsControllerV2.getVehicleById);
router.post('/logistics/vehicles', LogisticsControllerV2.createVehicle);
router.get('/logistics/drivers', LogisticsControllerV2.getDrivers);
router.get('/logistics/shipments', LogisticsControllerV2.getShipments);
router.post('/logistics/shipments', LogisticsControllerV2.createShipment);
router.get('/logistics/routes', LogisticsControllerV2.getRoutes);
router.get('/logistics/dashboard', LogisticsControllerV2.getLogisticsDashboard);

// ============================================================================
// HR
// ============================================================================
router.get('/hr/employees', HRV2.getEmployees);
router.get('/hr/employees/:id', HRV2.getEmployeeById);
router.post('/hr/employees', HRV2.createEmployee);
router.put('/hr/employees/:id', HRV2.updateEmployee);
router.get('/hr/departments', HRV2.getDepartments);
router.get('/hr/departments/:id', HRV2.getDepartmentById);
router.post('/hr/departments', HRV2.createDepartment);
router.put('/hr/departments/:id', HRV2.updateDepartment);
router.get('/hr/positions', HRV2.getPositions);
router.post('/hr/positions', HRV2.createPosition);
router.get('/hr/payroll/periods', HRV2.getPayrollPeriods);
router.post('/hr/payroll/periods', HRV2.createPayrollPeriod);
router.post('/hr/payroll/process', HRV2.processPayroll);
router.get('/hr/payroll/:id', HRV2.getPayrollRunDetails);
// Leave Types & Leave Requests
router.get('/hr/leave-types', HRV2.getLeaveTypes);
router.get('/hr/leave-requests', HRV2.getLeaveRequests);
// Payroll Runs
router.get('/hr/payroll-runs', HRV2.getPayrollRuns);
router.get('/hr/dashboard', HRV2.getHRDashboard);

// ============================================================================
// MANUFACTURING
// ============================================================================
router.get('/manufacturing/workcenters', ManufacturingControllerV2.getWorkCenters);
router.post('/manufacturing/workcenters', ManufacturingControllerV2.createWorkCenter);
router.get('/manufacturing/bom', ManufacturingControllerV2.getBOMs);
router.get('/manufacturing/bom/:id', ManufacturingControllerV2.getBOMById);
router.post('/manufacturing/bom', ManufacturingControllerV2.createBOM);
// Alias for boms -> bom
router.get('/manufacturing/boms', ManufacturingControllerV2.getBOMs);
router.get('/manufacturing/orders', ManufacturingControllerV2.getProductionOrders);
router.post('/manufacturing/orders', ManufacturingControllerV2.createProductionOrder);
router.put('/manufacturing/orders/:id/status', ManufacturingControllerV2.updateProductionOrderStatus);
// Alias for work-orders -> orders
router.get('/manufacturing/work-orders', ManufacturingControllerV2.getProductionOrders);
router.get('/manufacturing/dashboard', ManufacturingControllerV2.getDashboardStats);

// ============================================================================
// COMPLIANCE
// ============================================================================
router.get('/compliance/requirements', ComplianceControllerV2.getComplianceRequirements);
router.post('/compliance/requirements', ComplianceControllerV2.createComplianceRequirement);
router.get('/compliance/filings', ComplianceControllerV2.getComplianceFilings);
router.post('/compliance/filings', ComplianceControllerV2.createFiling);
router.get('/compliance/audits', ComplianceControllerV2.getComplianceAudits);
router.get('/compliance/regulatory-updates', ComplianceControllerV2.getRegulatoryUpdates);
router.get('/compliance/dashboard', ComplianceControllerV2.getComplianceDashboard);
// SARS Status
router.get('/compliance/sars/status', ComplianceControllerV2.getSarsStatus);

// ============================================================================
// SARS SENTINEL
// ============================================================================
router.get('/sars/tax-returns', SARSSentinelControllerV2.getTaxReturns);
router.post('/sars/tax-returns', SARSSentinelControllerV2.createTaxReturn);
router.get('/sars/vat', SARSSentinelControllerV2.getVATReturns);
router.post('/sars/vat', SARSSentinelControllerV2.createVATReturn);
router.get('/sars/paye', SARSSentinelControllerV2.getPAYESubmissions);
router.post('/sars/paye', SARSSentinelControllerV2.createPAYESubmission);
router.get('/sars/tax-certificates', SARSSentinelControllerV2.getTaxCertificates);
router.get('/sars/dashboard', SARSSentinelControllerV2.getSARSDashboard);

// ============================================================================
// PRACTICE MANAGEMENT
// ============================================================================
// Projects
router.get('/practice/projects', ProjectsV2.getAllProjects);
router.get('/practice/projects/dashboard', ProjectsV2.getProjectsDashboard);
router.get('/practice/projects/:id', ProjectsV2.getProjectById);
router.post('/practice/projects', ProjectsV2.createProject);
router.put('/practice/projects/:id', ProjectsV2.updateProject);
router.post('/practice/projects/:id/team', ProjectsV2.addTeamMember);
router.delete('/practice/projects/:id/team/:userId', ProjectsV2.removeTeamMember);

// Tasks
router.get('/practice/tasks', TasksV2.getAllTasks);
router.get('/practice/tasks/my-tasks', TasksV2.getMyTasks);
router.get('/practice/tasks/:id', TasksV2.getTaskById);
router.post('/practice/tasks', TasksV2.createTask);
router.put('/practice/tasks/:id', TasksV2.updateTask);
router.delete('/practice/tasks/:id', TasksV2.deleteTask);
router.put('/practice/tasks/:id/status', TasksV2.updateTaskStatus);

// Time Tracking
router.get('/practice/time-entries', TimeTrackingV2.getAllTimeEntries);
router.get('/practice/time-entries/timesheet', TimeTrackingV2.getMyTimesheet);
router.get('/practice/time-entries/summary', TimeTrackingV2.getTimesheetSummary);
router.get('/practice/time-entries/:id', TimeTrackingV2.getTimeEntryById);
router.post('/practice/time-entries', TimeTrackingV2.createTimeEntry);
router.put('/practice/time-entries/:id', TimeTrackingV2.updateTimeEntry);
router.delete('/practice/time-entries/:id', TimeTrackingV2.deleteTimeEntry);
router.post('/practice/time-entries/approve', TimeTrackingV2.approveTimeEntries);
router.post('/practice/time-entries/reject', TimeTrackingV2.rejectTimeEntries);

// Client Health
router.get('/practice/clients/at-risk', ClientHealthV2.getAtRiskClients);
router.get('/practice/clients/health-scores', ClientHealthV2.getClientHealthScores);
router.get('/practice/clients/dashboard', ClientHealthV2.getClientHealthDashboard);
router.get('/practice/clients/:id/360', ClientHealthV2.getClient360);
router.put('/practice/clients/:id/health-score', ClientHealthV2.updateClientHealthScore);
router.get('/practice/clients/:id/interactions', ClientHealthV2.getClientInteractions);
router.post('/practice/clients/:id/interactions', ClientHealthV2.logClientInteraction);

// ============================================================================
// AGRICULTURE
// ============================================================================
router.get('/agriculture/workspace', AgricultureControllerV2.getWorkspace);
router.get('/agriculture/farms', AgricultureControllerV2.getFarms);
router.get('/agriculture/farms/:id', AgricultureControllerV2.getFarmById);
router.post('/agriculture/farms', AgricultureControllerV2.createFarm);
router.put('/agriculture/farms/:id', AgricultureControllerV2.updateFarm);
router.get('/agriculture/farms/:farmId/fields', AgricultureControllerV2.getFarmFields);
router.post('/agriculture/farms/:farmId/fields', AgricultureControllerV2.createFarmField);
router.get('/agriculture/crops', AgricultureControllerV2.getCrops);
router.post('/agriculture/crops', AgricultureControllerV2.createCrop);
router.put('/agriculture/crops/:id', AgricultureControllerV2.updateCrop);
router.get('/agriculture/livestock', AgricultureControllerV2.getLivestock);
router.post('/agriculture/livestock', AgricultureControllerV2.createLivestock);
router.put('/agriculture/livestock/:id', AgricultureControllerV2.updateLivestock);
router.get('/agriculture/tasks', AgricultureControllerV2.getTasks);
router.post('/agriculture/tasks', AgricultureControllerV2.createTask);
router.put('/agriculture/tasks/:id', AgricultureControllerV2.updateTask);
// Dashboard
router.get('/agriculture/dashboard', AgricultureControllerV2.getAgricultureDashboard);

// ============================================================================
// MINING
// ============================================================================
router.get('/mining/workspace', MiningControllerV2.getWorkspace);
router.get('/mining/sites', MiningControllerV2.getSites);
router.get('/mining/sites/:id', MiningControllerV2.getSiteById);
router.post('/mining/sites', MiningControllerV2.createSite);
router.put('/mining/sites/:id', MiningControllerV2.updateSite);
router.get('/mining/production', MiningControllerV2.getProduction);
router.post('/mining/production', MiningControllerV2.recordProduction);
router.put('/mining/production/:id', MiningControllerV2.updateProduction);
router.get('/mining/safety-incidents', MiningControllerV2.getSafetyIncidents);
router.post('/mining/safety-incidents', MiningControllerV2.reportSafetyIncident);
router.put('/mining/safety-incidents/:id', MiningControllerV2.updateSafetyIncident);
router.get('/mining/equipment', MiningControllerV2.getEquipment);
router.post('/mining/equipment', MiningControllerV2.registerEquipment);
router.put('/mining/equipment/:id', MiningControllerV2.updateEquipment);
// Dashboard
router.get('/mining/dashboard', MiningControllerV2.getMiningDashboard);

// ============================================================================
// CONSTRUCTION
// ============================================================================
router.get('/construction/workspace', ConstructionControllerV2.getWorkspace);
router.get('/construction/projects', ConstructionControllerV2.getProjects);
router.get('/construction/projects/:id', ConstructionControllerV2.getProjectById);
router.post('/construction/projects', ConstructionControllerV2.createProject);
router.put('/construction/projects/:id', ConstructionControllerV2.updateProject);
router.get('/construction/projects/:projectId/phases', ConstructionControllerV2.getProjectPhases);
router.post('/construction/projects/:projectId/phases', ConstructionControllerV2.createPhase);
router.put('/construction/phases/:id', ConstructionControllerV2.updatePhase);
router.get('/construction/safety-incidents', ConstructionControllerV2.getSafetyIncidents);
router.post('/construction/safety-incidents', ConstructionControllerV2.reportSafetyIncident);
router.put('/construction/safety-incidents/:id', ConstructionControllerV2.updateSafetyIncident);
router.get('/construction/materials', ConstructionControllerV2.getMaterials);
router.post('/construction/materials', ConstructionControllerV2.addMaterial);
router.put('/construction/materials/:id', ConstructionControllerV2.updateMaterial);
// Dashboard
router.get('/construction/dashboard', ConstructionControllerV2.getConstructionDashboard);

// ============================================================================
// PROPERTY MANAGEMENT
// ============================================================================
router.get('/property/workspace', PropertyControllerV2.getWorkspace);
router.get('/property/properties', PropertyControllerV2.getProperties);
router.get('/property/properties/:id', PropertyControllerV2.getPropertyById);
router.post('/property/properties', PropertyControllerV2.createProperty);
router.put('/property/properties/:id', PropertyControllerV2.updateProperty);
router.get('/property/units', PropertyControllerV2.getUnits);
router.post('/property/units', PropertyControllerV2.createUnit);
router.put('/property/units/:id', PropertyControllerV2.updateUnit);
router.get('/property/occupants', PropertyControllerV2.getOccupants);
router.post('/property/occupants', PropertyControllerV2.createOccupant);
router.put('/property/occupants/:id', PropertyControllerV2.updateOccupant);
router.get('/property/leases', PropertyControllerV2.getLeases);
router.post('/property/leases', PropertyControllerV2.createLease);
router.put('/property/leases/:id', PropertyControllerV2.updateLease);
router.get('/property/maintenance', PropertyControllerV2.getMaintenanceRequests);
router.post('/property/maintenance', PropertyControllerV2.createMaintenanceRequest);
router.put('/property/maintenance/:id', PropertyControllerV2.updateMaintenanceRequest);
// Dashboard
router.get('/property/dashboard', PropertyControllerV2.getPropertyDashboard);

// ============================================================================
// COMMUNICATIONS
// ============================================================================
router.get('/communications/workspace', CommunicationsControllerV2.getWorkspace);
router.get('/communications/announcements', CommunicationsControllerV2.getAnnouncements);
router.post('/communications/announcements', CommunicationsControllerV2.createAnnouncement);
router.put('/communications/announcements/:id', CommunicationsControllerV2.updateAnnouncement);
router.delete('/communications/announcements/:id', CommunicationsControllerV2.deleteAnnouncement);
router.get('/communications/channels', CommunicationsControllerV2.getChannels);
router.post('/communications/channels', CommunicationsControllerV2.createChannel);
router.get('/communications/channels/:channelId/messages', CommunicationsControllerV2.getChannelMessages);
router.post('/communications/channels/:channelId/messages', CommunicationsControllerV2.sendChannelMessage);
router.get('/communications/dm/conversations', CommunicationsControllerV2.getDirectConversations);
router.get('/communications/dm/:otherUserId', CommunicationsControllerV2.getDirectMessages);
router.post('/communications/dm', CommunicationsControllerV2.sendDirectMessage);
router.get('/communications/notifications', CommunicationsControllerV2.getNotifications);
router.get('/communications/notifications/unread-count', CommunicationsControllerV2.getNotificationUnreadCount);
router.put('/communications/notifications/:id/read', CommunicationsControllerV2.markNotificationRead);
router.put('/communications/notifications/read-all', CommunicationsControllerV2.markAllNotificationsRead);
router.get('/communications/messages/unread-count', CommunicationsControllerV2.getMessageUnreadCount);
router.get('/communications/meetings', CommunicationsControllerV2.getMeetings);
router.post('/communications/meetings', CommunicationsControllerV2.createMeeting);
router.put('/communications/meetings/:id', CommunicationsControllerV2.updateMeeting);
router.delete('/communications/meetings/:id', CommunicationsControllerV2.cancelMeeting);
// Messages (inbox-style)
router.get('/communications/messages', CommunicationsControllerV2.getMessages);
router.post('/communications/messages', CommunicationsControllerV2.sendMessage);
// Contacts
router.get('/communications/contacts', CommunicationsControllerV2.getContacts);
// Templates
router.get('/communications/templates', CommunicationsControllerV2.getTemplates);
router.post('/communications/templates', CommunicationsControllerV2.createTemplate);
// Campaigns
router.get('/communications/campaigns', CommunicationsControllerV2.getCampaigns);
router.post('/communications/campaigns', CommunicationsControllerV2.createCampaign);
// Dashboard
router.get('/communications/dashboard', CommunicationsControllerV2.getCommunicationsDashboard);

// ============================================================================
// PROPOSALS
// ============================================================================
router.get('/proposals/workspace', ProposalsControllerV2.getWorkspace);
router.get('/proposals', ProposalsControllerV2.getProposals);
router.get('/proposals/:id', ProposalsControllerV2.getProposalById);
router.post('/proposals', ProposalsControllerV2.createProposal);
router.put('/proposals/:id', ProposalsControllerV2.updateProposal);
router.delete('/proposals/:id', ProposalsControllerV2.deleteProposal);
router.post('/proposals/:id/send', ProposalsControllerV2.sendProposal);
router.post('/proposals/:id/convert', ProposalsControllerV2.convertProposal);

// ============================================================================
// PAYMENTS
// ============================================================================
router.post('/payments/session', PaymentControllerV2.createPaymentSession);
router.get('/payments/status/:reference', PaymentControllerV2.getPaymentStatus);
router.get('/payments/history', PaymentControllerV2.getPaymentHistory);
router.post('/payments/cancel/:reference', PaymentControllerV2.cancelPayment);
router.get('/payments/pricing', PaymentControllerV2.getPricing);

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================
router.get('/subscriptions/current', SubscriptionControllerV2.getCurrentSubscription);
router.post('/subscriptions/upgrade', SubscriptionControllerV2.upgradePlan);
router.post('/subscriptions/downgrade', SubscriptionControllerV2.downgradePlan);
router.post('/subscriptions/cancel', SubscriptionControllerV2.cancelSubscription);
router.post('/subscriptions/reactivate', SubscriptionControllerV2.reactivateSubscription);
router.get('/subscriptions/status', SubscriptionControllerV2.getSubscriptionStatus);
router.get('/subscriptions/plans', SubscriptionControllerV2.getAvailablePlans);
router.get('/subscriptions/billing-history', SubscriptionControllerV2.getBillingHistory);
router.put('/subscriptions/payment-method', SubscriptionControllerV2.updatePaymentMethod);

// ============================================================================
// TAX SETTINGS
// ============================================================================
router.get('/settings/tax', TaxSettingsControllerV2.getTaxSettings);
router.put('/settings/tax', TaxSettingsControllerV2.updateTaxSettings);
router.get('/settings/tax/accounts', TaxSettingsControllerV2.getTaxAccounts);
router.put('/settings/tax/accounts', TaxSettingsControllerV2.updateTaxAccount);
router.get('/settings/tax/vat', TaxSettingsControllerV2.getVatConfig);
router.put('/settings/tax/vat', TaxSettingsControllerV2.updateVatConfig);
router.get('/settings/tax/paye', TaxSettingsControllerV2.getPayeSettings);
router.put('/settings/tax/paye', TaxSettingsControllerV2.updatePayeSettings);
router.get('/settings/tax/income-brackets', TaxSettingsControllerV2.getIncomeTaxBrackets);
router.put('/settings/tax/income-brackets', TaxSettingsControllerV2.updateIncomeTaxBrackets);
router.get('/settings/tax/efiling', TaxSettingsControllerV2.getEfilingConfig);
router.put('/settings/tax/efiling', TaxSettingsControllerV2.updateEfilingConfig);
// Tax settings alias (for test compatibility)
router.get('/tax-settings', TaxSettingsControllerV2.getTaxSettings);

// ============================================================================
// TENANT SETTINGS
// ============================================================================
router.get('/settings/tenant', TenantSettingsControllerV2.getTenantSettings);
router.put('/settings/tenant', TenantSettingsControllerV2.updateTenantSettings);
router.get('/settings/tenant/branding', TenantSettingsControllerV2.getBrandingSettings);
router.put('/settings/tenant/branding', TenantSettingsControllerV2.updateBrandingSettings);
router.get('/settings/tenant/modules', TenantSettingsControllerV2.getModuleConfig);
router.put('/settings/tenant/modules', TenantSettingsControllerV2.updateModuleConfig);
router.get('/settings/tenant/modules/:moduleCode', TenantSettingsControllerV2.getModuleSettings);
router.get('/settings/tenant/notifications', TenantSettingsControllerV2.getNotificationPreferences);
router.put('/settings/tenant/notifications', TenantSettingsControllerV2.updateNotificationPreferences);

// ============================================================================
// MULTI-ENTITY / SUBSIDIARIES
// ============================================================================
router.get('/entities', MultiEntityControllerV2.getEntities);
router.get('/entities/hierarchy', MultiEntityControllerV2.getEntityHierarchy);
router.get('/entities/:id', MultiEntityControllerV2.getEntity);
router.post('/entities', MultiEntityControllerV2.createEntity);
router.put('/entities/:id', MultiEntityControllerV2.updateEntity);
router.delete('/entities/:id', MultiEntityControllerV2.deleteEntity);
router.post('/entities/:id/move', MultiEntityControllerV2.moveEntity);
router.get('/entities/:id/ancestors', MultiEntityControllerV2.getEntityAncestors);
router.get('/entities/:id/descendants', MultiEntityControllerV2.getEntityDescendants);
router.get('/entities/permissions/:userId', MultiEntityControllerV2.getUserEntityPermissions);
router.put('/entities/permissions/:userId', MultiEntityControllerV2.updateUserEntityPermissions);
// Multi-Entity aliases (for test compatibility)
router.get('/multi-entity/entities', MultiEntityControllerV2.getEntities);
router.get('/multi-entity/dashboard', MultiEntityControllerV2.getMultiEntityDashboard);

// ============================================================================
// FORECASTING & BUDGETING
// ============================================================================
router.get('/forecasting/scenarios', ForecastingControllerV2.getBudgetScenarios);
router.post('/forecasting/scenarios', ForecastingControllerV2.createBudgetScenario);
router.put('/forecasting/scenarios/:id', ForecastingControllerV2.updateBudgetScenario);
router.delete('/forecasting/scenarios/:id', ForecastingControllerV2.deleteBudgetScenario);
router.get('/forecasting/budgets', ForecastingControllerV2.getBudgets);
router.get('/forecasting/budgets/:id', ForecastingControllerV2.getBudgetById);
router.post('/forecasting/budgets', ForecastingControllerV2.createBudget);
router.put('/forecasting/budgets/:id', ForecastingControllerV2.updateBudget);
router.delete('/forecasting/budgets/:id', ForecastingControllerV2.deleteBudget);
router.get('/forecasting/variance', ForecastingControllerV2.getBudgetVsActual);
router.get('/forecasting/variance/by-department', ForecastingControllerV2.getVarianceByDepartment);
router.get('/forecasting/trend', ForecastingControllerV2.getMonthlyTrend);

// ============================================================================
// AI ASSISTANT
// ============================================================================
router.get('/ai/agents', AIAssistantControllerV2.getAgents);
router.get('/ai/agents/:agentId', AIAssistantControllerV2.getAgent);
router.post('/ai/agents/:agentId/chat', AIAssistantControllerV2.chat);
router.post('/ai/agents/:agentId/stream', AIAssistantControllerV2.streamChat);
router.get('/ai/conversations', AIAssistantControllerV2.getConversations);
router.get('/ai/conversations/:conversationId', AIAssistantControllerV2.getConversationHistory);
router.delete('/ai/conversations/:conversationId', AIAssistantControllerV2.archiveConversation);
router.get('/ai/suggestions', AIAssistantControllerV2.getSuggestions);
router.put('/ai/suggestions/:suggestionId', AIAssistantControllerV2.updateSuggestionStatus);
// Specialized AI Assistants
router.post('/ai/sales/analyze-customer', AIAssistantControllerV2.salesAnalyzeCustomer);
router.post('/ai/sales/generate-quotation', AIAssistantControllerV2.salesGenerateQuotation);
router.post('/ai/sales/forecast', AIAssistantControllerV2.salesForecast);
router.post('/ai/compliance/check', AIAssistantControllerV2.complianceCheck);
router.post('/ai/compliance/risk-assess', AIAssistantControllerV2.complianceRiskAssess);
router.post('/ai/finance/explain-variance', AIAssistantControllerV2.financeExplainVariance);
router.post('/ai/finance/reconcile', AIAssistantControllerV2.financeReconcile);
// Actionable AI - Execute natural language commands
router.post('/ai/execute-command', AIAssistantControllerV2.executeCommand);

// ============================================================================
// SALES LIVE (POS/CRM)
// ============================================================================
router.get('/sales-live/customers', SalesLiveControllerV2.getCustomers);
router.get('/sales-live/customers/:id', SalesLiveControllerV2.getCustomerById);
router.post('/sales-live/customers', SalesLiveControllerV2.createCustomer);
router.put('/sales-live/customers/:id', SalesLiveControllerV2.updateCustomer);
router.delete('/sales-live/customers/:id', SalesLiveControllerV2.deleteCustomer);
router.get('/sales-live/leads', SalesLiveControllerV2.getLeads);
router.get('/sales-live/leads/:id', SalesLiveControllerV2.getLeadById);
router.post('/sales-live/leads', SalesLiveControllerV2.createLead);
router.put('/sales-live/leads/:id', SalesLiveControllerV2.updateLead);
router.post('/sales-live/leads/:id/convert', SalesLiveControllerV2.convertLeadToCustomer);
router.delete('/sales-live/leads/:id', SalesLiveControllerV2.deleteLead);
router.get('/sales-live/summary', SalesLiveControllerV2.getSalesSummary);

// ============================================================================
// HEALTHCARE
// ============================================================================
// Facility Operations
router.get('/healthcare/facilities', HealthcareControllerV2.getFacilities);
router.get('/healthcare/facilities/:facilityId/operations', HealthcareControllerV2.getFacilityOperationsStatus);
router.get('/healthcare/facilities/:facilityId/kpis', HealthcareControllerV2.getFacilityKPIs);
router.get('/healthcare/facilities/:facilityId/appointments/today', HealthcareControllerV2.getTodayAppointments);
// Patient Management
router.get('/healthcare/facilities/:facilityId/patients', HealthcareControllerV2.getPatients);
router.get('/healthcare/patients/:patientId', HealthcareControllerV2.getPatient);
router.post('/healthcare/patients', HealthcareControllerV2.createPatient);
router.put('/healthcare/patients/:patientId', HealthcareControllerV2.updatePatient);
// Patient Journey
router.get('/healthcare/facilities/:facilityId/active-patients', HealthcareControllerV2.getActivePatientsInFacility);
router.post('/healthcare/facilities/:facilityId/check-in', HealthcareControllerV2.checkInPatient);
router.put('/healthcare/visits/:visitId/journey', HealthcareControllerV2.updatePatientJourneyStage);
// Staff
router.get('/healthcare/facilities/:facilityId/staff/schedule', HealthcareControllerV2.getTodayStaffSchedule);
router.get('/healthcare/facilities/:facilityId/staff/utilization', HealthcareControllerV2.getStaffUtilization);
// Equipment
router.get('/healthcare/facilities/:facilityId/equipment', HealthcareControllerV2.getMedicalEquipmentStatus);
// Inventory
router.get('/healthcare/facilities/:facilityId/inventory', HealthcareControllerV2.getInventoryStatus);
router.get('/healthcare/facilities/:facilityId/inventory/alerts', HealthcareControllerV2.getInventoryAlerts);
router.post('/healthcare/facilities/:facilityId/inventory/reorder', HealthcareControllerV2.createReorderRequest);
// Clinical Workflows
router.post('/healthcare/patients/:patientId/vitals', HealthcareControllerV2.recordVitals);
router.post('/healthcare/patients/:patientId/triage', HealthcareControllerV2.createTriage);
router.post('/healthcare/patients/:patientId/lab-orders', HealthcareControllerV2.createLabOrder);
// GoodX Integration
router.get('/healthcare/facilities/:facilityId/goodx/revenue', HealthcareControllerV2.getGoodXRevenue);
router.get('/healthcare/facilities/:facilityId/goodx/sync-status', HealthcareControllerV2.getGoodXSyncStatus);
// Dashboard
router.get('/healthcare/dashboard', HealthcareControllerV2.getHealthcareDashboard);

// ============================================================================
// ONBOARDING
// ============================================================================
router.get('/onboarding/status', OnboardingControllerV2.getStatus);
router.get('/onboarding/checklist', OnboardingControllerV2.getChecklist);
router.patch('/onboarding', OnboardingControllerV2.update);
router.post('/onboarding/complete', OnboardingControllerV2.complete);
router.post('/onboarding/skip', OnboardingControllerV2.skip);
router.post('/onboarding/reset', OnboardingControllerV2.reset);

// ============================================================================
// AUDIT READY (Audit Engagements, Findings, Evidence, Checklists)
// ============================================================================
// Engagements
router.get('/audit-ready/engagements', AuditReadyControllerV2.getEngagements);
router.get('/audit-ready/engagements/:id', AuditReadyControllerV2.getEngagementById);
router.post('/audit-ready/engagements', AuditReadyControllerV2.createEngagement);
router.put('/audit-ready/engagements/:id/status', AuditReadyControllerV2.updateEngagementStatus);
// Findings
router.get('/audit-ready/findings', AuditReadyControllerV2.getFindings);
router.post('/audit-ready/findings', AuditReadyControllerV2.createFinding);
router.put('/audit-ready/findings/:id', AuditReadyControllerV2.updateFinding);
// Evidence
router.get('/audit-ready/evidence', AuditReadyControllerV2.getEvidence);
router.post('/audit-ready/evidence', AuditReadyControllerV2.addEvidence);
// Checklists
router.get('/audit-ready/checklist-templates', AuditReadyControllerV2.getChecklistTemplates);
router.get('/audit-ready/checklist-items/:templateId', AuditReadyControllerV2.getChecklistItems);
// Permanent Records
router.get('/audit-ready/permanent-records', AuditReadyControllerV2.getPermanentRecords);
router.post('/audit-ready/permanent-records', AuditReadyControllerV2.addPermanentRecord);
// Dashboard
router.get('/audit-ready/dashboard', AuditReadyControllerV2.getAuditReadyDashboard);

// ============================================================================
// EMAIL PREFERENCES
// ============================================================================
router.get('/email-preferences', EmailPreferencesControllerV2.getPreferences);
router.patch('/email-preferences', EmailPreferencesControllerV2.updatePreferences);
router.post('/email-preferences/unsubscribe-all', EmailPreferencesControllerV2.unsubscribeAll);
router.post('/email-preferences/resubscribe', EmailPreferencesControllerV2.resubscribe);
router.get('/email-preferences/unsubscribe/:token', EmailPreferencesControllerV2.unsubscribeViaToken);
router.get('/email-preferences/categories', EmailPreferencesControllerV2.getCategories);

// ============================================================================
// EMAIL QUEUE (Admin)
// ============================================================================
router.get('/admin/email-queue/stats', EmailQueueControllerV2.getStats);
router.get('/admin/email-queue/health', EmailQueueControllerV2.healthCheck);
router.get('/admin/email-queue/failed', EmailQueueControllerV2.getFailedJobsList);
router.get('/admin/email-queue/jobs/:jobId', EmailQueueControllerV2.getJobDetails);
router.post('/admin/email-queue/retry/:jobId', EmailQueueControllerV2.retryJob);
router.delete('/admin/email-queue/completed', EmailQueueControllerV2.clearCompleted);
router.delete('/admin/email-queue/failed', EmailQueueControllerV2.clearFailed);
router.post('/admin/email-queue/pause', EmailQueueControllerV2.pause);
router.post('/admin/email-queue/resume', EmailQueueControllerV2.resume);

// ============================================================================
// MODULE MANAGEMENT
// ============================================================================
router.get('/modules', ModuleManagementControllerV2.getModules);
// Settings modules alias (for test compatibility)
router.get('/settings/modules', ModuleManagementControllerV2.getModules);
router.get('/modules/:code', ModuleManagementControllerV2.getModuleByCode);
router.post('/modules/:code/enable', ModuleManagementControllerV2.enableModule);
router.post('/modules/:code/disable', ModuleManagementControllerV2.disableModule);
router.put('/modules/:code/config', ModuleManagementControllerV2.updateModuleConfig);
router.get('/modules/:code/usage', ModuleManagementControllerV2.getModuleUsage);
router.get('/modules/:code/dependencies', ModuleManagementControllerV2.getModuleDependencies);

// ============================================================================
// COMPLIANCE & GOVERNANCE (V2)
// ============================================================================
// Frameworks & Requirements
router.get('/compliance/frameworks', ComplianceV2.getRegulatoryFrameworks);
router.get('/compliance/requirements', ComplianceV2.getComplianceRequirements);
// Compliance Status
router.get('/compliance/status', ComplianceV2.getComplianceStatus);
router.put('/compliance/status/:id', ComplianceV2.updateComplianceStatus);
// Risk Management
router.get('/compliance/risks', ComplianceV2.getRisks);
router.post('/compliance/risks', ComplianceV2.createRisk);
router.get('/compliance/risk-categories', ComplianceV2.getRiskCategories);
// Policies
router.get('/compliance/policies', ComplianceV2.getPolicies);
router.post('/compliance/policies', ComplianceV2.createPolicy);
router.post('/compliance/policies/:id/acknowledge', ComplianceV2.acknowledgePolicy);
router.get('/compliance/policy-categories', ComplianceV2.getPolicyCategories);
// Incidents
router.get('/compliance/incidents', ComplianceV2.getIncidents);
router.post('/compliance/incidents', ComplianceV2.createIncident);
router.get('/compliance/incident-types', ComplianceV2.getIncidentTypes);
// Training
router.get('/compliance/training/courses', ComplianceV2.getTrainingCourses);
router.post('/compliance/training/completions', ComplianceV2.recordTrainingCompletion);
router.get('/compliance/training/history/:userId', ComplianceV2.getUserTrainingHistory);

// ============================================================================
// EMAIL VERIFICATION (V2)
// ============================================================================
router.post('/email/verify/send', EmailVerificationV2.sendVerification);
router.post('/email/verify', EmailVerificationV2.verifyEmail);
router.post('/email/verify/resend', EmailVerificationV2.resendVerification);
router.get('/email/verify/status/:userId', EmailVerificationV2.getStatus);
router.get('/email/verify/check/:userId', EmailVerificationV2.checkVerified);

// ============================================================================
// PASSWORD RESET (V2)
// ============================================================================
router.post('/auth/password/reset-request', PasswordResetV2.requestPasswordReset);
router.post('/auth/password/verify-token', PasswordResetV2.verifyToken);
router.post('/auth/password/reset', PasswordResetV2.resetPasswordHandler);
router.post('/auth/password/validate', PasswordResetV2.validatePassword);

// ============================================================================
// SARS SENTINEL - SA Tax Compliance (V2)
// ============================================================================
// Correspondence
router.get('/sars-sentinel/correspondence', SARSSentinelV2.getCorrespondence);
router.get('/sars-sentinel/correspondence/:id', SARSSentinelV2.getCorrespondenceById);
router.post('/sars-sentinel/correspondence', SARSSentinelV2.createCorrespondence);
router.put('/sars-sentinel/correspondence/:id', SARSSentinelV2.updateCorrespondence);
router.post('/sars-sentinel/correspondence/:id/comments', SARSSentinelV2.addComment);
// Dashboard
router.get('/sars-sentinel/dashboard/stats', SARSSentinelV2.getDashboardStats);
// Workflows
router.post('/sars-sentinel/correspondence/:id/workflows', SARSSentinelV2.createWorkflow);
router.get('/sars-sentinel/workflows/:workflowId/steps', SARSSentinelV2.getWorkflowSteps);
router.post('/sars-sentinel/workflows/steps/:stepId/complete', SARSSentinelV2.completeWorkflowStep);
// Submissions
router.get('/sars-sentinel/submissions', SARSSentinelV2.getSubmissionHistory);
router.post('/sars-sentinel/submissions', SARSSentinelV2.recordSubmission);
// Reference Data
router.get('/sars-sentinel/correspondence-types', SARSSentinelV2.getCorrespondenceTypes);
router.get('/sars-sentinel/deadline-calendar', SARSSentinelV2.getDeadlineCalendar);

// ============================================================================
// TREASURY MANAGEMENT (V2)
// ============================================================================
// Accounts & Position
router.get('/treasury-v2/accounts', TreasuryV2.getTreasuryAccounts);
router.get('/treasury-v2/cash-position', TreasuryV2.getCashPosition);
// Forecasting
router.get('/treasury-v2/forecasts', TreasuryV2.getCashForecasts);
router.post('/treasury-v2/forecasts', TreasuryV2.createCashForecast);
// Investments
router.get('/treasury-v2/investments', TreasuryV2.getInvestments);
router.post('/treasury-v2/investments', TreasuryV2.createInvestment);
// Transactions
router.get('/treasury-v2/transactions', TreasuryV2.getTreasuryTransactions);
// FX Rates
router.get('/treasury-v2/fx-rates', TreasuryV2.getFXRates);
// Payment Orders
router.get('/treasury-v2/payment-orders', TreasuryV2.getPaymentOrders);
router.post('/treasury-v2/payment-orders', TreasuryV2.createPaymentOrder);
// Liquidity
router.get('/treasury-v2/liquidity-metrics', TreasuryV2.getLiquidityMetrics);
// Dashboard
router.get('/treasury-v2/dashboard', TreasuryV2.getTreasuryDashboard);
// Treasury aliases (for test compatibility)
router.get('/treasury/accounts', TreasuryV2.getTreasuryAccounts);
router.get('/treasury/dashboard', TreasuryV2.getTreasuryDashboard);

// ============================================================================
// AI CHAT (Natural Language Queries)
// ============================================================================
router.post('/ai/chat', AIChatV2.chat);
router.post('/ai/confirm-action', AIChatV2.confirmAction);
router.post('/ai/cancel-action', AIChatV2.cancelAction);
router.get('/ai/conversation', AIChatV2.getConversation);
router.delete('/ai/conversation', AIChatV2.clearConversation);
router.get('/ai/suggestions', AIChatV2.getSuggestions);

// ============================================================================
// AI ACTIONABLE AGENT
// ============================================================================
router.post('/agent/chat', AgentV2.chat);
router.post('/agent/demo-chat', AgentV2.demoChat);
router.get('/agent/conversation', AgentV2.getConversation);
router.delete('/agent/conversation', AgentV2.clearConversation);
router.get('/agent/actions', AgentV2.getAvailableActions);
router.post('/agent/actions/execute', AgentV2.executeAction);
router.get('/agent/sessions', AgentV2.getSessions);

// ============================================================================
// DELIVERY VERIFICATION (POD)
// ============================================================================
router.post('/delivery/:deliveryId/verify/initiate', DeliveryV2.initiateVerification);
router.post('/delivery/:deliveryId/verify/code', DeliveryV2.verifyCode);
router.post('/delivery/:deliveryId/verify/resend', DeliveryV2.resendCode);
router.post('/delivery/:deliveryId/pod/upload', DeliveryV2.uploadPOD);
router.post('/delivery/:deliveryId/complete', DeliveryV2.completeDelivery);
router.get('/delivery/:deliveryId/status', DeliveryV2.getDeliveryStatus);
router.get('/delivery/:deliveryId/events', DeliveryV2.getDeliveryEvents);

// ============================================================================
// FINANCIAL FORECASTING & BUDGETS
// ============================================================================
// Budget Scenarios
router.get('/financial/budget-scenarios', FinancialForecastingV2.getBudgetScenarios);
router.post('/financial/budget-scenarios', FinancialForecastingV2.createBudgetScenario);
router.get('/financial/budget-scenarios/:id', FinancialForecastingV2.getBudgetScenario);
router.put('/financial/budget-scenarios/:id', FinancialForecastingV2.updateBudgetScenario);
router.delete('/financial/budget-scenarios/:id', FinancialForecastingV2.deleteBudgetScenario);
// Budgets
router.get('/financial/budgets', FinancialForecastingV2.getBudgets);
router.post('/financial/budgets', FinancialForecastingV2.createBudget);
router.get('/financial/budgets/:id', FinancialForecastingV2.getBudgetById);
router.put('/financial/budgets/:id', FinancialForecastingV2.updateBudget);
router.delete('/financial/budgets/:id', FinancialForecastingV2.deleteBudget);
// Analysis & Forecasting
router.get('/financial/budget-vs-actual', FinancialForecastingV2.getBudgetVsActual);
router.get('/financial/variance-analysis', FinancialForecastingV2.getVarianceAnalysis);
router.post('/financial/forecast', FinancialForecastingV2.generateForecast);
router.get('/financial/budget-dashboard', FinancialForecastingV2.getBudgetDashboard);

// ============================================================================
// LOGISTICS - TRIPS
// ============================================================================
router.get('/logistics/trips', LogisticsTripsV2.listTrips);
router.get('/logistics/trips/stats', LogisticsTripsV2.getDashboardStats);
router.get('/logistics/trips/recent', LogisticsTripsV2.getRecentTrips);
router.get('/logistics/trips/:id', LogisticsTripsV2.getTrip);
router.post('/logistics/trips', LogisticsTripsV2.createTrip);
router.put('/logistics/trips/:id', LogisticsTripsV2.updateTrip);
router.delete('/logistics/trips/:id', LogisticsTripsV2.deleteTrip);
router.post('/logistics/trips/:id/start', LogisticsTripsV2.startTrip);
router.post('/logistics/trips/:id/complete', LogisticsTripsV2.completeTrip);
router.post('/logistics/trips/:id/cancel', LogisticsTripsV2.cancelTrip);

// ============================================================================
// LOGISTICS - FUEL MANAGEMENT
// ============================================================================
router.get('/logistics/fuel', LogisticsFuelV2.listFuelTransactions);
router.post('/logistics/fuel', LogisticsFuelV2.createFuelTransaction);
router.get('/logistics/fuel/stats', LogisticsFuelV2.getFuelStats);
router.get('/logistics/fuel/:id', LogisticsFuelV2.getFuelTransaction);
router.delete('/logistics/fuel/:id', LogisticsFuelV2.deleteFuelTransaction);
router.post('/logistics/fuel/reconcile', LogisticsFuelV2.reconcileFuelTransactions);

// ============================================================================
// LOGISTICS - VEHICLE TRACKING
// ============================================================================
router.get('/logistics/tracking/positions', LogisticsTrackingV2.getAllPositions);
router.get('/logistics/tracking/vehicles/:vehicleId', LogisticsTrackingV2.getVehiclePosition);
router.get('/logistics/tracking/vehicles/:vehicleId/history', LogisticsTrackingV2.getPositionHistory);
router.post('/logistics/tracking/refresh', LogisticsTrackingV2.refreshPositions);
router.get('/logistics/tracking/providers', LogisticsTrackingV2.listProviders);

// ============================================================================
// LOGISTICS - ROUTES, INCIDENTS & GEOFENCES
// ============================================================================
// Routes
router.get('/logistics/routes', RoutesIncidentsGeofencesV2.getRoutes);
router.get('/logistics/routes/:id', RoutesIncidentsGeofencesV2.getRouteById);
router.post('/logistics/routes', RoutesIncidentsGeofencesV2.createRoute);
router.put('/logistics/routes/:id', RoutesIncidentsGeofencesV2.updateRoute);
router.delete('/logistics/routes/:id', RoutesIncidentsGeofencesV2.deleteRoute);
// Incidents
router.get('/logistics/incidents', RoutesIncidentsGeofencesV2.getIncidents);
router.post('/logistics/incidents', RoutesIncidentsGeofencesV2.createIncident);
router.put('/logistics/incidents/:id', RoutesIncidentsGeofencesV2.updateIncident);
router.delete('/logistics/incidents/:id', RoutesIncidentsGeofencesV2.deleteIncident);
// Geofences
router.get('/logistics/geofences', RoutesIncidentsGeofencesV2.getGeofences);
router.post('/logistics/geofences', RoutesIncidentsGeofencesV2.createGeofence);
router.put('/logistics/geofences/:id', RoutesIncidentsGeofencesV2.updateGeofence);
router.delete('/logistics/geofences/:id', RoutesIncidentsGeofencesV2.deleteGeofence);
router.get('/logistics/geofences/:id/events', RoutesIncidentsGeofencesV2.getGeofenceEvents);

// ============================================================================
// VIDEO MEETINGS (Daily.co)
// ============================================================================
router.get('/meetings/status', MeetingsV2.getMeetingStatus);
router.post('/meetings/instant', MeetingsV2.createInstantMeeting);
router.post('/meetings/schedule', MeetingsV2.scheduleMeeting);
router.post('/meetings/rooms', MeetingsV2.createRoom);
router.get('/meetings/rooms', MeetingsV2.listRooms);
router.get('/meetings/rooms/:roomName', MeetingsV2.getRoom);
router.delete('/meetings/rooms/:roomName', MeetingsV2.deleteRoom);
router.post('/meetings/rooms/:roomName/token', MeetingsV2.createToken);
router.post('/meetings/rooms/:roomName/invite', MeetingsV2.createInvite);
router.get('/meetings/usage', MeetingsV2.getUsageStats);

// ============================================================================
// INTERNAL MESSAGING
// ============================================================================
router.get('/messages/conversations', MessagesV2.getConversations);
router.get('/messages/conversations/:conversationId', MessagesV2.getConversationMessages);
router.post('/messages/send', MessagesV2.sendMessage);
router.post('/messages/emergency', MessagesV2.sendEmergency);
router.put('/messages/:messageId/read', MessagesV2.markAsRead);
router.get('/messages/unread-count', MessagesV2.getUnreadCount);
// Driver Check-in
router.post('/messages/driver-check-in', MessagesV2.driverCheckIn);
router.get('/messages/driver-status', MessagesV2.getDriverStatus);
// Alerts
router.get('/messages/alerts/active', MessagesV2.getActiveAlerts);
router.post('/messages/alerts/:alertId/acknowledge', MessagesV2.acknowledgeAlert);
router.post('/messages/alerts/:alertId/resolve', MessagesV2.resolveAlert);

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================
router.get('/projects/workspace', ProjectsModuleV2.getWorkspace);
router.get('/projects', ProjectsModuleV2.listProjects);
router.get('/projects/:projectId', ProjectsModuleV2.getProject);
router.post('/projects', ProjectsModuleV2.createProject);
router.put('/projects/:projectId', ProjectsModuleV2.updateProject);
router.delete('/projects/:projectId', ProjectsModuleV2.deleteProject);
// Tasks
router.get('/projects/:projectId/tasks', ProjectsModuleV2.listTasks);
router.post('/projects/:projectId/tasks', ProjectsModuleV2.createTask);
router.get('/projects/:projectId/tasks/:taskId', ProjectsModuleV2.getTask);
router.put('/projects/:projectId/tasks/:taskId', ProjectsModuleV2.updateTask);
router.delete('/projects/:projectId/tasks/:taskId', ProjectsModuleV2.deleteTask);
// Summary
router.get('/projects/:projectId/summary', ProjectsModuleV2.getProjectSummary);

export default router;
