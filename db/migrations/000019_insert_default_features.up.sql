INSERT INTO features (name, description) VALUES
('DIGITAL_MENU', 'Digital menu (with images).'),
('ONLINE_ORDERING', 'Online ordering.'),
('REPORTING', 'Basic reporting.'),
("3D_MENU", "3D digital menu."),
("POS_SYSTEM", "POS system (basic cashier functionality)."),
("UNLIMITED_TOKENS", "Enjoy Unlimited Tokens."),
("POS_ROUTING", "POS + kitchen routing")
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description);