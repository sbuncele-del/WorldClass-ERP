/**
 * Yodlee Financial Data API Integration Service
 * 
 * Handles:
 * - Authentication (admin + user tokens)
 * - Account linking via FastLink
 * - Transaction retrieval
 * - Account balance fetching
 * - Provider (bank) search
 * 
 * Docs: https://developer.yodlee.com/api-reference
 * API Version: 1.1
 */

import pool from '../config/database';

// ============================================================
// CONFIGURATION
// ============================================================

interface YodleeConfig {
  apiBaseUrl: string;
  fastLinkUrl: string;
  adminLoginName: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
}

function getConfig(): YodleeConfig {
  const isSandbox = process.env.YODLEE_ENV !== 'production';
  return {
    apiBaseUrl: process.env.YODLEE_API_BASE_URL || 
      (isSandbox ? 'https://sandbox.api.yodlee.com/ysl' : 'https://production.api.yodlee.com/ysl'),
    fastLinkUrl: process.env.YODLEE_FASTLINK_URL ||
      (isSandbox ? 'https://fl4.sandbox.yodlee.com/authenticate/restserver/fastlink' : ''),
    adminLoginName: process.env.YODLEE_ADMIN_LOGIN_NAME || '',
    clientId: process.env.YODLEE_CLIENT_ID || '',
    clientSecret: process.env.YODLEE_CLIENT_SECRET || '',
    apiVersion: process.env.YODLEE_API_VERSION || '1.1',
  };
}

// ============================================================
// TYPES
// ============================================================

interface YodleeToken {
  accessToken: string;
  issuedAt: string;
  expiresIn: number;
}

interface YodleeAccount {
  id: number;
  providerAccountId: number;
  accountName: string;
  accountNumber: string;
  accountType: string;
  balance: { amount: number; currency: string };
  availableBalance?: { amount: number; currency: string };
  currentBalance?: { amount: number; currency: string };
  bankTransferCode?: { id: string; type: string };
  providerName: string;
  isAsset: boolean;
  status: string;
  lastUpdated: string;
}

interface YodleeTransaction {
  id: number;
  accountId: number;
  amount: { amount: number; currency: string };
  baseType: 'CREDIT' | 'DEBIT';
  category: string;
  categoryType: string;
  date: string;
  description: { original: string; simple?: string };
  status: 'POSTED' | 'PENDING';
  merchant?: { name: string };
  runningBalance?: { amount: number; currency: string };
  postDate?: string;
  transactionDate?: string;
  type?: string;
}

interface YodleeProvider {
  id: number;
  name: string;
  loginUrl: string;
  status: string;
  countryISOCode: string;
  primaryLanguageISOCode: string;
  lastModified: string;
}

export interface FastLinkConfig {
  fastLinkUrl: string;
  accessToken: string;
  params: {
    configName: string;
  };
}

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

/**
 * Get admin access token for server-to-server calls
 */
async function getAdminToken(): Promise<string> {
  const config = getConfig();
  
  const response = await fetch(`${config.apiBaseUrl}/auth/token`, {
    method: 'POST',
    headers: {
      'Api-Version': config.apiVersion,
      'Content-Type': 'application/x-www-form-urlencoded',
      'loginName': config.adminLoginName,
    },
    body: new URLSearchParams({
      clientId: config.clientId,
      secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yodlee admin auth failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.token.accessToken;
}

/**
 * Get user access token for user-specific operations
 */
async function getUserToken(yodleeLoginName: string): Promise<string> {
  const config = getConfig();
  
  const response = await fetch(`${config.apiBaseUrl}/auth/token`, {
    method: 'POST',
    headers: {
      'Api-Version': config.apiVersion,
      'Content-Type': 'application/x-www-form-urlencoded',
      'loginName': yodleeLoginName,
    },
    body: new URLSearchParams({
      clientId: config.clientId,
      secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yodlee user auth failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.token.accessToken;
}

// ============================================================
// USER MANAGEMENT
// ============================================================

/**
 * Register a Yodlee user (maps to tenant + user in our system)
 */
async function registerUser(tenantId: string, userId: string): Promise<string> {
  const config = getConfig();
  const adminToken = await getAdminToken();
  
  // Create a unique login name for this tenant+user
  const yodleeLoginName = `siyabusa_${tenantId}_${userId}`;
  
  const response = await fetch(`${config.apiBaseUrl}/user/register`, {
    method: 'POST',
    headers: {
      'Api-Version': config.apiVersion,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      user: {
        loginName: yodleeLoginName,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    // User might already exist — that's okay
    if (response.status === 409) {
      return yodleeLoginName;
    }
    throw new Error(`Yodlee user registration failed: ${response.status} - ${error}`);
  }

  // Store the Yodlee login name in our database
  await pool.query(
    `UPDATE users SET yodlee_login_name = $1 WHERE id = $2 AND tenant_id = $3`,
    [yodleeLoginName, userId, tenantId]
  );

  return yodleeLoginName;
}

/**
 * Get or create Yodlee login name for a user
 */
async function getOrCreateYodleeUser(tenantId: string, userId: string): Promise<string> {
  // Check if user already has a Yodlee login name
  const result = await pool.query(
    `SELECT yodlee_login_name FROM users WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );

  if (result.rows[0]?.yodlee_login_name) {
    return result.rows[0].yodlee_login_name;
  }

  return registerUser(tenantId, userId);
}

// ============================================================
// FASTLINK (Bank Connection UI)
// ============================================================

/**
 * Generate FastLink configuration for frontend embedding
 * FastLink is Yodlee's pre-built UI for connecting bank accounts
 */
async function getFastLinkConfig(tenantId: string, userId: string): Promise<FastLinkConfig> {
  const config = getConfig();
  const yodleeLoginName = await getOrCreateYodleeUser(tenantId, userId);
  const userToken = await getUserToken(yodleeLoginName);

  return {
    fastLinkUrl: config.fastLinkUrl,
    accessToken: userToken,
    params: {
      configName: 'Aggregation',
    },
  };
}

// ============================================================
// ACCOUNTS
// ============================================================

/**
 * Get all linked bank accounts for a user
 */
async function getAccounts(tenantId: string, userId: string): Promise<YodleeAccount[]> {
  const config = getConfig();
  const yodleeLoginName = await getOrCreateYodleeUser(tenantId, userId);
  const userToken = await getUserToken(yodleeLoginName);

  const response = await fetch(`${config.apiBaseUrl}/accounts`, {
    headers: {
      'Api-Version': config.apiVersion,
      'Authorization': `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yodlee get accounts failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.account || [];
}

/**
 * Get account details by ID
 */
async function getAccountById(tenantId: string, userId: string, accountId: number): Promise<YodleeAccount | null> {
  const config = getConfig();
  const yodleeLoginName = await getOrCreateYodleeUser(tenantId, userId);
  const userToken = await getUserToken(yodleeLoginName);

  const response = await fetch(`${config.apiBaseUrl}/accounts/${accountId}`, {
    headers: {
      'Api-Version': config.apiVersion,
      'Authorization': `Bearer ${userToken}`,
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.account?.[0] || null;
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Get transactions for linked accounts
 */
async function getTransactions(
  tenantId: string,
  userId: string,
  params: {
    accountId?: number;
    fromDate?: string;  // YYYY-MM-DD
    toDate?: string;    // YYYY-MM-DD
    skip?: number;
    top?: number;
    container?: 'bank' | 'creditCard' | 'investment' | 'loan';
  } = {}
): Promise<YodleeTransaction[]> {
  const config = getConfig();
  const yodleeLoginName = await getOrCreateYodleeUser(tenantId, userId);
  const userToken = await getUserToken(yodleeLoginName);

  const queryParams = new URLSearchParams();
  if (params.accountId) queryParams.set('accountId', String(params.accountId));
  if (params.fromDate) queryParams.set('fromDate', params.fromDate);
  if (params.toDate) queryParams.set('toDate', params.toDate);
  if (params.skip) queryParams.set('skip', String(params.skip));
  if (params.top) queryParams.set('top', String(params.top));
  if (params.container) queryParams.set('container', params.container);

  const url = `${config.apiBaseUrl}/transactions?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Api-Version': config.apiVersion,
      'Authorization': `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yodlee get transactions failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.transaction || [];
}

/**
 * Get transaction count for an account
 */
async function getTransactionCount(
  tenantId: string,
  userId: string,
  accountId?: number,
  fromDate?: string,
  toDate?: string
): Promise<number> {
  const config = getConfig();
  const yodleeLoginName = await getOrCreateYodleeUser(tenantId, userId);
  const userToken = await getUserToken(yodleeLoginName);

  const queryParams = new URLSearchParams();
  if (accountId) queryParams.set('accountId', String(accountId));
  if (fromDate) queryParams.set('fromDate', fromDate);
  if (toDate) queryParams.set('toDate', toDate);

  const response = await fetch(
    `${config.apiBaseUrl}/transactions/count?${queryParams.toString()}`,
    {
      headers: {
        'Api-Version': config.apiVersion,
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );

  if (!response.ok) return 0;

  const data = await response.json();
  return data.transaction?.TOTAL?.count || 0;
}

// ============================================================
// PROVIDERS (Banks)
// ============================================================

/**
 * Search for supported banks/providers
 */
async function searchProviders(
  tenantId: string,
  userId: string,
  query: string
): Promise<YodleeProvider[]> {
  const config = getConfig();
  const yodleeLoginName = await getOrCreateYodleeUser(tenantId, userId);
  const userToken = await getUserToken(yodleeLoginName);

  const response = await fetch(
    `${config.apiBaseUrl}/providers?name=${encodeURIComponent(query)}`,
    {
      headers: {
        'Api-Version': config.apiVersion,
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();
  return data.provider || [];
}

// ============================================================
// SYNC TRANSACTIONS TO ERP
// ============================================================

/**
 * Sync Yodlee transactions into the ERP's bank statement lines
 * This bridges Yodlee data with the existing cash management module
 */
async function syncTransactionsToERP(
  tenantId: string,
  userId: string,
  bankAccountId: string,
  yodleeAccountId: number,
  fromDate: string,
  toDate: string
): Promise<{ imported: number; duplicates: number; errors: number }> {
  const transactions = await getTransactions(tenantId, userId, {
    accountId: yodleeAccountId,
    fromDate,
    toDate,
    container: 'bank',
  });

  let imported = 0;
  let duplicates = 0;
  let errors = 0;

  for (const txn of transactions) {
    try {
      // Check for duplicate by Yodlee transaction ID
      const existing = await pool.query(
        `SELECT id FROM cash_statement_lines 
         WHERE tenant_id = $1 AND yodlee_transaction_id = $2`,
        [tenantId, String(txn.id)]
      );

      if (existing.rows.length > 0) {
        duplicates++;
        continue;
      }

      // Insert into our statement lines table
      await pool.query(
        `INSERT INTO cash_statement_lines (
          tenant_id, bank_account_id, transaction_date, value_date,
          description, amount, transaction_type, status,
          yodlee_transaction_id, yodlee_category, yodlee_merchant,
          source, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'yodlee', NOW())`,
        [
          tenantId,
          bankAccountId,
          txn.transactionDate || txn.date,
          txn.postDate || txn.date,
          txn.description.original,
          txn.baseType === 'DEBIT' ? -Math.abs(txn.amount.amount) : Math.abs(txn.amount.amount),
          txn.baseType.toLowerCase(),
          txn.status === 'POSTED' ? 'unmatched' : 'pending',
          String(txn.id),
          txn.category || null,
          txn.merchant?.name || null,
        ]
      );
      imported++;
    } catch (err) {
      errors++;
      console.error(`Failed to import Yodlee transaction ${txn.id}:`, err);
    }
  }

  return { imported, duplicates, errors };
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Test Yodlee API connectivity
 */
async function healthCheck(): Promise<{ 
  status: 'ok' | 'error'; 
  environment: string;
  message: string;
}> {
  try {
    const config = getConfig();
    const adminToken = await getAdminToken();
    
    return {
      status: 'ok',
      environment: process.env.YODLEE_ENV || 'sandbox',
      message: `Connected to Yodlee API at ${config.apiBaseUrl}`,
    };
  } catch (err: any) {
    return {
      status: 'error',
      environment: process.env.YODLEE_ENV || 'sandbox',
      message: err.message,
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

export const yodleeService = {
  getConfig,
  getAdminToken,
  getUserToken,
  registerUser,
  getOrCreateYodleeUser,
  getFastLinkConfig,
  getAccounts,
  getAccountById,
  getTransactions,
  getTransactionCount,
  searchProviders,
  syncTransactionsToERP,
  healthCheck,
};

export default yodleeService;
