/*
  # Seed Initial Data for StockMaster

  ## Purpose
  This migration adds initial sample data to make the application immediately functional
  for testing and demonstration purposes.

  ## Data Added
  1. Categories - Sample product categories
  2. Warehouses - Sample warehouse locations

  ## Notes
  - This is optional seed data
  - Safe to run multiple times (uses INSERT with conflict handling where possible)
*/

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Electronic devices and components'),
  ('Furniture', 'Office and home furniture'),
  ('Stationery', 'Office supplies and stationery'),
  ('Food & Beverage', 'Food and beverage items'),
  ('Clothing', 'Apparel and accessories')
ON CONFLICT DO NOTHING;

-- Insert sample warehouses
INSERT INTO warehouses (name, code, location, is_active) VALUES
  ('Main Warehouse', 'WH-001', '123 Industrial Ave, City Center', true),
  ('North Distribution Center', 'WH-002', '456 North Road, North District', true),
  ('South Storage Facility', 'WH-003', '789 South Street, South Zone', true)
ON CONFLICT (code) DO NOTHING;
