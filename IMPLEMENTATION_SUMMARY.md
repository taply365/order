# Smart Kitchen Capacity Implementation - Summary

## ✅ Implementation Complete

This document summarizes the smart kitchen capacity/routing system for your restaurant platform.

---

## Problem Solved

### Before
- Online orders and POS orders were **separate kitchen queues**
- No coordination between the two
- If POS orders filled a slot, online orders were unaffected
- Restaurant might oversell kitchen capacity

**Example Problem:**
```
maxOrdersPerSlot = 5

Online queue for 19:30: 5 orders (FULL)
POS queue for 19:30: 5 orders (FULL)
Total actual kitchen load: 10 orders

Kitchen is overloaded but system thinks both are at 5-order limit!
```

### After
- One **unified kitchen queue** for both order types
- Shared capacity pool
- Both online and POS orders compete for same kitchen resources
- Smart pickup time calculation considers POS orders

**Solution:**
```
maxOrdersPerSlot = 5 (TOTAL for BOTH types)

Kitchen capacity for 19:30: 5/5 FULL
  - 3 online orders (pickupAt = 19:30)
  - 2 POS orders (kitchenDueAt = 19:30)

Next online order automatically gets 19:45 slot
Kitchen never overloaded!
```

---

## What Was Built

### 1. Core Unified Kitchen Functions
**File:** `kitchen/kitchenQueue.js`

```javascript
// Count BOTH online + POS orders in a slot
getKitchenLoadForSlot(businessId, slotTime)

// Find first available slot considering both order types
getAvailableKitchenSlot(businessId, earliestReady, maxOrdersPerSlot, slotMinutes)

// Get all orders for kitchen display (unified queue)
getUnifiedKitchenQueue(businessId, status)

// Show available pickup slots to customer
getAvailableSlots(businessId, pickupTime, maxOrdersPerSlot, slotMinutes, slotLimit)

// Calculate kitchen due times
calculatePOSKitchenTimes(prepMinutes)
calculateOnlineKitchenTimes(pickupAt, prepMinutes)
```

### 2. POS Order Handler
**File:** `kitchen/tableOrderHandler.js`

```javascript
// Create POS order with automatic kitchen fields
createTableOrder(orderData, prepMinutes)

// Update POS order status
updateTableOrderStatus(orderId, newStatus)

// List POS orders for a business
getTableOrdersByBusiness(businessId, status)

// Check how many orders share same kitchen due time
getTableOrderKitchenCapacity(orderId)
```

### 3. Updated Online Order Calculation
**File:** `order/calculation.js` (Modified)

```javascript
// Now uses shared kitchen functions!
// Automatically considers POS orders when calculating pickup time

pickupTimeCalculation(businessId)
  ↓
  Uses getAvailableKitchenSlot() (NEW)
  ↓
  Checks load from BOTH tables
```

### 4. Updated Kitchen Display
**File:** `routerHandler/kitchen.js` (Modified)

```javascript
// Now returns unified queue with source badges
HandleGetOrdersForKitchen(req, res)
  ↓
  Uses getUnifiedKitchenQueue() (NEW)
  ↓
  Returns online + POS orders in one list
  ↓
  Sorted by priority (high=POS) then due time
```

### 5. Database Migration
**File:** `db/migrations/000032_add_kitchen_fields_to_tableOrders.up.sql`

```sql
ALTER TABLE tableOrders ADD:
  - businessId (INT, FK to businesses)
  - source (VARCHAR, always 'pos')
  - priority (VARCHAR, always 'high')
  - kitchenDueAt (TIMESTAMP, when order should be ready)
  - kitchenStartAt (TIMESTAMP, when to start prep)
```

---

## Key Design Decisions

### 1. **ONE Unified Queue, Not Separate Tracks**
- ❌ Don't have separate online/POS kitchens
- ✅ Both orders use same maxOrdersPerSlot capacity
- **Why:** Real restaurants have one kitchen; can't process 5 online + 5 POS simultaneously if equipment is shared

### 2. **POS Orders Get HIGH Priority**
- Online orders: priority = 'normal'
- POS orders: priority = 'high'
- **Why:** Customer is in restaurant waiting; online customer comes later anyway

### 3. **Kitchen Due Time = Slot Identifier**
- Online: `pickupAt` = customer promise time = slot identifier
- POS: `kitchenDueAt` = when ready needed = slot identifier
- Both use same field for capacity counting
- **Why:** Simplifies query - just count orders by slot time, regardless of order type

### 4. **Automatic businessId on POS Orders**
- No manual FK setting needed
- `createTableOrder()` fetches businessId from table automatically
- **Why:** Enables direct queries, prevents orphaned orders

### 5. **Backward Compatible**
- Online order API response format unchanged
- Kitchen display adds new fields (old clients ignore them)
- No required changes to existing code
- **Why:** Safer migration, less risk of breaking things

---

## File Structure

```
order/
├── calculation.js                    ← UPDATED: Uses shared functions
├── index.js
├── customer.js
└── KITCHEN_CAPACITY_IMPLEMENTATION.md  ← Full docs (NEW)

kitchen/
├── kitchenQueue.js                   ← Core functions (NEW)
├── tableOrderHandler.js              ← POS order ops (NEW)
├── kitchenCapacity.js                ← Existing config
└── (others)

routerHandler/
├── kitchen.js                        ← UPDATED: Uses unified queue
├── orders.js                         ← No changes (uses calculation.js)
└── tableOrders.js                    ← Existing handler

db/migrations/
├── 000032_add_kitchen_fields_to_tableOrders.up.sql    ← NEW
└── 000032_add_kitchen_fields_to_tableOrders.down.sql  ← NEW

Documentation:
├── KITCHEN_CAPACITY_IMPLEMENTATION.md  ← Full technical specs
├── KITCHEN_QUICK_REFERENCE.md         ← Quick examples
├── KITCHEN_SCHEMA_AND_SQL.md          ← Database details
└── IMPLEMENTATION_SUMMARY.md          ← This file
```

---

## Before & After Comparison

### Feature: Calculate Online Pickup Time

**BEFORE**
```javascript
async function pickupTimeCalculation(businessId) {
  // ... code ...
  
  // Only checked ONLINE orders
  SELECT COUNT(*) FROM orders
  WHERE pickupAt = ?
  AND businessId = ?
}
```

**AFTER**
```javascript
async function pickupTimeCalculation(businessId) {
  // ... code ...
  
  // Uses shared function that checks BOTH
  const pickupTime = await getAvailableKitchenSlot(
    businessId,
    earliestReady,
    maxOrdersPerSlot,
    slotMinutes
  );
  
  // Which internally does:
  SELECT COUNT(*) FROM (
    SELECT * FROM orders WHERE pickupAt = ?
    UNION ALL
    SELECT * FROM tableOrders WHERE kitchenDueAt = ?
  ) AS combined
}
```

### Feature: Kitchen Display

**BEFORE**
```javascript
// Only showed online orders
SELECT * FROM orders WHERE status = ? AND businessId = ?
ORDER BY createdAt DESC
```

**AFTER**
```javascript
// Shows both, unified and sorted by priority
SELECT ..., 'online' AS source, 'normal' AS priority
FROM orders
UNION ALL
SELECT ..., 'pos' AS source, 'high' AS priority
FROM tableOrders
ORDER BY priority, kitchenDueAt, createdAt
```

---

## Example Scenarios

### Scenario 1: Peak Time with Mixed Orders

**Setup:**
- Business ID: 1
- maxOrdersPerSlot: 5
- slotMinutes: 15
- Current time: 17:00

**At 17:15 slot, we have:**
- 2 online orders (pickupAt = 17:15)
- 3 POS orders (kitchenDueAt = 17:15)
- Load = 5/5 (FULL)

**Customer places online order at 17:00:**
1. `pickupTimeCalculation(1)` called
2. Calls `getAvailableKitchenSlot(1, 17:20, 5, 15)`
3. Checks load for 17:15 slot → 5/5 FULL
4. Checks load for 17:30 slot → 1/5 AVAILABLE
5. Returns 17:30 as pickup time ✓

**Result:** Customer gets 17:30 pickup, not 17:15

---

### Scenario 2: Kitchen Display

**At 17:30, kitchen displays:**
```
[HIGH] POS Table 5  - Ready by 17:35 - PREPARING
[HIGH] POS Table 8  - Ready by 17:40 - PENDING
[NORMAL] Online     - Pickup 17:40  - PREPARING
[NORMAL] Online     - Pickup 17:45  - PENDING
```

**Why this order?**
1. POS orders (HIGH priority) appear first
2. Within same priority, earliest due time first
3. Kitchen handles POS customers first because they're waiting

---

### Scenario 3: Creating a POS Order

**Waiter takes order at table 5 at 17:20:**
```javascript
const order = await createTableOrder({
  tableId: 5,
  items: [{sku: 'burger', qty: 2}, {sku: 'fries', qty: 1}],
  totalPrice: 2500,
  currency: 'DKK'
}, 15); // 15 min prep

// Automatically created with:
{
  id: 101,
  tableId: 5,
  businessId: 1,        ← Fetched from table!
  source: 'pos',        ← Set automatically
  priority: 'high',     ← Set automatically
  kitchenDueAt: '17:35',    ← Calculated (now + 15 min)
  kitchenStartAt: '17:20',  ← Set to now
  status: 'PENDING',
  data: {...},
  totalPrice: 2500,
  currency: 'DKK'
}
```

**Result:** Order is immediately visible in kitchen queue (17:35 ready time)

---

## Migration Path

### Step 1: Run Migration
```bash
# Using your migration tool
migrate -path db/migrations -database "..." up
```

### Step 2: Verify Schema
```sql
DESCRIBE tableOrders;
-- Should show: businessId, source, priority, kitchenDueAt, kitchenStartAt
```

### Step 3: Backfill Old Data (Optional)
```sql
UPDATE tableOrders t
LEFT JOIN tables tbl ON t.tableId = tbl.id
SET t.businessId = tbl.businessId,
    t.source = 'pos',
    t.priority = 'high',
    t.kitchenDueAt = IFNULL(t.kitchenDueAt, DATE_ADD(t.createdAt, INTERVAL 15 MINUTE))
WHERE t.businessId IS NULL
  AND t.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Step 4: Test Endpoints
```bash
# Test pickup time (should now consider POS orders)
GET /pickup-time/user-business/:id

# Test kitchen display (should show unified queue)
GET /kitchen-routing/business/:id/orders/status/PREPARING
```

### Step 5: Monitor
- Watch kitchen operations
- Check if pickup times are reasonable
- Verify kitchen queue is correct
- All systems normal = success! ✓

---

## Backward Compatibility

### API Changes (Backward Compatible)
- ✅ `pickupTimeCalculation()` - Same response format, improved logic
- ✅ `getOrdersForKitchen()` - New fields added (old clients ignore them)
- ✅ `getOrderById()` - No changes
- ✅ `createOnlineOrder()` - No changes

### Database Changes (Backward Compatible)
- ✅ All new columns have DEFAULT values
- ✅ Existing queries still work
- ✅ Foreign keys use ON DELETE CASCADE (safe)
- ✅ Can rollback with down migration

### What Must Be Updated
- ⏳ Kitchen display UI (should show source badges)
- ⏳ POS integration (use `createTableOrder()` when adding orders)

### What Doesn't Need to Change
- ✅ Online order creation (uses same flow)
- ✅ Order status updates (work as before)
- ✅ Receipt generation (no changes needed)

---

## Troubleshooting

### Problem: Pickup time not changing
**Cause:** Might be using old calculation logic
**Solution:** Ensure imports are from updated `kitchen/kitchenQueue.js`

### Problem: businessId NULL on new POS orders
**Cause:** Not using `createTableOrder()` helper
**Solution:** Use the helper function, it auto-fills businessId

### Problem: Kitchen queue showing old format
**Cause:** Not updated kitchen.js handler
**Solution:** Update to use `getUnifiedKitchenQueue()`

### Problem: Query too slow
**Cause:** Missing indexes on kitchenDueAt, businessId
**Solution:** Add indexes (see KITCHEN_SCHEMA_AND_SQL.md)

---

## Documentation Files

| File | Purpose |
|------|---------|
| **KITCHEN_CAPACITY_IMPLEMENTATION.md** | Complete technical specifications |
| **KITCHEN_QUICK_REFERENCE.md** | Code examples and patterns |
| **KITCHEN_SCHEMA_AND_SQL.md** | Database details and SQL queries |
| **IMPLEMENTATION_SUMMARY.md** | This file - overview |

---

## Next Steps

1. ✅ Review this implementation
2. ⏳ Run migration on test DB
3. ⏳ Update kitchen UI to show source badges
4. ⏳ Test all scenarios
5. ⏳ Deploy to staging
6. ⏳ Monitor production

---

## Key Takeaway

**Before:** Kitchen capacity was tracked separately for online and POS orders
```
Online Capacity: 5/5
POS Capacity: 5/5
(Each type has its own limit)
```

**After:** Kitchen capacity is unified
```
Unified Capacity: 5/5
(Online + POS orders share same limit)
```

This prevents overbooking and gives customers smarter pickup times that account for actual kitchen load.
