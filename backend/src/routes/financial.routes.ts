import { Router } from 'express';
import * as financialController from '../modules/financial/controllers/financial.controller';
import * as financialWorkspaceController from '../modules/financial/controllers/financial.workspace.controller';

const router = Router();

// ===== WORKSPACE =====
router.get('/workspace', financialWorkspaceController.getFinancialWorkspace);

// ===== JOURNAL ENTRIES =====
router.post('/journal-entries', financialController.createJournalEntry);
router.get('/journal-entries', financialController.listJournalEntries);
router.get('/journal-entries/:id', financialController.getJournalEntry);
router.post('/journal-entries/:id/post', financialController.postJournalEntry);
router.post('/journal-entries/:id/reverse', financialController.reverseJournalEntry);

// ===== CHART OF ACCOUNTS =====
router.get('/chart-of-accounts', financialController.getChartOfAccounts);
router.get('/chart-of-accounts/:code', financialController.getAccount);

// ===== COA TEMPLATES =====
router.get('/coa-templates', financialController.getCOATemplates);
router.post('/coa-templates/:templateId/apply', financialController.applyCOATemplate);

// ===== REPORTS =====
router.get('/reports/trial-balance', financialController.getTrialBalance);
router.get('/reports/account-ledger/:code', financialController.getAccountLedger);
// router.get('/reports/balance-sheet', financialController.getBalanceSheet); // TODO: Implement
router.get('/reports/income-statement', financialController.getIncomeStatement);

// ===== GENERAL LEDGER =====
router.get('/ledger/general', financialController.getGeneralLedger);
router.get('/ledger/accounts/:accountCode', financialController.getAccountLedgerByCode);

// ===== FISCAL PERIODS =====
router.get('/fiscal-years', financialController.getFiscalYears);
router.get('/fiscal-periods', financialController.getFiscalPeriods);

// ===== CASH FLOW =====
router.get('/cash-flow', financialController.getCashFlowStatement);

// ===== INCOME STATEMENT =====
// Moved to /reports/income-statement above

// ===== TAX SETTINGS =====
router.get('/tax-settings', financialController.getTaxSettings);
router.post('/tax-settings', financialController.createTaxSetting);
router.put('/tax-settings/:id', financialController.updateTaxSetting);

// ===== DIMENSIONS =====
router.get('/dimensions', financialController.getDimensions);
router.post('/dimensions', financialController.createDimension);
router.put('/dimensions/:id', financialController.updateDimension);

// ===== DASHBOARD =====
router.get('/dashboard', financialController.getDashboard);

export default router;
