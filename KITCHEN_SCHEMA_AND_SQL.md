# Schema Changes & SQL Reference

## Migration: 000032_add_kitchen_fields_to_tableOrders

### What Changed
The `tableOrders` table is updated to support shared kitchen capacity management.

### UP Migration (000032_add_kitchen_fields_to_tableOrders.up.sql)
```sql
-- Add kitchen routing and capacity fields to tableOrders
-- These allow tableOrders to participate in shared kitchen capacity management

ALTER TABLE tableOrders
ADD COLUMN businessId INT NOT NULL AFTER id,
ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'pos' COMMENT 'Order source: pos or online',
ADD COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'high' COMMENT 'Kitchen priority: high (POS) or normal (online)',
ADD COLUMN kitchenDueAt TIMESTAMP NULL DEFAULT NULL COMMENT 'Kitchen capacity slot time - when order should be ready',
ADD COLUMN kitchenStartAt TIMESTAMP NULL DEFAULT NULL COMMENT 'When kitchen should start preparing this order';
```

### DOWN Migration (000032_add_kitchen_fields_to_tableOrders.down.sql)
```sql
-- Rollback: Remove kitchen routing and capacity fields from tableOrders

ALTER TABLE tableOrders
DROP FOREIGN KEY fk_tableOrders_business,
DROP COLUMN kitchenStartAt,
DROP COLUMN kitchenDueAt,
DROP COLUMN priority,
DROP COLUMN source,
DROP COLUMN businessId;
```

---

## Before & After Schema

### tableOrders - BEFORE
```sql
CREATE TABLE IF NOT EXISTS tableOrders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tableId INT NOT NULL,
    data JSON DEFAULT NULL,
    totalPrice INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    orders JSON DEFAULT NULL,
    currency VARCHAR(10) NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_table_orders_table
        FOREIGN KEY (tableId)
        REFERENCES tables(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

### tableOrders - AFTER
```sql
CREATE TABLE IF NOT EXISTS tableOrders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- NEW: Business context
    businessId INT NOT NULL,
    
    -- Existing columns
    tableId INT NOT NULL,
    data JSON DEFAULT NULL,
    totalPrice INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    orders JSON DEFAULT NULL,
    currency VARCHAR(10) NOT NULL,
    
    -- NEW: Kitchen routing and capacity
    source VARCHAR(50) NOT NULL DEFAULT 'pos',
    priority VARCHAR(50) NOT NULL DEFAULT 'high',
    kitchenDueAt TIMESTAMP NULL DEFAULT NULL,
    kitchenStartAt TIMESTAMP NULL DEFAULT NULL,
    
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_table_orders_table
        FOREIGN KEY (tableId)
        REFERENCES tables(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- NEW: Link to business
    CONSTRAINT fk_tableOrders_business
        FOREIGN KEY (businessId)
        REFERENCES businesses(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

---

## New Columns Explained

### businessId
```
Type: INT NOT NULL
Purpose: Links table order to business
Before: Had to join tableOrders → tables → businesses to get businessId
After: Direct reference, much faster queries
Usage: Filter orders by business, calculate kitchen capacity per business
```

### source
```
Type: VARCHAR(50) DEFAULT 'pos'
Values: 'pos' (always for tableOrders)
Purpose: Identify order type in unified kitchen queue
Note: Online orders have source='online', so kitchen display can show badges
```

### priority
```
Type: VARCHAR(50) DEFAULT 'high'
Values: 'high' (POS/table) or 'normal' (online)
Purpose: Sort kitchen queue by urgency
Kitchen sees POS first because customer is waiting
Usage: ORDER BY CASE WHEN priority='high' THEN 1 ELSE 2 END
```

### kitchenDueAt
```
Type: TIMESTAMP NULL
Purpose: When kitchen should have order READY (customer promise time)
For POS: Set to ~15 minutes after order creation
For online: = pickupAt (customer pickup time)
Usage: Kitchen capacity calculation, kitchen due time sorting
```

### kitchenStartAt
```
Type: TIMESTAMP NULL
Purpose: When kitchen should START preparing order
Calculation: kitchenDueAt - prepMinutes
For POS: Now (start immediately when ordered)
For online: pickupAt - prepMinutes (calculated later)
Usage: Kitchen scheduling, prep time visualization
```

---

## Backward Compatibility

### No Breaking Changes
- All new columns have DEFAULT values
- Existing tableOrders can be backfilled
- Existing queries still work (new columns ignored)
- Foreign key is ON DELETE CASCADE (safe)

### Backfill Existing Data (Optional)
If you have existing tableOrders without businessId, run this:

```sql
-- Backfill businessId from table relationship
UPDATE tableOrders t
LEFT JOIN tables tbl ON t.tableId = tbl.id
SET t.businessId = tbl.businessId,
    t.source = 'pos',
    t.priority = 'high',
    t.kitchenDueAt = IFNULL(t.kitchenDueAt, DATE_ADD(t.createdAt, INTERVAL 15 MINUTE)),
    t.kitchenStartAt = IFNULL(t.kitchenStartAt, t.createdAt)
WHERE t.businessId IS NULL
  AND t.createdAt >= CURDATE() - INTERVAL 30 DAY;  -- last 30 days
```

---

## Unified Kitchen Query

### The Core Query
```sql
-- Count total kitchen load for a specific slot (BOTH order types)
SELECT COUNT(*) AS count
FROM (
  -- Online orders: pickupAt is the kitchen due time
  SELECT id
  FROM orders
  WHERE businessId = ?
    AND pickupAt = ?
    AND status NOT IN ('cancelled', 'completed', 'failed')
    AND createdAt >= CURDATE()
    AND createdAt < CURDATE() + INTERVAL 1 DAY

  UNION ALL

  -- POS/Table orders: kitchenDueAt is the kitchen due time
  SELECT id
  FROM tableOrders
  WHERE businessId = ?
    AND kitchenDueAt = ?
    AND status NOT IN ('cancelled', 'completed', 'failed')
    AND createdAt >= CURDATE()
    AND createdAt < CURDATE() + INTERVAL 1 DAY
) AS kitchen_load;
```

### Example
```sql
-- How many orders in the 19:30 slot?
SET @businessId = 1;
SET @slotTime = '2024-05-22T19:30:00Z';

SELECT COUNT(*) AS total_kitchen_load
FROM (
  SELECT id FROM orders 
  WHERE businessId = @businessId AND pickupAt = @slotTime
    AND status NOT IN ('cancelled', 'completed')
  
  UNION ALL
  
  SELECT id FROM tableOrders
  WHERE businessId = @businessId AND kitchenDueAt = @slotTime
    AND status NOT IN ('cancelled', 'completed')
) AS load;

-- Result: 5 (3 online + 2 POS)
```

---

## Unified Kitchen Queue Query

### Get All Orders for Kitchen Display
```sql
SELECT 
  'online' AS source,
  'normal' AS priority,
  id, businessId, customerId,
  pickupAt AS kitchenDueAt,
  NULL AS kitchenStartAt,
  status, data, totalPrice, currency,
  createdAt, updatedAt, type
FROM orders
WHERE businessId = ?
  AND createdAt >= CURDATE()
  AND createdAt < CURDATE() + INTERVAL 1 DAY
  AND status NOT IN ('cancelled', 'completed')

UNION ALL

SELECT 
  'pos' AS source,
  'high' AS priority,
  id, businessId, NULL AS customerId,
  kitchenDueAt, kitchenStartAt,
  status, data, totalPrice, currency,
  createdAt, updatedAt, NULL AS type
FROM tableOrders
WHERE businessId = ?
  AND createdAt >= CURDATE()
  AND createdAt < CURDATE() + INTERVAL 1 DAY
  AND status NOT IN ('cancelled', 'completed')

ORDER BY 
  CASE WHEN priority = 'high' THEN 1 ELSE 2 END ASC,  -- High first
  kitchenDueAt ASC,                                    -- Earliest due time first
  createdAt ASC;                                       -- Then oldest first
```

### Example Result
```
source | priority | id  | kitchenDueAt        | status      | customerId
-------|----------|-----|---------------------|-------------|----------
pos    | high     | 101 | 2024-05-22 17:45:00 | PREPARING   | NULL
pos    | high     | 102 | 2024-05-22 18:00:00 | PENDING     | NULL
online | normal   | 201 | 2024-05-22 18:00:00 | PREPARING   | cust_123
online | normal   | 202 | 2024-05-22 18:15:00 | PREPARING   | cust_456
```

---

## Common Queries for Kitchen Management

### Get Kitchen Load for Next Hour
```sql
SELECT 
  kitchenDueAt,
  COUNT(*) as order_count,
  GROUP_CONCAT(source) as sources
FROM (
  SELECT pickupAt as kitchenDueAt, 'online' as source
  FROM orders
  WHERE businessId = 1
    AND pickupAt BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 60 MINUTE)
    AND status NOT IN ('cancelled', 'completed')
  
  UNION ALL
  
  SELECT kitchenDueAt, 'pos' as source
  FROM tableOrders
  WHERE businessId = 1
    AND kitchenDueAt BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 60 MINUTE)
    AND status NOT IN ('cancelled', 'completed')
) AS kitchen_load
GROUP BY kitchenDueAt
ORDER BY kitchenDueAt ASC;

-- Result:
-- kitchenDueAt | order_count | sources
-- 17:45        | 2          | pos,pos
-- 18:00        | 3          | pos,online,online
-- 18:15        | 1          | online
```

### Busiest Slots
```sql
-- Which slots have most orders?
SELECT 
  FLOOR(order_count / maxOrdersPerSlot) as capacity_used,
  COUNT(*) as num_slots,
  GROUP_CONCAT(DISTINCT kitchenDueAt) as slot_times
FROM (
  SELECT 
    kitchenDueAt,
    COUNT(*) as order_count
  FROM (
    SELECT pickupAt as kitchenDueAt FROM orders WHERE businessId = 1
    UNION ALL
    SELECT kitchenDueAt FROM tableOrders WHERE businessId = 1
  ) AS load
  GROUP BY kitchenDueAt
) slotted
CROSS JOIN kitchenCapacity k
WHERE k.businessId = 1
GROUP BY capacity_used
ORDER BY capacity_used DESC;
```

### POS Orders Ready Check
```sql
-- POS orders overdue (should be ready by now)
SELECT id, tableId, kitchenDueAt, NOW() as current_time,
  TIMESTAMPDIFF(MINUTE, kitchenDueAt, NOW()) as minutes_overdue
FROM tableOrders
WHERE businessId = 1
  AND kitchenDueAt <= NOW()
  AND status = 'PREPARING'
ORDER BY kitchenDueAt ASC;
```

### Online Pickup Availability
```sql
-- Which slots have available capacity?
SELECT 
  slotTime,
  current_orders,
  (SELECT maxOrdersPerSlot FROM kitchenCapacity WHERE businessId = 1) as max_capacity,
  (SELECT maxOrdersPerSlot FROM kitchenCapacity WHERE businessId = 1) - current_orders as remaining,
  CASE WHEN current_orders < (SELECT maxOrdersPerSlot FROM kitchenCapacity WHERE businessId = 1) THEN 'AVAILABLE' ELSE 'FULL' END as status
FROM (
  SELECT 
    pickupAt as slotTime,
    COUNT(*) as current_orders
  FROM (
    SELECT pickupAt FROM orders WHERE businessId = 1
    UNION ALL
    SELECT kitchenDueAt as pickupAt FROM tableOrders WHERE businessId = 1
  ) AS orders_combined
  GROUP BY pickupAt
  HAVING pickupAt >= NOW()
  ORDER BY pickupAt ASC
  LIMIT 10
) AS slots
ORDER BY slotTime ASC;
```

---

## Testing Queries

### Insert Test Data
```sql
-- Add a test POS order to a table
INSERT INTO tableOrders (
  tableId, businessId, source, priority, data, totalPrice, currency,
  kitchenDueAt, kitchenStartAt, status
) VALUES (
  5,                                        -- tableId
  1,                                        -- businessId
  'pos',                                    -- source
  'high',                                   -- priority
  '{"item": "burger", "qty": 2}',          -- data
  2500,                                     -- totalPrice (cents)
  'DKK',                                    -- currency
  DATE_ADD(NOW(), INTERVAL 15 MINUTE),     -- kitchenDueAt
  NOW(),                                    -- kitchenStartAt
  'PENDING'                                 -- status
);
```

### Test Unified Capacity Count
```sql
-- Manually verify getKitchenLoadForSlot logic
SET @business = 1;
SET @slot = '2024-05-22T19:30:00Z';

-- Online orders in this slot
SELECT COUNT(*) as online_count
FROM orders
WHERE businessId = @business AND pickupAt = @slot AND status NOT IN ('cancelled', 'completed');

-- POS orders in this slot
SELECT COUNT(*) as pos_count
FROM tableOrders
WHERE businessId = @business AND kitchenDueAt = @slot AND status NOT IN ('cancelled', 'completed');

-- Total
SELECT COUNT(*) as total
FROM (
  SELECT id FROM orders WHERE businessId = @business AND pickupAt = @slot
  UNION ALL
  SELECT id FROM tableOrders WHERE businessId = @business AND kitchenDueAt = @slot
) AS combined;
```

---

## Performance Considerations

### Indexes (Recommend Adding)
```sql
-- Speed up capacity queries
ALTER TABLE tableOrders ADD INDEX idx_business_due (businessId, kitchenDueAt);
ALTER TABLE orders ADD INDEX idx_business_pickup (businessId, pickupAt);

-- Speed up status checks
ALTER TABLE tableOrders ADD INDEX idx_business_status (businessId, status);
ALTER TABLE orders ADD INDEX idx_business_status (businessId, status);
```

### Why These Help
- `getKitchenLoadForSlot()` filters by businessId + kitchenDueAt
- Status filtering is frequent
- Without indexes, queries scan entire tables
- With indexes, queries use index range scans

### Monitor Query Performance
```sql
-- Find slow queries
SET GLOBAL long_query_time = 2;
SET GLOBAL log_queries_not_using_indexes = ON;
-- Then check slow query log

-- Manual EXPLAIN
EXPLAIN SELECT COUNT(*) FROM (
  SELECT id FROM orders WHERE businessId = 1 AND pickupAt = '2024-05-22T19:30:00'
  UNION ALL
  SELECT id FROM tableOrders WHERE businessId = 1 AND kitchenDueAt = '2024-05-22T19:30:00'
) AS load;
-- Should show INDEX usage, not full table scans
```
