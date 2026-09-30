import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { parseTamilCommand, formatTamilCurrency, TamilCommand } from '../lib/tamil-voice';
import { Mic, MicOff, Volume2, X, Send, MessageSquare, Trash2 } from 'lucide-react';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface ChatMessage {
  id?: string;
  user_message: string;
  bot_response: string;
  command_type?: string | null;
  created_at?: string;
}

interface VoiceAssistantProps {
  onCommandExecuted?: () => void;
}

export function VoiceAssistant({ onCommandExecuted }: VoiceAssistantProps) {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recogLang, setRecogLang] = useState<'ta-IN' | 'en-IN'>('ta-IN');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load history when panel opens
  useEffect(() => {
    if (showPanel && user) {
      loadHistory();
    }
  }, [showPanel, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = recogLang;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        if (event.results[current].isFinal) {
          setInterimTranscript('');
          handleCommand(text);
        } else {
          setInterimTranscript(text);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimTranscript('');
        if (event.error === 'no-speech') {
          setMessages(prev => [...prev, {
            user_message: '...',
            bot_response: 'கேட்கவில்லை. மீண்டும் பேசுங்கள் / Did not hear. Please speak again.',
            command_type: null
          }]);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      recognitionRef.current?.abort();
    };
  }, [recogLang]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  };

  const saveMessage = async (msg: ChatMessage) => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        user_message: msg.user_message,
        bot_response: msg.bot_response,
        command_type: msg.command_type || null
      })
      .select()
      .single();
    if (data) {
      setMessages(prev => [...prev, data]);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from('chat_history').delete().eq('user_id', user.id);
    setMessages([]);
  };

  const speak = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ta-IN';
      utterance.rate = 0.9;
      synthRef.current.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('உங்கள் உலாவி பேச்சு அங்கீகாரத்தை ஆதரிக்கவில்லை. Please use Google Chrome.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInterimTranscript('');
      recognitionRef.current.lang = recogLang;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Recognition start error:', e);
        setIsListening(false);
      }
    }
  };

  const handleCommand = async (text: string) => {
    setIsProcessing(true);
    const command = parseTamilCommand(text);
    let botReply: string;
    let commandType: string | null = null;

    if (command) {
      commandType = command.type;
      botReply = await executeCommand(command);
    } else {
      botReply = 'மன்னிக்கவும் / Sorry, I did not understand. Try: "Rice 1 kg 100", "arisi 1 kilo 100 vanginean", or "expense 500"';
    }

    await saveMessage({ user_message: text, bot_response: botReply, command_type: commandType });
    speak(botReply);
    setIsProcessing(false);
    onCommandExecuted?.();
  };

  const executeCommand = async (command: TamilCommand): Promise<string> => {
    if (!user) return 'Please login first / தயவுசெய்து உள்நுழைந்து முயற்சி செய்யவும்.';
    switch (command.type) {
      case 'purchase': return await handlePurchase(command);
      case 'sale': return await handleSale(command);
      case 'expense': return await handleExpense(command);
      case 'saving': return await handleSaving(command);
      case 'income': return await handleIncome(command);
      case 'query': return await handleQuery(command);
      default: return 'புரிந்துகொள்ள முடியவில்லை.';
    }
  };

  const handlePurchase = async (command: TamilCommand): Promise<string> => {
    if (!command.product || !command.quantity || !command.price) {
      return 'Please say product, quantity and price. / பொருள், அளவு மற்றும் விலையை கூறவும்.';
    }
    try {
      let product = await findProduct(command.product);
      if (!product) {
        const { data, error } = await supabase
          .from('products')
          .insert({ product_name: command.product, product_name_tamil: command.product, unit: 'kg', user_id: user!.id })
          .select().single();
        if (error) throw error;
        product = data;
      }
      const { error } = await supabase.from('purchases').insert({
        product_id: product.id,
        quantity: command.quantity,
        purchase_price: command.price,
        total_amount: command.price,
        user_id: user!.id
      });
      if (error) throw error;
      return `${command.product} ${command.quantity} unit(s) - ${formatTamilCurrency(command.price)} purchase recorded / வாங்கினோம். பதிவு செய்யப்பட்டது.`;
    } catch (e) {
      console.error(e);
      return 'Purchase could not be saved / கொள்முதல் பதிவு செய்ய முடியவில்லை.';
    }
  };

  const handleSale = async (command: TamilCommand): Promise<string> => {
    if (!command.product || !command.quantity || !command.price) {
      return 'Please say product, quantity and price. / பொருள், அளவு மற்றும் விலையை கூறவும்.';
    }
    try {
      const product = await findProduct(command.product);
      if (!product) return `${command.product} not found / காணவில்லை.`;

      const { data: stock } = await supabase
        .from('stock_summary').select('*').eq('product_id', product.id).single();

      if (!stock || stock.available_quantity < command.quantity) {
        return `Not enough stock / இருப்பு இல்லை. Available: ${stock?.available_quantity || 0}`;
      }

      const unitPrice = command.price / command.quantity;
      const profit = (unitPrice - (stock?.last_purchase_price || 0)) * command.quantity;

      const { error } = await supabase.from('sales').insert({
        product_id: product.id,
        quantity_sold: command.quantity,
        selling_price: unitPrice,
        total_amount: command.price,
        profit_amount: profit,
        user_id: user!.id
      });
      if (error) throw error;
      return `${command.product} ${command.quantity} sold - ${formatTamilCurrency(command.price)}. Profit / லாபம்: ${formatTamilCurrency(profit)}`;
    } catch (e) {
      console.error(e);
      return 'Sale could not be saved / விற்பனை பதிவு செய்ய முடியவில்லை.';
    }
  };

  const handleExpense = async (command: TamilCommand): Promise<string> => {
    if (!command.price) return 'Please say the amount / தொகை கூறவும்.';
    try {
      const { error } = await supabase.from('expenses').insert({
        expense_category: command.product || 'other',
        amount: command.price,
        user_id: user!.id
      });
      if (error) throw error;
      return `${formatTamilCurrency(command.price)} expense saved / செலவு பதிவு செய்யப்பட்டது.`;
    } catch (e) {
      console.error(e);
      return 'Expense could not be saved / செலவு பதிவு செய்ய முடியவில்லை.';
    }
  };

  const handleSaving = async (command: TamilCommand): Promise<string> => {
    if (!command.price) return 'Please say the amount / தொகை கூறவும்.';
    try {
      const { error } = await supabase.from('savings').insert({ amount: command.price, user_id: user!.id });
      if (error) throw error;
      return `${formatTamilCurrency(command.price)} saving recorded / சேமிப்பு பதிவு செய்யப்பட்டது.`;
    } catch (e) {
      console.error(e);
      return 'Saving could not be saved / சேமிப்பு பதிவு செய்ய முடியவில்லை.';
    }
  };

  const handleIncome = async (command: TamilCommand): Promise<string> => {
    if (!command.price) return 'Please say the amount / தொகை கூறவும்.';
    try {
      const { error } = await supabase.from('daily_collections').insert({
        total_amount: command.price,
        notes: 'Voice assistant',
        user_id: user!.id
      });
      if (error) throw error;
      return `${formatTamilCurrency(command.price)} income recorded / வருமானம் பதிவு செய்யப்பட்டது.`;
    } catch (e) {
      console.error(e);
      return 'Income could not be saved / வருமானம் பதிவு செய்ய முடியவில்லை.';
    }
  };

  const handleQuery = async (command: TamilCommand): Promise<string> => {
    try {
      switch (command.queryType) {
        case 'stock': {
          if (!command.product) return 'Say product name / பொருளின் பெயரை கூறவும்.';
          const product = await findProduct(command.product);
          if (!product) return `${command.product} not found.`;
          const { data: stock } = await supabase.from('stock_summary').select('*').eq('product_id', product.id).single();
          return `${command.product} stock / இருப்பு: ${stock?.available_quantity || 0} ${product.unit}`;
        }
        case 'price': {
          if (!command.product) return 'Say product name / பொருளின் பெயரை கூறவும்.';
          const product = await findProduct(command.product);
          if (!product) return `${command.product} not found.`;
          const { data: stock } = await supabase.from('stock_summary').select('*').eq('product_id', product.id).single();
          return `${command.product} - Buy: ${formatTamilCurrency(stock?.last_purchase_price || 0)}, Sell: ${formatTamilCurrency(stock?.last_selling_price || 0)}`;
        }
        case 'profit': {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const { data: sales } = await supabase.from('sales').select('profit_amount').eq('user_id', user!.id).gte('sales_date', today.toISOString());
          const { data: expenses } = await supabase.from('expenses').select('amount').eq('user_id', user!.id).gte('expense_date', today.toISOString());
          const sp = sales?.reduce((s, r) => s + (r.profit_amount || 0), 0) || 0;
          const ex = expenses?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
          return `Today profit / இன்றைய லாபம்: ${formatTamilCurrency(sp - ex)} (Sales profit: ${formatTamilCurrency(sp)}, Expenses: ${formatTamilCurrency(ex)})`;
        }
        case 'expense': {
          const { data } = await supabase.from('expenses').select('amount').eq('user_id', user!.id);
          const total = data?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
          return `Total expenses / மொத்த செலவு: ${formatTamilCurrency(total)}`;
        }
        case 'savings': {
          const { data } = await supabase.from('savings').select('amount').eq('user_id', user!.id);
          const total = data?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
          return `Total savings / மொத்த சேமிப்பு: ${formatTamilCurrency(total)}`;
        }
        case 'income': {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const { data: todayData } = await supabase.from('daily_collections').select('total_amount').eq('user_id', user!.id).eq('collection_date', today.toISOString().split('T')[0]);
          const todayTotal = todayData?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0;
          const { data: allData } = await supabase.from('daily_collections').select('total_amount').eq('user_id', user!.id);
          const allTotal = allData?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0;
          return `Today income / இன்றைய வருமானம்: ${formatTamilCurrency(todayTotal)}. Total / மொத்த வருமானம்: ${formatTamilCurrency(allTotal)}`;
        }
        default:
          return 'புரிந்துகொள்ள முடியவில்லை.';
      }
    } catch (e) {
      console.error(e);
      return 'Could not fetch data / தகவல் பெற முடியவில்லை.';
    }
  };

  const findProduct = async (name: string) => {
    const { data } = await supabase
      .from('products').select('*')
      .or(`product_name_tamil.ilike.%${name}%,product_name.ilike.%${name}%`)
      .eq('user_id', user!.id).limit(1).single();
    return data;
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleCommand(textInput.trim());
      setTextInput('');
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const commandTypeBadge: Record<string, string> = {
    purchase: 'bg-blue-100 text-blue-700',
    sale: 'bg-green-100 text-green-700',
    expense: 'bg-red-100 text-red-700',
    saving: 'bg-yellow-100 text-yellow-700',
    income: 'bg-emerald-100 text-emerald-700',
    query: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="voice-assistant-panel">
      {/* Floating button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`voice-button ${isListening ? 'recording' : ''}`}
      >
        {showPanel ? <X className="w-7 h-7 text-white" /> : isListening ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
      </button>

      {showPanel && (
        <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">குரல் உதவியாளர்</h3>
                  <p className="text-xs text-white/75">Tamil · Tanglish · English</p>
                </div>
              </div>
              <button
                onClick={clearHistory}
                title="Clear history"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.length === 0 && !isProcessing && (
              <div className="text-center text-gray-400 text-sm py-6">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No messages yet</p>
                <p className="text-xs mt-1">Type or speak to get started</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id || i} className="space-y-1">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="bg-primary-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm">
                      {msg.user_message}
                    </div>
                    <p className="text-right text-xs text-gray-400 mt-0.5 pr-1">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
                {/* Bot bubble */}
                <div className="flex justify-start items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Volume2 className="w-3 h-3 text-primary-600" />
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 shadow-sm">
                      {msg.bot_response}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 pl-1">
                      {msg.command_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${commandTypeBadge[msg.command_type] || 'bg-gray-100 text-gray-500'}`}>
                          {msg.command_type}
                        </span>
                      )}
                      <p className="text-xs text-gray-400">{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Interim transcript bubble */}
            {interimTranscript && (
              <div className="flex justify-end">
                <div className="bg-primary-400 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm opacity-70 italic max-w-[80%]">
                  {interimTranscript}...
                </div>
              </div>
            )}

            {/* Processing bubble */}
            {isProcessing && (
              <div className="flex justify-start items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-3 h-3 text-primary-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white rounded-b-2xl">
            <form onSubmit={handleTextSubmit} className="flex gap-2 p-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or speak... (e.g. Rice 1 kg 100)"
                className="input-field flex-1 py-2 text-sm"
              />
              <button type="submit" disabled={!textInput.trim()} className="btn-primary py-2 px-3">
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={() => setRecogLang(prev => prev === 'ta-IN' ? 'en-IN' : 'ta-IN')}
                className={`px-3 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5 ${
                  recogLang === 'ta-IN'
                    ? 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="மொழி மாற்று / Switch language"
              >
                {recogLang === 'ta-IN' ? 'தமிழ்' : 'EN'}
              </button>
              <button
                onClick={toggleListening}
                className={`flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-colors ${
                  isListening
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {isListening ? (
                  <><MicOff className="w-4 h-4" /> Stop / நிறுத்து</>
                ) : (
                  <><Mic className="w-4 h-4" /> Speak / பேசு</>
                )}
              </button>
            </div>

            {/* Examples */}
            <details className="px-3 pb-3 text-xs text-gray-500">
              <summary className="cursor-pointer font-medium text-gray-600 select-none">Examples / எடுத்துக்காட்டுகள்</summary>
              <ul className="mt-2 space-y-0.5 text-gray-500">
                <li>"arisi 1 kilo 100 vanginean" (Tanglish purchase)</li>
                <li>"rice 1 kg 100" (English purchase)</li>
                <li>"sold rice 1 kg 150" (English sale)</li>
                <li>"expense 500" / "selavu 500"</li>
                <li>"nnaiku 10000 vanthuchu" (income)</li>
                <li>"income 10000" / "வருமானம் 10000"</li>
                <li>"today profit" / "inraiya labam"</li>
                <li>"அரிசி 25 கிலோ 1200 ரூபாய்க்கு வாங்கினேன்"</li>
              </ul>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
