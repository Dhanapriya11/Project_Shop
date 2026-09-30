import { useEffect, useState } from 'react';
import { supabase, DashboardStats, Sale, Expense } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  PiggyBank,
  AlertTriangle,
  Package,
  DollarSign,
  Calendar,
  Heart,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [salesChartData, setSalesChartData] = useState<{ date: string; sales: number; profit: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const monthStart = startOfMonth(new Date());

    try {
      // Fetch today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total_amount, profit_amount')
        .eq('user_id', user.id)
        .gte('sales_date', today.toISOString());

      const todaySales = todaySalesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const todayProfit = todaySalesData?.reduce((sum, s) => sum + (s.profit_amount || 0), 0) || 0;

      // Fetch today's purchases
      const { data: todayPurchasesData } = await supabase
        .from('purchases')
        .select('total_amount')
        .eq('user_id', user.id)
        .gte('purchase_date', today.toISOString());

      const todayPurchases = todayPurchasesData?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

      // Fetch today's expenses
      const { data: todayExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('expense_date', today.toISOString());

      const todayExpenses = todayExpensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Fetch today's savings
      const { data: todaySavingsData } = await supabase
        .from('savings')
        .select('amount')
        .eq('user_id', user.id)
        .gte('saving_date', today.toISOString());

      const todaySavings = todaySavingsData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      // Week sales and profit
      const { data: weekSalesData } = await supabase
        .from('sales')
        .select('total_amount, profit_amount')
        .eq('user_id', user.id)
        .gte('sales_date', weekStart.toISOString());

      const weekSales = weekSalesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const weekProfit = weekSalesData?.reduce((sum, s) => sum + (s.profit_amount || 0), 0) || 0;

      // Month sales and profit
      const { data: monthSalesData } = await supabase
        .from('sales')
        .select('total_amount, profit_amount')
        .eq('user_id', user.id)
        .gte('sales_date', monthStart.toISOString());

      const monthSales = monthSalesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const monthProfit = monthSalesData?.reduce((sum, s) => sum + (s.profit_amount || 0), 0) || 0;

      // Total revenue
      const { data: allSales } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('user_id', user.id);

      const totalRevenue = allSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      // Total expenses
      const { data: allExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id);

      const totalExpenses = allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Total savings
      const { data: allSavings } = await supabase
        .from('savings')
        .select('amount')
        .eq('user_id', user.id);

      const totalSavings = allSavings?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      // Low stock products (less than 5 units)
      const { data: lowStockData } = await supabase
        .from('stock_summary')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .lt('available_quantity', 5)
        .gt('available_quantity', 0);

      // Recent sales
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentSales(recentSalesData || []);

      // Recent expenses
      const { data: recentExpensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentExpenses(recentExpensesData || []);

      // Chart data - last 7 days
      const chartData: { date: string; sales: number; profit: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: daySales } = await supabase
          .from('sales')
          .select('total_amount, profit_amount')
          .eq('user_id', user.id)
          .gte('sales_date', dayStart.toISOString())
          .lt('sales_date', dayEnd.toISOString());

        const daySalesTotal = daySales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        const dayProfitTotal = daySales?.reduce((sum, s) => sum + (s.profit_amount || 0), 0) || 0;

        chartData.push({
          date: format(date, 'dd/MM'),
          sales: daySalesTotal,
          profit: dayProfitTotal
        });
      }
      setSalesChartData(chartData);

      setStats({
        todaySales,
        todayPurchases,
        todayExpenses,
        todaySavings,
        todayProfit: todayProfit - todayExpenses,
        weekSales,
        weekProfit,
        monthSales,
        monthProfit,
        totalRevenue,
        totalExpenses,
        totalSavings,
        lowStockProducts: lowStockData || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'இன்றைய விற்பனை',
      value: stats?.todaySales || 0,
      icon: ShoppingBag,
      color: 'border-primary-500',
      bgGradient: 'from-primary-50 to-primary-100'
    },
    {
      title: 'இன்றைய லாபம்',
      value: stats?.todayProfit || 0,
      icon: TrendingUp,
      color: 'border-green-500',
      bgGradient: 'from-green-50 to-green-100'
    },
    {
      title: 'இன்றைய செலவு',
      value: stats?.todayExpenses || 0,
      icon: Receipt,
      color: 'border-red-500',
      bgGradient: 'from-red-50 to-red-100'
    },
    {
      title: 'இன்றைய சேமிப்பு',
      value: stats?.todaySavings || 0,
      icon: PiggyBank,
      color: 'border-accent-500',
      bgGradient: 'from-accent-50 to-accent-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">டாஷ்போர்டு</h1>
          <p className="text-lg text-gray-600 mt-1">உங்கள் கடையின் செயல்பாடுகள்</p>
        </div>
        <div className="text-right">
          <p className="text-lg text-gray-600">{format(new Date(), 'dd/MM/yyyy')}</p>
          <p className="text-sm text-gray-500">
            {['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'][new Date().getDay()]}க்கிழமை
          </p>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`card-dashboard ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{card.value.toLocaleString('ta-IN')}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.bgGradient}`}>
                  <Icon className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold">வாராந்திர சுருக்கம்</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">விற்பனை</span>
              <span className="font-semibold">₹{(stats?.weekSales || 0).toLocaleString('ta-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">லாபம்</span>
              <span className="font-semibold text-green-600">₹{(stats?.weekProfit || 0).toLocaleString('ta-IN')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-accent-600" />
            <h3 className="text-lg font-semibold">மாதாந்திர சுருக்கம்</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">விற்பனை</span>
              <span className="font-semibold">₹{(stats?.monthSales || 0).toLocaleString('ta-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">லாபம்</span>
              <span className="font-semibold text-green-600">₹{(stats?.monthProfit || 0).toLocaleString('ta-IN')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">மொத்த சுருக்கம்</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">மொத்த வருமானம்</span>
              <span className="font-semibold">₹{(stats?.totalRevenue || 0).toLocaleString('ta-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">மொத்த செலவு</span>
              <span className="font-semibold text-red-600">₹{(stats?.totalExpenses || 0).toLocaleString('ta-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">மொத்த சேமிப்பு</span>
              <span className="font-semibold text-accent-600">₹{(stats?.totalSavings || 0).toLocaleString('ta-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Health Score */}
      {(() => {
        const totalRev = stats?.totalRevenue || 0;
        const totalExp = stats?.totalExpenses || 0;
        const totalSav = stats?.totalSavings || 0;
        const lowStock = stats?.lowStockProducts?.length || 0;
        const weekProf = stats?.weekProfit || 0;

        // Weighted score: profitability (40), savings (20), stock health (20), expense ratio (20)
        const profitScore = totalRev > 0 ? Math.min(40, (weekProf / totalRev) * 100 * 2) : 0;
        const savingsScore = totalRev > 0 ? Math.min(20, (totalSav / totalRev) * 100) : 0;
        const stockScore = Math.max(0, 20 - lowStock * 4);
        const expenseScore = totalRev > 0 ? Math.max(0, 20 - (totalExp / totalRev) * 20) : 0;
        const healthScore = Math.round(profitScore + savingsScore + stockScore + expenseScore);

        const healthLabel = healthScore >= 75 ? 'சிறப்பாக' : healthScore >= 50 ? 'நல்லது' : healthScore >= 25 ? 'கவனிக்கவும்' : 'மேம்படுத்தவும்';
        const healthColor = healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-primary-600' : healthScore >= 25 ? 'text-orange-600' : 'text-red-600';
        const healthBg = healthScore >= 75 ? 'from-green-50 to-green-100' : healthScore >= 50 ? 'from-primary-50 to-primary-100' : healthScore >= 25 ? 'from-orange-50 to-orange-100' : 'from-red-50 to-red-100';

        return (
          <div className={`card bg-gradient-to-br ${healthBg} border-2 ${
            healthScore >= 75 ? 'border-green-300' : healthScore >= 50 ? 'border-primary-300' : healthScore >= 25 ? 'border-orange-300' : 'border-red-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/60">
                  <Heart className={`w-6 h-6 ${healthColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">வர்த்தக ஆரோக்கிய மதிப்பெண்</h3>
                  <p className="text-sm text-gray-600">Business Health Score</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-bold ${healthColor}`}>{healthScore}</p>
                <p className={`text-sm font-medium ${healthColor}`}>{healthLabel}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-gray-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>லாபம் (Profitability)</span>
                    <span>{Math.round(profitScore)}/40</span>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(profitScore / 40) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-gray-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>சேமிப்பு (Savings)</span>
                    <span>{Math.round(savingsScore)}/20</span>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${(savingsScore / 20) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-gray-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>இருப்பு நிலை (Stock Health)</span>
                    <span>{Math.round(stockScore)}/20</span>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${(stockScore / 20) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-gray-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>செலவு விகிதம் (Expense Ratio)</span>
                    <span>{Math.round(expenseScore)}/20</span>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(expenseScore / 20) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">கடந்த 7 நாட்கள் விற்பனை</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChartData}>
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
              <Bar dataKey="sales" fill="#22c55e" radius={[4, 4, 0, 0]} name="விற்பனை" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Alert & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">குறைந்த இருப்பு எச்சரிக்கை</h3>
          </div>
          {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.lowStockProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-red-600" />
                    <span className="font-medium">
                      {item.products?.product_name_tamil || item.products?.product_name}
                    </span>
                  </div>
                  <span className="badge badge-danger">
                    {item.available_quantity} {item.products?.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>குறைந்த இருப்பு இல்லை</p>
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold">சமீபத்திய விற்பனை</h3>
          </div>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium">
                      {sale.products?.product_name_tamil}
                    </p>
                    <p className="text-sm text-gray-500">
                      {sale.quantity_sold} {sale.products?.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{sale.total_amount.toLocaleString('ta-IN')}</p>
                    <p className="text-sm text-green-600">+₹{(sale.profit_amount || 0).toLocaleString('ta-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>விற்பனை இல்லை</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold">சமீபத்திய செலவுகள்</h3>
        </div>
        {recentExpenses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 bg-red-50 rounded-xl"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{expense.expense_category}</p>
                    <p className="text-sm text-gray-500">{expense.notes}</p>
                  </div>
                  <span className="font-semibold text-red-600">
                    ₹{expense.amount.toLocaleString('ta-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>செலவுகள் இல்லை</p>
          </div>
        )}
      </div>
    </div>
  );
}
