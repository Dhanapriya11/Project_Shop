/*
# Add Suppliers, Credit, Product Expiry, and AI Advisor tables

1. New Tables
- `suppliers` — vendor/supplier directory (name, phone, address, notes)
- `credit_customers` — customers who buy on credit (name, phone)
- `credit_sales` — credit sale records linked to customers (amount, due_date, settled)
- `product_expiry` — expiry tracking per product batch (product_id, batch_date, expiry_date, quantity)
- `ai_advisor_logs` — stores AI advisor queries and responses (query, response, context_data)

2. Modified Tables
- `products` — add optional `supplier_id` column linking to suppliers
- `purchases` — add optional `supplier_id` column linking to suppliers

3. Security
- RLS enabled on all new tables with owner-scoped CRUD policies (4 per table)
- All new tables have `user_id uuid NOT NULL DEFAULT auth.uid()`
*/

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_suppliers" ON suppliers;
CREATE POLICY "select_own_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_suppliers" ON suppliers;
CREATE POLICY "insert_own_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_suppliers" ON suppliers;
CREATE POLICY "update_own_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_suppliers" ON suppliers;
CREATE POLICY "delete_own_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Credit customers table
CREATE TABLE IF NOT EXISTS credit_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE credit_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credit_customers" ON credit_customers;
CREATE POLICY "select_own_credit_customers" ON credit_customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_credit_customers" ON credit_customers;
CREATE POLICY "insert_own_credit_customers" ON credit_customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_credit_customers" ON credit_customers;
CREATE POLICY "update_own_credit_customers" ON credit_customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_credit_customers" ON credit_customers;
CREATE POLICY "delete_own_credit_customers" ON credit_customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Credit sales table
CREATE TABLE IF NOT EXISTS credit_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES credit_customers(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE credit_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credit_sales" ON credit_sales;
CREATE POLICY "select_own_credit_sales" ON credit_sales FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_credit_sales" ON credit_sales;
CREATE POLICY "insert_own_credit_sales" ON credit_sales FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_credit_sales" ON credit_sales;
CREATE POLICY "update_own_credit_sales" ON credit_sales FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_credit_sales" ON credit_sales;
CREATE POLICY "delete_own_credit_sales" ON credit_sales FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Product expiry tracking table
CREATE TABLE IF NOT EXISTS product_expiry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE product_expiry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_product_expiry" ON product_expiry;
CREATE POLICY "select_own_product_expiry" ON product_expiry FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_product_expiry" ON product_expiry;
CREATE POLICY "insert_own_product_expiry" ON product_expiry FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_product_expiry" ON product_expiry;
CREATE POLICY "update_own_product_expiry" ON product_expiry FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_product_expiry" ON product_expiry;
CREATE POLICY "delete_own_product_expiry" ON product_expiry FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AI advisor logs table
CREATE TABLE IF NOT EXISTS ai_advisor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  context_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE ai_advisor_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_advisor_logs" ON ai_advisor_logs;
CREATE POLICY "select_own_advisor_logs" ON ai_advisor_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_advisor_logs" ON ai_advisor_logs;
CREATE POLICY "insert_own_advisor_logs" ON ai_advisor_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_advisor_logs" ON ai_advisor_logs;
CREATE POLICY "delete_own_advisor_logs" ON ai_advisor_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add supplier_id to products (optional)
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add supplier_id to purchases (optional)
DO $$ BEGIN
  ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_customers_user ON credit_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_user ON credit_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_customer ON credit_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_expiry_product ON product_expiry(product_id);
CREATE INDEX IF NOT EXISTS idx_product_expiry_user ON product_expiry(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_logs_user ON ai_advisor_logs(user_id);
