import React, { useEffect, useState } from 'react';
import { supabase, Product, Sale, StockSummary } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  ShoppingCart,
  Plus,
  Search,
  X,
  Save,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SalesPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<(Product & { stock?: StockSummary })[]>([]);
  const [sales, setSales] = useState<(Sale & { products?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product & { stock?: StockSummary } | null>(null);
  const [chartData, setChartData] = useState<{ date: string; amount: number }[]>([]);

  // Form states
  const [saleQuantity, setSaleQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  // Summary stats
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchSales();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, stock_summary(*)')
        .eq('user_id', user.id)
        .order('product_name_tamil');

      if (error) throw error;
      setProducts(data?.map(p => ({
        ...p,
        stock: Array.isArray(p.stock_summary) ? p.stock_summary[0] : p.stock_summary
      })) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSales = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const monthStart = startOfMonth(new Date());

      // Fetch all sales
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .order('sales_date', { ascending: false });

      if (error) throw error;
      setSales(salesData || []);

      // Calculate totals
      const todaySales = salesData?.filter(s =>
        new Date(s.sales_date) >= today
      ) || [];
      const weekSales = salesData?.filter(s =>
        new Date(s.sales_date) >= weekStart
      ) || [];
      const monthSales = salesData?.filter(s =>
        new Date(s.sales_date) >= monthStart
      ) || [];

      setTodayTotal(todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0));
      setWeekTotal(weekSales.reduce((sum, s) => sum + (s.total_amount || 0), 0));
      setMonthTotal(monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0));

      // Chart data - last 7 days
      const chartD: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const daySales = salesData?.filter(s => {
          const saleDate = new Date(s.sales_date);
          return saleDate >= dayStart && saleDate < dayEnd;
        }) || [];

        chartD.push({
          date: format(date, 'dd/MM'),
          amount: daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
        });
      }
      setChartData(chartD);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;

    const quantity = parseFloat(saleQuantity);
    const price = parseFloat(salePrice);

    if (isNaN(quantity) || isNaN(price)) {
      alert('தயவுசெய்து சரியான அளவு மற்றும் விலையை உள்ளிடவும்');
      return;
    }

    const availableQty = selectedProduct.stock?.available_quantity || 0;
    if (quantity > availableQty) {
      alert(`இருப்பில் போதுமான அளவு இல்லை. கிடைக்கும்: ${availableQty} ${selectedProduct.unit}`);
      return;
    }

    const totalAmount = price;
    const unitPrice = price / quantity;
    const purchasePrice = selectedProduct.stock?.last_purchase_price || 0;
    const profitAmount = (unitPrice - purchasePrice) * quantity;

    try {
      const { error } = await supabase
        .from('sales')
        .insert({
          product_id: selectedProduct.id,
          quantity_sold: quantity,
          selling_price: unitPrice,
          total_amount: totalAmount,
          profit_amount: profitAmount,
          notes: saleNotes,
          user_id: user.id
        });

      if (error) throw error;

      setShowSaleModal(false);
      resetSaleForm();
      fetchProducts();
      fetchSales();
    } catch (error) {
      console.error('Error adding sale:', error);
      alert('விற்பனை சேர்க்க முடியவில்லை');
    }
  };

  const resetSaleForm = () => {
    setSaleQuantity('');
    setSalePrice('');
    setSaleNotes('');
    setSelectedProduct(null);
  };

  const filteredSales = sales.filter(s =>
    s.products?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.products?.product_name_tamil?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">விற்பனை</h1>
          <p className="text-lg text-gray-600 mt-1">விற்பனை பதிவுகள்</p>
        </div>
        <button
          onClick={() => setShowSaleModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          புதிய விற்பனை
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard border-primary-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-100">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">இன்றைய விற்பனை</p>
              <p className="text-2xl font-bold">₹{todayTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-accent-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent-100">
              <TrendingUp className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">வார விற்பனை</p>
              <p className="text-2xl font-bold">₹{weekTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card-dashboard border-green-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மாத விற்பனை</p>
              <p className="text-2xl font-bold">₹{monthTotal.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">கடந்த 7 நாட்கள் விற்பனை</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="விற்பனை தேடு..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">விற்பனை இல்லை</p>
          <p className="text-gray-500 mt-2">புதிய விற்பனை சேர்க்க "புதிய விற்பனை" பொத்தானை கிளிக் செய்யவும்</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">தேதி</th>
                <th className="px-4 py-3">பொருள்</th>
                <th className="px-4 py-3">அளவு</th>
                <th className="px-4 py-3">தொகை</th>
                <th className="px-4 py-3">லாபம்</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="table-cell">{format(new Date(sale.sales_date), 'dd/MM/yyyy')}</td>
                  <td className="table-cell font-medium">
                    {sale.products?.product_name_tamil || sale.products?.product_name}
                  </td>
                  <td className="table-cell">
                    {sale.quantity_sold} {sale.products?.unit}
                  </td>
                  <td className="table-cell font-semibold">
                    ₹{sale.total_amount.toLocaleString('ta-IN')}
                  </td>
                  <td className="table-cell">
                    <span className={sale.profit_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {sale.profit_amount >= 0 ? '+' : ''}₹{sale.profit_amount?.toLocaleString('ta-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">புதிய விற்பனை</h2>
              <button onClick={() => {
                setShowSaleModal(false);
                resetSaleForm();
              }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSale} className="space-y-4">
              {/* Product Selection */}
              {!selectedProduct ? (
                <div>
                  <label className="label">பொருள் தேர்வு</label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
                    {products.filter(p => (p.stock?.available_quantity || 0) > 0).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-primary-500 text-left transition-colors"
                      >
                        <p className="font-medium">{product.product_name_tamil}</p>
                        <p className="text-sm text-gray-500">
                          {product.stock?.available_quantity} {product.unit} இருப்பில்
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-primary-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{selectedProduct.product_name_tamil}</p>
                        <p className="text-sm text-gray-600">
                          இருப்பில்: <span className="font-medium">{selectedProduct.stock?.available_quantity} {selectedProduct.unit}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        மாற்று
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">அளவு ({selectedProduct.unit})</label>
                    <input
                      type="number"
                      step="0.01"
                      max={selectedProduct.stock?.available_quantity}
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(e.target.value)}
                      className="input-field"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">மொத்த விலை (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="input-field"
                      placeholder="0"
                      required
                    />
                  </div>

                  {saleQuantity && salePrice && (
                    <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ஒரு {selectedProduct.unit} விலை:</span>
                        <span className="font-semibold">₹{(parseFloat(salePrice) / parseFloat(saleQuantity)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">கொள்முதல் விலை:</span>
                        <span className="font-semibold">₹{selectedProduct.stock?.last_purchase_price || 0}/{selectedProduct.unit}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-700 font-medium">எதிர்பார்க்கும் லாபம்:</span>
                        <span className={`font-bold ${
                          ((parseFloat(salePrice) / parseFloat(saleQuantity)) - (selectedProduct.stock?.last_purchase_price || 0)) * parseFloat(saleQuantity) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          ₹{(((parseFloat(salePrice) / parseFloat(saleQuantity)) - (selectedProduct.stock?.last_purchase_price || 0)) * parseFloat(saleQuantity)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">குறிப்புகள் (விருப்பம்)</label>
                    <textarea
                      value={saleNotes}
                      onChange={(e) => setSaleNotes(e.target.value)}
                      className="input-field"
                      rows={2}
                      placeholder="கூடுதல் தகவல்..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => {
                      setShowSaleModal(false);
                      resetSaleForm();
                    }} className="btn-secondary flex-1">
                      ரத்து செய்
                    </button>
                    <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      சேமி
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
