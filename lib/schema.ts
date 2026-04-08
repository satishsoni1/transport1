import 'dotenv/config';
import { sql } from '@/lib/db';

async function createUsersTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'User',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Users table created successfully');
  } catch (error) {
    console.error('Error creating users table:', error);
    throw error;
  }
}

async function createAdminUser() {
  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('admin123', 10);

    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ('admin@trimurti.com', ${passwordHash}, 'Admin', 'User', 'Admin')
      ON CONFLICT (email) DO NOTHING;
    `;
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

async function main() {
  try {
    await createUsersTable();
    await createAdminUser();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();