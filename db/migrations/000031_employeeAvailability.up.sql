CREATE TABLE IF NOT EXISTS employeeAvailability (
    id INT AUTO_INCREMENT PRIMARY KEY,

    businessId INT NOT NULL,
    employeeId INT NOT NULL,

    availableDate DATE NOT NULL,

    startTime TIME NOT NULL,
    endTime TIME NOT NULL,

    isAvailable BOOLEAN DEFAULT TRUE,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (businessId)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

    FOREIGN KEY (employeeId)
        REFERENCES employees(id)
        ON DELETE CASCADE
);