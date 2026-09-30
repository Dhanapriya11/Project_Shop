import React, { useEffect, useState } from 'react';
import { supabase, Expense } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  Receipt,
  Plus,
  Search,
  X,
  Save,
  Calendar,
  DollarSign,
  TrendingDown,
  Trash2
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const expenseCategories = [
  'மின்சாரம்',
  'நீர்',
  'வாடகை',
  'போக்குவரத்து',
  'உணவு',
  'பிற'
];

const categoryColors: Record<string, string> = {
  'மின்சாரம்': '#f59e0b',
  'நீர்': '#3b82f6',
  'வாடகை': '#8b5cf6',
  'போக்குவரத்து': '#10b981',
  'உணவு': '#ef4444',
  'பிற': '#6b7280'
};

export function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; amount: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; amount: number; color: string }[]>([]);

  // Summary stats
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);

  // Form states
  const [expenseCategory, setExpenseCategory] = useState('பிற');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const monthStart = startOfMonth(new Date());

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);

      // Calculate totals
      const todayExpenses = data?.filter(e =>
        new Date(e.expense_date) >= today
      ) || [];
      const weekExpenses = data?.filter(e =>
        new Date(e.expense_date) >= weekStart
      ) || [];
      const monthExpenses = data?.filter(e =>
        new Date(e.expense_date) >= monthStart
      ) || [];

      setTodayTotal(todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));
      setWeekTotal(weekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));
      setMonthTotal(monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));

      // Chart data - last 7 days
      const chartD: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayExpenses = data?.filter(e => {
          const expDate = new Date(e.expense_date);
          return expDate >= dayStart && expDate < dayEnd;
        }) || [];

        chartD.push({
          date: format(date, 'dd/MM'),
          amount: dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        });
      }
      setChartData(chartD);

      // Category breakdown
      const categoryTotals: Record<string, number> = {};
      monthExpenses.forEach(e => {
        categoryTotals[e.expense_category] = (categoryTotals[e.expense_category] || 0) + (e.amount || 0);
      });
      setCategoryData(
        Object.entries(categoryTotals).map(([name, amount]) => ({
          name,
          amount,
          color: categoryColors[name] || '#6b7280'
        }))
      );
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('தயவுசெய்து சரியான தொகையை உள்ளிடவும்');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          expense_category: expenseCategory,
          amount,
          notes: expenseNotes,
          user_id: user.id
        });

      if (error) throw error;

      setShowExpenseModal(false);
      resetExpenseForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('செலவு சேர்க்க முடியவில்லை');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('இந்த செலவை நிச்சயமாக நீக்க விரும்புகிறீர்களா?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('செலவை நீக்க முடியவில்லை');
    }
  };

  const resetExpenseForm = () => {
    setExpenseCategory('பிற');
    setExpenseAmount('');
    setExpenseNotes('');
  };

  const filteredExpenses = expenses.filter(e =>
    e.expense_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.notes?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">செலவுகள்</h1>
          <p className="text-lg text-gray-600 mt-1">செலவுகளை கண்காணிக்கவும்</p>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="btn-danger flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          புதிய செலவு
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard border-red-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-100">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">இன்றைய செலவு</p>
              <p className="text-2xl font-bold text-red-600">₹{todayTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">வார செலவு</p>
              <p className="text-2xl font-bold text-orange-600">₹{weekTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-gray-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gray-100">
              <DollarSign className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மாத செலவு</p>
              <p className="text-2xl font-bold">₹{monthTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">கடந்த 7 நாட்கள் செலவுகள்</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem'
                  }}
                />
                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">மாத செலவு பிரிவு</h3>
          {categoryData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              செலவு இல்லை
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="செலவு தேடு..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">செலவுகள் இல்லை</p>
          <p className="text-gray-500 mt-2">புதிய செலவு சேர்க்க "புதிய செலவு" பொத்தானை கிளிக் செய்யவும்</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="card flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: categoryColors[expense.expense_category] || '#6b7280' }}
                />
                <div>
                  <p className="font-medium text-lg">{expense.expense_category}</p>
                  <p className="text-sm text-gray-500">{expense.notes}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-lg text-red-600">
                    ₹{expense.amount.toLocaleString('ta-IN')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">புதிய செலவு</h2>
              <button onClick={() => {
                setShowExpenseModal(false);
                resetExpenseForm();
              }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="label">செலவு வகை</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="select-field"
                >
                  {expenseCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">தொகை (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="label">குறிப்புகள் (விருப்பம்)</label>
                <textarea
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="input-field"
                  rows={2}
                  placeholder="கூடுதல் தகவல்..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => {
                  setShowExpenseModal(false);
                  resetExpenseForm();
                }} className="btn-secondary flex-1">
                  ரத்து செய்
                </button>
                <button type="submit" className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
