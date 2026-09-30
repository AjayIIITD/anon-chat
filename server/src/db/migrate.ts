import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function runMigration() {
  console.log('🔄 Running database migrations on PostgreSQL...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('✅ Database schema created/verified successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
