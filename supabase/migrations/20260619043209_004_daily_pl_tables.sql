
-- Daily collections: total cash received per day
CREATE TABLE IF NOT EXISTS daily_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_collections" ON daily_collections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_collections" ON daily_collections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_collections" ON daily_collections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_collections" ON daily_collections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Order expenses: per-order spending entries
CREATE TABLE IF NOT EXISTS order_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  order_name text NOT NULL,
  amount_spent numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_order_expenses" ON order_expenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_order_expenses" ON order_expenses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_order_expenses" ON order_expenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_order_expenses" ON order_expenses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
