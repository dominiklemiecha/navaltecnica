-- Navaltecnica - Schema Database
-- Tutte le tabelle normalizzate per storico completo

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS destinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location_id INT NOT NULL,
    km DECIMAL(10,2) NOT NULL DEFAULT 0,
    travel_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    highway_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    cost_percentage DECIMAL(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS equipment_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS component_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (model_id) REFERENCES equipment_models(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS spare_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    part_number VARCHAR(50) NOT NULL DEFAULT 'NA',
    list_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES component_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pricing_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    value DECIMAL(10,4) NOT NULL,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Preventivi

CREATE TABLE IF NOT EXISTS quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('draft','sent','accepted','rejected') NOT NULL DEFAULT 'draft',
    client_name VARCHAR(200) NOT NULL DEFAULT '',
    location_id INT NOT NULL,
    destination_id INT NOT NULL,
    client_type ENUM('shipyard','shipowner') NOT NULL,
    hamann_model_id INT NULL,
    dvz_model_id INT NULL,
    num_services INT NOT NULL DEFAULT 1,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (destination_id) REFERENCES destinations(id),
    FOREIGN KEY (hamann_model_id) REFERENCES equipment_models(id),
    FOREIGN KEY (dvz_model_id) REFERENCES equipment_models(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    spare_part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (spare_part_id) REFERENCES spare_parts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_custom_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    brand VARCHAR(50) NOT NULL DEFAULT '',
    description VARCHAR(200) NOT NULL DEFAULT '',
    part_number VARCHAR(50) NOT NULL DEFAULT 'NA',
    quantity INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    service_number INT NOT NULL,
    junior_people INT NOT NULL DEFAULT 0,
    junior_hours DECIMAL(5,1) NOT NULL DEFAULT 0,
    junior_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    senior_people INT NOT NULL DEFAULT 0,
    senior_hours DECIMAL(5,1) NOT NULL DEFAULT 0,
    senior_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    consumables DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_travel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    service_number INT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    km DECIMAL(10,2) NOT NULL DEFAULT 0,
    travel_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    highway DECIMAL(10,2) NOT NULL DEFAULT 0,
    daily_allowance INT NOT NULL DEFAULT 0,
    daily_allowance_half INT NOT NULL DEFAULT 0,
    rental_car DECIMAL(10,2) NOT NULL DEFAULT 0,
    flights DECIMAL(10,2) NOT NULL DEFAULT 0,
    taxi DECIMAL(10,2) NOT NULL DEFAULT 0,
    parking DECIMAL(10,2) NOT NULL DEFAULT 0,
    other DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_workshop (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    service_number INT NOT NULL,
    junior_people INT NOT NULL DEFAULT 0,
    junior_hours DECIMAL(5,1) NOT NULL DEFAULT 0,
    junior_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    senior_people INT NOT NULL DEFAULT 0,
    senior_hours DECIMAL(5,1) NOT NULL DEFAULT 0,
    senior_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    consumables DECIMAL(10,2) NOT NULL DEFAULT 0,
    disposals DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_workshop_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    description VARCHAR(200) NOT NULL DEFAULT '',
    part_number VARCHAR(50) NOT NULL DEFAULT '',
    quantity INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
