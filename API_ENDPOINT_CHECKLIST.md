# API Endpoint Update Checklist

Quick reference for updating API endpoints to support transport isolation.

## Template Pattern

All API endpoints handling master data or transactional data must follow this pattern:

### GET Endpoint
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/db';
import { requireTransportAuth } from '@/lib/transport-auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    
    // 1. Get authenticated user's transport ID
    const transportId = await requireTransportAuth(request);
    
    // 2. Add transport filter to query
    const { rows } = await sql`
      SELECT * FROM <table>
      WHERE transport_id = ${transportId}
      ORDER BY id DESC
    `;
    
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching data', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### POST Endpoint
```typescript
export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    
    // 1. Get authenticated user's transport ID
    const transportId = await requireTransportAuth(request);
    
    const body = await request.json();
    
    // 2. Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // 3. Add transport_id to INSERT
    const { rows } = await sql`
      INSERT INTO <table> (
        transport_id,  <!-- Add this -->
        name,
        ...
      )
      VALUES (
        ${transportId},  <!-- Add this -->
        ${body.name},
        ...
      )
      RETURNING *
    `;
    
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating record', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Step-by-Step Checklist

For each endpoint file:

### 1. Imports
- [ ] Import `NextRequest` instead of `Request`
- [ ] Import `requireTransportAuth` from `@/lib/transport-auth`

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { requireTransportAuth } from '@/lib/transport-auth';
```

### 2. GET Handler
- [ ] Change `GET(request: Request)` → `GET(request: NextRequest)`
- [ ] Add `const transportId = await requireTransportAuth(request);`
- [ ] Add `WHERE transport_id = ${transportId}` to all SELECT queries
- [ ] Add transport filter to any JOIN conditions

### 3. POST Handler
- [ ] Change `POST(request: Request)` → `POST(request: NextRequest)`
- [ ] Add `const transportId = await requireTransportAuth(request);`
- [ ] Add `transport_id,` to INSERT column list
- [ ] Add `${transportId},` to INSERT values
- [ ] Update duplicate check queries to filter by transport: `WHERE transport_id = ${transportId}`

### 4. PUT/PATCH Handler (if exists)
- [ ] Change to `NextRequest`
- [ ] Get transport ID
- [ ] Add `WHERE transport_id = ${transportId}` to UPDATE
- [ ] Verify user can only update their transport's data

### 5. DELETE Handler (if exists)
- [ ] Change to `NextRequest`
- [ ] Get transport ID
- [ ] Add `WHERE transport_id = ${transportId}` to DELETE
- [ ] Prevent deleting other transport's data

### 6. Error Handling
- [ ] Update error messages if needed
- [ ] Ensure 403 returned for unauthorized transport access
- [ ] Ensure 401 returned for unauthenticated requests

## Tables Requiring Updates

Priority order for endpoint updates:

### 🔴 Critical (Used for LR entry)
- [ ] [app/api/masters/consignors/route.ts](app/api/masters/consignors/route.ts) - ✅ DONE
- [ ] [app/api/masters/consignees/route.ts](app/api/masters/consignees/route.ts)
- [ ] [app/api/daily-entry/lr-entries/route.ts](app/api/daily-entry/lr-entries/route.ts) - ✅ DONE

### 🟠 High Priority (Daily operations)
- [ ] [app/api/masters/drivers/route.ts](app/api/masters/drivers/route.ts)
- [ ] [app/api/masters/vehicles/route.ts](app/api/masters/vehicles/route.ts)
- [ ] [app/api/masters/cities/route.ts](app/api/masters/cities/route.ts)
- [ ] [app/api/masters/routes/route.ts](app/api/masters/routes/route.ts)
- [ ] [app/api/masters/freight-rates/route.ts](app/api/masters/freight-rates/route.ts)

### 🟡 Medium Priority (Administrative)
- [ ] [app/api/daily-entry/challans/route.ts](app/api/daily-entry/challans/route.ts)
- [ ] [app/api/financial/invoices/route.ts](app/api/financial/invoices/route.ts)
- [ ] [app/api/financial/receipts/route.ts](app/api/financial/receipts/route.ts)

### 🟢 Low Priority (Reports, settings)
- [ ] [app/api/reports/](app/api/reports/) - All endpoints
- [ ] [app/api/settings/](app/api/settings/) - Per-transport settings
- [ ] [app/api/search/](app/api/search/) - Add transport filter

## Testing After Update

For each endpoint:

```bash
# 1. Test authenticated request
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/masters/consignors

# 2. Verify transport_id filter
# - Transport A should see only its data
# - Transport B should see only its data
# - Switching tokens should show different data

# 3. Test duplicate prevention
# - Duplicate check must include transport_id filter
# - Duplicates should be allowed across transports

# 4. Test error cases
# - Missing auth token → 401
# - Wrong token → 403 or 401
# - Valid token → 200 with filtered data
```

## Common Query Patterns

### Select with transport filter
```typescript
const { rows } = await sql`
  SELECT * FROM table_name
  WHERE transport_id = ${transportId}
`;
```

### Select with multiple filters
```typescript
const { rows } = await sql`
  SELECT * FROM table_name
  WHERE transport_id = ${transportId}
  AND status = 'active'
  ORDER BY name ASC
`;
```

### Join with transport filter
```typescript
const { rows } = await sql`
  SELECT a.*, b.name
  FROM table_a a
  LEFT JOIN table_b b ON b.id = a.b_id
  WHERE a.transport_id = ${transportId}
  AND b.transport_id = ${transportId}
`;
```

### Insert with transport_id
```typescript
const { rows } = await sql`
  INSERT INTO table_name (
    transport_id,
    name,
    value
  ) VALUES (
    ${transportId},
    ${body.name},
    ${body.value}
  )
  RETURNING *
`;
```

### Update with transport verification
```typescript
const { rows } = await sql`
  UPDATE table_name
  SET name = ${body.name}
  WHERE id = ${id}
  AND transport_id = ${transportId}
  RETURNING *
`;
```

### Delete with transport verification
```typescript
const result = await sql`
  DELETE FROM table_name
  WHERE id = ${id}
  AND transport_id = ${transportId}
`;
```

## Error Responses

### Unauthorized (missing token)
```json
{
  "error": "Unauthorized: No valid authentication token",
  "status": 401
}
```

### Forbidden (not transport admin)
```json
{
  "error": "Forbidden: Only transport admins can access this resource",
  "status": 403
}
```

### Not Found (record belongs to other transport)
```json
{
  "error": "Record not found",
  "status": 404
}
```

## Quick Reference Card

```typescript
// Step 1: Import
import { requireTransportAuth } from '@/lib/transport-auth';

// Step 2: Get transport ID
const transportId = await requireTransportAuth(request);

// Step 3: Filter queries
WHERE transport_id = ${transportId}

// Step 4: Insert transport
${transportId} in VALUES clause

// That's it! Follow the pattern.
```

---

**Status**: Use this checklist to track endpoint updates
**Last Updated**: April 2025
