"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
exports.healthCheck = healthCheck;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * PostgreSQL Database Configuration
 * Connection pool for efficient database access
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ... existing imports ...
const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'worldclass_erp',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
    ssl: process.env.DB_HOST?.includes('rds.amazonaws.com') ? {
        rejectUnauthorized: true,
        ca: fs_1.default.readFileSync(path_1.default.join(__dirname, '../../global-bundle.pem')).toString()
    } : undefined
};
// Create the connection pool
exports.pool = new pg_1.Pool(poolConfig);
// Test connection on startup
exports.pool.on('connect', () => {
    console.log('✅ Database connected');
});
exports.pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const transientCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
]);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const shouldRetry = (err) => {
    const code = err?.code || err?.code;
    return Boolean(code && transientCodes.has(code));
};
/**
 * Execute a query with exponential backoff retries for transient errors
 */
async function query(text, params) {
    const start = Date.now();
    let attempt = 0;
    let lastError;
    while (attempt <= RETRY_DELAYS_MS.length) {
        try {
            const result = await exports.pool.query(text, params);
            const duration = Date.now() - start;
            if (process.env.LOG_QUERIES === 'true') {
                console.log('📊 Query executed', { text, duration, rows: result.rowCount });
            }
            return result;
        }
        catch (error) {
            lastError = error;
            if (attempt === RETRY_DELAYS_MS.length || !shouldRetry(error)) {
                console.error('❌ Database query error (no more retries):', error);
                throw error;
            }
            const backoff = RETRY_DELAYS_MS[attempt];
            console.warn(`⚠️ Query failed (attempt ${attempt + 1}). Retrying in ${backoff}ms...`, error);
            attempt++;
            await delay(backoff);
        }
    }
    // Should never reach here, but throw last error defensively
    throw lastError;
}
/**
 * Execute a transaction (multiple queries atomically)
 */
async function transaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        await callback(client);
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Check if database connection is healthy
 */
async function healthCheck() {
    try {
        const result = await exports.pool.query('SELECT NOW()');
        return result.rowCount !== null && result.rowCount > 0;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
exports.default = exports.pool;
