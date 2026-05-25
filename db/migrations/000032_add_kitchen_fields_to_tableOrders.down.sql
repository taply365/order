-- Rollback: Remove kitchen routing and capacity fields from tableOrders

ALTER TABLE tableOrders
DROP FOREIGN KEY fk_tableOrders_business,
DROP COLUMN kitchenStartAt,
DROP COLUMN kitchenDueAt,
DROP COLUMN priority,
DROP COLUMN source,
DROP COLUMN businessId;
