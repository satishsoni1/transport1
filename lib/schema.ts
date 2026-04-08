import 'dotenv/config';

import { bootstrapDatabase } from '@/scripts/bootstrap-db';
import { closePool } from '@/lib/db';

async function main() {
  try {
    await bootstrapDatabase();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

void main();
