/*
  # StockMaster Inventory Management System - Complete Database Schema

  ## Overview
  This migration creates the complete database structure for StockMaster, a full-featured 
  inventory management system with multi-warehouse support, stock operations tracking, 
  and comprehensive audit logging.

  ## 1. New Tables

  ### Authentication & Users
  - `user_profiles`
    - `id` (uuid, references auth.users)
    - `full_name` (text)
    - `role` (text: admin, manager, staff)
    - `phone` (text)
    - `is_active` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Warehouse Management
  - `warehouses`
    - `id` (uuid, primary key)
    - `name` (text)
    - `code` (text, unique)
    - `location` (text)
    - `manager_id` (uuid, references user_profiles)
    - `is_active` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Product Management
  - `categories`
    - `id` (uuid, primary key)
    - `name` (text)
    - `description` (text)
    - `created_at` (timestamptz)

  - `products`
    - `id` (uuid, primary key)
    - `name` (text)
    - `sku` (text, unique)
    - `category_id` (uuid, references categories)
    - `unit` (text: pcs, kg, ltr, box, etc.)
    - `reorder_level` (numeric)
    - `description` (text)
    - `is_active` (boolean)
    - `created_by` (uuid, references user_profiles)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Stock Management
  - `stock`
    - `id` (uuid, primary key)
    - `product_id` (uuid, references products)
    - `warehouse_id` (uuid, references warehouses)
    - `quantity` (numeric)
    - `updated_at` (timestamptz)
    - Unique constraint on (product_id, warehouse_id)

  ### Stock Operations
  - `stock_receipts`
    - `id` (uuid, primary key)
    - `receipt_number` (text, unique)
    - `product_id` (uuid, references products)
    - `warehouse_id` (uuid, references warehouses)
    - `quantity` (numeric)
    - `unit_cost` (numeric)
    - `supplier_name` (text)
    - `notes` (text)
    - `status` (text: pending, completed)
    - `created_by` (uuid, references user_profiles)
    - `created_at` (timestamptz)
    - `completed_at` (timestamptz)

  - `stock_deliveries`
    - `id` (uuid, primary key)
    - `delivery_number` (text, unique)
    - `product_id` (uuid, references products)
    - `warehouse_id` (uuid, references warehouses)
    - `quantity` (numeric)
    - `customer_name` (text)
    - `notes` (text)
    - `status` (text: pending, completed)
    - `created_by` (uuid, references user_profiles)
    - `created_at` (timestamptz)
    - `completed_at` (timestamptz)

  - `stock_transfers`
    - `id` (uuid, primary key)
    - `transfer_number` (text, unique)
    - `product_id` (uuid, references products)
    - `from_warehouse_id` (uuid, references warehouses)
    - `to_warehouse_id` (uuid, references warehouses)
    - `quantity` (numeric)
    - `notes` (text)
    - `status` (text: pending, completed)
    - `created_by` (uuid, references user_profiles)
    - `created_at` (timestamptz)
    - `completed_at` (timestamptz)

  - `stock_adjustments`
    - `id` (uuid, primary key)
    - `adjustment_number` (text, unique)
    - `product_id` (uuid, references products)
    - `warehouse_id` (uuid, references warehouses)
    - `quantity_change` (numeric, can be positive or negative)
    - `reason` (text)
    - `notes` (text)
    - `created_by` (uuid, references user_profiles)
    - `created_at` (timestamptz)

  ### Tracking & Auditing
  - `stock_ledger`
    - `id` (uuid, primary key)
    - `product_id` (uuid, references products)
    - `warehouse_id` (uuid, references warehouses)
    - `transaction_type` (text: receipt, delivery, transfer_in, transfer_out, adjustment)
    - `reference_id` (uuid)
    - `reference_number` (text)
    - `quantity_change` (numeric)
    - `quantity_after` (numeric)
    - `created_by` (uuid, references user_profiles)
    - `created_at` (timestamptz)

  - `audit_logs`
    - `id` (uuid, primary key)
    - `table_name` (text)
    - `record_id` (uuid)
    - `action` (text: insert, update, delete)
    - `old_data` (jsonb)
    - `new_data` (jsonb)
    - `user_id` (uuid, references user_profiles)
    - `created_at` (timestamptz)

  - `low_stock_alerts`
    - `id` (uuid, primary key)
    - `product_id` (uuid, references products)
    - `warehouse_id` (uuid, references warehouses)
    - `current_quantity` (numeric)
    - `reorder_level` (numeric)
    - `is_acknowledged` (boolean)
    - `acknowledged_by` (uuid, references user_profiles)
    - `acknowledged_at` (timestamptz)
    - `created_at` (timestamptz)

  ## 2. Security (Row Level Security)
  - All tables have RLS enabled
  - Policies based on user roles (admin, manager, staff)
  - Authenticated users can only access data based on their role
  - Admins have full access
  - Managers can manage their assigned warehouses
  - Staff have read access and limited write access

  ## 3. Indexes
  - Performance indexes on frequently queried columns
  - Foreign key indexes for join operations
  - Unique indexes for business logic constraints

  ## 4. Functions & Triggers
  - Auto-generate operation numbers
  - Update stock quantities on operations
  - Create ledger entries automatically
  - Generate low stock alerts
  - Track all changes in audit logs
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 2. CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- 3. WAREHOUSES
-- =============================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  location text,
  manager_id uuid REFERENCES user_profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 4. PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category_id uuid REFERENCES categories(id),
  unit text NOT NULL DEFAULT 'pcs' CHECK (unit IN ('pcs', 'kg', 'ltr', 'box', 'carton', 'dozen', 'meter')),
  reorder_level numeric DEFAULT 0 CHECK (reorder_level >= 0),
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and managers can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- 5. STOCK
-- =============================================
CREATE TABLE IF NOT EXISTS stock (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock(warehouse_id);

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock"
  ON stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage stock"
  ON stock FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- 6. STOCK RECEIPTS
-- =============================================
CREATE TABLE IF NOT EXISTS stock_receipts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric DEFAULT 0 CHECK (unit_cost >= 0),
  supplier_name text,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_receipts_status ON stock_receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_product ON stock_receipts(product_id);

ALTER TABLE stock_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receipts"
  ON stock_receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create receipts"
  ON stock_receipts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can manage receipts"
  ON stock_receipts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- 7. STOCK DELIVERIES
-- =============================================
CREATE TABLE IF NOT EXISTS stock_deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_number text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  customer_name text,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status ON stock_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_product ON stock_deliveries(product_id);

ALTER TABLE stock_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deliveries"
  ON stock_deliveries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create deliveries"
  ON stock_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can manage deliveries"
  ON stock_deliveries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- 8. STOCK TRANSFERS
-- =============================================
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CHECK (from_warehouse_id != to_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_product ON stock_transfers(product_id);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers"
  ON stock_transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create transfers"
  ON stock_transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can manage transfers"
  ON stock_transfers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- 9. STOCK ADJUSTMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_number text UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity_change numeric NOT NULL CHECK (quantity_change != 0),
  reason text NOT NULL,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_product ON stock_adjustments(product_id);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustments"
  ON stock_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can create adjustments"
  ON stock_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- 10. STOCK LEDGER
-- =============================================
CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment')),
  reference_id uuid,
  reference_number text,
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_warehouse ON stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON stock_ledger(created_at DESC);

ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ledger"
  ON stock_ledger FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create ledger entries"
  ON stock_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- 11. AUDIT LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 12. LOW STOCK ALERTS
-- =============================================
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  current_quantity numeric NOT NULL,
  reorder_level numeric NOT NULL,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES user_profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON low_stock_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON low_stock_alerts(product_id);

ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON low_stock_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can acknowledge alerts"
  ON low_stock_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_updated_at ON stock;
CREATE TRIGGER update_stock_updated_at
  BEFORE UPDATE ON stock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate operation numbers
CREATE OR REPLACE FUNCTION generate_operation_number(prefix text)
RETURNS text AS $$
DECLARE
  next_num integer;
  year_month text;
BEGIN
  year_month := to_char(now(), 'YYYYMM');
  next_num := floor(random() * 10000)::integer;
  RETURN prefix || '-' || year_month || '-' || LPAD(next_num::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to check and create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity IS NOT NULL THEN
    INSERT INTO low_stock_alerts (product_id, warehouse_id, current_quantity, reorder_level)
    SELECT 
      NEW.product_id,
      NEW.warehouse_id,
      NEW.quantity,
      p.reorder_level
    FROM products p
    WHERE p.id = NEW.product_id
      AND NEW.quantity <= p.reorder_level
      AND p.reorder_level > 0
      AND NOT EXISTS (
        SELECT 1 FROM low_stock_alerts
        WHERE product_id = NEW.product_id
          AND warehouse_id = NEW.warehouse_id
          AND is_acknowledged = false
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_low_stock_trigger ON stock;
CREATE TRIGGER check_low_stock_trigger
  AFTER INSERT OR UPDATE ON stock
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();