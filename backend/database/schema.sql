CREATE DATABASE IF NOT EXISTS del_valle_inventario CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE del_valle_inventario;

CREATE TABLE IF NOT EXISTS materials (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(140) NOT NULL,
 category VARCHAR(80) NOT NULL, unit VARCHAR(30) NOT NULL, min_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
 max_stock DECIMAL(12,2) NOT NULL DEFAULT 0, avg_daily_demand DECIMAL(12,2) NOT NULL DEFAULT 0,
 max_daily_demand DECIMAL(12,2) NOT NULL DEFAULT 0, lead_time_days DECIMAL(8,2) NOT NULL DEFAULT 0,
 reorder_point DECIMAL(14,2) GENERATED ALWAYS AS (avg_daily_demand*lead_time_days+(max_daily_demand-avg_daily_demand)*lead_time_days) STORED,
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(min_stock>=0 AND max_stock>=min_stock AND avg_daily_demand>=0 AND max_daily_demand>=avg_daily_demand AND lead_time_days>=0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, code VARCHAR(24) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
 location_type ENUM('bodega','obra') NOT NULL, site_name VARCHAR(100), active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS app_users (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, name VARCHAR(120) NOT NULL, email VARCHAR(180) NOT NULL UNIQUE,
 role ENUM('bodega','compras','jefatura','finanzas','admin') NOT NULL DEFAULT 'bodega', active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS suppliers (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, name VARCHAR(140) NOT NULL, tax_id VARCHAR(30) UNIQUE,
 contact_name VARCHAR(120), email VARCHAR(180), phone VARCHAR(40), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS purchase_orders (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, order_number VARCHAR(40) NOT NULL UNIQUE,
 supplier_id BIGINT UNSIGNED NOT NULL, order_date DATE NOT NULL, status ENUM('registrada','recibida','cancelada') NOT NULL DEFAULT 'registrada',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS purchase_order_items (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, purchase_order_id BIGINT UNSIGNED NOT NULL,
 material_id BIGINT UNSIGNED NOT NULL, quantity DECIMAL(12,2) NOT NULL, unit_price DECIMAL(14,2) NOT NULL,
 CHECK(quantity>0 AND unit_price>=0), FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id), FOREIGN KEY(material_id) REFERENCES materials(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS stock_movements (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, material_id BIGINT UNSIGNED NOT NULL,
 movement_type ENUM('entrada','salida','traslado','ajuste') NOT NULL, quantity DECIMAL(12,2) NOT NULL,
 location_id BIGINT UNSIGNED NOT NULL, source_location_id BIGINT UNSIGNED NULL,
 movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, user_id BIGINT UNSIGNED NOT NULL,
 reference_document VARCHAR(80) NOT NULL, notes VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_mov_material_location_date(material_id,location_id,movement_date), INDEX idx_mov_reference(reference_document),
 FOREIGN KEY(material_id) REFERENCES materials(id), FOREIGN KEY(location_id) REFERENCES locations(id),
 FOREIGN KEY(source_location_id) REFERENCES locations(id), FOREIGN KEY(user_id) REFERENCES app_users(id),
 CHECK(quantity<>0)
) ENGINE=InnoDB;
