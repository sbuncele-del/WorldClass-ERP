/**
 * Xero API Client Service
 *
 * Builds a per-tenant authenticated axios client for calling Xero's
 * Accounting API. Auto-refreshes the access token if it's within 5
 * minutes of expiring before every use, persisting the (rotated)
 * refresh token back to xero_connections.
 */

import axios, { AxiosInstance } from 'axios';
import pool from '../config/database';
import XeroOAuthService from './xero-oauth.service';

const XERO_API_BASE_URL = 'https://api.xero.com/api.xro/2.0';
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

interface XeroConnectionRow {
  connection_id: string;
  tenant_id: string;
  xero_org_id: string;
  xero_org_name: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_active: boolean;
}

async function getActiveConnection(tenantId: string): Promise<XeroConnectionRow | null> {
  const result = await pool.query(
    `SELECT * FROM xero_connections WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || null;
}

async function isConnected(tenantId: string): Promise<boolean> {
  const connection = await getActiveConnection(tenantId);
  return Boolean(connection);
}

/**
 * Returns a fresh, valid access token + xero org id for the tenant,
 * refreshing via Xero if the current token is near expiry.
 */
async function getValidTokenForTenant(
  tenantId: string
): Promise<{ accessToken: string; xeroOrgId: string }> {
  const connection = await getActiveConnection(tenantId);
  if (!connection) {
    throw new Error('Xero not connected for this tenant');
  }

  const expiresAt = new Date(connection.token_expires_at).getTime();
  const needsRefresh = expiresAt - Date.now() < REFRESH_MARGIN_MS;

  if (!needsRefresh) {
    return { accessToken: connection.access_token, xeroOrgId: connection.xero_org_id };
  }

  const tokens = await XeroOAuthService.refreshTokens(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await pool.query(
    `UPDATE xero_connections
     SET access_token = $1, refresh_token = $2, token_expires_at = $3
     WHERE connection_id = $4`,
    [tokens.access_token, tokens.refresh_token, newExpiresAt, connection.connection_id]
  );

  return { accessToken: tokens.access_token, xeroOrgId: connection.xero_org_id };
}

/**
 * Builds an axios instance authenticated for this tenant's Xero org.
 * A fresh instance is built per call (tokens can rotate between calls
 * within the same sync run), not cached.
 */
async function getXeroClientForTenant(tenantId: string): Promise<AxiosInstance> {
  const { accessToken, xeroOrgId } = await getValidTokenForTenant(tenantId);

  const client = axios.create({
    baseURL: XERO_API_BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': xeroOrgId,
      Accept: 'application/json',
    },
    timeout: 30000,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        if (error.response.status === 429) {
          console.error('[Xero] Rate limited', {
            retryAfter: error.response.headers['retry-after'],
            url: error.config?.url,
          });
        } else {
          console.error('[Xero] API error', {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url,
          });
        }
      } else if (error.request) {
        console.error('[Xero] Network error', error.message);
      } else {
        console.error('[Xero] Unexpected error', error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const XeroClientService = {
  isConnected,
  getActiveConnection,
  getXeroClientForTenant,
};

export default XeroClientService;
