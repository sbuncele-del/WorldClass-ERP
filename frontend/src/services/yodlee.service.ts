/**
 * Yodlee Open Banking Service
 * 
 * Frontend service for Yodlee bank feed integration.
 * Handles: FastLink embedding, account retrieval, transaction sync
 */

import { apiGet, apiPost } from './api.service';

// ============================================================
// TYPES
// ============================================================

export interface YodleeHealthStatus {
  status: 'ok' | 'error';
  environment: string;
  message: string;
}

export interface FastLinkConfig {
  fastLinkUrl: string;
  accessToken: string;
  params: {
    configName: string;
  };
}

export interface YodleeAccount {
  id: number;
  providerAccountId: number;
  accountName: string;
  accountNumber: string;
  accountType: string;
  balance: { amount: number; currency: string };
  availableBalance?: { amount: number; currency: string };
  currentBalance?: { amount: number; currency: string };
  providerName: string;
  isAsset: boolean;
  status: string;
  lastUpdated: string;
}

export interface YodleeTransaction {
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
}

export interface YodleeProvider {
  id: number;
  name: string;
  loginUrl: string;
  status: string;
  countryISOCode: string;
}

export interface SyncResult {
  imported: number;
  duplicates: number;
  errors: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

// ============================================================
// API CALLS
// ============================================================

const BASE = '/api/yodlee';

/**
 * Check Yodlee API health
 */
export async function checkYodleeHealth(): Promise<YodleeHealthStatus> {
  const res = await apiGet<ApiResponse<YodleeHealthStatus>>(`${BASE}/health`);
  return res.data;
}

/**
 * Get FastLink config for bank connection UI
 */
export async function getFastLinkConfig(): Promise<FastLinkConfig> {
  const res = await apiGet<ApiResponse<FastLinkConfig>>(`${BASE}/fastlink-config`);
  return res.data;
}

/**
 * Get linked bank accounts
 */
export async function getYodleeAccounts(): Promise<YodleeAccount[]> {
  const res = await apiGet<ApiResponse<YodleeAccount[]>>(`${BASE}/accounts`);
  return res.data;
}

/**
 * Get account by ID
 */
export async function getYodleeAccount(accountId: number): Promise<YodleeAccount> {
  const res = await apiGet<ApiResponse<YodleeAccount>>(`${BASE}/accounts/${accountId}`);
  return res.data;
}

/**
 * Get transactions from linked accounts
 */
export async function getYodleeTransactions(params?: {
  accountId?: number;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  top?: number;
}): Promise<YodleeTransaction[]> {
  const res = await apiGet<ApiResponse<YodleeTransaction[]>>(`${BASE}/transactions`, params);
  return res.data;
}

/**
 * Get transaction count
 */
export async function getYodleeTransactionCount(params?: {
  accountId?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<number> {
  const res = await apiGet<ApiResponse<{ count: number }>>(`${BASE}/transactions/count`, params);
  return res.data.count;
}

/**
 * Sync Yodlee transactions into ERP
 */
export async function syncYodleeTransactions(
  bankAccountId: string,
  yodleeAccountId: number,
  fromDate: string,
  toDate: string
): Promise<SyncResult> {
  const res = await apiPost<ApiResponse<SyncResult>>(`${BASE}/sync`, {
    bankAccountId,
    yodleeAccountId,
    fromDate,
    toDate,
  });
  return res.data;
}

/**
 * Search for supported banks
 */
export async function searchYodleeProviders(query: string): Promise<YodleeProvider[]> {
  const res = await apiGet<ApiResponse<YodleeProvider[]>>(`${BASE}/providers`, { q: query });
  return res.data;
}

/**
 * Launch FastLink in an iframe to connect a bank account
 */
export function launchFastLink(
  containerId: string,
  config: FastLinkConfig,
  onSuccess?: (data: any) => void,
  onError?: (error: any) => void,
  onClose?: () => void
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`FastLink container #${containerId} not found`);
    return;
  }

  // Create form to POST to FastLink URL
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = config.fastLinkUrl;
  form.target = 'yodlee-fastlink';
  form.style.display = 'none';

  // Add access token
  const tokenInput = document.createElement('input');
  tokenInput.type = 'hidden';
  tokenInput.name = 'accessToken';
  tokenInput.value = `Bearer ${config.accessToken}`;
  form.appendChild(tokenInput);

  // Add extra params
  const extraInput = document.createElement('input');
  extraInput.type = 'hidden';
  extraInput.name = 'extraParams';
  extraInput.value = JSON.stringify(config.params);
  form.appendChild(extraInput);

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.name = 'yodlee-fastlink';
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';

  // Listen for FastLink messages
  const messageHandler = (event: MessageEvent) => {
    if (event.data) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'POST_MESSAGE') {
          if (data.action === 'exit') {
            window.removeEventListener('message', messageHandler);
            onClose?.();
          } else if (data.sites && data.sites.length > 0) {
            onSuccess?.(data);
          } else if (data.status === 'FAILED') {
            onError?.(data);
          }
        }
      } catch {
        // Not a FastLink message
      }
    }
  };
  window.addEventListener('message', messageHandler);

  container.innerHTML = '';
  container.appendChild(iframe);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
