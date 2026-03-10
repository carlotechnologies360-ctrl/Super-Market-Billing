-- Enable UUID extension if we want to use auto-generated UUIDs (optional but recommended)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Store Settings Table
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact VARCHAR(50),
    logo TEXT,
    tax_enabled BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    modules JSONB
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    permissions JSONB NOT NULL
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE SET NULL,
    joining_date DATE,
    salary_type VARCHAR(20),
    base_salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'Active',
    pin VARCHAR(10)
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP
);

-- Salary Payments Table
CREATE TABLE IF NOT EXISTS salary_payments (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) REFERENCES staff(id) ON DELETE SET NULL,
    month VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending'
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    mobile VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    last_visit TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    products_supplied JSONB -- Storing string array of products
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    actual_price DECIMAL(10,2),
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    expiry_date DATE,
    unit VARCHAR(20),
    stock INTEGER DEFAULT 0,
    size_name VARCHAR(50),
    image_url TEXT,
    barcode VARCHAR(100) UNIQUE
);

-- Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100),
    price DECIMAL(10,2),
    actual_price DECIMAL(10,2),
    barcode VARCHAR(100),
    stock INTEGER DEFAULT 0
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_mobile VARCHAR(20), -- Intentionally nVARCHAR to allow walk-ins without linking to customer table strictly if needed, but best practice is FK. Keeping flexible.
    customer_name VARCHAR(100),
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_savings DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    cash_amount DECIMAL(10,2) DEFAULT 0,
    upi_amount DECIMAL(10,2) DEFAULT 0
);

-- Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(50) REFERENCES sales(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    selected_variant VARCHAR(100)
);

-- Held Bills Table (Optional, for persistent held bills)
CREATE TABLE IF NOT EXISTS held_bills (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(100),
    customer_mobile VARCHAR(20),
    items JSONB -- Storing items as JSON for temporary held bills
);

-- Purchases Table (from Suppliers)
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2) NOT NULL
);

-- Supplier Payments Table
CREATE TABLE IF NOT EXISTS supplier_payments (
    id VARCHAR(50) PRIMARY KEY,
    supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(20),
    note TEXT
);

-- Initial Data Seeding (Optional)

-- Default Store Settings
INSERT INTO store_settings (name, address, contact, tax_enabled, tax_rate, modules)
VALUES (
    'Smart Mart Pro',
    '123, Enterprise Ave, Digital City',
    '9876543210',
    true,
    18,
    '{"dashboard": true, "billing": true, "inventory": true, "suppliers": true, "staff": true, "reports": true, "label_printing": true, "settings": true}'
) ON CONFLICT DO NOTHING;

-- Default Roles
INSERT INTO roles (id, name, permissions) VALUES 
('owner', 'Owner', '{"dashboard": true, "billing": true, "inventory": true, "suppliers": true, "staff": true, "reports": true, "label_printing": true, "settings": true}'),
('manager', 'Manager', '{"dashboard": true, "billing": true, "inventory": true, "suppliers": true, "staff": true, "reports": true, "label_printing": true, "settings": false}'),
('cashier', 'Cashier', '{"dashboard": false, "billing": true, "inventory": false, "suppliers": false, "staff": false, "reports": false, "label_printing": true, "settings": false}')
ON CONFLICT (id) DO NOTHING;
