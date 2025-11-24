import { Router } from 'express';
import * as salesController from '../controllers/sales.controller';
import * as salesWorkspaceController from '../modules/sales/controllers/sales.workspace.controller';

const router = Router();

// ============================================================================
// DASHBOARD
// ============================================================================
router.get('/dashboard', salesController.getDashboard);

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', salesWorkspaceController.getSalesWorkspace);

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

router.get('/customers', salesController.getCustomers);
router.get('/customers/:id', salesController.getCustomerById);
router.post('/customers', salesController.createCustomer);
router.put('/customers/:id', salesController.updateCustomer);
router.delete('/customers/:id', salesController.deleteCustomer);

// ============================================================================
// LEAD ROUTES
// ============================================================================

router.get('/leads', salesController.getLeads);
router.get('/leads/:id', salesController.getLeadById);
router.post('/leads', salesController.createLead);
router.put('/leads/:id', salesController.updateLead);
router.delete('/leads/:id', salesController.deleteLead);
router.post('/leads/:id/convert', salesController.convertLeadToOpportunity);

// ============================================================================
// OPPORTUNITY ROUTES
// ============================================================================

router.get('/opportunities', salesController.getOpportunities);
router.get('/opportunities/:id', salesController.getOpportunityById);
router.post('/opportunities', salesController.createOpportunity);
router.put('/opportunities/:id', salesController.updateOpportunity);
router.delete('/opportunities/:id', salesController.deleteOpportunity);

// ============================================================================
// QUOTATION ROUTES
// ============================================================================

router.get('/quotations', salesController.getQuotations);
router.get('/quotations/:id', salesController.getQuotationById);
router.post('/quotations', salesController.createQuotation);
router.put('/quotations/:id', salesController.updateQuotation);
router.delete('/quotations/:id', salesController.deleteQuotation);
router.post('/quotations/:id/send', salesController.sendQuotation);
router.post('/quotations/:id/accept', salesController.acceptQuotation);

// ============================================================================
// SALES ORDER ROUTES
// ============================================================================

router.get('/orders', salesController.getOrders);
router.get('/orders/:id', salesController.getOrderById);
router.post('/orders/:id/confirm', salesController.confirmOrder);
router.post('/orders/:id/ship', salesController.shipOrder);
router.post('/orders/:id/deliver', salesController.deliverOrder);
router.post('/orders/:id/cancel', salesController.cancelOrder);

// ============================================================================
// INVOICE ROUTES
// ============================================================================

// TODO: Implement invoice CRUD operations
// router.get('/invoices', salesController.getInvoices);
// router.get('/invoices/:id', salesController.getInvoiceById);
// router.post('/invoices', salesController.createInvoice);
// router.put('/invoices/:id', salesController.updateInvoice);
// router.delete('/invoices/:id', salesController.deleteInvoice);
// router.post('/invoices/:id/send', salesController.sendInvoice);

// ============================================================================
// CREDIT NOTE ROUTES
// ============================================================================

router.get('/credit-notes', salesController.getCreditNotes);
router.get('/credit-notes/:id', salesController.getCreditNoteById);
router.post('/credit-notes', salesController.createCreditNote);
router.put('/credit-notes/:id', salesController.updateCreditNote);
router.delete('/credit-notes/:id', salesController.deleteCreditNote);

// ============================================================================
// RECEIPT ROUTES (Invoice Payments)
// ============================================================================

router.get('/receipts', salesController.getReceipts);
router.get('/receipts/:id', salesController.getReceiptById);
router.post('/receipts', salesController.createReceipt);
router.put('/receipts/:id', salesController.updateReceipt);
router.delete('/receipts/:id', salesController.deleteReceipt);

// ============================================================================
// COMMISSION ROUTES
// ============================================================================

router.get('/commissions', salesController.getCommissions);
router.get('/commissions/:id', salesController.getCommissionById);
router.post('/commissions', salesController.createCommission);
router.put('/commissions/:id', salesController.updateCommission);
router.delete('/commissions/:id', salesController.deleteCommission);

// ============================================================================
// PRICING RULES ROUTES
// ============================================================================

router.get('/pricing', salesController.getPricingRules);
router.get('/pricing/:id', salesController.getPricingRuleById);
router.post('/pricing', salesController.createPricingRule);
router.put('/pricing/:id', salesController.updatePricingRule);
router.delete('/pricing/:id', salesController.deletePricingRule);

export default router;
