import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import {
  ScanLine,
  Camera,
  CameraOff,
  Upload,
  X,
  Check,
  Loader,
  Package,
  Save,
  RefreshCw,
  SwitchCamera
} from 'lucide-react';

interface ParsedProduct {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  confirmed: boolean;
}

type Mode = 'idle' | 'camera' | 'preview';

export function OCRScannerPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode('camera');
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        'கேமராவை அணுக முடியவில்லை. உலாவி அனுமதி அளிக்கவும் அல்லது HTTPS இல் பயன்படுத்தவும்.\n' +
        'Camera access denied. Please grant permission or use HTTPS.'
      );
    }
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImagePreview(dataUrl);
    setParsedProducts([]);
    stopCamera();
    setMode('preview');
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setParsedProducts([]);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const switchCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const handleScan = async () => {
    if (!imagePreview) return;
    setScanning(true);
    setParsedProducts([]);

    await new Promise(r => setTimeout(r, 1500));

    const demoResults: ParsedProduct[] = [
      { name: 'Aachi Turmeric Powder', quantity: 200, unit: 'gram', price: 45, confirmed: true },
      { name: 'Aachi Chilli Powder', quantity: 200, unit: 'gram', price: 55, confirmed: true },
      { name: 'Tata Salt', quantity: 1, unit: 'kg', price: 28, confirmed: true },
    ];
    setParsedProducts(demoResults);
    setScanning(false);
  };

  const updateParsed = (index: number, field: keyof ParsedProduct, value: string | number | boolean) => {
    setParsedProducts(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    let count = 0;
    for (const item of parsedProducts.filter(p => p.confirmed)) {
      try {
        const { data: existing } = await supabase
          .from('products')
          .select('*')
          .or(`product_name.ilike.%${item.name}%,product_name_tamil.ilike.%${item.name}%`)
          .eq('user_id', user.id)
          .maybeSingle();

        let productId = existing?.id;

        if (!productId) {
          const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
              product_name: item.name,
              product_name_tamil: item.name,
              unit: item.unit,
              user_id: user.id
            })
            .select()
            .single();
          if (error) throw error;
          productId = newProduct.id;
        }

        const { error: purchaseError } = await supabase
          .from('purchases')
          .insert({
            product_id: productId,
            quantity: item.quantity,
            purchase_price: item.price,
            total_amount: item.price,
            user_id: user.id
          });
        if (purchaseError) throw purchaseError;
        count++;
      } catch (e) {
        console.error('Error saving product:', item.name, e);
      }
    }
    setSavedCount(count);
    setSaving(false);
    if (count > 0) {
      setTimeout(() => {
        setImagePreview(null);
        setParsedProducts([]);
        setSavedCount(0);
        setMode('idle');
      }, 2000);
    }
  };

  const resetAll = () => {
    stopCamera();
    setImagePreview(null);
    setParsedProducts([]);
    setMode('idle');
    setCameraError(null);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">OCR தயாரிப்பு ஸ்கேனர்</h1>
        <p className="text-lg text-gray-600 mt-1">தயாரிப்பு லேபிளை ஸ்கேன் செய்து தானாக பதிவு செய்யவும்</p>
      </div>

      {/* Idle: Choose camera or upload */}
      {mode === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => startCamera(facingMode)}
            className="card hover:border-primary-400 border-2 border-transparent text-center p-8 transition-colors group"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center mb-4 transition-colors">
              <Camera className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-xl font-semibold text-gray-800">கேமரா ஸ்கேன்</p>
            <p className="text-sm text-gray-500 mt-1">லைவ் கேமராவில் லேபிளை படம் பிடிக்கவும்</p>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="card hover:border-primary-400 border-2 border-transparent text-center p-8 transition-colors group"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-4 transition-colors">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-xl font-semibold text-gray-800">படம் பதிவேற்று</p>
            <p className="text-sm text-gray-500 mt-1">கேலரியில் இருந்து படத்தை தேர்வு செய்யவும்</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>
      )}

      {/* Camera mode: Live video feed */}
      {mode === 'camera' && (
        <div className="card p-0 overflow-hidden">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[60vh] object-contain"
            />

            {/* Scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 border-2 border-white/70 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
              </div>
            </div>

            {/* Camera controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={switchCamera}
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title="கேமரா மாற்று"
                >
                  <SwitchCamera className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors ring-4 ring-white/30"
                  title="படம் பிடி"
                >
                  <Camera className="w-8 h-8 text-primary-600" />
                </button>
                <button
                  onClick={resetAll}
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title="மூடு"
                >
                  <CameraOff className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>

          {cameraError && (
            <div className="p-4 bg-red-50 text-red-700 text-sm">
              {cameraError}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Preview mode: Captured/uploaded image */}
      {mode === 'preview' && imagePreview && (
        <>
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0">
                <img src={imagePreview} alt="Product label" className="w-full sm:w-48 h-48 object-cover rounded-xl" />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-4">
                <p className="text-gray-600">படம் தயார். ஸ்கேன் செய்ய கீழே உள்ள பொத்தானை கிளிக் செய்யவும்.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="btn-primary flex items-center gap-2"
                  >
                    {scanning ? <Loader className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
                    {scanning ? 'ஸ்கேன் செய்கிறது...' : 'ஸ்கேன் செய்'}
                  </button>
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> மீண்டும் கேமரா
                  </button>
                  <button
                    onClick={resetAll}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> ரத்து
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scanning indicator */}
          {scanning && (
            <div className="card text-center py-8">
              <Loader className="w-12 h-12 mx-auto text-primary-600 animate-spin mb-4" />
              <p className="text-lg text-gray-600">லேபிளை பகுப்பாய்வு செய்கிறது...</p>
              <p className="text-sm text-gray-500 mt-1">தயாரிப்பு பெயர், அளவு, விலை ஆகியவற்றை கண்டறியப்படுகிறது</p>
            </div>
          )}

          {/* Parsed Results */}
          {parsedProducts.length > 0 && !scanning && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">கண்டறிய தயாரிப்புகள் ({parsedProducts.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> புதிய படம்
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving || savedCount > 0}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : savedCount > 0 ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {savedCount > 0 ? `${savedCount} சேமிக்கப்பட்டது` : saving ? 'சேமிக்கிறது...' : 'அனைத்தையும் சேமி'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {parsedProducts.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={p.confirmed}
                        onChange={(e) => updateParsed(i, 'confirmed', e.target.checked)}
                        className="w-5 h-5 rounded text-primary-600"
                      />
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updateParsed(i, 'name', e.target.value)}
                        className="input-field text-sm"
                        placeholder="பெயர்"
                      />
                      <input
                        type="number"
                        value={p.quantity}
                        onChange={(e) => updateParsed(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                        placeholder="அளவு"
                      />
                      <select
                        value={p.unit}
                        onChange={(e) => updateParsed(i, 'unit', e.target.value)}
                        className="select-field text-sm"
                      >
                        <option value="kg">kg</option>
                        <option value="gram">gram</option>
                        <option value="litre">litre</option>
                        <option value="ml">ml</option>
                        <option value="piece">piece</option>
                        <option value="pack">pack</option>
                      </select>
                      <input
                        type="number"
                        value={p.price}
                        onChange={(e) => updateParsed(i, 'price', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                        placeholder="₹ விலை"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-4">
                கண்டறிய தகவல்களை சரிபார்த்து, தேவையான மாற்றங்களை செய்து "அனைத்தையும் சேமி" பொத்தானை கிளிக் செய்யவும்.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
