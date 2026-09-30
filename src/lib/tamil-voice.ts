export interface TamilCommand {
  type: 'purchase' | 'sale' | 'expense' | 'saving' | 'income' | 'query';
  product?: string;
  quantity?: number;
  price?: number;
  queryType?: 'stock' | 'price' | 'profit' | 'expense' | 'savings' | 'income';
}

const tamilMonths = [
  'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
  'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
];

const expenseCategories: Record<string, string> = {
  'மின்சாரம்': 'electricity',
  'நீர்': 'water',
  'வாடகை': 'rent',
  'போக்குவரத்து': 'transport',
  'உணவு': 'food',
  'பிற': 'other',
  'electrictiy': 'electricity',
  'water': 'water',
  'rent': 'rent',
  'transport': 'transport',
  'food': 'food',
  'other': 'other'
};

export function parseTamilCommand(text: string): TamilCommand | null {
  const cleanText = text.toLowerCase().trim().replace(/\s+/g, ' ');

  // --- Tamil number word conversion ---
  const tamilDigits: Record<string, string> = {
    'பூஜ்யம்': '0', 'ஒன்று': '1', 'ரண்டு': '2', 'மூன்று': '3', 'நான்கு': '4',
    'ஐந்து': '5', 'ஆறு': '6', 'ஏழு': '7', 'எட்டு': '8', 'ஒன்பது': '9',
    'பத்து': '10', 'இருபது': '20', 'முப்பது': '30', 'நாற்பது': '40',
    'ஐம்பது': '50', 'அறுபது': '60', 'எழுபது': '70', 'எண்பது': '80', 'தொண்ணூறு': '90',
    'நூறு': '100', 'இருநூறு': '200', 'முன்னூறு': '300', 'நாநூறு': '400',
    'ஐநூறு': '500', 'ஆறுநூறு': '600', 'எழுநூறு': '700', 'எண்ணூறு': '800',
    'தொள்ளாயிரம்': '900', 'ஆயிரம்': '1000', 'ஆயிரத்து': '1000'
  };
  let processedText = cleanText;
  for (const [word, digit] of Object.entries(tamilDigits)) {
    processedText = processedText.replace(new RegExp(word, 'g'), digit);
  }

  // --- Tanglish number words ---
  const tanglishNums: Record<string, string> = {
    'onnu': '1', 'rendu': '2', 'moonu': '3', 'naalu': '4', 'anju': '5',
    'aaru': '6', 'ezhu': '7', 'ettu': '8', 'ombathu': '9', 'pathu': '10',
    'irandu': '2', 'mundru': '3', 'naanku': '4', 'ainthu': '5', 'aarum': '6'
  };
  for (const [word, digit] of Object.entries(tanglishNums)) {
    processedText = processedText.replace(new RegExp(`\b${word}\b`, 'g'), digit);
  }

  const t = processedText;

  // --- Tanglish patterns (Roman-script Tamil) ---

  // Tanglish income: "nnaiku 10000 vanthuchu", "today 10000 vanthuchu", "10000 vasool", "varumaanam 10000"
  const tanIncomePattern = /(?:nnaiku\s+|innaiku\s+|today\s+|inraiya\s+)?(\d[\d,]*\.?\d*)\s*(?:vanthuchu|vanthachu|vanthutchu|vanthuchii|vasool|vasol|varumaanam|varumanam|varumai|aachu|aachu\s+vanthuchu)/;
  const tanIncomeMatch = t.match(tanIncomePattern);
  if (tanIncomeMatch) {
    return { type: 'income', price: parseFloat(tanIncomeMatch[1].replace(/,/g, '')) };
  }
  // Tanglish income variant: "varumaanam 10000", "vasool 10000"
  const tanIncomePattern2 = /(?:varumaanam|varumanam|vasool|vasol|income|revenue)\s+(\d[\d,]*\.?\d*)/;
  const tanIncomeMatch2 = t.match(tanIncomePattern2);
  if (tanIncomeMatch2) {
    return { type: 'income', price: parseFloat(tanIncomeMatch2[1].replace(/,/g, '')) };
  }

  // Tanglish purchase: "arisi 1 kilo 100 vanginean", "arisi 25 kilo 1200 rupaikku vanginean"
  const tanPurchasePattern = /(.+?)\s+(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilogram|litre|liter|bottle|bag|pack|piece|no)?\s+(\d+(?:\.\d+)?)\s*(?:rupee|rupay|rupaikku|rs|₹)?\s*(?:vanginean|vanginen|vanginon|kondom|vaanginean)?$/;
  const tanPurchaseMatch = t.match(tanPurchasePattern);
  if (tanPurchaseMatch && /vangi|kondom|purchase|vanginean|vanginen/i.test(t)) {
    return {
      type: 'purchase',
      product: tanPurchaseMatch[1].trim(),
      quantity: parseFloat(tanPurchaseMatch[2]),
      price: parseFloat(tanPurchaseMatch[3])
    };
  }

  // Tanglish sale: "arisi 5 kilo 350 vitrom", "arisi 5 kilo 350 viten"
  const tanSalePattern = /(.+?)\s+(\d+(?:\.\d+)?)\s*(?:kilo|kg|litre|liter|bottle|bag|pack|piece|no)?\s+(\d+(?:\.\d+)?)\s*(?:rupee|rupay|rupaikku|rs|₹)?\s*(?:vitrom|viten|vitean|vitten|sold)/;
  const tanSaleMatch = t.match(tanSalePattern);
  if (tanSaleMatch) {
    return {
      type: 'sale',
      product: tanSaleMatch[1].trim(),
      quantity: parseFloat(tanSaleMatch[2]),
      price: parseFloat(tanSaleMatch[3])
    };
  }

  // Tanglish expense: "selavu 500", "inraiya selavu 500"
  const tanExpensePattern = /(?:inraiya\s*)?selavu\s+(\d+(?:\.\d+)?)/;
  const tanExpenseMatch = t.match(tanExpensePattern);
  if (tanExpenseMatch) {
    return { type: 'expense', price: parseFloat(tanExpenseMatch[1]), product: 'other' };
  }

  // Tanglish saving: "semippu 1000", "inraiya semippu 1000"
  const tanSavingPattern = /(?:inraiya\s*)?semippu\s+(\d+(?:\.\d+)?)/;
  const tanSavingMatch = t.match(tanSavingPattern);
  if (tanSavingMatch) {
    return { type: 'saving', price: parseFloat(tanSavingMatch[1]) };
  }

  // Tanglish profit query: "inraiya labam", "labam enna"
  if (/(?:inraiya\s*)?labam/.test(t)) {
    return { type: 'query', queryType: 'profit' };
  }

  // Tanglish stock query: "arisi irukku", "arisi stock evvalavu"
  const tanStockPattern = /(.+?)\s+(?:irukku|stock\s*evvalavu|evvalavu\s*irukku)/;
  const tanStockMatch = t.match(tanStockPattern);
  if (tanStockMatch) {
    return { type: 'query', queryType: 'stock', product: tanStockMatch[1].trim() };
  }

  // --- English patterns ---

  // English income: "income 10000", "revenue 10000", "today income 10000", "received 10000"
  const engIncomePattern = /(?:today\s*)?(?:income|revenue|received|receipt|collection)\s+(\d[\d,]*\.?\d*)\s*(?:rs|rupees|rupee|₹)?/;
  const engIncomeMatch = t.match(engIncomePattern);
  if (engIncomeMatch) {
    return { type: 'income', price: parseFloat(engIncomeMatch[1].replace(/,/g, '')) };
  }

  // English purchase: "rice 1 kg 100", "bought rice 2 kg 200", "purchase rice 1 kg 100 rupees"
  const engPurchasePattern = /(?:bought|buy|purchase|purchased)?\s*([a-z][a-z\s]*?)\s+(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|liter|litre|l|bottle|bag|pack|piece|pcs|no)?\s+(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupee|₹)?$/;
  const engPurchaseMatch = t.match(engPurchasePattern);
  if (engPurchaseMatch && /[a-z]/.test(engPurchaseMatch[1])) {
    return {
      type: 'purchase',
      product: engPurchaseMatch[1].trim(),
      quantity: parseFloat(engPurchaseMatch[2]),
      price: parseFloat(engPurchaseMatch[3])
    };
  }

  // English sale: "sold rice 1 kg 150", "sell rice 1 kg 150"
  const engSalePattern = /(?:sold|sell|sale)\s+([a-z][a-z\s]*?)\s+(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|liter|litre|l|bottle|bag|pack|piece|pcs|no)?\s+(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupee|₹)?/;
  const engSaleMatch = t.match(engSalePattern);
  if (engSaleMatch) {
    return {
      type: 'sale',
      product: engSaleMatch[1].trim(),
      quantity: parseFloat(engSaleMatch[2]),
      price: parseFloat(engSaleMatch[3])
    };
  }

  // English expense: "expense 500", "today expense 500", "spent 500"
  const engExpensePattern = /(?:today\s*)?(?:expense|expenses|spent|spending)\s+(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupee|₹)?/;
  const engExpenseMatch = t.match(engExpensePattern);
  if (engExpenseMatch) {
    return {
      type: 'expense',
      price: parseFloat(engExpenseMatch[1]),
      product: 'other'
    };
  }

  // English saving: "saving 1000", "savings 1000", "saved 1000"
  const engSavingPattern = /(?:today\s*)?(?:saving|savings|saved)\s+(\d+(?:\.\d+)?)\s*(?:rs|rupees|rupee|₹)?/;
  const engSavingMatch = t.match(engSavingPattern);
  if (engSavingMatch) {
    return {
      type: 'saving',
      price: parseFloat(engSavingMatch[1])
    };
  }

  // English profit query: "today profit", "what is profit"
  if (/(?:today\s*)?(?:profit|earnings|income)/.test(t)) {
    return { type: 'query', queryType: 'profit' };
  }

  // English stock query: "rice stock", "how much rice"
  const engStockPattern = /(?:how much|stock of|check)\s+([a-z][a-z\s]+?)(?:\s+stock|\s+available|\s+left)?$/;
  const engStockMatch = t.match(engStockPattern);
  if (engStockMatch) {
    return { type: 'query', queryType: 'stock', product: engStockMatch[1].trim() };
  }
  const engStockPattern2 = /([a-z][a-z\s]+?)\s+stock/;
  const engStockMatch2 = t.match(engStockPattern2);
  if (engStockMatch2) {
    return { type: 'query', queryType: 'stock', product: engStockMatch2[1].trim() };
  }

  // --- Tamil patterns ---

  // Tamil income: "இன்றைய வருமானம் 10000", "வருமானம் 10000", "வசூல் 10000", "10000 வந்தது", "10000 வந்துச்சு"
  const tamilIncomePattern = /(?:இன்றைய\s*)?(?:வருமானம்|வசூல்)\s*(\d[\d,]*\.?\d*)\s*(?:ரூபாய்)?|(\d[\d,]*\.?\d*)\s*(?:ரூபாய்)?\s*(?:வந்தது|வந்துச்சு|வந்தச்சு|வந்துசி)/;
  const tamilIncomeMatch = t.match(tamilIncomePattern);
  if (tamilIncomeMatch) {
    const amount = tamilIncomeMatch[1] || tamilIncomeMatch[2];
    return { type: 'income', price: parseFloat(amount.replace(/,/g, '')) };
  }

  // Tamil income variant: number first then keyword - "10000 வருமானம்", "5000 வசூல்"
  const tamilIncomePattern2 = /(\d[\d,]*\.?\d*)\s*(?:ரூபாய்)?\s*(?:வருமானம்|வசூல்|வந்தது|வந்துச்சு)/;
  const tamilIncomeMatch2 = t.match(tamilIncomePattern2);
  if (tamilIncomeMatch2) {
    return { type: 'income', price: parseFloat(tamilIncomeMatch2[1].replace(/,/g, '')) };
  }

  // Tamil purchase - flexible: "அரிசி 25 கிலோ 1200 ரூபாய்க்கு வாங்கினேன்", "அரிசி 2 கிலோ 100 ரூபாய் வாங்கினேன்", "25 கிலோ அரிசி 1200 வாங்கினேன்"
  // Pattern 1: product qty unit price keyword
  const tamilPurchase1 = /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:கிலோ|லிட்டர்|பாட்டில்|பை|முட்டை|கிராம்|பேக்|பாக்|துண்டு|முழு)?\s*(\d+(?:\.\d+)?)\s*(?:ரூபாய்|ரூபாய்க்கு|ரூபா)?\s*(?:வாங்கினேன்|வாங்கினோம்|வாங்கியது|வாங்கி|கொள்முதல்|கினேன்)/;
  const tamilPurchaseMatch1 = t.match(tamilPurchase1);
  if (tamilPurchaseMatch1) {
    return {
      type: 'purchase',
      product: tamilPurchaseMatch1[1].trim(),
      quantity: parseFloat(tamilPurchaseMatch1[2]),
      price: parseFloat(tamilPurchaseMatch1[3])
    };
  }
  // Pattern 2: qty unit product price keyword (reversed order)
  const tamilPurchase2 = /(\d+(?:\.\d+)?)\s*(?:கிலோ|லிட்டர்|பாட்டில்|பை|முட்டை|கிராம்|பேக்|பாக்|துண்டு|முழு)?\s*(.+?)\s*(\d+(?:\.\d+)?)\s*(?:ரூபாய்|ரூபாய்க்கு|ரூபா)?\s*(?:வாங்கினேன்|வாங்கினோம்|வாங்கியது|வாங்கி|கொள்முதல்|கினேன்)/;
  const tamilPurchaseMatch2 = t.match(tamilPurchase2);
  if (tamilPurchaseMatch2) {
    return {
      type: 'purchase',
      product: tamilPurchaseMatch2[2].trim(),
      quantity: parseFloat(tamilPurchaseMatch2[1]),
      price: parseFloat(tamilPurchaseMatch2[3])
    };
  }
  // Pattern 3: product qty price (no unit word, no rupaay) - "அரிசி 2 100 வாங்கினேன்"
  const tamilPurchase3 = /(.+?)\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(?:வாங்கினேன்|வாங்கினோம்|வாங்கியது|வாங்கி|கொள்முதல்|கினேன்)/;
  const tamilPurchaseMatch3 = t.match(tamilPurchase3);
  if (tamilPurchaseMatch3) {
    return {
      type: 'purchase',
      product: tamilPurchaseMatch3[1].trim(),
      quantity: parseFloat(tamilPurchaseMatch3[2]),
      price: parseFloat(tamilPurchaseMatch3[3])
    };
  }

  // Tamil sale - flexible: "அரிசி 5 கிலோ 350 ரூபாய்க்கு விற்றேன்", "அரிசி 2 கிலோ 150 விற்றேன்", "5 கிலோ அரிசி 350 விற்றேன்"
  // Pattern 1: product qty unit price keyword
  const tamilSale1 = /(.+?)\s*(\d+(?:\.\d+)?)\s*(?:கிலோ|லிட்டர்|பாட்டில்|பை|முட்டை|கிராம்|பேக்|பாக்|துண்டு|முழு)?\s*(\d+(?:\.\d+)?)\s*(?:ரூபாய்|ரூபாய்க்கு|ரூபா)?\s*(?:விற்றேன்|விற்றது|விற்றோம்|விற்பனை|விற்ற|விட்டேன்|விட்டோம்)/;
  const tamilSaleMatch1 = t.match(tamilSale1);
  if (tamilSaleMatch1) {
    return {
      type: 'sale',
      product: tamilSaleMatch1[1].trim(),
      quantity: parseFloat(tamilSaleMatch1[2]),
      price: parseFloat(tamilSaleMatch1[3])
    };
  }
  // Pattern 2: qty unit product price keyword (reversed)
  const tamilSale2 = /(\d+(?:\.\d+)?)\s*(?:கிலோ|லிட்டர்|பாட்டில்|பை|முட்டை|கிராம்|பேக்|பாக்|துண்டு|முழு)?\s*(.+?)\s*(\d+(?:\.\d+)?)\s*(?:ரூபாய்|ரூபாய்க்கு|ரூபா)?\s*(?:விற்றேன்|விற்றது|விற்றோம்|விற்பனை|விற்ற|விட்டேன்|விட்டோம்)/;
  const tamilSaleMatch2 = t.match(tamilSale2);
  if (tamilSaleMatch2) {
    return {
      type: 'sale',
      product: tamilSaleMatch2[2].trim(),
      quantity: parseFloat(tamilSaleMatch2[1]),
      price: parseFloat(tamilSaleMatch2[3])
    };
  }
  // Pattern 3: product qty price (no unit, no rupaay) - "அரிசி 2 150 விற்றேன்"
  const tamilSale3 = /(.+?)\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(?:விற்றேன்|விற்றது|விற்றோம்|விற்பனை|விற்ற|விட்டேன்|விட்டோம்)/;
  const tamilSaleMatch3 = t.match(tamilSale3);
  if (tamilSaleMatch3) {
    return {
      type: 'sale',
      product: tamilSaleMatch3[1].trim(),
      quantity: parseFloat(tamilSaleMatch3[2]),
      price: parseFloat(tamilSaleMatch3[3])
    };
  }

  // Tamil expense: "இன்றைய செலவு 500", "இன்றைக்கு செலவு ₹10", "செலவு 500 ரூபாய்", "மின்சாரம் 500"
  // Pattern 1: keyword + amount, including natural speech variants for today and rupee symbols
  const tamilExpense1 = /(?:இன்றைய|இன்றைக்கு|இன்று)?\s*செலவு\s*(?:₹\s*)?(\d+(?:\.\d+)?)\s*(?:ரூபாய்|ரூபா|rs)?/;
  const tamilExpMatch1 = t.match(tamilExpense1);
  if (tamilExpMatch1) {
    return { type: 'expense', price: parseFloat(tamilExpMatch1[1]), product: 'other' };
  }
  // Pattern 2: amount + keyword
  const tamilExpense2 = /(\d+(?:\.\d+)?)\s*(?:ரூபாய்)?\s*செலவு/;
  const tamilExpMatch2 = t.match(tamilExpense2);
  if (tamilExpMatch2) {
    return { type: 'expense', price: parseFloat(tamilExpMatch2[1]), product: 'other' };
  }
  // Pattern 3: category + amount (e.g., "மின்சாரம் 500", "வாடகை 2000")
  const tamilExpense3 = /(மின்சாரம்|நீர்|வாடகை|போக்குவரத்து|உணவு|பிற)\s*(\d+(?:\.\d+)?)\s*(?:ரூபாய்)?/;
  const tamilExpMatch3 = t.match(tamilExpense3);
  if (tamilExpMatch3) {
    return { type: 'expense', price: parseFloat(tamilExpMatch3[2]), product: expenseCategories[tamilExpMatch3[1]] || 'other' };
  }

  // Tamil savings: "இன்றைய சேமிப்பு 1000", "சேமிப்பு 1000 ரூபாய்", "1000 ரூபாய் சேமிப்பு"
  const tamilSaving1 = /(?:இன்றைய\s*)?சேமிப்பு\s*(\d+(?:\.\d+)?)\s*(?:ரூபாய்)?/;
  const tamilSaveMatch1 = t.match(tamilSaving1);
  if (tamilSaveMatch1) {
    return { type: 'saving', price: parseFloat(tamilSaveMatch1[1]) };
  }
  const tamilSaving2 = /(\d+(?:\.\d+)?)\s*(?:ரூபாய்)?\s*சேமிப்பு/;
  const tamilSaveMatch2 = t.match(tamilSaving2);
  if (tamilSaveMatch2) {
    return { type: 'saving', price: parseFloat(tamilSaveMatch2[1]) };
  }

  // Tamil stock query: "அரிசி எவ்வளவு இருக்கு?", "அரிசி எவ்வளவு இருக்கு", "அரிசி இருக்கு?", "அரிசி இருப்பு என்ன?"
  const tamilStock1 = /(.+?)\s*எவ்வளவு\s*இருக்கு\??/;
  const tamilStockMatch1 = t.match(tamilStock1);
  if (tamilStockMatch1) {
    return { type: 'query', queryType: 'stock', product: tamilStockMatch1[1].trim() };
  }
  const tamilStock2 = /(.+?)\s*இருப்பு\s*என்ன\??/;
  const tamilStockMatch2 = t.match(tamilStock2);
  if (tamilStockMatch2) {
    return { type: 'query', queryType: 'stock', product: tamilStockMatch2[1].trim() };
  }
  const tamilStock3 = /(.+?)\s*இருக்கு\??/;
  const tamilStockMatch3 = t.match(tamilStock3);
  if (tamilStockMatch3 && !/(வாங்கி|விற்ற|செலவு|சேமி)/.test(tamilStockMatch3[1])) {
    return { type: 'query', queryType: 'stock', product: tamilStockMatch3[1].trim() };
  }

  // Price query: "அரிசி எவ்வளவு விலைக்கு வாங்கினோம்?"
  const priceQueryPattern = /(.+?)\s*எவ்வளவு\s*விலைக்கு\s*வாங்கினோம்\??/;
  const priceQueryMatch = t.match(priceQueryPattern);
  if (priceQueryMatch) {
    return {
      type: 'query',
      queryType: 'price',
      product: priceQueryMatch[1].trim()
    };
  }

  // Tamil profit query: "இன்றைய லாபம் என்ன?", "லாபம் என்ன", "லாபம் எவ்வளவு", "இன்றைய லாபம் எவ்வளவு"
  if (/(?:இன்றைய\s*)?லாபம்\s*(?:என்ன\??|எவ்வளவு\??)?/.test(t)) {
    return { type: 'query', queryType: 'profit' };
  }

  // Tamil total expense query: "மொத்த செலவு என்ன?", "செலவு எவ்வளவு?"
  if (/மொத்த\s*செலவு\s*என்ன\??|செலவு\s*எவ்வளவு\??/.test(t)) {
    return { type: 'query', queryType: 'expense' };
  }

  // Tamil total savings query: "மொத்த சேமிப்பு என்ன?", "சேமிப்பு எவ்வளவு?"
  if (/மொத்த\s*சேமிப்பு\s*என்ன\??|சேமிப்பு\s*எவ்வளவு\??/.test(t)) {
    return { type: 'query', queryType: 'savings' };
  }

  // Tamil total income query: "மொத்த வருமானம் என்ன?", "இன்றைய வருமானம் என்ன?", "வருமானம் எவ்வளவு?"
  if (/(?:மொத்த\s*|இன்றைய\s*)?வருமானம்\s*(?:என்ன\??|எவ்வளவு\??)?/.test(t)) {
    return { type: 'query', queryType: 'income' };
  }
  // Tanglish income query: "inraiya varumaanam", "total vasool"
  if (/(?:inraiya\s*|total\s*)?(?:varumaanam|varumanam|vasool|vasol)\b/.test(t) && !/\d/.test(t)) {
    return { type: 'query', queryType: 'income' };
  }
  // English income query: "total income", "today revenue"
  if (/(?:today\s*|total\s*)?(?:income|revenue)\b/.test(cleanText) && !/\d/.test(cleanText)) {
    return { type: 'query', queryType: 'income' };
  }

  return null;
}

export function formatTamilCurrency(amount: number): string {
  return `${amount.toLocaleString('ta-IN')} ரூபாய்`;
}

export function formatTamilQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}`;
}

export function getTamilDate(date: Date = new Date()): string {
  const day = date.getDate();
  const month = tamilMonths[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getTamilDayName(date: Date = new Date()): string {
  const days = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];
  return days[date.getDay()];
}

export function generateTamilResponse(command: TamilCommand, result?: unknown): string {
  switch (command.type) {
    case 'purchase':
      return `${command.product} ${command.quantity} ${formatTamilCurrency(command.price || 0)} வாங்கினோம். கையேடு பதிவு செய்யப்பட்டது.`;
    case 'sale':
      return `${command.product} ${command.quantity} விற்றோம். ${formatTamilCurrency(command.price || 0)}`;
    case 'expense':
      return `${formatTamilCurrency(command.price || 0)} செலவு பதிவு செய்யப்பட்டது.`;
    case 'saving':
      return `${formatTamilCurrency(command.price || 0)} சேமிப்பு பதிவு செய்யப்பட்டது.`;
    case 'query':
      if (result !== undefined) {
        return String(result);
      }
      return 'தகவல் கிடைக்கவில்லை.';
    default:
      return 'மன்னிக்கவும். புரிந்துகொள்ள முடியவில்லை.';
  }
}

export const tamilVoiceCommands = {
  purchase: 'வாங்கினேன்',
  sale: 'விற்றேன்',
  expense: 'செலவு',
  saving: 'சேமிப்பு',
  stock: 'இருப்பு',
  price: 'விலை',
  profit: 'லாபம்',
  loss: 'நஷ்டம்',
  today: 'இன்று',
  yesterday: 'நேற்று',
  month: 'மாதம்',
  week: 'வாரம்',
  total: 'மொத்தம்',
  amount: 'தொகை',
  quantity: 'அளவு',
  lowStock: 'குறைந்த இருப்பு',
  addProduct: 'பொருள் சேர்க்க',
  addStock: 'இஇஇருப்பு சேர்',
  removeStock: 'இருப்பு குறை',
  viewReport: 'அறிக்கை பார்',
  exportReport: 'அறிக்கை ஏற்றுமதி'
};

export const expenseCategoriesTamil = [
  'மின்சாரம்',
  'நீர்',
  'வாடகை',
  'போக்குவரத்து',
  'உணவு',
  'பிற'
];

export const commonProductsTamil = [
  'அரிசி',
  'பருப்பு',
  'எண்ணெய்',
  'சர்க்கரை',
  'உப்பு',
  'மிளகாய்',
  'பால்',
  'முட்டை',
  'தேங்காய்',
  'பயறு',
  'பட்டாணி',
  'கடலை'
];
