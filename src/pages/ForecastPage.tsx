import { useEffect, useState } from 'react';
import { supabase, Product, ProductExpiry, Sale } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Package,
  Clock,
  IndianRupee,
  BarChart3
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, startOfDay, differenceInDays, addDays } from 'date-fns';

interface ForecastItem {
  product: Product;
  avgDailySales: number;
  predictedDemand: number;
  daysOfStock: number;
  recommendation: string;
}

interface ExpiryItem {
  product: Product;
  expiry: ProductExpiry;
  daysUntilExpiry: number;
  urgency: 'critical' | 'warning' | 'safe';
}

interface FestivalInsight {
  festival: string;
  date: string;
  products: string[];
  expectedBoost: string;
  recommendation: string;
}

export function ForecastPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [, setProducts] = useState<Product[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>([]);
  const [festivalInsights] = useState<FestivalInsight[]>(getFestivalInsights());
  const [salesTrend, setSalesTrend] = useState<{ date: string; sales: number }[]>([]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('product_name_tamil');
      setProducts(productsData || []);

      // Fetch last 30 days of sales for trend + demand calculation
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .gte('sales_date', thirtyDaysAgo.toISOString())
        .order('sales_date', { ascending: true });

      // Fetch stock summaries
      const { data: stockData } = await supabase
        .from('stock_summary')
        .select('*')
        .eq('user_id', user.id);

      const stockMap: Record<string, number> = {};
      (stockData || []).forEach(s => { stockMap[s.product_id] = s.available_quantity; });

      // Build demand forecast
      const productSalesMap: Record<string, Sale[]> = {};
      (salesData || []).forEach(s => {
        if (!productSalesMap[s.product_id]) productSalesMap[s.product_id] = [];
        productSalesMap[s.product_id].push(s);
      });

      const forecastItems: ForecastItem[] = (productsData || []).map(p => {
        const productSales = productSalesMap[p.id] || [];
        const totalQtySold = productSales.reduce((sum, s) => sum + s.quantity_sold, 0);
        const avgDaily = totalQtySold / 30;
        const predicted = Math.round(avgDaily * 7);
        const currentStock = stockMap[p.id] || 0;
        const daysOfStock = avgDaily > 0 ? Math.round(currentStock / avgDaily) : 999;

        let rec = '';
        if (daysOfStock < 3) rec = 'உடனடியாக கொள்முதல் செய்யவும்';
        else if (daysOfStock < 7) rec = 'இந்த வாரம் கொள்முதல் செய்யவும்';
        else if (daysOfStock > 30) rec = 'அதிக இருப்பு - கொள்முதல் தற்காலிக்கமாக நிறுத்தவும்';
        else rec = 'இருப்பு போதுமானது';

        return {
          product: p,
          avgDailySales: Math.round(avgDaily * 10) / 10,
          predictedDemand: predicted,
          daysOfStock,
          recommendation: rec
        };
      }).filter(f => f.avgDailySales > 0 || f.daysOfStock < 30);

      setForecast(forecastItems.sort((a, b) => a.daysOfStock - b.daysOfStock));

      // Fetch expiry data
      const { data: expiryData } = await supabase
        .from('product_expiry')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .order('expiry_date', { ascending: true });

      const today = new Date();
      const expiryItemsList: ExpiryItem[] = (expiryData || []).map(e => {
        const days = differenceInDays(new Date(e.expiry_date), today);
        let urgency: 'critical' | 'warning' | 'safe' = 'safe';
        if (days <= 3) urgency = 'critical';
        else if (days <= 7) urgency = 'warning';
        return {
          product: e.products as Product,
          expiry: e,
          daysUntilExpiry: days,
          urgency
        };
      }).filter(e => e.daysUntilExpiry <= 30);

      setExpiryItems(expiryItemsList);

      // Build sales trend chart (last 14 days)
      const trend: { date: string; sales: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = addDays(dayStart, 1);
        const daySales = (salesData || []).filter(s => {
          const sd = new Date(s.sales_date);
          return sd >= dayStart && sd < dayEnd;
        });
        trend.push({
          date: format(date, 'dd/MM'),
          sales: daySales.reduce((sum, s) => sum + s.total_amount, 0)
        });
      }
      setSalesTrend(trend);
    } catch (e) {
      console.error('Error fetching forecast data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">கணிப்பு மற்றும் திட்டமிடல்</h1>
        <p className="text-lg text-gray-600 mt-1">தேவை கணிப்பு, காலாவதி கண்காணிப்பு, விழா பரிந்துரைகள்</p>
      </div>

      {/* Sales Trend */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">கடந்த 14 நாட்கள் விற்பனை போக்கு</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }} />
              <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Demand Forecast */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">தேவை கணிப்பு (அடுத்த 7 நாட்கள்)</h3>
        </div>
        {forecast.length > 0 ? (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">பொருள்</th>
                  <th className="px-4 py-3 text-right">தினசரி சராசரி</th>
                  <th className="px-4 py-3 text-right">கணிக்கப்பட்ட தேவை</th>
                  <th className="px-4 py-3 text-right">இருப்பு நாட்கள்</th>
                  <th className="px-4 py-3 text-left">பரிந்துரை</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{f.product.product_name_tamil}</td>
                    <td className="table-cell text-right">{f.avgDailySales} {f.product.unit}</td>
                    <td className="table-cell text-right font-semibold">{f.predictedDemand} {f.product.unit}</td>
                    <td className="table-cell text-right">
                      <span className={`badge ${f.daysOfStock < 3 ? 'badge-danger' : f.daysOfStock < 7 ? 'badge-warning' : 'badge-success'}`}>
                        {f.daysOfStock > 900 ? '∞' : f.daysOfStock} நாட்கள்
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{f.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>கணிப்பு தகவல் இல்லை. விற்பனை பதிவு செய்யவும்.</p>
          </div>
        )}
      </div>

      {/* Expiry Tracking */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold">காலாவதி கண்காணிப்பு</h3>
        </div>
        {expiryItems.length > 0 ? (
          <div className="space-y-3">
            {expiryItems.map((e, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${
                e.urgency === 'critical' ? 'bg-red-50' : e.urgency === 'warning' ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <Package className={`w-5 h-5 ${
                    e.urgency === 'critical' ? 'text-red-600' : e.urgency === 'warning' ? 'text-orange-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className="font-medium">{e.product.product_name_tamil}</p>
                    <p className="text-sm text-gray-500">{e.expiry.quantity} {e.product.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    e.urgency === 'critical' ? 'text-red-600' : e.urgency === 'warning' ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {e.daysUntilExpiry <= 0 ? 'காலாவதி ஆகிவிட்டது' : `${e.daysUntilExpiry} நாட்கள்`}
                  </p>
                  <p className="text-sm text-gray-500">{format(new Date(e.expiry.expiry_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>காலாவதி தகவல் இல்லை. சரக்கு பட்டியலில் காலாவதி தேதி சேர்க்கவும்.</p>
          </div>
        )}
      </div>

      {/* Festival Insights */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-accent-600" />
          <h3 className="text-lg font-semibold">விழா பரிந்துரைகள்</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {festivalInsights.map((f, i) => (
            <div key={i} className="p-4 bg-gradient-to-br from-accent-50 to-primary-50 rounded-xl border border-accent-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-accent-600" />
                <h4 className="font-semibold">{f.festival}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">{f.date}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {f.products.map(p => (
                  <span key={p} className="badge badge-primary text-xs">{p}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 mb-2">
                <IndianRupee className="w-3 h-3 text-green-600" />
                <p className="text-sm font-medium text-green-700">{f.expectedBoost}</p>
              </div>
              <p className="text-sm text-gray-600">{f.recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getFestivalInsights(): FestivalInsight[] {
  return [
    {
      festival: 'தீபாவளி (Diwali)',
      date: 'அக்டோபர்/நவம்பர்',
      products: ['எண்ணெய்', 'மிளகாய்', 'உப்பு', 'சர்க்கரை', 'பருப்பு'],
      expectedBoost: 'விற்பனை 40-60% அதிகரிக்கும்',
      recommendation: '2 வாரங்கள் முன்பு கூடுதல் கொள்முதல் செய்யவும்'
    },
    {
      festival: 'பொங்கல் (Pongal)',
      date: 'ஜனவரி 14-16',
      products: ['அரிசி', 'சர்க்கரை', 'பருப்பு', 'நெய்', 'கடலை'],
      expectedBoost: 'விற்பனை 50-70% அதிகரிக்கும்',
      recommendation: 'அரிசி மற்றும் சர்க்கரை கொள்முதல் அதிகரிக்கவும்'
    },
    {
      festival: 'விநாயகர் சதுர்த்தி',
      date: 'ஆகஸ்ட்/செப்டம்பர்',
      products: ['அரிசி மாவு', 'சர்க்கரை', 'நெய்', 'கடலை'],
      expectedBoost: 'விற்பனை 30-40% அதிகரிக்கும்',
      recommendation: 'அரிசி மாவு மற்றும் சர்க்கரை கொள்முதல் செய்யவும்'
    },
    {
      festival: 'நவராத்திரி',
      date: 'செப்டம்பர்/அக்டோபர்',
      products: ['கடலை', 'பருப்பு', 'சர்க்கரை', 'எண்ணெய்'],
      expectedBoost: 'விற்பனை 25-35% அதிகரிக்கும்',
      recommendation: 'பருப்பு வகைகள் கொள்முதல் செய்யவும்'
    },
    {
      festival: 'கிறிஸ்துமஸ்',
      date: 'டிசம்பர் 25',
      products: ['கேக்', 'சர்க்கரை', 'முட்டை', 'பால்'],
      expectedBoost: 'விற்பனை 20-30% அதிகரிக்கும்',
      recommendation: 'பேக்கரி பொருட்கள் கொள்முதல் செய்யவும்'
    },
    {
      festival: 'புத்தாண்டு (New Year)',
      date: 'ஜனவரி 1',
      products: ['அரிசி', 'பருப்பு', 'எண்ணெய்', 'சர்க்கரை'],
      expectedBoost: 'விற்பனை 30-45% அதிகரிக்கும்',
      recommendation: 'டிசம்பர் இறுதியில் கொள்முதல் செய்யவும்'
    }
  ];
}
