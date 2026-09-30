import React, { useEffect, useState } from 'react';
import { supabase, Supplier, Product, Purchase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  Truck,
  Plus,
  Search,
  X,
  Save,
  Trash2,
  Phone,
  MapPin,
  Package,
  PhoneCall
} from 'lucide-react';
import { format } from 'date-fns';

export function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [supplierPurchases, setSupplierPurchases] = useState<(Purchase & { products?: Product })[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) fetchSuppliers();
  }, [user]);

  const fetchSuppliers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSuppliers(data || []);
    } catch (e) {
      console.error('Error fetching suppliers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { error } = await supabase.from('suppliers').insert({
        name, phone, address, notes, user_id: user.id
      });
      if (error) throw error;
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (e) {
      console.error(e);
      alert('சப்ளையர் சேர்க்க முடியவில்லை');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('இந்த சப்ளையரை நிச்சயமாக நீக்க விரும்புகிறீர்களா?')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      fetchSuppliers();
    } catch (e) {
      console.error(e);
      alert('நீக்க முடியவில்லை');
    }
  };

  const viewSupplierDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    if (user) {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('supplier_id', supplier.id);
      setSupplierProducts(products || []);

      const { data: purchases } = await supabase
        .from('purchases')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .eq('supplier_id', supplier.id)
        .order('purchase_date', { ascending: false })
        .limit(10);
      setSupplierPurchases(purchases || []);
    }
  };

  const resetForm = () => {
    setName(''); setPhone(''); setAddress(''); setNotes('');
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">சப்ளையர்கள்</h1>
          <p className="text-lg text-gray-600 mt-1">விநியோகஸ்தர்களை நிர்வகிக்கவும்</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          புதிய சப்ளையர்
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="சப்ளையர் தேடு..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">சப்ளையர்கள் இல்லை</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="card hover:border-primary-200 border-2 border-transparent">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold">{supplier.name}</h3>
                  {supplier.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {supplier.phone}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => viewSupplierDetails(supplier)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="விவரம்"
                  >
                    <Package className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {supplier.address && (
                <p className="text-sm text-gray-600 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-1 flex-shrink-0" /> {supplier.address}
                </p>
              )}
              {supplier.notes && <p className="text-sm text-gray-500 mt-2">{supplier.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">புதிய சப்ளையர்</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">பெயர்</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="label">தொலைபேசி</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="9876543210" />
              </div>
              <div>
                <label className="label">முகவரி</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="input-field" rows={2} />
              </div>
              <div>
                <label className="label">குறிப்புகள் (விருப்பம்)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary flex-1">ரத்து</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedSupplier.name}</h2>
                {selectedSupplier.phone && (
                  <a href={`tel:${selectedSupplier.phone}`} className="text-primary-600 flex items-center gap-1 text-sm mt-1">
                    <PhoneCall className="w-3 h-3" /> {selectedSupplier.phone}
                  </a>
                )}
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">பொருட்கள் ({supplierProducts.length})</h3>
                {supplierProducts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {supplierProducts.map(p => (
                      <span key={p.id} className="badge badge-primary">
                        {p.product_name_tamil}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">பொருட்கள் இல்லை</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">கொள்முதல் வரலாறு ({supplierPurchases.length})</h3>
                {supplierPurchases.length > 0 ? (
                  <div className="space-y-2">
                    {supplierPurchases.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium">{p.products?.product_name_tamil || '—'}</p>
                          <p className="text-sm text-gray-500">{p.quantity} {p.products?.unit} · {format(new Date(p.purchase_date), 'dd/MM/yyyy')}</p>
                        </div>
                        <p className="font-semibold">₹{p.total_amount.toLocaleString('ta-IN')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">கொள்முதல் வரலாறு இல்லை</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
