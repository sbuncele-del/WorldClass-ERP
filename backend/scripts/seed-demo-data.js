/**
 * Demo Seed Data — Ndaba Engineering (Pty) Ltd
 * Run: node /app/seed-demo-data.js
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://doadmin:AVNS_Hu-3_r8U0tQ2cH0EpEh@db-postgresql-fra1-74418-do-user-27800709-0.l.db.ondigitalocean.com:25060/defaultdb',
  ssl: { rejectUnauthorized: false },
});
const TENANT    = '00000000-0000-0000-0000-000000000001';
const DEMO_USER = '00000000-0000-0000-0000-000000000002';
const daysAgo  = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const daysFrom = (n) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];
async function q(client, sql, params, label) {
  try { return await client.query(sql, params); }
  catch (e) { console.warn('  WARN ' + (label||'') + ': ' + e.message.split('\n')[0]); return null; }
}
