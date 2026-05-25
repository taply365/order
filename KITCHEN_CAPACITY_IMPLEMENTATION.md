# Smart Kitchen Capacity & Routing Implementation

## Overview

This system provides unified kitchen capacity management across **online (pickup) orders** and **POS (table) orders**. Instead of separate kitchen queues, all orders compete for the same kitchen capacity and are displayed in one unified queue sorted by priority and due time.

---

## Key Concepts

### Kitchen Capacity = ONE SHARED QUEUE

Not separate rows for:
- ❌ Online queue (capacity 5)
- ❌ POS queue (capacity 5)

But instead:
- ✅ Unified queue (capacity 5 total for BOTH online + POS)

### Example

If `maxOrdersPerSlot = 5` and the 19:30 slot:
- Has 3 online orders (pickupAt = 19:30)
- Has 2 POS orders (kitchenDueAt = 19:30)

Then:
- Used capacity = 5/5 ✓ FULL
- Next online order gets moved to 19:45
- Next POS order also must wait for next available slot

---

## Database Schema

### orders Table
```sql
-- Existing columns + new ones:
pickupAt TIMESTAMP          -- Customer promise time = Kitchen due time
type VARCHAR(50)           -- "online"
status VARCHAR(50)         -- PREPARING, READY, COMPLETED, CANCELLED
data JSON                  -- Order items/details
customerId VARCHAR(255)    -- Who placed the order
createdAt TIMESTAMP        -- When order was created
```

### tableOrders Table  (UPDATED)
```sql
-- Existing columns:
tableId INT                -- Links to tables(id)
data JSON                  -- Order items/details
totalPrice INT
currency VARCHAR(10)
status VARCHAR(20)         -- PENDING, PREPARING, READY, SERVED, CANCELLED

-- NEW columns (added via migration 000032):
businessId INT             -- Links to businesses(id) - NOW AVAILABLE
source VARCHAR(50)         -- Always 'pos'
priority VARCHAR(50)       -- Always 'high'
kitchenDueAt TIMESTAMP     -- When kitchen should have order ready
kitchenStartAt TIMESTAMP   -- When to start preparing
```

### Key Difference

| Field | Online Orders | POS/Table Orders |
|-------|--------------|------------------|
| `pickupAt` | ✅ Customer promise time | ❌ NULL (customer in restaurant) |
| `kitchenDueAt` | = pickupAt | Set to ~15 min after order |
| `kitchenStartAt` | pickupAt - prepMinutes | kitchenDueAt - prepMinutes |
| `source` | "online" | "pos" |
| `priority` | "normal" | "high" |

---

## Core Functions

### 1. getKitchenLoadForSlot(businessId, slotTime)

**Purpose**: Count active orders in a kitchen slot (BOTH online + POS)

**Query**:
```sql
SELECT COUNT(*) FROM (
  SELECT id FROM orders WHERE businessId = ? AND pickupAt = ? AND status NOT IN ('cancelled', 'completed')
  UNION ALL
  SELECT id FROM tableOrders WHERE businessId = ? AND kitchenDueAt = ? AND status NOT IN ('cancelled', 'completed')
) AS kitchen_load
```

**Example**:
```javascript
const load = await getKitchenLoadForSlot(1, new Date('2024-05-22T19:30:00Z'));
// Returns: 5 (means slot is full if maxOrdersPerSlot = 5)
```

---

### 2. getAvailableKitchenSlot(businessId, earliestReady, maxOrdersPerSlot, slotMinutes)

**Purpose**: Find first available slot with space (considering BOTH order types)

**Logic**:
1. Round earliestReady up to nearest slot
2. Check load for that slot
3. If full, move to next slot and repeat
4. Return first slot with available capacity

**Example**:
```javascript
const nextSlot = await getAvailableKitchenSlot(
  businessId: 1,
  earliestReady: new Date('2024-05-22T17:45:00Z'),
  maxOrdersPerSlot: 5,
  slotMinutes: 15
);
// Might return 17:45 (if has space) or 18:00 (if 17:45 is full)
```

---

### 3. getUnifiedKitchenQueue(businessId, status)

**Purpose**: Fetch ALL orders for kitchen display in correct priority order

**Returns**: UNION query result with both tables:
- Online orders: source='online', priority='normal', kitchenDueAt=pickupAt
- POS orders: source='pos', priority='high', kitchenDueAt=kitchenDueAt

**Sort Order**:
1. priority (high=1, normal=2) ← POS first
2. kitchenDueAt (earliest first)
3. createdAt (oldest first)

**Example Response**:
```javascript
[
  {
    id: 101,
    source: 'pos',           // POS order - appears first
    priority: 'high',
    kitchenDueAt: '2024-05-22T17:45:00Z',
    status: 'PREPARING',
    data: {...},
    customerId: null,        // No customer ID (table order)
  },
  {
    id: 102,
    source: 'pos',
    priority: 'high',
    kitchenDueAt: '2024-05-22T18:00:00Z',
    status: 'PENDING',
    data: {...},
  },
  {
    id: 201,
    source: 'online',        // Online order
    priority: 'normal',
    kitchenDueAt: '2024-05-22T18:00:00Z',  // = pickupAt
    status: 'PREPARING',
    data: {...},
    customerId: 'cust_123',
  }
]
```

---

### 4. createTableOrder(orderData, prepMinutes)

**Purpose**: Create a POS order with proper kitchen fields

**Parameters**:
```javascript
{
  tableId: 5,
  items: [...],
  totalPrice: 2500,      // cents
  currency: 'DKK',
  // prepMinutes: 15     // optional, defaults to 15
}
```

**Sets automatically**:
- `businessId` ← fetched from tables(tableId)
- `source` = 'pos'
- `priority` = 'high'
- `kitchenDueAt` = now + prepMinutes
- `kitchenStartAt` = now
- `status` = 'PENDING'

**Example**:
```javascript
import { createTableOrder } from "./kitchen/tableOrderHandler.js";

const newOrder = await createTableOrder({
  tableId: 5,
  items: [{sku: 'burger', qty: 2}, {sku: 'fries', qty: 1}],
  totalPrice: 2500,
  currency: 'DKK'
}, 20); // 20 min prep time

// Returns created order with all fields filled
```

---

## Online Order Flow (pickupTimeCalculation)

### Old Way (SINGLE source - online only)
```javascript
// Checked ONLY orders table
SELECT COUNT(*) FROM orders WHERE pickupAt = '19:30'
```

### New Way (UNIFIED - both sources)
```javascript
// 1. Get kitchen capacity settings
const settings = await getKitchenCapacity(businessId);

// 2. Calculate earliest possible pickup time
const now = new Date();
const earliestReady = new Date(now + prepMinutes * 60 * 1000);

// 3. Find first available slot (checks BOTH orders + tableOrders)
const pickupTime = await getAvailableKitchenSlot(
  businessId,
  earliestReady,
  maxOrdersPerSlot,
  slotMinutes
);

// 4. Get slot availability for UI display
const availableSlots = await getAvailableSlots(
  businessId,
  pickupTime,
  maxOrdersPerSlot,
  slotMinutes,
  slotLimit
);

return {
  pickupTime,
  availableSlots,
  // ... other fields
};
```

---

## Kitchen Display Flow

### Endpoint
```
GET /kitchen-routing/business/:id/orders/status/:status
```

### Old Response (online only)
```json
{
  "success": true,
  "data": [
    { "id": 201, "customerId": "...", "pickupAt": "...", ... }
  ]
}
```

### New Response (unified queue)
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "source": "pos",              // NEW - identifies order type
      "priority": "high",           // NEW - kitchen sees POS orders first
      "kitchenDueAt": "2024-05-22T17:45:00Z",
      "tableId": 5,
      "customerId": null,
      "status": "PREPARING",
      "data": {...}
    },
    {
      "id": 201,
      "source": "online",           // NEW
      "priority": "normal",         // NEW
      "kitchenDueAt": "2024-05-22T18:00:00Z",  // NEW (= pickupAt)
      "customerId": "cust_123",
      "status": "PREPARING",
      "data": {...}
    }
  ],
  "note": "This queue combines online (pickup) and POS (table) orders..."
}
```

---

## Implementation Checklist

### Database
- ✅ Migration created: `000032_add_kitchen_fields_to_tableOrders.up.sql`
  - Adds: businessId, source, priority, kitchenDueAt, kitchenStartAt
  - Adds foreign key: businessId → businesses(id)

### Files Created
- ✅ `kitchen/kitchenQueue.js` - Core unified queue functions
  - `getKitchenLoadForSlot(businessId, slotTime)`
  - `getAvailableKitchenSlot(businessId, earliestReady, ...)`
  - `getUnifiedKitchenQueue(businessId, status)`
  - `getAvailableSlots(businessId, pickupTime, ...)`
  - `calculatePOSKitchenTimes(prepMinutes)`
  - `calculateOnlineKitchenTimes(pickupAt, prepMinutes)`

- ✅ `kitchen/tableOrderHandler.js` - POS order creation
  - `createTableOrder(orderData, prepMinutes)`
  - `updateTableOrderStatus(orderId, newStatus)`
  - `getTableOrdersByBusiness(businessId, status)`
  - `getTableOrderKitchenCapacity(orderId)`

### Files Modified
- ✅ `order/calculation.js`
  - Updated `pickupTimeCalculation()` to use shared functions
  - Imports from `kitchen/kitchenQueue.js`
  - Counts both online + POS orders

- ✅ `routerHandler/kitchen.js`
  - Updated `HandleGetOrdersForKitchen()` to use `getUnifiedKitchenQueue()`
  - Returns one queue with both order types
  - Includes source badges for display

---

## Migration Steps (When Ready to Deploy)

1. **Backup database**
   ```bash
   mysqldump -u user -p database > backup.sql
   ```

2. **Run migration**
   ```bash
   # Using your migration tool (e.g., golang-migrate, flyway, etc.)
   migrate -path db/migrations -database "mysql://user:pass@host/db" up
   ```

3. **Update existing tableOrders** (optional, to backfill)
   ```sql
   UPDATE tableOrders t
   LEFT JOIN tables tbl ON t.tableId = tbl.id
   SET t.businessId = tbl.businessId,
       t.source = 'pos',
       t.priority = 'high',
       t.kitchenDueAt = IFNULL(t.kitchenDueAt, DATE_ADD(t.createdAt, INTERVAL 15 MINUTE))
   WHERE t.businessId IS NULL;
   ```

4. **Test endpoints**
   ```bash
   # Test pickup time calculation
   GET /pickup-time/user-business/:id

   # Test kitchen display
   GET /kitchen-routing/business/:id/orders/status/PREPARING

   # Test create table order
   POST /business/:id/table-order (implement if needed)
   ```

---

## Backward Compatibility

### API Responses
- **pickupTimeCalculation()**: No change to response format
  - Still returns `pickupTime`, `availableSlots`, etc.
  - Calculation now considers both order types (hidden logic change)

- **GetOrdersForKitchen()**: Response NOW includes new fields
  - `source` - identifies "online" or "pos"
  - `priority` - "high" or "normal"
  - `kitchenDueAt` - replaces pickupAt for display
  - Old clients should ignore new fields (forward compatible)

### Database
- No changes to existing `orders` table
- `tableOrders` adds new nullable columns
- Existing table orders work (businessId can be backfilled)

---

## Testing Scenarios

### Scenario 1: Fill online slot with POS orders
```
maxOrdersPerSlot = 5
19:30 slot currently has: 3 online orders

Action: Add 2 POS orders with kitchenDueAt = 19:30
Expected: Slot is now FULL (5/5)
Next online order should get 19:45 slot
```

### Scenario 2: Mix of priorities
```
Kitchen queue should show:
[
  POS order (high priority, kitchenDueAt 19:30),  // First
  POS order (high priority, kitchenDueAt 19:30),  // Second
  Online order (normal, kitchenDueAt 19:30),      // Third (lower priority, same due time)
  Online order (normal, kitchenDueAt 19:45)       // Fourth
]
```

### Scenario 3: Slot capacity calculation
```
Slot: 19:30-19:45
maxOrdersPerSlot: 5

Test queries:
1. getKitchenLoadForSlot(1, '2024-05-22T19:30:00Z') → should count all active orders
2. Create online order → checks load
3. Create POS order → checks load
4. Both should reduce available capacity from same pool
```

---

## Common Questions

**Q: Why don't POS orders have pickupAt?**
A: POS orders don't need pickupAt because the customer is already in the restaurant. They don't need to be promised a specific time; the kitchen just needs to have it ready when the table orders it.

**Q: Why HIGH priority for POS, NORMAL for online?**
A: POS customers are waiting in the restaurant. A 2-minute wait is annoying. Online customers are going to come later anyway (pickupAt is in the future), so slight delays matter less.

**Q: Can both orders be in the same slot?**
A: Yes! If pickupAt=19:30 (online) and kitchenDueAt=19:30 (POS), they share the same slot capacity. They're not separate queues.

**Q: How to display to kitchen?**
A: Use `getUnifiedKitchenQueue(businessId, 'PREPARING')`. It returns one list, sorted by priority + due time. Include the `source` field to show badges (🟦 POS | 🟧 Online).

---

## File Locations

```
kitchen/
  ├── kitchenQueue.js          ← Core unified functions
  ├── kitchenCapacity.js       ← Kitchen config (existing)
  └── tableOrderHandler.js     ← POS order creation helper

order/
  └── calculation.js           ← Updated with shared logic

routerHandler/
  ├── kitchen.js               ← Updated kitchen display
  └── tableOrders.js           ← Existing table order handler

db/migrations/
  └── 000032_*.up.sql          ← Add new columns
  └── 000032_*.down.sql        ← Rollback
```

---

## Next Steps

1. ✅ Review this implementation
2. ⏳ Run migration on test database
3. ⏳ Update frontend to display `source` badges
4. ⏳ Test all scenarios above
5. ⏳ Deploy to production
6. ⏳ Monitor kitchen operations
