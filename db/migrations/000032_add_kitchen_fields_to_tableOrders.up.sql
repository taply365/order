-- Add kitchen routing and capacity fields to tableOrders
-- These allow tableOrders to participate in shared kitchen capacity management

ALTER TABLE tableOrders
ADD COLUMN businessId INT NOT NULL AFTER id,
ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'pos' COMMENT 'Order source: pos or online',
ADD COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'high' COMMENT 'Kitchen priority: high (POS) or normal (online)',
ADD COLUMN kitchenDueAt TIMESTAMP NULL DEFAULT NULL COMMENT 'Kitchen capacity slot time - when order should be ready',
ADD COLUMN kitchenStartAt TIMESTAMP NULL DEFAULT NULL COMMENT 'When kitchen should start preparing this order',
ADD CONSTRAINT fk_tableOrders_business
  FOREIGN KEY (businessId)
  REFERENCES businesses(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;