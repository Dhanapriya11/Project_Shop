import React, { useEffect, useState } from 'react';
import { supabase, Saving } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  PiggyBank,
  Plus,
  X,
  Save,
  Calendar,
  Target,
  TrendingUp,
  Trash2
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function SavingsPage() {
  const { user } = useAuth();
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; amount: number; cumulative: number }[]>([]);

  // Summary stats
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);

  // Form states
  const [savingAmount, setSavingAmount] = useState('');
  const [savingNotes, setSavingNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchSavings();
    }
  }, [user]);

  const fetchSavings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const monthStart = startOfMonth(new Date());

      const { data, error } = await supabase
        .from('savings')
        .select('*')
        .eq('user_id', user.id)
        .order('saving_date', { ascending: false });

      if (error) throw error;
      setSavings(data || []);

      // Calculate totals
      const todaySavings = data?.filter(s =>
        new Date(s.saving_date) >= today
      ) || [];
      const weekSavings = data?.filter(s =>
        new Date(s.saving_date) >= weekStart
      ) || [];
      const monthSavings = data?.filter(s =>
        new Date(s.saving_date) >= monthStart
      ) || [];

      setTodayTotal(todaySavings.reduce((sum, s) => sum + (s.amount || 0), 0));
      setWeekTotal(weekSavings.reduce((sum, s) => sum + (s.amount || 0), 0));
      setMonthTotal(monthSavings.reduce((sum, s) => sum + (s.amount || 0), 0));
      setTotalSavings(data?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0);

      // Chart data - last 30 days with cumulative
      const chartD: { date: string; amount: number; cumulative: number }[] = [];
      let cumulative = 0;

      // Create a map of daily savings
      const dailySavings: Record<string, number> = {};
      data?.forEach(s => {
        const dateKey = format(new Date(s.saving_date), 'yyyy-MM-dd');
        dailySavings[dateKey] = (dailySavings[dateKey] || 0) + (s.amount || 0);
      });

      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayAmount = dailySavings[dateKey] || 0;
        cumulative += dayAmount;

        chartD.push({
          date: format(date, 'dd/MM'),
          amount: dayAmount,
          cumulative
        });
      }
      setChartData(chartD);
    } catch (error) {
      console.error('Error fetching savings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSaving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(savingAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('தயவுசெய்து சரியான தொகையை உள்ளிடவும்');
      return;
    }

    try {
      const { error } = await supabase
        .from('savings')
        .insert({
          amount,
          notes: savingNotes,
          user_id: user.id
        });

      if (error) throw error;

      setShowSavingModal(false);
      resetSavingForm();
      fetchSavings();
    } catch (error) {
      console.error('Error adding saving:', error);
      alert('சேமிப்பு சேர்க்க முடியவில்லை');
    }
  };

  const handleDeleteSaving = async (savingId: string) => {
    if (!window.confirm('இந்த சேமிப்பை நிச்சயமாக நீக்க விரும்புகிறீர்களா?')) return;

    try {
      const { error } = await supabase
        .from('savings')
        .delete()
        .eq('id', savingId);

      if (error) throw error;
      fetchSavings();
    } catch (error) {
      console.error('Error deleting saving:', error);
      alert('சேமிப்பை நீக்க முடியவில்லை');
    }
  };

  const resetSavingForm = () => {
    setSavingAmount('');
    setSavingNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">சேமிப்பு</h1>
          <p className="text-lg text-gray-600 mt-1">சேமிப்பை கண்காணிக்கவும்</p>
        </div>
        <button
          onClick={() => setShowSavingModal(true)}
          className="btn-accent flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          புதிய சேமிப்பு
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-dashboard border-accent-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent-100">
              <Calendar className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">இன்றைய சேமிப்பு</p>
              <p className="text-2xl font-bold text-accent-600">₹{todayTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">வார சேமிப்பு</p>
              <p className="text-2xl font-bold text-orange-600">₹{weekTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-green-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <PiggyBank className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மாத சேமிப்பு</p>
              <p className="text-2xl font-bold text-green-600">₹{monthTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-primary-500 bg-gradient-to-br from-primary-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-100">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மொத்த சேமிப்பு</p>
              <p className="text-2xl font-bold text-primary-600">₹{totalSavings.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">கடந்த 30 நாட்கள் சேமிப்பு முன்னேற்றம்</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#f59e0b"
                fill="#fef3c7"
                strokeWidth={2}
                name="மொத்த சேமிப்பு"
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
                name="தினசரி சேமிப்பு"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : savings.length === 0 ? (
        <div className="text-center py-12">
          <PiggyBank className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">சேமிப்பு இல்லை</p>
          <p className="text-gray-500 mt-2">புதிய சேமிப்பு சேர்க்க "புதிய சேமிப்பு" பொத்தானை கிளிக் செய்யவும்</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savings.map((saving) => (
            <div
              key={saving.id}
              className="card flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-xl text-accent-600">
                  ₹{saving.amount.toLocaleString('ta-IN')}
                </p>
                <p className="text-sm text-gray-500">{saving.notes}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  {format(new Date(saving.saving_date), 'dd/MM/yyyy')}
                </p>
                <button
                  onClick={() => handleDeleteSaving(saving.id)}
                  className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Saving Modal */}
      {showSavingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">புதிய சேமிப்பு</h2>
              <button onClick={() => {
                setShowSavingModal(false);
                resetSavingForm();
              }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSaving} className="space-y-4">
              <div>
                <label className="label">தொகை (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={savingAmount}
                  onChange={(e) => setSavingAmount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="label">குறிப்புகள் (விருப்பம்)</label>
                <textarea
                  value={savingNotes}
                  onChange={(e) => setSavingNotes(e.target.value)}
                  className="input-field"
                  rows={2}
                  placeholder="கூடுதல் தகவல்..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => {
                  setShowSavingModal(false);
                  resetSavingForm();
                }} className="btn-secondary flex-1">
                  ரத்து செய்
                </button>
                <button type="submit" className="btn-accent flex-1 flex items-center justify-center gap-2">
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
