/**
 * Yodlee Open Banking Routes
 * 
 * API routes for Yodlee bank feed integration
 * Provides automated bank statement pulling via Yodlee Financial Data API
 */

import express from 'express';
import { tenantMiddleware } from '../middleware/tenant';
import { yodleeService } from '../services/yodlee.service';

const router = express.Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * GET /api/yodlee/health
 * Test Yodlee API connectivity
 */
router.get('/health', async (req: any, res: any) => {
  try {
    const result = await yodleeService.healthCheck();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// FASTLINK (Bank Connection UI)
// ============================================================

/**
 * GET /api/yodlee/fastlink-config
 * Get FastLink configuration for frontend to embed bank connection UI
 */
router.get('/fastlink-config', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const config = await yodleeService.getFastLinkConfig(tenantId, userId);
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ACCOUNTS
// ============================================================

/**
 * GET /api/yodlee/accounts
 * Get all linked bank accounts from Yodlee
 */
router.get('/accounts', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const accounts = await yodleeService.getAccounts(tenantId, userId);
    res.json({ success: true, data: accounts, count: accounts.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/yodlee/accounts/:accountId
 * Get a specific linked account
 */
router.get('/accounts/:accountId', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    const accountId = parseInt(req.params.accountId, 10);
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid account ID' });
    }

    const account = await yodleeService.getAccountById(tenantId, userId, accountId);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * GET /api/yodlee/transactions
 * Get transactions from Yodlee
 * Query params: accountId, fromDate, toDate, skip, top
 */
router.get('/transactions', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { accountId, fromDate, toDate, skip, top } = req.query;

    const transactions = await yodleeService.getTransactions(tenantId, userId, {
      accountId: accountId ? parseInt(accountId, 10) : undefined,
      fromDate: fromDate as string,
      toDate: toDate as string,
      skip: skip ? parseInt(skip, 10) : undefined,
      top: top ? parseInt(top, 10) : undefined,
      container: 'bank',
    });

    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/yodlee/transactions/count
 * Get transaction count
 */
router.get('/transactions/count', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { accountId, fromDate, toDate } = req.query;

    const count = await yodleeService.getTransactionCount(
      tenantId, userId,
      accountId ? parseInt(accountId, 10) : undefined,
      fromDate as string,
      toDate as string
    );

    res.json({ success: true, data: { count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// SYNC TO ERP
// ============================================================

/**
 * POST /api/yodlee/sync
 * Sync Yodlee transactions into the ERP cash management module
 */
router.post('/sync', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { bankAccountId, yodleeAccountId, fromDate, toDate } = req.body;

    if (!bankAccountId || !yodleeAccountId || !fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: bankAccountId, yodleeAccountId, fromDate, toDate' 
      });
    }

    const result = await yodleeService.syncTransactionsToERP(
      tenantId, userId, bankAccountId, yodleeAccountId, fromDate, toDate
    );

    res.json({ 
      success: true, 
      data: result,
      message: `Synced ${result.imported} transactions (${result.duplicates} duplicates skipped, ${result.errors} errors)` 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// PROVIDERS (Bank Search)
// ============================================================

/**
 * GET /api/yodlee/providers?q=bank_name
 * Search for supported banks
 */
router.get('/providers', async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.userId;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const query = (req.query.q || req.query.name || '') as string;
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
    }

    const providers = await yodleeService.searchProviders(tenantId, userId, query);
    res.json({ success: true, data: providers, count: providers.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
