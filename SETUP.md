# TRIMURTI Transport Management System - Setup Guide

## Project Overview
A complete transport management system for logistics companies built with Next.js 16 (React 19) frontend and Express.js backend with PostgreSQL database.

## Prerequisites
- Node.js 18+ and npm/pnpm
- Neon PostgreSQL database (or any PostgreSQL-compatible database)
- Git

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
1. Create a Neon PostgreSQL database at [neon.tech](https://neon.tech)
2. Copy your database connection string

### 3. Environment Configuration
```bash
# Update .env.local with your database URL:
DATABASE_URL="your-neon-database-connection-string"
```

### 4. Initialize Database
```bash
# Create users table and default admin user
npm run db:init
```

### 5. Start Development
```bash
npm run dev
```
```

## Default Login Credentials
- **Email**: admin@trimurti.com
- **Password**: admin123

## Project Structure

### Frontend (/app)
- **`(auth)/login`**: Authentication page
- **`(protected)/`**: Protected routes requiring authentication
- **`(protected)/dashboard`**: Main dashboard with KPIs and charts
- **`masters/`**: Master data management (cities, drivers, vehicles, etc.)
- **`daily-entry/`**: L.R., Challan, Invoice, Receipt entry
- **`reports/`**: Analytics and reporting
- **`components/`**: Reusable UI components
- **`services/`**: API client and services
- **`context/`**: React context for state management

### Backend (/server.js)
REST API endpoints organized by module:
- `/api/auth/`: Login, register, token verification
- `/api/masters/`: Master data endpoints (cities, drivers, vehicles, etc.)
- `/api/lr/`: Lorry receipt operations
- `/api/challan/`: Goods despatch operations
- `/api/invoices/`: Invoice management
- `/api/receipts/`: Payment receipts
- `/api/reports/`: Analytics and reporting

### Database (/scripts)
- **`01-init-database.sql`**: Complete PostgreSQL schema with master tables, transactional data, audit logs

## Key Features Implemented (Phase 1)

✅ **Authentication System**
- JWT-based authentication
- Role-based access control (Admin, Operator, Accountant, Viewer)
- User registration and login

✅ **Core Navigation**
- Sidebar with collapsible menu
- Role-based menu visibility
- Dashboard with KPI cards

✅ **Master Data Foundation**
- Cities, Vehicles, Drivers API endpoints
- Audit logging for changes
- Database schema for all masters

✅ **Dashboard**
- KPI cards (Total Freight, Pending Payment, Active Vehicles, Total Parties)
- Revenue trends chart
- City distribution pie chart
- Recent activity and quick actions

## Database Schema Highlights

### Core Tables
- `users`: System users with roles
- `roles`: Predefined roles (Admin, Operator, Accountant, Viewer)
- `lorry_receipts`: L.R. bookings with freight details
- `lr_items`: Line items for each L.R.
- `challans`: Goods dispatch records
- `invoices`: Billing invoices
- `monthly_bills`: Consolidated monthly invoicing
- `party_receipts`: Payment receipts
- `audit_logs`: Change tracking for compliance

### Support Tables
- `cities`, `drivers`, `vehicles`, `consignors`, `consignees`
- `freight_rates`, `banks`, `goods_types`, `gst_settings`, `financial_years`

## Next Steps (Phase 2-11)

1. **Master CRUD Pages**: Build UI for managing cities, drivers, vehicles, consignors, consignees
2. **L.R. Entry Form**: Complete goods booking with calculations
3. **Challan Module**: Goods dispatch and loading management
4. **Invoice System**: Per-LR and consolidated billing
5. **Monthly Billing**: Automated invoice generation
6. **Receipts**: Payment collection tracking
7. **Reports**: 8+ report types with filtering and export
8. **Print Formats**: Professional document templates
9. **Admin Panel**: User management, audit logs, settings
10. **Search & Navigation**: Global search, advanced filters
11. **Security**: Financial year locks, enhanced validation

## API Examples

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@trimurti.com",
    "password": "admin123"
  }'
```

### Get Cities
```bash
curl http://localhost:3001/api/masters/cities \
  -H "Authorization: Bearer <token>"
```

### Create Vehicle
```bash
curl -X POST http://localhost:3001/api/masters/vehicles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "MH-04-BG-1610",
    "vehicleType": "Truck",
    "capacityKg": 5000,
    "ownerName": "Pratap Singh Thakur",
    "insuranceNumber": "INS123456",
    "insuranceExpiry": "2026-12-31"
  }'
```

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env.local
- Ensure database exists: `psql -l | grep trimurti_tms`

### API Connection Error
- Verify backend is running on port 3001
- Check NEXT_PUBLIC_API_URL in .env.local
- Review browser console for CORS errors

### Authentication Issues
- Clear browser localStorage: Delete auth_token and auth_user
- Check JWT_SECRET matches between frontend and backend
- Verify user exists in database: `SELECT * FROM users;`

## Performance Notes
- Database indexes on frequently searched fields (LR#, Truck#, Party)
- API pagination for large datasets
- React context for state management (avoiding prop drilling)
- Sidebar collapsible menu for better UX

## Security Considerations
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 24-hour expiration
- Role-based access control on all endpoints
- CORS configured for localhost development
- Audit logging for all changes
- Input validation with Zod
- SQL injection prevention with parameterized queries

## Deployment
For production deployment:
1. Build frontend: `pnpm build`
2. Set environment variables in production
3. Use process manager (PM2) for backend
4. Configure database with SSL
5. Set up reverse proxy (Nginx)
6. Enable HTTPS/TLS
7. Configure firewall rules

## Support & Development
For issues or questions about the implementation, refer to:
- API endpoints in server.js
- Frontend components in app/components/
- Database schema in scripts/01-init-database.sql
- Implementation plan in v0_plans/keen-implementation.md
