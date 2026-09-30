-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_name_tamil TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'கிலோ',
    category TEXT DEFAULT 'பொதுவானவை',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Purchases Table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sales Table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_sold DECIMAL(10,3) NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    profit_amount DECIMAL(12,2),
    sales_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Savings Table
CREATE TABLE savings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(12,2) NOT NULL,
    saving_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Stock Summary Table
CREATE TABLE stock_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    available_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    last_purchase_price DECIMAL(12,2),
    last_selling_price DECIMAL(12,2),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "select_own_products" ON products FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_products" ON products FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_products" ON products FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_products" ON products FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for purchases
CREATE POLICY "select_own_purchases" ON purchases FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_purchases" ON purchases FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_purchases" ON purchases FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_purchases" ON purchases FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for sales
CREATE POLICY "select_own_sales" ON sales FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sales" ON sales FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sales" ON sales FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sales" ON sales FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "select_own_expenses" ON expenses FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_expenses" ON expenses FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_expenses" ON expenses FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_expenses" ON expenses FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for savings
CREATE POLICY "select_own_savings" ON savings FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_savings" ON savings FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_savings" ON savings FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_savings" ON savings FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for stock_summary
CREATE POLICY "select_own_stock_summary" ON stock_summary FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_stock_summary" ON stock_summary FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_stock_summary" ON stock_summary FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_stock_summary" ON stock_summary FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_date ON sales(sales_date);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_savings_date ON savings(saving_date);
CREATE INDEX idx_stock_product_id ON stock_summary(product_id);
