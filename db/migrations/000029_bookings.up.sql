CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookingId VARCHAR(255) NOT NULL UNIQUE,
    businessId INT NOT NULL,
    tableId INT NOT NULL,

    customerName VARCHAR(255) NOT NULL,
    customerEmail VARCHAR(255) NOT NULL,
    customerPhone VARCHAR(50) NOT NULL,

    guests INT NOT NULL,

    startTime DATETIME NOT NULL,
    endTime DATETIME NOT NULL,

    status ENUM('pending', 'confirmed', 'cancelled')
        NOT NULL DEFAULT 'confirmed',

    createdAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updatedAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_bookings_business
        FOREIGN KEY (businessId)
        REFERENCES businesses(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_bookings_table
        FOREIGN KEY (tableId)
        REFERENCES tables(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);