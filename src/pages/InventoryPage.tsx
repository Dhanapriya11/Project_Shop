import React, { useEffect, useState } from 'react';
import { supabase, Product, StockSummary, Purchase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  Package,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  X,
  Save,
  History
} from 'lucide-react';
import { format } from 'date-fns';

type Page = 'dashboard' | 'inventory' | 'sales' | 'expenses' | 'savings' | 'reports';

interface InventoryPageProps {
  onNavigate?: (page: Page) => void;
}

export function InventoryPage({ }: InventoryPageProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<(Product & { stock?: StockSummary })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);

  // Form states
  const [productName, setProductName] = useState('');
  const [productNameTamil, setProductNameTamil] = useState('');
  const [unit, setUnit] = useState('கிலோ');
  const [category, setCategory] = useState('பொதுவானவை');

  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const units = ['கிலோ', 'லிட்டர்', 'பாட்டில்', 'பை', 'முட்டை', 'பாக்கெட்', 'கிராம்'];
  const categories = ['பொதுவானவை', 'தானியங்கள்', 'பருப்பு வகைகள்', 'எண்ணெய்', 'பால் பொருட்கள்', 'காய்கறிகள்', 'பழங்கள்', 'மசாலா', 'பிற'];

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*, stock_summary(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(productsData?.map(p => ({
        ...p,
        stock: Array.isArray(p.stock_summary) ? p.stock_summary[0] : p.stock_summary
      })) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          product_name: productName,
          product_name_tamil: productNameTamil || productName,
          unit,
          category,
          user_id: user.id
        });

      if (error) throw error;

      setShowProductModal(false);
      resetProductForm();
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('பொருள் சேர்க்க முடியவில்லை');
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;

    const quantity = parseFloat(purchaseQuantity);
    const price = parseFloat(purchasePrice);

    if (isNaN(quantity) || isNaN(price)) {
      alert('தயவுசெய்து சரியான அளவு மற்றும் விலையை உள்ளிடவும்');
      return;
    }

    try {
      // Add purchase
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          product_id: selectedProduct.id,
          quantity,
          purchase_price: price,
          total_amount: price,
          notes: purchaseNotes,
          user_id: user.id
        });

      if (purchaseError) throw purchaseError;

      setShowPurchaseModal(false);
      resetPurchaseForm();
      fetchProducts();
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert('கொள்முதல் சேர்க்க முடியவில்லை');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('இந்த பொருளை நிச்சயமாக நீக்க விரும்புகிறீர்களா?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('பொருளை நீக்க முடியவில்லை');
    }
  };

  const fetchPurchaseHistory = async (productId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, products(*)')
        .eq('product_id', productId)
        .order('purchase_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPurchaseHistory(data || []);
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    }
  };

  const resetProductForm = () => {
    setProductName('');
    setProductNameTamil('');
    setUnit('கிலோ');
    setCategory('பொதுவானவை');
  };

  const resetPurchaseForm = () => {
    setPurchaseQuantity('');
    setPurchasePrice('');
    setPurchaseNotes('');
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_name_tamil.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = filteredProducts.filter(p => (p.stock?.available_quantity || 0) < 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">சரக்கு பட்டியல்</h1>
          <p className="text-lg text-gray-600 mt-1">பொருட்களை நிர்வகிக்கவும்</p>
        </div>
        <button
          onClick={() => setShowProductModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          புதிய பொருள்
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">குறைந்த இருப்பு எச்சரிக்கை</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map(p => (
              <span key={p.id} className="badge badge-danger">
                {p.product_name_tamil} ({p.stock?.available_quantity || 0} {p.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="பொருள் தேடு..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-600">பொருட்கள் இல்லை</p>
          <p className="text-gray-500 mt-2">புதிய பொருள் சேர்க்க "புதிய பொருள்" பொத்தானை கிளிக் செய்யவும்</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card hover:border-primary-200 border-2 border-transparent">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold">{product.product_name_tamil}</h3>
                  <p className="text-gray-500 text-sm">{product.category}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowHistoryModal(true);
                      fetchPurchaseHistory(product.id);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="வரலாறு"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                    title="நீக்கு"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-600">கிடைக்கும் அளவு</p>
                  <p className={`text-2xl font-bold ${
                    (product.stock?.available_quantity || 0) < 5 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {product.stock?.available_quantity || 0} <span className="text-base font-normal">{product.unit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">கடைசி விலை</p>
                  <p className="text-lg font-semibold">₹{product.stock?.last_purchase_price?.toLocaleString('ta-IN') || '-'}</p>
                  <p className="text-sm text-gray-500">/{product.unit}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowPurchaseModal(true);
                  }}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  இருப்பு சேர்
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">புதிய பொருள்</h2>
              <button onClick={() => {
                setShowProductModal(false);
                resetProductForm();
              }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="label">பொருளின் பெயர் (ஆங்கிலம்)</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="input-field"
                  placeholder="Product name"
                  required
                />
              </div>

              <div>
                <label className="label">பொருளின் பெயர் (தமிழ்)</label>
                <input
                  type="text"
                  value={productNameTamil}
                  onChange={(e) => setProductNameTamil(e.target.value)}
                  className="input-field"
                  placeholder="பொருளின் பெயர்"
                />
              </div>

              <div>
                <label className="label">அலகு</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="select-field"
                >
                  {units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">வகை</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select-field"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => {
                  setShowProductModal(false);
                  resetProductForm();
                }} className="btn-secondary flex-1">
                  ரத்து செய்
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">இருப்பு சேர்</h2>
                <p className="text-gray-600">{selectedProduct.product_name_tamil}</p>
              </div>
              <button onClick={() => {
                setShowPurchaseModal(false);
                resetPurchaseForm();
              }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPurchase} className="space-y-4">
              <div>
                <label className="label">அளவு ({selectedProduct.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
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
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="input-field"
                  placeholder="0"
                  required
                />
              </div>

              {purchaseQuantity && purchasePrice && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">ஒரு {selectedProduct.unit} விலை:</p>
                  <p className="text-xl font-bold text-primary-600">
                    ₹{(parseFloat(purchasePrice) / parseFloat(purchaseQuantity)).toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <label className="label">குறிப்புகள் (விருப்பம்)</label>
                <textarea
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="input-field"
                  rows={2}
                  placeholder="கூடுதல் தகவல்..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => {
                  setShowPurchaseModal(false);
                  resetPurchaseForm();
                }} className="btn-secondary flex-1">
                  ரத்து செய்
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  சேமி
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">கொள்முதல் வரலாறு</h2>
                <p className="text-gray-600">{selectedProduct?.product_name_tamil}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {purchaseHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>கொள்முதல் வரலாறு இல்லை</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseHistory.map((purchase) => (
                  <div key={purchase.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium">{purchase.quantity} {selectedProduct?.unit}</p>
                      <p className="text-sm text-gray-500">{format(new Date(purchase.purchase_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{purchase.total_amount.toLocaleString('ta-IN')}</p>
                      <p className="text-sm text-gray-500">
                        ₹{(purchase.purchase_price / purchase.quantity).toFixed(2)}/{selectedProduct?.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
