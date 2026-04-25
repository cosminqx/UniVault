import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const hasSslModeInConnectionString = /[?&]sslmode=/i.test(env.databaseUrl || '');

const poolConfig = {
  connectionString: env.databaseUrl
};

// Respect explicit sslmode in DATABASE_URL (for example Supabase URLs).
// Fallback: enable TLS in production when sslmode is not provided.
if (!hasSslModeInConnectionString && env.nodeEnv === 'production') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);

export async function query(text, params = []) {
  return pool.query(text, params);
}
