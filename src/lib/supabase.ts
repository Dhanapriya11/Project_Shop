import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  product_name: string;
  product_name_tamil: string;
  unit: string;
  category: string;
  created_at: string;
  user_id: string;
};

export type Purchase = {
  id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  total_amount: number;
  purchase_date: string;
  notes: string;
  created_at: string;
  user_id: string;
  products?: Product;
};

export type Sale = {
  id: string;
  product_id: string;
  quantity_sold: number;
  selling_price: number;
  total_amount: number;
  profit_amount: number;
  sales_date: string;
  notes: string;
  created_at: string;
  user_id: string;
  products?: Product;
};

export type Expense = {
  id: string;
  expense_category: string;
  amount: number;
  expense_date: string;
  notes: string;
  created_at: string;
  user_id: string;
};

export type Saving = {
  id: string;
  amount: number;
  saving_date: string;
  notes: string;
  created_at: string;
  user_id: string;
};

export type StockSummary = {
  id: string;
  product_id: string;
  available_quantity: number;
  last_purchase_price: number;
  last_selling_price: number;
  last_updated: string;
  user_id: string;
  products?: Product;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
};

export type CreditCustomer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
};

export type CreditSale = {
  id: string;
  customer_id: string;
  amount: number;
  description: string | null;
  sale_date: string;
  due_date: string | null;
  settled: boolean;
  settled_date: string | null;
  created_at: string;
  user_id: string;
  credit_customers?: CreditCustomer;
};

export type ProductExpiry = {
  id: string;
  product_id: string;
  batch_date: string;
  expiry_date: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  user_id: string;
  products?: Product;
};

export type AdvisorLog = {
  id: string;
  query: string;
  response: string;
  context_data: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
};

export type DashboardStats = {
  todaySales: number;
  todayPurchases: number;
  todayExpenses: number;
  todaySavings: number;
  todayProfit: number;
  weekSales: number;
  weekProfit: number;
  monthSales: number;
  monthProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  totalSavings: number;
  lowStockProducts: StockSummary[];
};
