# Database Configuration Troubleshooting Guide

## Issue: "Database error. Configure DATABASE_URL for Neon (or POSTGRES_URL)."

### Quick Checklist

1. **Verify `.env` file exists** with valid database URL:
   ```bash
   cat .env
   # Should show:
   # NEON_DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
   ```

2. **Test database connection** via health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Response should show `"database": "connected"`

3. **Check environment variable is loaded**:
   ```bash
   npm run dev
   # Watch server startup logs for "Environments: .env.local, .env"
   ```

### Common Issues & Solutions

#### Issue 1: `.env` file missing or has placeholder
**Symptom**: Error mentions "your-neon-database-url-here"

**Solution**:
```bash
# Check if .env exists
ls -la .env

# If it has a placeholder, replace with real Neon URL
# Get URL from: https://console.neon.tech → Connection String
# Format: postgresql://user:password@host/database?sslmode=require
```

#### Issue 2: Database URL not being loaded at runtime
**Symptom**: Health check shows database disconnected, but `.env` looks correct

**Solution**:
```bash
# Restart the dev server
npm run dev

# If still failing, try setting environment variable directly:
export NEON_DATABASE_URL="your-actual-url-here"
npm run dev
```

#### Issue 3: Connection to Neon database fails after URL is set
**Symptom**: Health check shows error like "getaddrinfo ENOTFOUND"

**Solution**:
1. Verify Neon project is active (check https://console.neon.tech)
2. Verify the URL has the correct pooler endpoint
3. Check your network/firewall isn't blocking PostgreSQL connections
4. Try connecting directly with psql:
   ```bash
   psql "your-database-url-from-.env"
   ```

### Debug Information

To get detailed connection error messages:

1. **Check server logs** when making API calls
2. **Use health endpoint** to test database:
   ```bash
   curl http://localhost:3000/api/health
   # Check "error" field for specific database error
   ```

3. **Verify tables were created**:
   ```bash
   npm run db:init
   # Should show: "Database initialization completed successfully"
   ```

### Environment Variables Supported

The app checks for database URLs in this order:
1. `DATABASE_URL` - Primary choice
2. `POSTGRES_URL` - Alternative
3. `NEON_DATABASE_URL` - Neon-specific (current default)

Or provide individual components:
- `PGHOST_UNPOOLED` / `PGHOST` - Database host
- `PGUSER` - Database user
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name
- `PGPORT` - Port (default: 5432)
- `PGSSLMODE` - SSL mode (default: require)

### Full Setup Flow

```bash
# 1. Install dependencies
npm install

# 2. Create .env with Neon URL
echo 'NEON_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"' > .env

# 3. Initialize database tables and seed data
npm run db:init
# Output should show:
# - App settings table created successfully
# - Admin user created successfully
# - Database initialization completed successfully

# 4. Start development server
npm run dev

# 5. Test connection
curl http://localhost:3000/api/health
```

If everything is configured correctly, you should see:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "message": "Next.js local API is running",
    "database": "connected"
  }
}
```
