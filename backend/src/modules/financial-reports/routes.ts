import { Router } from 'express';
import { FinancialReportsController } from './controller';

const router = Router();
const controller = new FinancialReportsController();

// Trial Balance - Shows all accounts with debits, credits, and balances
router.get('/trial-balance', controller.getTrialBalance);

// Balance Sheet - Assets, Liabilities, Equity
router.get('/balance-sheet', controller.getBalanceSheet);

// Profit & Loss Statement (Income Statement) - Revenue and Expenses
router.get('/profit-loss', controller.getProfitAndLoss);

// Account Transactions - All GL transactions for a specific account
router.get('/account-transactions/:accountId', controller.getAccountTransactions);

// Cash Flow Statement - Cash movements
router.get('/cash-flow', controller.getCashFlow);

// General Ledger - All account transactions with running balances
router.get('/general-ledger', controller.getGeneralLedger);

// Aged Receivables - Customer balances by aging buckets
router.get('/aged-receivables', controller.getAgedReceivables);

// Aged Payables - Vendor balances by aging buckets
router.get('/aged-payables', controller.getAgedPayables);

// VAT Report - Input/Output VAT for SARS compliance
router.get('/vat-report', controller.getVatReport);

export default router;
