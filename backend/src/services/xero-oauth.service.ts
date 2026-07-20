/**
 * Xero OAuth2 Service
 *
 * Handles the authorization-code flow against Xero's identity/API endpoints.
 * Xero access tokens expire after ~30 minutes; refresh tokens rotate on
 * every use (Xero issues a new refresh_token with every refresh call, and
 * the old one is invalidated) - callers MUST persist the new refresh_token
 * returned from refreshTokens(), not just the new access_token.
 *
 * @see https://developer.xero.com/documentation/guides/oauth2/overview/
 */

import axios from 'axios';
import crypto from 'crypto';

// Access env at runtime (not module load time) to support late loading/injection
const getXeroClientId = () => process.env.XERO_CLIENT_ID?.trim();
const getXeroClientSecret = () => process.env.XERO_CLIENT_SECRET?.trim();
const getXeroRedirectUri = () => process.env.XERO_REDIRECT_URI?.trim();
const getXeroStateSecret = () => process.env.XERO_STATE_SECRET?.trim();

const XERO_AUTHORIZE_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'accounting.transactions',
  'accounting.contacts',
  'accounting.settings',
  'offline_access',
].join(' ');

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export interface XeroTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface XeroOrgConnection {
  id: string; // Xero's connection id
  tenantId: string; // Xero's org id (their "tenantId") - NOT our tenant_id
  tenantName: string;
  tenantType: string;
}

export interface XeroState {
  tenantId: string;
  userId: string;
}

function isConfigured(): boolean {
  return Boolean(getXeroClientId() && getXeroClientSecret() && getXeroRedirectUri() && getXeroStateSecret());
}

/**
 * Sign a {tenantId, userId, timestamp} payload with HMAC-SHA256 so it can
 * survive the round-trip to Xero and back as the OAuth `state` param -
 * this is the ONLY way tenant identity is recovered in the callback, since
 * Xero's redirect carries no JWT/bearer token.
 */
function signState(tenantId: string, userId: string): string {
  const secret = getXeroStateSecret();
  if (!secret) {
    throw new Error('Xero integration not configured');
  }
  const payload = JSON.stringify({ tenantId, userId, ts: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifyState(state: string): XeroState {
  const secret = getXeroStateSecret();
  if (!secret) {
    throw new Error('Xero integration not configured');
  }
  const [payloadB64, signature] = (state || '').split('.');
  if (!payloadB64 || !signature) {
    throw new Error('Invalid state parameter');
  }
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expectedBuf))
  ) {
    throw new Error('Invalid state signature');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (!payload.tenantId || !payload.userId || !payload.ts) {
    throw new Error('Invalid state payload');
  }
  if (Date.now() - payload.ts > STATE_MAX_AGE_MS) {
    throw new Error('State parameter expired');
  }
  return { tenantId: payload.tenantId, userId: payload.userId };
}

function buildConsentUrl(tenantId: string, userId: string): string {
  const clientId = getXeroClientId();
  const redirectUri = getXeroRedirectUri();
  if (!clientId || !redirectUri) {
    throw new Error('Xero integration not configured');
  }
  const state = signState(tenantId, userId);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${XERO_AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string): Promise<XeroTokens> {
  const clientId = getXeroClientId();
  const clientSecret = getXeroClientSecret();
  const redirectUri = getXeroRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Xero integration not configured');
  }
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    XERO_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );
  return response.data;
}

async function refreshTokens(refreshToken: string): Promise<XeroTokens> {
  const clientId = getXeroClientId();
  const clientSecret = getXeroClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Xero integration not configured');
  }
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    XERO_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );
  return response.data;
}

async function getXeroOrgConnections(accessToken: string): Promise<XeroOrgConnection[]> {
  const response = await axios.get(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

async function revokeConnection(accessToken: string, connectionId: string): Promise<void> {
  await axios.delete(`${XERO_CONNECTIONS_URL}/${connectionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export const XeroOAuthService = {
  isConfigured,
  signState,
  verifyState,
  buildConsentUrl,
  exchangeCodeForTokens,
  refreshTokens,
  getXeroOrgConnections,
  revokeConnection,
};

export default XeroOAuthService;
