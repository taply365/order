CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,

    businessId INT NOT NULL,

    employeeId VARCHAR(50) UNIQUE NOT NULL,

    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar LONGTEXT NULL,

    role VARCHAR(50) NOT NULL,
    department VARCHAR(50),

    employmentType ENUM(
        'full-time',
        'part-time',
        'temporary',
        'contract'
    ) NOT NULL,

    hourlyRate DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'DKK',

    maxHoursPerWeek INT DEFAULT 40,

    hireDate DATE,

    status ENUM(
        'active',
        'inactive',
        'on leave'
    ) DEFAULT 'active',

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_business
        FOREIGN KEY (businessId)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);