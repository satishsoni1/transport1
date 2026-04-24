# Installation & Deployment Guide

## 🚀 Quick Start: Transport Isolation Setup

### Prerequisites
- PostgreSQL database running
- Node.js 18+ installed
- Existing TRIMURTI TMS database

---

## 📋 Step 1: Database Migration (REQUIRED)

### Backup Your Database First
```bash
pg_dump trimurti_tms > backup_before_isolation_$(date +%Y%m%d_%H%M%S).sql
```

### Run the Migration
```bash
# Connect and run migration
psql trimurti_tms < scripts/02-transport-isolation-migration.sql
```

### Verify Migration Success
```bash
# Check if tables have transport_id
psql trimurti_tms << EOF
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'lr_entries' AND column_name = 'transport_id';
EOF
# Should return: transport_id

# Check if function exists
psql trimurti_tms << EOF
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_name = 'get_next_lr_number_for_transport';
EOF
# Should return: get_next_lr_number_for_transport
```

### Initialize Existing Transports (if you have data)
```bash
psql trimurti_tms << EOF
  INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix)
  SELECT id, 1, '' FROM transports
  ON CONFLICT (id) DO NOTHING;
EOF
```

---

## 📦 Step 2: Update Code

### Install Dependencies (no new packages needed)
```bash
cd /path/to/project
pnpm install
```

### Key Files Added/Updated
✅ [lib/transport-auth.ts](lib/transport-auth.ts) - New authentication utility  
✅ [scripts/02-transport-isolation-migration.sql](scripts/02-transport-isolation-migration.sql) - Database migration  
✅ [app/api/daily-entry/lr-entries/route.ts](app/api/daily-entry/lr-entries/route.ts) - Updated with isolation  
✅ [app/api/masters/consignors/route.ts](app/api/masters/consignors/route.ts) - Updated with isolation  
✅ [scripts/bootstrap-db.ts](scripts/bootstrap-db.ts) - Updated to initialize sequences  
✅ [app/api/admin/transports/route.ts](app/api/admin/transports/route.ts) - Updated with sequence init  

### Remaining Endpoints to Update
See [API_ENDPOINT_CHECKLIST.md](API_ENDPOINT_CHECKLIST.md) for the complete list.

Copy the pattern from [app/api/masters/consignors/route.ts](app/api/masters/consignors/route.ts) to:
- `app/api/masters/consignees/route.ts`
- `app/api/masters/drivers/route.ts`
- `app/api/masters/vehicles/route.ts`
- `app/api/masters/cities/route.ts`
- `app/api/masters/freight-rates/route.ts`
- `app/api/masters/routes/route.ts`
- And other data-accessing endpoints

---

## 🧪 Step 3: Test Transport Isolation

### Test Scenario 1: Create Two Transports
```bash
# Login as super admin
# Go to: Admin Panel → Manage Transports
# Create Transport A: "Transport Company A"
# Create Transport B: "Transport Company B"
```

### Test Scenario 2: Create LRs in Transport A
```bash
# Login as Admin of Transport A
# Create LR Entry 1 → LR#: "1"
# Create LR Entry 2 → LR#: "2"
# Create LR Entry 3 → LR#: "3"
# Note: LR numbers start from 1 for this transport
```

### Test Scenario 3: Create LRs in Transport B
```bash
# Login as Admin of Transport B
# Create LR Entry 1 → LR#: "1" (NOT "4"!)
# Create LR Entry 2 → LR#: "2"
# Create LR Entry 3 → LR#: "3"
# Note: INDEPENDENT sequence, also starts from 1
```

### Test Scenario 4: Verify Isolation
```bash
# Login as Transport A admin
# View LR list → Should see: 1, 2, 3
# Should NOT see Transport B's entries

# Login as Transport B admin
# View LR list → Should see: 1, 2, 3
# Should NOT see Transport A's entries
```

### Test Scenario 5: Masters Isolation
```bash
# Login as Transport A admin
# Create Consignor: "ABC Shipping"
# List Consignors → Should see only "ABC Shipping"

# Login as Transport B admin
# List Consignors → Should NOT see "ABC Shipping"
# Create Consignor: "ABC Shipping" (same name, different transport)
# Now Transport B has its own "ABC Shipping"
```

---

## 🚀 Step 4: Deployment Checklist

Before deploying to production:

- [ ] Database migration tested on staging
- [ ] Backup of production database created
- [ ] All API endpoints updated (or not yet used)
- [ ] Tests pass with multiple transports
- [ ] Error handling working (401 unauthorized, 403 forbidden)
- [ ] LR sequences initialized for all transports
- [ ] Audit logs updated
- [ ] Frontend updated (if needed)
- [ ] User documentation updated
- [ ] Monitoring configured

---

## 🔍 Verification Commands

### Check Transport Count
```bash
psql trimurti_tms -c "SELECT id, company_name FROM transports;"
```

### Check LR Sequences
```bash
psql trimurti_tms -c "SELECT id, next_lr_number, lr_prefix FROM transport_lr_sequences;"
```

### Get Next LR Number
```bash
psql trimurti_tms -c "SELECT get_next_lr_number_for_transport(1);"
```

### Count LRs per Transport
```bash
psql trimurti_tms << EOF
  SELECT 
    transport_id, 
    COUNT(*) as total_lrs,
    MAX(lr_no) as last_lr
  FROM lr_entries
  GROUP BY transport_id
  ORDER BY transport_id;
EOF
```

### Verify Function
```bash
psql trimurti_tms -c "\df get_next_lr_number_for_transport"
```

---

## 📝 Environmental Variables (No Changes)

The migration doesn't require new environment variables. Continue using:
```
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-key
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...
```

---

## 🐛 Troubleshooting

### Issue: "table transport_lr_sequences does not exist"
**Solution**: Run migration: `psql trimurti_tms < scripts/02-transport-isolation-migration.sql`

### Issue: "function get_next_lr_number_for_transport does not exist"
**Solution**: Run migration script (it creates the function)

### Issue: LR numbers not starting from 1
**Solution**: Initialize sequences:
```sql
INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix)
SELECT id, 1, '' FROM transports
ON CONFLICT (id) DO NOTHING;
```

### Issue: "Unauthorized: No valid authentication token"
**Solution**: Pass JWT token in Authorization header:
```bash
curl -H "Authorization: Bearer <jwt_token>" \
  http://localhost:3000/api/daily-entry/lr-entries
```

### Issue: Cannot see other transport's data
**This is expected!** Transport isolation is working correctly. Each admin only sees their own transport's data.

---

## 📞 Support & Documentation

- **Full Technical Guide**: [TRANSPORT_ISOLATION_GUIDE.md](TRANSPORT_ISOLATION_GUIDE.md)
- **Implementation Checklist**: [API_ENDPOINT_CHECKLIST.md](API_ENDPOINT_CHECKLIST.md)
- **Summary**: [TRANSPORT_ISOLATION_SUMMARY.md](TRANSPORT_ISOLATION_SUMMARY.md)

---

## 🎓 How to Update Remaining Endpoints

See [API_ENDPOINT_CHECKLIST.md](API_ENDPOINT_CHECKLIST.md) for the complete template.

Quick pattern:
```typescript
// 1. Add import
import { requireTransportAuth } from '@/lib/transport-auth';

// 2. Get transport ID
const transportId = await requireTransportAuth(request);

// 3. Filter queries
WHERE transport_id = ${transportId}

// 4. Add to inserts
${transportId} in VALUES
```

---

## ✅ Success Criteria

Your implementation is successful when:

✅ Two transports can be created  
✅ Each transport has independent LR numbering (1, 2, 3...)  
✅ Transport A admin cannot see Transport B's data  
✅ Transport B admin cannot see Transport A's data  
✅ Masters (consignors, drivers) are isolated per transport  
✅ API returns 403 for unauthorized transport access  
✅ Database queries filter by transport_id  

---

**Version**: 2.0 - Transport Isolation  
**Last Updated**: April 2025  
**Status**: Production Ready (after endpoint updates)

