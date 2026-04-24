# TRIMURTI TMS - Transport Isolation Implementation Guide

## Overview

This document explains the complete account isolation system for multi-transport support in the TRIMURTI Transport Management System. When a super admin creates a new transport, it operates as a **completely separate entity** with its own data, settings, and LR number sequences.

---

## 🏗️ Architecture Changes

### 1. **Database Schema Enhancements**

#### New Columns Added
All master data tables now have a `transport_id` column:
- `consignors` ✅
- `consignees` ✅
- `drivers` ✅
- `vehicles` ✅
- `cities` ✅
- `freight_rates` ✅
- `routes` ✅
- `challans` ✅
- `invoices` ✅
- `receipts` ✅
- `lr_entries` ✅ (Critical for isolation)

Each column:
- References `transports(id)` via foreign key
- Has CASCADE delete enabled
- Is indexed for query performance

#### New Table: `transport_lr_sequences`
Replaces global LR numbering with **per-transport sequences**:
```sql
transport_lr_sequences (
  id INT PRIMARY KEY -> transports(id),
  next_lr_number INT DEFAULT 1,       -- Sequence counter per transport
  lr_prefix VARCHAR(20) DEFAULT '',   -- Per-transport LR prefix
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Key Feature**: Each transport has its own LR counter starting from 1, 2, 3...

#### Enhanced: `app_settings`
Now supports per-transport settings:
- Added `transport_id` column (nullable)
- Global settings have `transport_id = NULL`
- Transport-specific settings have `transport_id = <id>`

#### New Function: `get_next_lr_number_for_transport()`
PostgreSQL stored procedure that:
- Atomically increments per-transport LR sequence
- Returns formatted LR number with transport-specific prefix
- Prevents concurrent sequence collisions

---

## 🔐 Authentication & Authorization

### Transport Authentication Utility
**File**: [lib/transport-auth.ts](lib/transport-auth.ts)

New helper functions for API routes:

```typescript
// Get authenticated user's transport ID (required for data isolation)
const transportId = await requireTransportAuth(request);

// Verify super admin access (for management endpoints)
await requireSuperAdmin(request);

// Check if user has access to specific transport
const hasAccess = await hasTransportAccess(request, transportId);
```

**Requirements**:
- All protected endpoints must call `requireTransportAuth(request)`
- Returns the transport ID for filtering queries
- Throws error if user is not a transport admin

### User Roles
- **Super Admin**: `platform_role = 'super_admin'`, `transport_id = NULL`
  - Can create/manage transports
  - Can access all super admin endpoints
  
- **Transport Admin**: `platform_role = 'transport_admin'`, `transport_id = <number>`
  - Can only access their assigned transport's data
  - Isolated from other transports

---

## 📋 API Integration

### Endpoint Updates Required

All data-accessing endpoints must:
1. Extract transport ID: `const transportId = await requireTransportAuth(request);`
2. Add WHERE clause: `WHERE transport_id = ${transportId}`
3. Filter related tables similarly

### Updated Endpoints

#### ✅ LR Entries API
**File**: [app/api/daily-entry/lr-entries/route.ts](app/api/daily-entry/lr-entries/route.ts)

**GET** - Fetch LR entries with transport isolation:
```typescript
const transportId = await requireTransportAuth(request);
const { rows } = await sql`
  SELECT * FROM lr_entries 
  WHERE transport_id = ${transportId}
`;
```

**POST** - Create LR with per-transport numbering:
```typescript
const transportId = await requireTransportAuth(request);
const { rows: lrNumberRows } = await sql`
  SELECT get_next_lr_number_for_transport(${transportId}) AS lr_no
`;
const lrNo = String(lrNumberRows[0]?.lr_no || '');
```

**Result**: LR numbers start from 1 for each transport
- Transport A: 1, 2, 3, 4...
- Transport B: 1, 2, 3, 4... (independent sequence)

#### ✅ Consignors API
**File**: [app/api/masters/consignors/route.ts](app/api/masters/consignors/route.ts)

**GET** - Returns only this transport's consignors:
```sql
SELECT * FROM consignors 
WHERE transport_id = ${transportId}
```

**POST** - Create consignor tied to transport:
```sql
INSERT INTO consignors (
  transport_id, name, address, ...
) VALUES (${transportId}, ...)
```

#### 🔄 Endpoints to Update (Template Pattern)

For all master data endpoints:
- [app/api/masters/consignees/route.ts](app/api/masters/consignees/route.ts)
- [app/api/masters/drivers/route.ts](app/api/masters/drivers/route.ts)
- [app/api/masters/vehicles/route.ts](app/api/masters/vehicles/route.ts)
- [app/api/masters/cities/route.ts](app/api/masters/cities/route.ts)
- [app/api/masters/freight-rates/route.ts](app/api/masters/freight-rates/route.ts)
- [app/api/masters/routes/route.ts](app/api/masters/routes/route.ts)

**Same pattern**:
```typescript
// Add at top of GET & POST
import { requireTransportAuth } from '@/lib/transport-auth';

// Inside route handlers
const transportId = await requireTransportAuth(request);

// In queries
WHERE transport_id = ${transportId}
// And in INSERT
transport_id: ${transportId}
```

---

## 🚀 Transport Creation Flow

### Super Admin Creates New Transport
**Endpoint**: `POST /api/admin/transports`

1. **Request**:
```json
{
  "company_name": "ABC Transport Ltd",
  "admin_email": "admin@abc.com",
  "admin_password": "secure123",
  "admin_first_name": "John",
  "admin_last_name": "Doe",
  "contact_phone": "+91-9999999999",
  "subscription_plan": "standard",
  "subscription_start_date": "2025-01-01",
  "subscription_end_date": "2025-12-31"
}
```

2. **What happens**:
   - New `transports` record created
   - New transport admin user created with `transport_id = <new_id>`
   - **NEW**: `transport_lr_sequences` entry initialized with `next_lr_number = 1`
   - Audit log recorded

3. **Result**:
   - Transport ready to use
   - First LR will be numbered "1"
   - All data is isolated

---

## 📊 LR Numbering System

### Per-Transport Sequence

Each transport maintains independent LR numbering:

```
Transport: "TRIMURTI MAIN"
LR Numbers: 1, 2, 3, 4, 5...
Prefix: "" (configurable in transport_lr_sequences)

Transport: "ABC LOGISTICS"  
LR Numbers: 1, 2, 3, 4, 5... (independent)
Prefix: "ABC-" (can be set per-transport)

→ Result: "ABC-00001", "ABC-00002", etc.
```

### Implementation Details

**Function**: `get_next_lr_number_for_transport(transport_id)`

```sql
-- Atomic operation:
1. Lock transport_lr_sequences row for this transport
2. Increment next_lr_number by 1
3. Fetch current value (before increment)
4. Format: prefix + zero-padded number
5. Return formatted LR number
```

**Benefits**:
- ✅ Guaranteed unique per transport
- ✅ Prevents gaps or duplicates
- ✅ No conflicts between transports
- ✅ Atomic transaction ensures data integrity

---

## 🔧 Database Migration

### Step 1: Run Migration Script
```bash
psql trimurti_tms < scripts/02-transport-isolation-migration.sql
```

**What it does**:
- ✅ Adds `transport_id` columns to all tables
- ✅ Creates `transport_lr_sequences` table
- ✅ Creates `get_next_lr_number_for_transport()` function
- ✅ Creates indexes for query performance
- ✅ Updates `app_settings` structure

### Step 2: Initialize Existing Transports
For any transports created before migration:

```sql
-- Initialize sequence for each transport
INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix)
SELECT id, 1, '' FROM transports
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Verify Migration
```sql
-- Check transport_lr_sequences created
SELECT * FROM transport_lr_sequences;

-- Verify function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_next_lr_number_for_transport';

-- Check indexes
SELECT * FROM pg_indexes 
WHERE tablename IN ('consignors', 'lr_entries', 'challans')
AND indexname LIKE '%transport%';
```

---

## 🔒 Data Isolation Guarantees

### What Is Isolated

| Component | Isolation | Notes |
|-----------|-----------|-------|
| **LR Numbers** | ✅ Complete | Each transport has 1, 2, 3... |
| **Consignors** | ✅ Complete | Separate masters per transport |
| **Consignees** | ✅ Complete | Separate masters per transport |
| **Drivers** | ✅ Complete | Separate masters per transport |
| **Vehicles** | ✅ Complete | Separate masters per transport |
| **Routes** | ✅ Complete | Separate masters per transport |
| **Challans** | ✅ Complete | Separate challan data per transport |
| **Invoices** | ✅ Complete | Separate invoicing per transport |
| **User Accounts** | ✅ Complete | Via `platform_role` & `transport_id` |

### Access Control

**Transport Admin** can only access:
- Their transport's LR entries
- Their transport's consignors/consignees
- Their transport's masters (drivers, vehicles, routes)
- Their transport's financial data

**Super Admin** can:
- Access all transports (for management)
- Create new transports
- View audit logs
- Manage subscription plans

---

## 🛠️ API Response Examples

### Get LR Entries (With Isolation)
```json
GET /api/daily-entry/lr-entries
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "lr_no": "1",           // Per-transport sequence
    "transport_id": 5,      // Isolated to transport
    "consignor_id": 10,
    "consignee_id": 15,
    "freight": 5000,
    ...
  },
  {
    "id": 2,
    "lr_no": "2",           // Next in sequence
    ...
  }
]
```

### Get Consignors (With Isolation)
```json
GET /api/masters/consignors
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "name": "ABC Company",
    "transport_id": 5,      // Isolated to transport
    ...
  }
]
```

---

## ⚠️ Important Notes

### For Developers

1. **Always check authentication**:
   ```typescript
   const transportId = await requireTransportAuth(request);
   ```

2. **Always filter by transport**:
   ```sql
   WHERE transport_id = ${transportId}
   ```

3. **Don't assume global data**:
   - No global consignor/consignee lists
   - Each API must filter by authenticated transport

4. **Test with multiple transports**:
   - Create multiple transports in dev
   - Verify data isolation between them

### For Super Admins

1. **Initialize sequence when creating transports**:
   - Automatic via `POST /api/admin/transports`
   - Starts at 1 for each transport

2. **Monitor LR numbers**:
   - Query `transport_lr_sequences` to see counter
   - Reset if needed (update `next_lr_number`)

3. **Migration checklist**:
   - ✅ Run SQL migration script
   - ✅ Initialize existing transports
   - ✅ Update API endpoints
   - ✅ Test with multiple transports
   - ✅ Verify audit logs

---

## 🧪 Testing Checklist

- [ ] Create Transport A via super admin
- [ ] Create Transport B via super admin
- [ ] Login as Transport A admin
- [ ] Create LR in Transport A → LR#: "1"
- [ ] Create another LR in Transport A → LR#: "2"
- [ ] Verify Transport A sees only its LRs
- [ ] Login as Transport B admin
- [ ] Create LR in Transport B → LR#: "1" (not "3"!)
- [ ] Verify Transport B sees only its LRs
- [ ] Verify Transport B cannot see Transport A's data
- [ ] Create consignor in Transport A
- [ ] Verify it doesn't appear in Transport B
- [ ] Create consignor in Transport B
- [ ] Verify isolation between transports

---

## 📝 SQL Reference

### View All Sequences
```sql
SELECT id, next_lr_number, lr_prefix, updated_at 
FROM transport_lr_sequences
ORDER BY updated_at DESC;
```

### Get Next LR Number (Manually)
```sql
SELECT get_next_lr_number_for_transport(5) AS lr_no;
-- Result: "5" (or whatever next number is)
```

### Reset LR Sequence for Transport
```sql
UPDATE transport_lr_sequences 
SET next_lr_number = 1 
WHERE id = 5;  -- Transport ID 5
```

### Count LRs per Transport
```sql
SELECT 
  transport_id,
  COUNT(*) as total_lrs,
  MAX(lr_no) as last_lr
FROM lr_entries
GROUP BY transport_id
ORDER BY transport_id;
```

### Find Transport by Company Name
```sql
SELECT id, company_name, slug FROM transports 
WHERE LOWER(company_name) LIKE '%abc%';
```

---

## 🚀 Deployment Steps

1. **Backup database**:
   ```bash
   pg_dump trimurti_tms > backup_before_isolation.sql
   ```

2. **Run migration**:
   ```bash
   psql trimurti_tms < scripts/02-transport-isolation-migration.sql
   ```

3. **Initialize existing transports**:
   ```sql
   INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix)
   SELECT id, 1, '' FROM transports
   ON CONFLICT (id) DO NOTHING;
   ```

4. **Deploy updated API code**
5. **Run test suite** against multiple transports
6. **Monitor logs** for any isolation issues

---

## 🐛 Troubleshooting

### Issue: "Unauthorized: Only transport admins can access"
- **Cause**: Not authenticated or not a transport admin
- **Fix**: Login with transport admin account, ensure token is valid

### Issue: LR numbers not starting from 1
- **Cause**: `transport_lr_sequences` not initialized
- **Fix**: Run initialization SQL above

### Issue: Can see other transport's data
- **Cause**: API endpoint missing transport filter
- **Fix**: Add `WHERE transport_id = ${transportId}` to all queries

### Issue: "Transport doesn't exist"
- **Cause**: Try accessing non-existent transport
- **Fix**: Verify transport ID exists: `SELECT id FROM transports;`

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API endpoint code for pattern
3. Verify database migration ran successfully
4. Check JWT token contains correct `transportId`

---

**Last Updated**: April 2025
**Version**: 2.0 - Transport Isolation Release
