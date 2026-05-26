# Quick Reference: Shared Kitchen Capacity

## For Backend Developers

### Import the Functions
```javascript
// Kitchen capacity calculations
import {
  getKitchenLoadForSlot,
  getAvailableKitchenSlot,
  getUnifiedKitchenQueue,
  getAvailableSlots,
  calculatePOSKitchenTimes,
  calculateOnlineKitchenTimes
} from './kitchen/kitchenQueue.js';

// POS order creation
import {
  createTableOrder,
  updateTableOrderStatus,
  getTableOrdersByBusiness,
  getTableOrderKitchenCapacity
} from './kitchen/tableOrderHandler.js';
```

### Create an Online Order
```javascript
// In routerHandler/orders.js
const { pickupTime, availableSlots } = await pickupTimeCalculation(businessId);

// This NOW checks BOTH online + POS orders!
// If POS orders fill the 19:30 slot, online gets 19:45
```

### Create a POS Order
```javascript
// When table order is placed
const newTableOrder = await createTableOrder({
  tableId: 5,
  items: [
    { sku: 'burger', qty: 2 },
    { sku: 'fries', qty: 1 }
  ],
  totalPrice: 2500,  // cents
  currency: 'DKK'
}, 20); // 20 min prep time

// Returns:
// {
//   id: 123,
//   tableId: 5,
//   businessId: 1,       ← automatically set
//   source: 'pos',       ← automatically set
//   priority: 'high',    ← automatically set
//   kitchenDueAt: '2024-05-22T17:35:00Z',  ← automatically set
//   kitchenStartAt: '2024-05-22T17:15:00Z',
//   status: 'PENDING'
// }
```

### Get Kitchen Queue
```javascript
// In routerHandler/kitchen.js
// Already implemented! Returns unified queue

const orders = await getUnifiedKitchenQueue(businessId, 'PREPARING');

// Each order has:
// - source: 'online' or 'pos'
// - priority: 'high' (POS) or 'normal' (online)
// - kitchenDueAt: when it should be ready
```

### Check Kitchen Load
```javascript
// How many orders in the 19:30 slot?
const load = await getKitchenLoadForSlot(businessId, new Date('2024-05-22T19:30:00Z'));

// Returns: 3
// Includes both online orders (pickupAt=19:30) AND POS orders (kitchenDueAt=19:30)
```

---

## For Frontend Developers

### Online Order Pickup Selection
```javascript
// GET /pickup-time/user-business/:businessId
// Response still looks the same!

{
  "pickupTime": "2024-05-22T19:30:00Z",
  "availableSlots": [
    {
      "slotTime": "2024-05-22T19:30:00Z",
      "label": "19:30",
      "currentOrders": 5,           ← now includes BOTH online + POS!
      "remainingCapacity": 0,
      "isAvailable": false
    },
    {
      "slotTime": "2024-05-22T19:45:00Z",
      "label": "19:45",
      "currentOrders": 2,           ← count from both tables
      "remainingCapacity": 3,
      "isAvailable": true
    }
  ]
}
```

### Kitchen Display Screen
```javascript
// GET /kitchen-routing/business/:id/orders/status/PREPARING
// Response NOW includes source badges!

{
  "success": true,
  "data": [
    {
      "id": 101,
      "source": "pos",              // ← NEW: POS order from table
      "priority": "high",           // ← NEW: High priority
      "kitchenDueAt": "2024-05-22T17:45:00Z",
      "tableId": 5,
      "status": "PREPARING",
      "data": {
        // order items
      }
    },
    {
      "id": 102,
      "source": "pos",
      "priority": "high",
      "kitchenDueAt": "2024-05-22T18:00:00Z",
      "tableId": 8,
      "status": "PENDING"
    },
    {
      "id": 201,
      "source": "online",           // ← NEW: Online order
      "priority": "normal",         // ← NEW: Normal priority
      "kitchenDueAt": "2024-05-22T18:00:00Z",  // = pickupAt
      "customerId": "cust_abc123",
      "status": "PREPARING",
      "data": {
        // order items
      }
    }
  ]
}
```

### Show Status Badges
```javascript
// In your kitchen display component

{source === 'pos' && <Badge color="red">🟦 TABLE {tableId}</Badge>}
{source === 'online' && <Badge color="blue">🟧 PICKUP @ {kitchenDueAt}</Badge>}

// POS orders show table number
// Online orders show pickup time
```

---

## Common Patterns

### Scenario 1: Check if a time slot is available
```javascript
const businessId = 1;
const targetTime = new Date('2024-05-22T19:30:00Z');
const maxOrdersPerSlot = 5;

const load = await getKitchenLoadForSlot(businessId, targetTime);
const isAvailable = load < maxOrdersPerSlot;

if (!isAvailable) {
  console.log('19:30 slot is FULL, try next slot');
}
```

### Scenario 2: Place an online order
```javascript
// Old way (broken):
// const load = await getKitchenLoadForSlot_ONLINE_ONLY(businessId, targetTime);
// Could get wrong result if POS orders exist!

// New way (correct):
const load = await getKitchenLoadForSlot(businessId, targetTime);  // ✅ Counts both!
```

### Scenario 3: Place a POS order
```javascript
try {
  const order = await createTableOrder({
    tableId: tableId,
    items: cartItems,
    totalPrice: totalPrice,
    currency: 'DKK'
  }, prepMinutes);

  console.log(`Order ready by: ${order.kitchenDueAt}`);
  // Automatically:
  // - Sets businessId from table
  // - Sets high priority
  // - Computes kitchen due time
} catch (error) {
  console.error('Failed to create order:', error);
}
```

### Scenario 4: Display all kitchen orders
```javascript
// Get ALL orders for kitchen display
const allOrders = await getUnifiedKitchenQueue(businessId, 'PREPARING');

// Sort is AUTOMATIC:
// 1. HIGH priority first (POS orders)
// 2. Then NORMAL priority (online orders)
// 3. Both sorted by kitchenDueAt (earliest first)

allOrders.forEach(order => {
  console.log(
    `[${order.priority.toUpperCase()}] ${order.source === 'pos' ? `TABLE ${order.tableId}` : 'PICKUP'} @ ${order.kitchenDueAt}`
  );
});

// Output might look like:
// [HIGH] TABLE 5 @ 17:45
// [HIGH] TABLE 8 @ 18:00
// [NORMAL] PICKUP @ 18:00
// [NORMAL] PICKUP @ 18:15
```

---

## Debugging

### Check Kitchen Load
```sql
-- Count all active orders in a slot
SELECT COUNT(*) FROM (
  SELECT id FROM orders WHERE businessId = 1 AND pickupAt = '2024-05-22T19:30:00' AND status != 'cancelled'
  UNION ALL
  SELECT id FROM tableOrders WHERE businessId = 1 AND kitchenDueAt = '2024-05-22T19:30:00' AND status != 'cancelled'
) AS kitchen_load;
```

### Find Missing businessId
```sql
-- Which table orders don't have businessId?
SELECT to.id, to.tableId
FROM tableOrders to
WHERE to.businessId IS NULL;

-- Fix them
UPDATE tableOrders to
LEFT JOIN tables t ON to.tableId = t.id
SET to.businessId = t.businessId
WHERE to.businessId IS NULL;
```

### List Orders by Kitchen Due Time
```sql
-- See what kitchen has to prepare in next hour
SELECT 
  'online' AS source, id, pickupAt AS kitchenDueAt, status
FROM orders
WHERE businessId = 1
  AND pickupAt BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 60 MINUTE)
  AND status != 'cancelled'

UNION ALL

SELECT
  'pos' AS source, id, kitchenDueAt, status
FROM tableOrders
WHERE businessId = 1
  AND kitchenDueAt BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 60 MINUTE)
  AND status != 'cancelled'

ORDER BY kitchenDueAt ASC;
```

---

## Migration Checklist

- [ ] Run `000032_*.up.sql` migration
- [ ] Verify `tableOrders` has new columns
- [ ] Backfill existing tableOrders with businessId (if needed)
- [ ] Test `pickupTimeCalculation()` with POS orders in system
- [ ] Test kitchen display endpoint returns unified queue
- [ ] Update kitchen UI to show source badges
- [ ] Monitor kitchen operations for issues
- [ ] Run `000032_*.down.sql` to rollback (if needed)
