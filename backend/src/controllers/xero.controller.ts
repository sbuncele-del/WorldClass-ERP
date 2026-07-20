/**
 * Xero Integration Controller
 *
 * OAuth connect/callback/disconnect + manual data sync. Every route except
 * /callback runs behind the normal authenticateToken + tenantMiddleware
 * stack, so it works transparently for accounting firm staff who've
 * switched into a client tenant via the existing accountant-portal
 * mechanism - req.tenant.id is whichever tenant the current JWT is scoped
 * to, exactly like every other tenant-scoped module in this app.
 *
 * /callback is the one exception: Xero's redirect carries no JWT, so tenant
 * identity is recovered from the signed `state` param instead.
 */

import { Response, Request } from 'express';
import { TenantRequest } from '../types';
import pool from '../config/database';
import XeroOAuthService from '../services/xero-oauth.service';
import XeroClientService from '../services/xero-client.service';
import XeroSyncService from '../services/xero-sync.service';

function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: req.user?.id || '' };
}

export const connectXero = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    if (!XeroOAuthService.isConfigured()) {
      res.status(400).json({ success: false, message: 'Xero integration not configured' });
      return;
    }

    const consentUrl = XeroOAuthService.buildConsentUrl(tenantId, userId);
    res.json({ success: true, data: { consentUrl } });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
      return;
    }
    console.error('[Xero] Connect error:', error);
    res.status(500).json({ success: false, message: 'Failed to start Xero connection' });
  }
};

// No auth middleware on this route - Xero's redirect carries no JWT.
// Tenant identity comes ONLY from the signed state param.
export const xeroCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error: xeroError } = req.query as { code?: string; state?: string; error?: string };

    if (xeroError) {
      res.redirect(`${process.env.FRONTEND_URL || ''}/settings/integrations?xero=denied`);
      return;
    }
    if (!code || !state) {
      res.status(400).send('Missing code or state parameter');
      return;
    }

    const { tenantId, userId } = XeroOAuthService.verifyState(state);

    const tokens = await XeroOAuthService.exchangeCodeForTokens(code);
    const connections = await XeroOAuthService.getXeroOrgConnections(tokens.access_token);

    if (connections.length === 0) {
      res.status(400).send('No Xero organisation was authorized');
      return;
    }

    // A user can authorize multiple Xero orgs in one consent screen; take the first.
    const org = connections[0];
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await pool.query(
      `INSERT INTO xero_connections (tenant_id, xero_org_id, xero_org_name, access_token, refresh_token, token_expires_at, scope, connected_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       ON CONFLICT (tenant_id, xero_org_id) DO UPDATE SET
         xero_org_name = EXCLUDED.xero_org_name,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         scope = EXCLUDED.scope,
         is_active = true`,
      [tenantId, org.tenantId, org.tenantName, tokens.access_token, tokens.refresh_token, expiresAt, tokens.scope, userId]
    );

    res.redirect(`${process.env.FRONTEND_URL || ''}/settings/integrations?xero=connected`);
  } catch (error: any) {
    console.error('[Xero] Callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || ''}/settings/integrations?xero=error`);
  }
};

export const getXeroStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const connection = await XeroClientService.getActiveConnection(tenantId);
    if (!connection) {
      res.json({ success: true, data: { connected: false } });
      return;
    }

    res.json({
      success: true,
      data: {
        connected: true,
        xeroOrgName: connection.xero_org_name,
        connectedAt: (connection as any).connected_at,
        tokenExpiresAt: connection.token_expires_at,
      },
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
      return;
    }
    console.error('[Xero] Status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get Xero status' });
  }
};

export const disconnectXero = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const connection = await XeroClientService.getActiveConnection(tenantId);
    if (!connection) {
      res.status(400).json({ success: false, message: 'Xero not connected' });
      return;
    }

    try {
      const orgs = await XeroOAuthService.getXeroOrgConnections(connection.access_token);
      const match = orgs.find((o) => o.tenantId === connection.xero_org_id);
      if (match) {
        await XeroOAuthService.revokeConnection(connection.access_token, match.id);
      }
    } catch (revokeError) {
      // Revoking on Xero's side is best-effort - still deactivate locally
      // even if the token is already expired/invalid there.
      console.error('[Xero] Revoke error (continuing to deactivate locally):', revokeError);
    }

    await pool.query(`UPDATE xero_connections SET is_active = false WHERE connection_id = $1`, [connection.connection_id]);

    res.json({ success: true, message: 'Xero disconnected' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
      return;
    }
    console.error('[Xero] Disconnect error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect Xero' });
  }
};

export const syncXeroNow = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    const connected = await XeroClientService.isConnected(tenantId);
    if (!connected) {
      res.status(400).json({ success: false, message: 'Xero not connected' });
      return;
    }

    const results = await XeroSyncService.syncAll(tenantId, userId);

    res.json({ success: true, data: { results } });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
      return;
    }
    console.error('[Xero] Sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync with Xero' });
  }
};

// One-off backfill for cash_bank_accounts synced before balance rollup was
// added to syncBankTransactions - recomputes from data already in the DB,
// no Xero API call, so it can't hit the timeouts a full re-sync can.
export const recalculateXeroBalances = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const result = await XeroSyncService.recalculateBalances(tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
      return;
    }
    console.error('[Xero] Recalculate balances error:', error);
    res.status(500).json({ success: false, message: 'Failed to recalculate balances' });
  }
};

export const getXeroSyncHistory = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const result = await pool.query(
      `SELECT * FROM migration_history WHERE tenant_id = $1 AND source_platform = 'xero' ORDER BY created_at DESC LIMIT 50`,
      [tenantId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
      return;
    }
    console.error('[Xero] History error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Xero sync history' });
  }
};

export default {
  connectXero,
  xeroCallback,
  getXeroStatus,
  disconnectXero,
  syncXeroNow,
  recalculateXeroBalances,
  getXeroSyncHistory,
};
