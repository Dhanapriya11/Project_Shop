import React, { useEffect, useState } from 'react';
import { supabase, CreditCustomer, CreditSale } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  CreditCard,
  Plus,
  Search,
  X,
  Save,
  Trash2,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export function CreditPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [creditSales, setCreditSales] = useState<(CreditSale & { credit_customers?: CreditCustomer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomer | null>(null);

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  const [saleAmount, setSaleAmount] = useState('');
  const [saleDesc, setSaleDesc] = useState('');
  const [saleDueDate, setSaleDueDate] = useState('');

  const [totalDue, setTotalDue] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: custData } = await supabase
        .from('credit_customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCustomers(custData || []);

      const { data: salesData } = await supabase
        .from('credit_sales')
        .select('*, credit_customers(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCreditSales(salesData || []);

      const unsettled = (salesData || []).filter(s => !s.settled);
      setTotalDue(unsettled.reduce((sum, s) => sum + (s.amount || 0), 0));
      const today = new Date();
      setOverdueCount(unsettled.filter(s => s.due_date && new Date(s.due_date) < today).length);
    } catch (e) {
      console.error('Error fetching credit data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { error } = await supabase.from('credit_customers').insert({
        name: custName, phone: custPhone, address: custAddress, user_id: user.id
      });
      if (error) throw error;
      setShowCustomerModal(false);
      setCustName(''); setCustPhone(''); setCustAddress('');
      fetchAll();
    } catch (e) {
      console.error(e);
      alert('வாடிக்கையாளர் சேர்க்க முடியவில்லை');
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCustomer) return;
    const amount = parseFloat(saleAmount);
    if (isNaN(amount) || amount <= 0) { alert('சரியான தொகையை உள்ளிடவும்'); return; }
    try {
      const { error } = await supabase.from('credit_sales').insert({
        customer_id: selectedCustomer.id,
        amount,
        description: saleDesc,
        due_date: saleDueDate || null,
        user_id: user.id
      });
      if (error) throw error;
      setShowSaleModal(false);
      setSaleAmount(''); setSaleDesc(''); setSaleDueDate('');
      setSelectedCustomer(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      alert('கடன் விற்பனை சேர்க்க முடியவில்லை');
    }
  };

  const handleSettle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credit_sales')
        .update({ settled: true, settled_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);
      if (error) throw error;
      fetchAll();
    } catch (e) {
      console.error(e);
      alert('புதுப்ப முடியவில்லை');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('இந்த வாடிக்கையாளரை நிச்சயமாக நீக்க விரும்புகிறீர்களா?')) return;
    try {
      const { error } = await supabase.from('credit_customers').delete().eq('id', id);
      if (error) throw error;
      fetchAll();
    } catch (e) {
      console.error(e);
      alert('நீக்க முடியவில்லை');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  const getCustomerDue = (customerId: string) =>
    creditSales.filter(s => s.customer_id === customerId && !s.settled).reduce((sum, s) => sum + s.amount, 0);

  const getOverdueForCustomer = (customerId: string) => {
    const today = new Date();
    return creditSales.filter(s => s.customer_id === customerId && !s.settled && s.due_date && new Date(s.due_date) < today).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">கடன் கணக்கு</h1>
          <p className="text-lg text-gray-600 mt-1">வாடிக்கையாளர் கடன்களை நிர்வகிக்கவும்</p>
        </div>
        <button onClick={() => setShowCustomerModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> புதிய வாடிக்கையாளர்
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard border-red-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-100">
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">மொத்த கடன்</p>
              <p className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('ta-IN')}</p>
            </div>
          </div>
        </div>
        <div className="card-dashboard border-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">காலதாமத கடன்கள்</p>
              <p className="text-2xl font-bold text-orange-600">{overdueCount}</p>
            </div>
          </div>
        </div>
        <div className="card-dashboard border-primary-500">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-100">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">வாடிக்கையாளர்கள்</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="வாடிக்கையாளர் தேடு..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">வாடிக்கையாளர்கள் இல்லை</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(c => {
            const due = getCustomerDue(c.id);
            const overdue = getOverdueForCustomer(c.id);
            return (
              <div key={c.id} className={`card border-2 ${due > 0 ? 'border-red-200' : 'border-transparent'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-semibold">{c.name}</h3>
                    {c.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setSelectedCustomer(c); setShowSaleModal(true); }}
                      className="p-2 rounded-lg hover:bg-primary-100 text-primary-600"
                      title="கடன் விற்பனை சேர்"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCustomer(c.id)} className="p-2 rounded-lg hover:bg-red-100 text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-600">நிலுவை கடன்</p>
                    <p className={`text-2xl font-bold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{due.toLocaleString('ta-IN')}
                    </p>
                  </div>
                  {overdue > 0 && (
                    <span className="badge badge-danger">{overdue} காலதாமத</span>
                  )}
                </div>
                {c.address && <p className="text-sm text-gray-500 mt-2">{c.address}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Unsettled Credit Sales */}
      {creditSales.filter(s => !s.settled).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">நிலுவை கடன் விற்பனைகள்</h3>
          <div className="space-y-3">
            {creditSales.filter(s => !s.settled).map(s => {
              const today = new Date();
              const isOverdue = s.due_date && new Date(s.due_date) < today;
              const daysOverdue = s.due_date ? differenceInDays(today, new Date(s.due_date)) : 0;
              return (
                <div key={s.id} className={`flex justify-between items-center p-4 rounded-xl ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div>
                    <p className="font-medium">{s.credit_customers?.name || '—'}</p>
                    <p className="text-sm text-gray-500">
                      {s.description || '—'} · {format(new Date(s.sale_date), 'dd/MM/yyyy')}
                    </p>
                    {s.due_date && (
                      <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        தவணை: {format(new Date(s.due_date), 'dd/MM/yyyy')}
                        {isOverdue && ` (${daysOverdue} நாட்கள் தாமதம்)`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-lg text-red-600">₹{s.amount.toLocaleString('ta-IN')}</p>
                    <button
                      onClick={() => handleSettle(s.id)}
                      className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                      title="புதுப்பு"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">புதிய வாடிக்கையாளர்</h2>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="label">பெயர்</label>
                <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="label">தொலைபேசி</label>
                <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">முகவரி</label>
                <textarea value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="input-field" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="btn-secondary flex-1">ரத்து</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit Sale Modal */}
      {showSaleModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">கடன் விற்பனை</h2>
                <p className="text-gray-600">{selectedCustomer.name}</p>
              </div>
              <button onClick={() => { setShowSaleModal(false); setSelectedCustomer(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSale} className="space-y-4">
              <div>
                <label className="label">தொகை (₹)</label>
                <input type="number" step="0.01" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="label">விவரம்</label>
                <input type="text" value={saleDesc} onChange={(e) => setSaleDesc(e.target.value)} className="input-field" placeholder="எ.கா. மளிகை 5 கிலோ" />
              </div>
              <div>
                <label className="label">தவணை தேதி</label>
                <input type="date" value={saleDueDate} onChange={(e) => setSaleDueDate(e.target.value)} className="input-field" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowSaleModal(false); setSelectedCustomer(null); }} className="btn-secondary flex-1">ரத்து</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
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
