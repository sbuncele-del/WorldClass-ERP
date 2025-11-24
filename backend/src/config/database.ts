import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Database Configuration
 * Connection pool for efficient database access
 */

const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'worldclass_erp',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
  ssl: process.env.DB_HOST?.includes('rds.amazonaws.com') ? {
    rejectUnauthorized: false
  } : undefined
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Execute a query with automatic error handling
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.LOG_QUERIES === 'true') {
      console.log('📊 Query executed', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

/**
 * Execute a transaction (multiple queries atomically)
 */
export async function transaction(callback: (client: any) => Promise<void>) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await callback(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if database connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export default pool;
