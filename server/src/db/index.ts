import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/anon_chat';
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const useSsl = !isLocalhost && (process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT || connectionString.includes('railway') || connectionString.includes('sslmode=require'));

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
