import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Save,
  Trash2,
  Calendar,
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval
} from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

type ViewMode = 'weekly' | 'monthly';

interface DailyCollection {
  id: string;
  collection_date: string;
  total_amount: number;
  notes: string;
}

interface OrderExpense {
  id: string;
  expense_date: string;
  order_name: string;
  amount_spent: number;
  notes: string;
}

interface DaySummary {
  date: string;
  displayDate: string;
  collection: number;
  spent: number;
  profit: number;
  orders: OrderExpense[];
}

export function DailyPLPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [collections, setCollections] = useState<DailyCollection[]>([]);
  const [orderExpenses, setOrderExpenses] = useState<OrderExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Collection form
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionDate, setCollectionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionNotes, setCollectionNotes] = useState('');

  // Order expense form
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [orderName, setOrderName] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user, viewMode]);

  const getDateRange = () => {
    const base = new Date(selectedDate);
    if (viewMode === 'weekly') {
      return {
        start: format(startOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      };
    }
    return {
      start: format(startOfMonth(base), 'yyyy-MM-dd'),
      end: format(endOfMonth(base), 'yyyy-MM-dd')
    };
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { start, end } = getDateRange();

    const [collRes, expRes] = await Promise.all([
      supabase
        .from('daily_collections')
        .select('*')
        .eq('user_id', user.id)
        .gte('collection_date', start)
        .lte('collection_date', end)
        .order('collection_date'),
      supabase
        .from('order_expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date')
    ]);

    setCollections(collRes.data || []);
    setOrderExpenses(expRes.data || []);
    setLoading(false);
  };

  const buildDaySummaries = (): DaySummary[] => {
    const { start, end } = getDateRange();
    const days = eachDayOfInterval({
      start: new Date(start + 'T00:00:00'),
      end: new Date(end + 'T00:00:00')
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayCollections = collections.filter(c => c.collection_date === dateStr);
      const dayOrders = orderExpenses.filter(o => o.expense_date === dateStr);
      const collection = dayCollections.reduce((s, c) => s + Number(c.total_amount), 0);
      const spent = dayOrders.reduce((s, o) => s + Number(o.amount_spent), 0);
      return {
        date: dateStr,
        displayDate: format(day, 'dd/MM'),
        collection,
        spent,
        profit: collection - spent,
        orders: dayOrders
      };
    });
  };

  const daySummaries = buildDaySummaries();
  const totalCollection = daySummaries.reduce((s, d) => s + d.collection, 0);
  const totalSpent = daySummaries.reduce((s, d) => s + d.spent, 0);
  const totalProfit = totalCollection - totalSpent;

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = parseFloat(collectionAmount);
    if (isNaN(amount) || amount < 0) return;

    const { error } = await supabase.from('daily_collections').insert({
      user_id: user.id,
      collection_date: collectionDate,
      total_amount: amount,
      notes: collectionNotes
    });

    if (!error) {
      setShowCollectionModal(false);
      setCollectionAmount('');
      setCollectionNotes('');
      fetchData();
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = parseFloat(orderAmount);
    if (isNaN(amount) || amount < 0 || !orderName.trim()) return;

    const { error } = await supabase.from('order_expenses').insert({
      user_id: user.id,
      expense_date: orderDate,
      order_name: orderName.trim(),
      amount_spent: amount,
      notes: orderNotes
    });

    if (!error) {
      setShowOrderModal(false);
      setOrderName('');
      setOrderAmount('');
      setOrderNotes('');
      fetchData();
    }
  };

  const handleDeleteCollection = async (id: string) => {
    await supabase.from('daily_collections').delete().eq('id', id);
    fetchData();
  };

  const handleDeleteOrder = async (id: string) => {
    await supabase.from('order_expenses').delete().eq('id', id);
    fetchData();
  };

  const chartData = daySummaries
    .filter(d => d.collection > 0 || d.spent > 0)
    .map(d => ({
      date: d.displayDate,
      வசூல்: d.collection,
      செலவு: d.spent,
      லாபம்: d.profit
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">தினசரி லாப/நட்டம்</h1>
          <p className="text-lg text-gray-600 mt-1">வசூல் & ஆர்டர் செலவு கணக்கு</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setCollectionDate(format(new Date(), 'yyyy-MM-dd')); setShowCollectionModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            வசூல் சேர்
          </button>
          <button
            onClick={() => { setOrderDate(format(new Date(), 'yyyy-MM-dd')); setShowOrderModal(true); }}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            ஆர்டர் செலவு
          </button>
        </div>
      </div>

      {/* View toggle + date nav */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              viewMode === 'weekly' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            வாரம்
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              viewMode === 'monthly' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            மாதம்
          </button>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); }}
          onBlur={() => fetchData()}
          className="input-field max-w-[180px]"
        />
        <span className="text-sm text-gray-500">
          {format(new Date(getDateRange().start + 'T00:00:00'), 'dd MMM')} –{' '}
          {format(new Date(getDateRange().end + 'T00:00:00'), 'dd MMM yyyy')}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard border-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மொத்த வசூல்</p>
              <p className="text-2xl font-bold text-blue-700">₹{totalCollection.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>
        <div className="card-dashboard border-red-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-100">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மொத்த செலவு</p>
              <p className="text-2xl font-bold text-red-600">₹{totalSpent.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>
        <div className={`card-dashboard ${totalProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <TrendingUp className={`w-6 h-6 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">{totalProfit >= 0 ? 'மொத்த லாபம்' : 'மொத்த நட்டம்'}</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit >= 0 ? '+' : ''}₹{totalProfit.toLocaleString('ta-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">வசூல் vs செலவு vs லாபம்</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                  formatter={(val: number) => `₹${val.toLocaleString('ta-IN')}`}
                />
                <Legend />
                <Bar dataKey="வசூல்" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="செலவு" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="லாபம்" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Day-by-day breakdown */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">நாள் வாரியான விவரம்</h3>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary-600" />
          </div>
        ) : (
          daySummaries.map(day => {
            const isExpanded = expandedDay === day.date;
            const hasData = day.collection > 0 || day.orders.length > 0;
            const dayCollections = collections.filter(c => c.collection_date === day.date);

            return (
              <div key={day.date} className={`card transition-all ${!hasData ? 'opacity-60' : ''}`}>
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-700">{day.displayDate}</span>
                    </div>
                    <div className="hidden sm:flex gap-4 text-sm">
                      <span className="text-blue-600">வசூல்: ₹{day.collection.toLocaleString('ta-IN')}</span>
                      <span className="text-red-500">செலவு: ₹{day.spent.toLocaleString('ta-IN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {day.profit >= 0 ? '+' : ''}₹{day.profit.toLocaleString('ta-IN')}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    {/* Collections for this day */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-blue-700">வசூல் தொகைகள்</h4>
                        <button
                          onClick={() => { setCollectionDate(day.date); setShowCollectionModal(true); }}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> சேர்
                        </button>
                      </div>
                      {dayCollections.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">வசூல் இல்லை</p>
                      ) : (
                        <div className="space-y-1">
                          {dayCollections.map(c => (
                            <div key={c.id} className="flex justify-between items-center py-1 px-3 bg-blue-50 rounded-lg">
                              <div>
                                <span className="font-medium text-blue-800">₹{Number(c.total_amount).toLocaleString('ta-IN')}</span>
                                {c.notes && <span className="text-xs text-gray-500 ml-2">{c.notes}</span>}
                              </div>
                              <button onClick={() => handleDeleteCollection(c.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Order expenses for this day */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-red-700">ஆர்டர் செலவுகள்</h4>
                        <button
                          onClick={() => { setOrderDate(day.date); setShowOrderModal(true); }}
                          className="text-xs text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> சேர்
                        </button>
                      </div>
                      {day.orders.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">ஆர்டர் செலவு இல்லை</p>
                      ) : (
                        <div className="space-y-1">
                          {day.orders.map(o => (
                            <div key={o.id} className="flex justify-between items-center py-1 px-3 bg-red-50 rounded-lg">
                              <div>
                                <span className="font-medium text-red-800">{o.order_name}</span>
                                {o.notes && <span className="text-xs text-gray-500 ml-2">{o.notes}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-red-700">₹{Number(o.amount_spent).toLocaleString('ta-IN')}</span>
                                <button onClick={() => handleDeleteOrder(o.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Day P&L */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">இந்த நாள் நிகர:</span>
                      <span className={`font-bold text-lg ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {day.profit >= 0 ? 'லாபம் +' : 'நட்டம் '}₹{Math.abs(day.profit).toLocaleString('ta-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">வசூல் தொகை சேர்</h2>
              <button onClick={() => setShowCollectionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCollection} className="space-y-4">
              <div>
                <label className="label">தேதி</label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">வசூல் தொகை (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={collectionAmount}
                  onChange={e => setCollectionAmount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">குறிப்பு (விருப்பம்)</label>
                <input
                  type="text"
                  value={collectionNotes}
                  onChange={e => setCollectionNotes(e.target.value)}
                  className="input-field"
                  placeholder="கூடுதல் தகவல்..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCollectionModal(false)} className="btn-secondary flex-1">ரத்து</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Order Expense Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">ஆர்டர் செலவு சேர்</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddOrder} className="space-y-4">
              <div>
                <label className="label">தேதி</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">ஆர்டர் பெயர் / விவரம்</label>
                <input
                  type="text"
                  value={orderName}
                  onChange={e => setOrderName(e.target.value)}
                  className="input-field"
                  placeholder="உதா: ரங்கசாமி ஆர்டர், காய்கறி கொள்முதல்..."
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">செலவு தொகை (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={orderAmount}
                  onChange={e => setOrderAmount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="label">குறிப்பு (விருப்பம்)</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="input-field"
                  placeholder="கூடுதல் தகவல்..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-secondary flex-1">ரத்து</button>
                <button type="submit" className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
