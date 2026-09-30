import React, { useEffect, useState } from 'react';
import { supabase, AdvisorLog } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  Sparkles,
  Send,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Package,
  IndianRupee,
  Lightbulb
} from 'lucide-react';
import { format } from 'date-fns';

interface AdvisorContext {
  totalSales: number;
  totalExpenses: number;
  totalProfit: number;
  totalSavings: number;
  lowStockCount: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  recentSales: number;
  avgDailyProfit: number;
}

export function AdvisorPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AdvisorLog[]>([]);
  const [context, setContext] = useState<AdvisorContext | null>(null);

  useEffect(() => {
    if (user) {
      loadLogs();
      loadContext();
    }
  }, [user]);

  const loadLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_advisor_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setLogs(data);
  };

  const loadContext = async () => {
    if (!user) return;
    try {
      const { data: sales } = await supabase
        .from('sales')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .order('sales_date', { ascending: false })
        .limit(100);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id);

      const { data: savings } = await supabase
        .from('savings')
        .select('amount')
        .eq('user_id', user.id);

      const { data: lowStock } = await supabase
        .from('stock_summary')
        .select('*')
        .eq('user_id', user.id)
        .lt('available_quantity', 5);

      const totalSales = (sales || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      const totalProfit = (sales || []).reduce((s, r) => s + (r.profit_amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((s, r) => s + (r.amount || 0), 0);
      const totalSavings = (savings || []).reduce((s, r) => s + (r.amount || 0), 0);

      // Top products by quantity
      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      (sales || []).forEach(s => {
        const name = s.products?.product_name_tamil || s.products?.product_name || 'Unknown';
        if (!productMap[s.product_id]) productMap[s.product_id] = { name, qty: 0, revenue: 0 };
        productMap[s.product_id].qty += s.quantity_sold;
        productMap[s.product_id].revenue += s.total_amount;
      });
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const recentSalesCount = (sales || []).filter(s => {
        const d = new Date(s.sales_date);
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }).length;

      const avgDailyProfit = totalProfit / 30;

      setContext({
        totalSales,
        totalExpenses,
        totalProfit: totalProfit - totalExpenses,
        totalSavings,
        lowStockCount: (lowStock || []).length,
        topProducts,
        recentSales: recentSalesCount,
        avgDailyProfit
      });
    } catch (e) {
      console.error('Error loading context:', e);
    }
  };

  const generateResponse = (q: string, ctx: AdvisorContext): string => {
    const lower = q.toLowerCase();

    if (lower.includes('profit') || lower.includes('லாபம்') || lower.includes('labam')) {
      return `உங்கள் தற்போதைய லாபம் ₹${ctx.totalProfit.toLocaleString('ta-IN')}.\n\n` +
        `விற்பனை: ₹${ctx.totalSales.toLocaleString('ta-IN')}\n` +
        `செலவுகள்: ₹${ctx.totalExpenses.toLocaleString('ta-IN')}\n` +
        `சராசரி தினசரி லாபம்: ₹${Math.round(ctx.avgDailyProfit).toLocaleString('ta-IN')}\n\n` +
        (ctx.totalProfit > 0
          ? 'உங்கள் கடை லாபத்தில் உள்ளது. விற்பனையை அதிகரிக்க புதிய தயாரிப்புகளை சேர்க்கலாம்.'
          : 'கவனிக்கவும்: உங்கள் செலவுகள் அதிகமாக உள்ளன. செலவுகளை குறிக்க முயற்சிக்கவும்.');
    }

    if (lower.includes('stock') || lower.includes('இருப்பு') || lower.includes('irukku')) {
      return `குறைந்த இருப்பு பொருட்கள்: ${ctx.lowStockCount}.\n\n` +
        (ctx.lowStockCount > 0
          ? `${ctx.lowStockCount} பொருட்கள் 5 அலகுக்கு கீழ் உள்ளன. உடனடியாக கொள்முதல் செய்யவும்.\n\n`
          : 'அனைத்து பொருட்களும் போதுமான அளவில் உள்ளன.\n\n') +
        `சிறந்த விற்பனை பொருட்கள்:\n` +
        ctx.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.qty} அலகு (₹${p.revenue.toLocaleString('ta-IN')})`).join('\n');
    }

    if (lower.includes('save') || lower.includes('சேமி') || lower.includes('semippu')) {
      return `மொத்த சேமிப்பு: ₹${ctx.totalSavings.toLocaleString('ta-IN')}.\n\n` +
        (ctx.totalSavings > 0
          ? 'நல்ல சேமிப்பு! தொடர்ந்து சேமிக்கவும். விழா காலங்களில் கூடுதல் சேமிக்கலாம்.'
          : 'சேமிப்பு இல்லை. தினசரி ஒரு குறிப்பிட்ட தொகையை சேமிக்க தொடங்கவும்.');
    }

    if (lower.includes('best') || lower.includes('top') || lower.includes('சிறந்த')) {
      return `உங்கள் சிறந்த விற்பனை பொருட்கள்:\n\n` +
        ctx.topProducts.map((p, i) => `${i + 1}. ${p.name}\n   விற்பனை: ${p.qty} அலகு\n   வருவாய்: ₹${p.revenue.toLocaleString('ta-IN')}`).join('\n\n') +
        `\n\nஇந்த பொருட்களில் கூடுதல் கொள்முதல் செய்து லாபத்தை அதிகரிக்கலாம்.`;
    }

    if (lower.includes('advice') || lower.includes('அறிவுரை') || lower.includes('பரிந்துரை') || lower.includes('help')) {
      const tips: string[] = [];
      if (ctx.lowStockCount > 0) tips.push(`${ctx.lowStockCount} பொருட்கள் குறைந்த இருப்பில் உள்ளன - உடனடியாக கொள்முதல் செய்யவும்.`);
      if (ctx.totalProfit < 0) tips.push('நஷ்டத்தில் உள்ளீர் - செலவுகளை குறிக்கவும்.');
      if (ctx.recentSales < 5) tips.push('கடந்த வாரம் விற்பனை குறைவாக உள்ளது - விளம்பரம் அல்லது தள்ளுபடி மூலம் விற்பனையை அதிகரிக்கவும்.');
      if (ctx.totalSavings === 0) tips.push('சேமிப்பு இல்லை - தினசரி சேமிக்க தொடங்கவும்.');
      if (ctx.avgDailyProfit > 500) tips.push(`நல்ல லாபம்! சராசரி ₹${Math.round(ctx.avgDailyProfit).toLocaleString('ta-IN')}/நாள். இதை தக்கவைக்கவும்.`);
      if (tips.length === 0) tips.push('உங்கள் கடை நன்றாக செயல்படுகிறது. தொடர்ந்து இவ்வாறே முன்னேறவும்.');
      return 'வர்த்தக அறிவுரைகள்:\n\n' + tips.map((t, i) => `${i + 1}. ${t}`).join('\n');
    }

    // Default: general summary
    return `உங்கள் கடையின் சுருக்கம்:\n\n` +
      `மொத்த விற்பனை: ₹${ctx.totalSales.toLocaleString('ta-IN')}\n` +
      `மொத்த செலவு: ₹${ctx.totalExpenses.toLocaleString('ta-IN')}\n` +
      `நிகர லாபம்: ₹${ctx.totalProfit.toLocaleString('ta-IN')}\n` +
      `மொத்த சேமிப்பு: ₹${ctx.totalSavings.toLocaleString('ta-IN')}\n` +
      `குறைந்த இருப்பு: ${ctx.lowStockCount} பொருட்கள்\n\n` +
      'கேள்வங்கள்: "லாபம் என்ன?", "சிறந்த பொருட்கள்", "அறிவுரை", "இருப்பு நிலை"';
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user || !context) return;
    setLoading(true);
    const q = query.trim();
    setQuery('');

    const response = generateResponse(q, context);

    try {
      const { data } = await supabase
        .from('ai_advisor_logs')
        .insert({
          query: q,
          response,
          context_data: context as unknown as Record<string, unknown>,
          user_id: user.id
        })
        .select()
        .single();
      if (data) setLogs(prev => [data, ...prev]);
    } catch (e) {
      console.error('Error saving advisor log:', e);
    }
    setLoading(false);
  };

  const clearLogs = async () => {
    if (!user) return;
    await supabase.from('ai_advisor_logs').delete().eq('user_id', user.id);
    setLogs([]);
  };

  const quickQuestions = [
    'லாபம் என்ன?',
    'சிறந்த பொருட்கள்',
    'இருப்பு நிலை',
    'அறிவுரை தாருங்கள்'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI சில்லறை ஆலோசகர்</h1>
        <p className="text-lg text-gray-600 mt-1">உங்கள் கடையின் தரவை அடிப்படையாகக் கொண்டு அறிவுரைகள்</p>
      </div>

      {/* Context Summary */}
      {context && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-dashboard border-green-500">
            <IndianRupee className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-sm text-gray-600">நிகர லாபம்</p>
            <p className={`text-lg font-bold ${context.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{context.totalProfit.toLocaleString('ta-IN')}
            </p>
          </div>
          <div className="card-dashboard border-primary-500">
            <TrendingUp className="w-5 h-5 text-primary-600 mb-1" />
            <p className="text-sm text-gray-600">மொத்த விற்பனை</p>
            <p className="text-lg font-bold">₹{context.totalSales.toLocaleString('ta-IN')}</p>
          </div>
          <div className="card-dashboard border-red-500">
            <AlertTriangle className="w-5 h-5 text-red-600 mb-1" />
            <p className="text-sm text-gray-600">குறைந்த இருப்பு</p>
            <p className="text-lg font-bold text-red-600">{context.lowStockCount}</p>
          </div>
          <div className="card-dashboard border-accent-500">
            <Package className="w-5 h-5 text-accent-600 mb-1" />
            <p className="text-sm text-gray-600">வார விற்பனை</p>
            <p className="text-lg font-bold">{context.recentSales}</p>
          </div>
        </div>
      )}

      {/* Quick Questions */}
      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => setQuery(q)}
            className="px-4 py-2 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3" />
            {q}
          </button>
        ))}
      </div>

      {/* Ask Form */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="உங்கள் கேள்வத்தை இடுங்கள்..."
          className="input-field flex-1"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !query.trim()} className="btn-primary flex items-center gap-2">
          {loading ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
          கேளு
        </button>
      </form>

      {/* Response History */}
      <div className="space-y-4">
        {logs.length > 0 && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">அண்மைக் கேள்வங்கள்</h3>
            <button onClick={clearLogs} className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> அழி
            </button>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="card space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-700">நீ</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{log.query}</p>
                <p className="text-xs text-gray-400">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-accent-600" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-800 whitespace-pre-line">{log.response}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-600">கேள்வங்கள் இல்லை</p>
            <p className="text-gray-500 mt-2">மேலே உள்ள பெட்டியில் கேள்வம் கேளுங்கள்</p>
          </div>
        )}
      </div>
    </div>
  );
}
