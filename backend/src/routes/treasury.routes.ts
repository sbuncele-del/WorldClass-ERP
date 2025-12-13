import express from 'express';
import TreasuryController from '../controllers/treasury.controller';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

// Apply tenant middleware to all treasury routes
router.use(tenantMiddleware);

// Treasury Accounts
router.get('/accounts', authenticateToken, TreasuryController.getTreasuryAccounts);
router.get('/cash-position', authenticateToken, TreasuryController.getCashPosition);

// Cash Forecasting
router.get('/forecasts', authenticateToken, TreasuryController.getCashForecasts);
router.post('/forecasts', authenticateToken, TreasuryController.createCashForecast);

// Investments
router.get('/investments', authenticateToken, TreasuryController.getInvestments);
router.post('/investments', authenticateToken, TreasuryController.createInvestment);

// Transactions
router.get('/transactions', authenticateToken, TreasuryController.getTreasuryTransactions);

// FX Rates
router.get('/fx-rates', authenticateToken, TreasuryController.getFXRates);

// Payment Orders
router.get('/payment-orders', authenticateToken, TreasuryController.getPaymentOrders);
router.post('/payment-orders', authenticateToken, TreasuryController.createPaymentOrder);

// Liquidity Metrics
router.get('/liquidity-metrics', authenticateToken, TreasuryController.getLiquidityMetrics);

export default router;
