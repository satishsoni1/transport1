# QUICK START GUIDE - TRIMURTI Transport Management System

## 🚀 Get the System Running in 5 Minutes

### Step 1: Install Dependencies (1 minute)
```bash
cd /path/to/project
npm install
```

### Step 2: Setup Database (1 minute)

1. Create a Neon PostgreSQL database at [neon.tech](https://neon.tech)
2. Get your connection string

### Step 3: Configure Environment (1 minute)
Edit `.env.local`:
```env
DATABASE_URL=your-neon-database-connection-string
```

### Step 4: Initialize Database (1 minute)
```bash
npm run db:init
```

### Step 5: Start Development Server (1 minute)
```bash
npm run dev
```

This starts the Next.js development server at http://localhost:3000
- **Frontend** on http://localhost:3000
- **Backend** on http://localhost:3001

### Step 5: Login (1 minute)
Open http://localhost:3000 in your browser
- **Email**: `admin@trimurti.com`
- **Password**: `admin123`

---

## 📋 What You Can Do Now

✅ **Dashboard**: View KPIs, revenue charts, city distribution  
✅ **Cities Management**: Create, view, edit cities  
✅ **Vehicles Management**: Add and manage trucks/vehicles  
✅ **Drivers Management**: Add driver information  
✅ **User Profile**: View your account and role  
✅ **Logout**: Secure session termination  

---

## 🧪 Test the API Directly

### Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@trimurti.com",
    "password": "admin123"
  }'

# Response:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": {
#     "id": 1,
#     "email": "admin@trimurti.com",
#     "role": "Admin"
#   }
# }
```

### Get Cities (with token)
```bash
curl http://localhost:3001/api/masters/cities \
  -H "Authorization: Bearer <paste_token_here>"
```

### Create New City
```bash
curl -X POST http://localhost:3001/api/masters/cities \
  -H "Authorization: Bearer <paste_token_here>" \
  -H "Content-Type: application/json" \
  -d '{
    "cityName": "PUNE",
    "state": "Maharashtra"
  }'
```

---

## 🗄️ Check Database

### Connect to Database
```bash
psql trimurti_tms
```

### Useful Queries
```sql
-- View all users
SELECT id, email, first_name, last_name FROM users;

-- Check cities
SELECT * FROM cities;

-- View vehicles
SELECT * FROM vehicles;

-- View drivers
SELECT * FROM drivers;

-- Check audit logs
SELECT * FROM audit_logs ORDER BY changed_at DESC LIMIT 10;

-- View financial years
SELECT * FROM financial_years;

-- Exit psql
\q
```

---

## ⚙️ Troubleshooting

### Issue: "Cannot connect to database"
```bash
# Check if PostgreSQL is running
psql -U postgres -d postgres -c "SELECT version();"

# Check if database exists
psql -U postgres -c "\l" | grep trimurti_tms

# Recreate database if needed
dropdb trimurti_tms
createdb trimurti_tms
psql trimurti_tms < scripts/01-init-database.sql
```

### Issue: "Port 3001 already in use"
```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill the process (example PID 1234)
kill -9 1234  # macOS/Linux
taskkill /PID 1234 /F  # Windows
```

### Issue: "Login fails"
1. Verify admin user exists: `SELECT * FROM users WHERE email = 'admin@trimurti.com';`
2. Check password hash is correct
3. Clear browser localStorage: DevTools → Application → Local Storage → Delete

### Issue: "CORS error"
1. Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env.local`
2. Restart both servers
3. Clear browser cache (Ctrl+Shift+Delete)

---

## 🎯 Feature Walkthrough

### 1. Dashboard
**Location**: http://localhost:3000/dashboard  
**Shows**:
- Total Freight amount
- Pending Payments
- Active Vehicles count
- Total Parties
- Monthly revenue chart
- City distribution pie chart
- Quick action buttons

### 2. Cities Master
**Location**: http://localhost:3000/masters/cities  
**Actions**:
- Click "Add City" to create new city
- Enter City Name and State
- View list of all cities
- Edit/Delete buttons for each city

### 3. Vehicles Master
**Location**: http://localhost:3000/masters/vehicles  
**Actions**:
- Add vehicle with: number, type, capacity, owner, insurance details
- View all vehicles in table
- Edit or delete vehicles
- Track insurance expiry

### 4. Drivers Master
**Location**: http://localhost:3000/masters/drivers  
**Actions**:
- Add driver with: name, mobile, license number, expiry
- Maintain driver database
- Track license expiration
- Edit/delete driver records

---

## 📱 Navigation Menu

```
TRIMURTI
├── Dashboard
├── Master Data
│   ├── Consignors
│   ├── Consignees
│   ├── Drivers ✅
│   ├── Vehicles ✅
│   ├── Cities ✅
│   └── Settings
├── Daily Entry
│   ├── L.R. Entry
│   ├── Challan
│   ├── Invoice
│   └── Receipt
├── Reports
├── Administration (Admin only)
│   ├── Users
│   ├── Audit Log
│   └── Settings
└── Logout
```

---

## 🔐 Security

### Default Admin Credentials
- **Email**: admin@trimurti.com
- **Password**: admin123 (hashed with bcrypt)

### Change Password (Future Feature)
To manually change admin password:
```bash
# Generate bcrypt hash for new password
npm run generate-hash "newpassword123"

# Then update database
psql trimurti_tms -c "UPDATE users SET password_hash='<hash>' WHERE email='admin@trimurti.com';"
```

---

## 📊 Database Schema Quick Reference

**Key Tables**:
- `users` - System users with roles
- `roles` - Admin, Operator, Accountant, Viewer
- `cities` - Transportation destinations
- `drivers` - Driver information
- `vehicles` - Trucks and vehicles
- `consignors` - Shippers
- `consignees` - Receivers
- `lorry_receipts` - L.R. bookings (empty, ready for Phase 3)
- `invoices` - Billing records (empty, ready for Phase 5)
- `audit_logs` - Change tracking

**Sample Data Loaded**:
- 1 admin user
- 7 cities (AKOLA, JAIPUR, BULDHANA, AURAD, KHUDAI, PARDHANI, BULDHANA)
- GST settings for Indian states
- Financial year 2025-2026

---

## 🚦 Development Workflow

1. **Frontend Development**: Files update hot-reload in browser
2. **Backend Development**: Changes require server restart
3. **Database Changes**: Use scripts/ folder for migrations
4. **Testing**: Use curl commands or Postman for API testing

---

## 📝 Common Commands

```bash
# Start development
pnpm dev

# Build frontend
pnpm build

# Start production server
pnpm start

# Run backend only
node server.js

# Connect to database
psql trimurti_tms

# View logs (backend terminal)
# Shows all API calls and errors

# View frontend in browser
http://localhost:3000
```

---

## 🎓 Learning Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Express.js Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/

---

## ✅ Verification Checklist

After starting the system:

- [ ] Can open http://localhost:3000
- [ ] Can login with admin@trimurti.com / admin123
- [ ] Dashboard displays correctly with charts
- [ ] Can navigate to Cities page
- [ ] Can add a new city
- [ ] City appears in table after creation
- [ ] Can navigate to Vehicles page
- [ ] Can add a new vehicle
- [ ] Can navigate to Drivers page
- [ ] Can add a new driver
- [ ] API endpoints respond (test with curl)
- [ ] Database shows new records (psql)

---

## 🎉 You're Ready!

The TRIMURTI Transport Management System is now running with:
✅ Full authentication system  
✅ Dashboard with analytics  
✅ Master data management  
✅ Role-based access control  
✅ Audit logging  
✅ Professional UI  

**Next Phase**: Build L.R. Entry module with goods booking and freight calculations.

For detailed documentation, see `SETUP.md` and `IMPLEMENTATION_STATUS.md`.

---

## 💡 Pro Tips

1. **Use browser DevTools**: F12 to see console logs and network requests
2. **Keep terminal open**: Shows backend logs for debugging
3. **Check database**: Use `psql trimurti_tms` to verify data persistence
4. **Postman**: Import API endpoints for easier testing
5. **Git**: Commit after each feature to track progress

**Need help?** Check error messages in browser console (F12) or backend terminal.
