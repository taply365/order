CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    businessId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    data JSON,          -- []dmenu.Items
    model VARCHAR(100),

    images JSON,        -- []string
    ingredients JSON,   -- any
    extras JSON,        -- dmenu.Extras

    quantity INT NOT NULL DEFAULT 0,
    currency VARCHAR(10),

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_business
        FOREIGN KEY (businessId)
        REFERENCES businesses(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);