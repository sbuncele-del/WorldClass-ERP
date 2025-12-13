import { Router } from 'express';
// Use v2 controller with Repository Pattern for multi-tenant safety
import * as salesController from '../controllers/sales.controller.v2';
// Keep legacy controller for endpoints not yet migrated
import * as legacyController from '../controllers/sales.controller';
import * as salesWorkspaceController from '../modules/sales/controllers/sales.workspace.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Apply tenant middleware to all sales routes
router.use(tenantMiddleware);

// ============================================================================
// DASHBOARD (v2 - Repository Pattern)
// ============================================================================
router.get('/dashboard', salesController.getSalesDashboard);

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', salesWorkspaceController.getSalesWorkspace);

// ============================================================================
// CUSTOMER ROUTES (v2 - Repository Pattern)
// ============================================================================
router.get('/customers', salesController.getCustomers);
router.get('/customers/:id', salesController.getCustomer);
router.get('/customers/:id/orders', salesController.getCustomerOrders);
router.get('/customers/:id/invoices', salesController.getCustomerInvoices);
router.post('/customers', salesController.createCustomer);
router.put('/customers/:id', salesController.updateCustomer);
router.delete('/customers/:id', salesController.deleteCustomer);

// ============================================================================
// LEAD ROUTES (Legacy - pending migration)
// ============================================================================
router.get('/leads', legacyController.getLeads);
router.get('/leads/:id', legacyController.getLeadById);
router.post('/leads', legacyController.createLead);
router.put('/leads/:id', legacyController.updateLead);
router.delete('/leads/:id', legacyController.deleteLead);
router.post('/leads/:id/convert', legacyController.convertLeadToOpportunity);

// ============================================================================
// OPPORTUNITY ROUTES (Legacy - pending migration)
// ============================================================================
router.get('/opportunities', legacyController.getOpportunities);
router.get('/opportunities/:id', legacyController.getOpportunityById);
router.post('/opportunities', legacyController.createOpportunity);
router.put('/opportunities/:id', legacyController.updateOpportunity);
router.delete('/opportunities/:id', legacyController.deleteOpportunity);

// ============================================================================
// QUOTATION ROUTES (v2 - Repository Pattern)
// ============================================================================
router.get('/quotations', salesController.getQuotations);
router.get('/quotations/:id', salesController.getQuotation);
router.post('/quotations', salesController.createQuotation);
router.post('/quotations/:id/convert', salesController.convertQuotationToOrder);
// Legacy endpoints still needed
router.put('/quotations/:id', legacyController.updateQuotation);
router.delete('/quotations/:id', legacyController.deleteQuotation);
router.post('/quotations/:id/send', legacyController.sendQuotation);
router.post('/quotations/:id/accept', legacyController.acceptQuotation);

// ============================================================================
// SALES ORDER ROUTES (v2 - Repository Pattern)
// ============================================================================
router.get('/orders', salesController.getSalesOrders);
router.get('/orders/:id', salesController.getSalesOrder);
router.post('/orders', salesController.createSalesOrder);
router.put('/orders/:id', salesController.updateSalesOrder);
router.post('/orders/:id/confirm', salesController.confirmSalesOrder);
router.post('/orders/:id/cancel', salesController.cancelSalesOrder);
// Legacy endpoints for ship/deliver
router.post('/orders/:id/ship', legacyController.shipOrder);
router.post('/orders/:id/deliver', legacyController.deliverOrder);

// ============================================================================
// INVOICE ROUTES (v2 - Repository Pattern)
// ============================================================================
router.get('/invoices', salesController.getInvoices);
router.get('/invoices/:id', salesController.getInvoice);
router.post('/invoices', salesController.createInvoice);
router.post('/invoices/from-order/:orderId', salesController.createInvoiceFromOrder);
router.post('/invoices/:id/send', salesController.sendInvoice);
router.post('/invoices/:id/void', salesController.voidInvoice);

// ============================================================================
// REPORTS (v2 - Repository Pattern)
// ============================================================================
router.get('/reports/sales', salesController.getSalesReport);

// ============================================================================
// CREDIT NOTE ROUTES (Legacy - pending migration)
// ============================================================================
router.get('/credit-notes', legacyController.getCreditNotes);
router.get('/credit-notes/:id', legacyController.getCreditNoteById);
router.post('/credit-notes', legacyController.createCreditNote);
router.put('/credit-notes/:id', legacyController.updateCreditNote);
router.delete('/credit-notes/:id', legacyController.deleteCreditNote);

// ============================================================================
// RECEIPT ROUTES (Legacy - pending migration)
// ============================================================================
router.get('/receipts', legacyController.getReceipts);
router.get('/receipts/:id', legacyController.getReceiptById);
router.post('/receipts', legacyController.createReceipt);
router.put('/receipts/:id', legacyController.updateReceipt);
router.delete('/receipts/:id', legacyController.deleteReceipt);

// ============================================================================
// COMMISSION ROUTES (Legacy - pending migration)
// ============================================================================
router.get('/commissions', legacyController.getCommissions);
router.get('/commissions/:id', legacyController.getCommissionById);
router.post('/commissions', legacyController.createCommission);
router.put('/commissions/:id', legacyController.updateCommission);
router.delete('/commissions/:id', legacyController.deleteCommission);

// ============================================================================
// PRICING RULES ROUTES (Legacy - pending migration)
// ============================================================================
router.get('/pricing', legacyController.getPricingRules);
router.get('/pricing/:id', legacyController.getPricingRuleById);
router.post('/pricing', legacyController.createPricingRule);
router.put('/pricing/:id', legacyController.updatePricingRule);
router.delete('/pricing/:id', legacyController.deletePricingRule);

export default router;
