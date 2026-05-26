CREATE TABLE IF NOT EXISTS receiptSessions ( 
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    orderId BIGINT NOT NULL,
    businessId INT NOT NULL,
    internalId VARCHAR(255) NOT NULL,
    
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_order_id (orderId),
    INDEX idx_internal_id (internalId),

    CONSTRAINT fk_receipt_business
        FOREIGN KEY (businessId)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);