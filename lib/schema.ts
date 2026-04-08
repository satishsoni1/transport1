import 'dotenv/config';
import { sql } from '@/lib/db';

async function createAppSettingsTable() {
  try {
    // Drop if exists to ensure fresh schema
    try {
      await sql`DROP TABLE IF EXISTS app_settings CASCADE;`;
    } catch (e) {
      // Ignore drop errors
    }

    await sql`
      CREATE TABLE app_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        data_type VARCHAR(50) NOT NULL DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('App settings table created successfully');
  } catch (error) {
    console.error('Error creating app_settings table:', error);
    throw error;
  }
}

async function seedAppSettings() {
  try {
    const settings = [
      { key: 'company_name', value: 'TRIMURTI Transport', type: 'string', desc: 'Display name of the company' },
      { key: 'company_tagline', value: 'Transport Management System', type: 'string', desc: 'Tagline or subtitle for the company' },
      { key: 'app_title', value: 'TRIMURTI TMS', type: 'string', desc: 'Application title' },
      { key: 'support_email', value: 'support@trimurti.com', type: 'string', desc: 'Support email address' },
    ];

    for (const setting of settings) {
      await sql`
        INSERT INTO app_settings (setting_key, setting_value, data_type, description)
        VALUES (${setting.key}, ${setting.value}, ${setting.type}, ${setting.desc})
        ON CONFLICT (setting_key) DO NOTHING;
      `;
    }
    
    console.log('App settings seeded successfully');
  } catch (error) {
    console.error('Error seeding app settings:', error);
    throw error;
  }
}

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
    await createAppSettingsTable();
    await seedAppSettings();
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