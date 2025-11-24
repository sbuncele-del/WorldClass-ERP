import { Router } from 'express';
import { IncomeStatementController } from '../controllers/income-statement.controller';
import { BalanceSheetController } from '../controllers/balance-sheet.controller';
import { CashFlowController } from '../controllers/cash-flow.controller';

const router = Router();

// Income Statement Routes
router.get('/income-statement', IncomeStatementController.generateIncomeStatement);
router.post('/income-statement/export', IncomeStatementController.exportToPDF);
router.get('/income-statement/account/:accountCode', IncomeStatementController.getAccountDetails);

// Balance Sheet Routes
router.get('/balance-sheet', BalanceSheetController.generateBalanceSheet);
router.post('/balance-sheet/export', BalanceSheetController.exportToPDF);
router.get('/balance-sheet/account/:accountCode', BalanceSheetController.getAccountDetails);
router.get('/balance-sheet/ratios', BalanceSheetController.getFinancialRatios);

// Cash Flow Statement Routes
router.get('/cash-flow', CashFlowController.generateCashFlowStatement);
router.post('/cash-flow/export', CashFlowController.exportToPDF);

export default router;
