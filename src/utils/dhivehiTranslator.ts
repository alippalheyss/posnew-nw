/**
 * Dhivehi Translation and Phonetic Transliteration Engine for Retail & Supermarket Products
 */

// Comprehensive retail & supermarket product translation dictionary
const DICTIONARY: Record<string, string> = {
  // Commodities & Staples
  'rice': 'ހަނޑޫ',
  'basmati rice': 'ބާސްމަތީ ހަނޑޫ',
  'white rice': 'ހުދު ހަނޑޫ',
  'red rice': 'ރަތް ހަނޑޫ',
  'sugar': 'ހަކުރު',
  'white sugar': 'ހުދު ހަކުރު',
  'brown sugar': 'މުށި ހަކުރު',
  'flour': 'ފުށް',
  'wheat flour': 'ގޮދަން ފުށް',
  'baking powder': 'ބޭކިންގ ޕައުޑަރު',
  'baking soda': 'ބޭކިންގ ސޯޑާ',
  'yeast': 'ޔީސްޓް',
  'noodles': 'ނޫޑްލްސް',
  'spaghetti': 'ސްޕެގެޓީ',
  'pasta': 'ޕާސްތާ',
  'macaroni': 'މެކަރޯނީ',
  'salt': 'ލޮނު',
  'black salt': 'ކަޅު ލޮނު',
  'sea salt': 'ކަނޑު ލޮނު',
  'pepper': 'އަސޭމިރުސް',
  'black pepper': 'ކަޅު އަސޭމިރުސް',
  'white pepper': 'ހުދު އަސޭމިރުސް',
  'oil': 'ތެޔޮ',
  'cooking oil': 'ކައްކާ ތެޔޮ',
  'vegetable oil': 'ވެޖިޓަބަލް ތެޔޮ',
  'sunflower oil': 'ސަންފްލާވަރ ތެޔޮ',
  'corn oil': 'ކޯން އޮއިލް',
  'olive oil': 'ޒައިތޫނި ތެޔޮ',
  'coconut oil': 'ކާށިތެޔޮ',
  'ghee': 'ގިތެޔޮ',
  'vinegar': 'ވިނިގަރ',
  'soy sauce': 'ސޯޔާ ސޯސް',
  'chili sauce': 'މިރުސް ސޯސް',
  'tomato sauce': 'ޓޮމާޓޯ ސޯސް',
  'tomato paste': 'ޓޮމާޓޯ ޕޭސްޓް',
  'ketchup': 'ކެޗަޕް',
  'mayonnaise': 'މަޔޮނައިޒް',
  'mustard': 'މަސްޓަޑް',

  // Dairy & Refrigerated
  'milk': 'ކިރު',
  'fresh milk': 'ތާޒާ ކިރު',
  'full cream milk': 'ފުލް ކްރީމް ކިރު',
  'low fat milk': 'ލޯ ފެޓް ކިރު',
  'skimmed milk': 'ސްކިމްޑް ކިރު',
  'evaporated milk': 'އޮލަކިރު',
  'condensed milk': 'މާމުއި ކިރު',
  'powdered milk': 'ކިރު ޕައުޑަރު',
  'milk powder': 'ކިރު ޕައުޑަރު',
  'butter': 'ބަޓަރު',
  'unsalted butter': 'ލޮނުނުލާ ބަޓަރު',
  'salted butter': 'ލޮނުލީ ބަޓަރު',
  'margarine': 'މާޖަރީން',
  'cheese': 'ޗީޒް',
  'cheddar cheese': 'ޗެޑަރ ޗީޒް',
  'mozzarella cheese': 'މޮޒަރެއްލާ ޗީޒް',
  'cream cheese': 'ކްރީމް ޗީޒް',
  'yogurt': 'ޔޯގަޓް',
  'yoghurt': 'ޔޯގަޓް',
  'curd': 'މަދުހިކި',
  'egg': 'ބިސް',
  'eggs': 'ބިސް',
  'white eggs': 'ހުދު ބިސް',
  'brown eggs': 'މުށި ބިސް',

  // Bakery & Breakfast
  'bread': 'ޕާން',
  'white bread': 'ހުދު ޕާން',
  'brown bread': 'މުށި ޕާން',
  'bun': 'ބަނަސް',
  'buns': 'ބަނަސް',
  'cake': 'ކޭކު',
  'biscuit': 'ބިސްކޯދު',
  'biscuits': 'ބިސްކޯދު',
  'cookie': 'ކުކީސް',
  'cookies': 'ކުކީސް',
  'toast': 'ޓޯސްޓް',
  'cereal': 'ސީރިއަލް',
  'corn flakes': 'ކޯން ފްލޭކްސް',
  'oats': 'އޯޓްސް',
  'honey': 'މާމުއި',
  'jam': 'ޖޭމް',
  'peanut butter': 'ޕީނަޓް ބަޓަރު',

  // Fresh Produce - Vegetables
  'onion': 'ފިޔާ',
  'onions': 'ފިޔާ',
  'red onion': 'ރަތް ފިޔާ',
  'bombay onion': 'ބޮމްބޭ ފިޔާ',
  'potato': 'އަލުވި',
  'potatoes': 'އަލުވި',
  'sweet potato': 'ކައްޓަލަ',
  'garlic': 'ލޮނުމެދު',
  'ginger': 'އިނގުރު',
  'tomato': 'ވިލާތުބަށި',
  'tomatoes': 'ވިލާތުބަށި',
  'chili': 'މިރުސް',
  'chilies': 'މިރުސް',
  'green chili': 'ގިތެޔޮ މިރުސް',
  'githeyo mirus': 'ގިތެޔޮ މިރުސް',
  'carrot': 'ކެރެޓު',
  'carrots': 'ކެރެޓު',
  'cabbage': 'ކޮޕީފަތް',
  'lettuce': 'ސެލަޑް ފަތް',
  'cucumber': 'ކިއުކަމްބާ',
  'capsicum': 'ބޮޑު މިރުސް',
  'bell pepper': 'ބޮޑު މިރުސް',
  'eggplant': 'ބަށި',
  'brinjal': 'ބަށި',
  'pumpkin': 'ބަރަބޯ',
  'drumstick': 'މުރަނގަތޮޅި',
  'beans': 'ތޮޅި',
  'green beans': 'ތޮޅި',
  'curry leaves': 'ހިކަނދިފަތް',
  'pandan leaves': 'ރާނބާފަތް',
  'lime': 'ލުނބޯ',
  'limes': 'ލުނބޯ',
  'lemon': 'ލުނބޯ',
  'coconut': 'ކާށި',
  'young coconut': 'ކުރުނބާ',
  'grated coconut': 'ހުނި',

  // Fresh Produce - Fruits
  'apple': 'އާފަލު',
  'apples': 'އާފަލު',
  'red apple': 'ރަތް އާފަލު',
  'green apple': 'ފެހި އާފަލު',
  'orange': 'އޮރެންޖު',
  'oranges': 'އޮރެންޖު',
  'banana': 'ދޮންކެޔޮ',
  'bananas': 'ދޮންކެޔޮ',
  'mango': 'އަނބު',
  'mangoes': 'އަނބު',
  'grapes': 'މޭބިސްކަދުރު',
  'watermelon': 'ކަރާ',
  'pineapple': 'އަނަންނާސި',
  'papaya': 'ފަޅޯ',
  'strawberry': 'ސްޓްރޯބެރީ',
  'strawberries': 'ސްޓްރޯބެރީ',
  'guava': 'ފޭރު',
  'pomegranate': 'އަންނާރު',
  'dates': 'ކަދުރު',

  // Meat, Seafood & Poultry
  'chicken': 'ކުކުޅު',
  'whole chicken': 'މުޅި ކުކުޅު',
  'chicken breast': 'ކުކުޅު މޭމަސް',
  'chicken leg': 'ކުކުޅު ފައި',
  'chicken wings': 'ކުކުޅު ފިޔަގަނޑު',
  'beef': 'ގެރިމަސް',
  'mutton': 'ބަކަރިމަސް',
  'meat': 'ރަތްމަސް',
  'minced meat': 'މުގުރި މަސް',
  'sausage': 'ސޮސެޖް',
  'sausages': 'ސޮސެޖް',
  'hot dog': 'ހޮޓް ޑޮގް',
  'fish': 'މަސް',
  'tuna': 'ކަންނެލި',
  'canned tuna': 'މަސްދަޅު',
  'tuna can': 'މަސްދަޅު',
  'tuna in oil': 'ތެލުލި މަސްދަޅު',
  'tuna in brine': 'ފެނުގަ މަސްދަޅު',
  'smoked tuna': 'ވަޅޯމަސް',
  'dried fish': 'ހިކިމަސް',
  'rihaakuru': 'ރިހާކުރު',

  // Beverages
  'water': 'ފެން',
  'mineral water': 'މިނަރަލް ވޯޓަރ',
  'drinking water': 'ބޯފެން',
  'tea': 'ސައިފަތް',
  'tea bag': 'ސައި ކޮތަޅު',
  'tea bags': 'ސައި ކޮތަޅު',
  'black tea': 'ކަޅު ސައިފަތް',
  'green tea': 'ގްރީން ޓީ',
  'coffee': 'ކޮފީ',
  'instant coffee': 'އިންސްޓަންޓް ކޮފީ',
  'juice': 'ޖޫސް',
  'orange juice': 'އޮރެންޖު ޖޫސް',
  'apple juice': 'އާފަލު ޖޫސް',
  'mango juice': 'އަނބު ޖޫސް',
  'soft drink': 'ސޮފްޓް ޑްރިންކް',
  'energy drink': 'އެނާޖީ ޑްރިންކް',
  'soda': 'ސޯޑާ',

  // Popular Brands & Items
  'coca cola': 'ކޮކާ ކޯލާ',
  'coke': 'ކޯކް',
  'diet coke': 'ޑައެޓް ކޯކް',
  'coca-cola': 'ކޮކާ ކޯލާ',
  'pepsi': 'ޕެޕްސީ',
  'sprite': 'ސްޕްރައިޓް',
  'fanta': 'ފެންޓާ',
  'milo': 'މައިލޯ',
  'nescafe': 'ނެސްކެފޭ',
  'lipton': 'ލިޕްޓަން',
  'red bull': 'ރެޑް ބުލް',
  'sting': 'ސްޓިންގ',
  'xl energy': 'އެކްސްއެލް',
  'tang': 'ޓޭންގް',
  'anchor': 'އެންކަރ',
  'coast': 'ކޯސްޓް',
  'nido': 'ނިޑޯ',
  'pringles': 'ޕްރިންގަލްސް',
  'oreo': 'އޮރިއޯ',
  'kitkat': 'ކިޓްކެޓް',
  'snickers': 'ސްނިކަރސް',
  'mars': 'މާރސް',
  'nutella': 'ނުޓެއްލާ',
  'marmite': 'މާމައިޓް',
  'maggi': 'މެގީ',
  'knorr': 'ނޯރ',
  'indomie': 'އިންޑޯމީ',
  'dettol': 'ޑެޓޯލް',
  'lifebuoy': 'ލައިފްބޯއި',
  'sunlight': 'ސަންލައިޓް',
  'colgate': 'ކޮލްގޭޓް',
  'closeup': 'ކްލޯސްއަޕް',

  // Household & Cleaning
  'soap': 'ސައިބޯނި',
  'bath soap': 'ގައިގަ އުނގުޅާ ސައިބޯނި',
  'hand wash': 'އަތްދޮންނަ ސައިބޯނި',
  'hand soap': 'އަތްދޮންނަ ސައިބޯނި',
  'shampoo': 'ޝޭމްޕޫ',
  'conditioner': 'ކޮންޑިޝަނަރ',
  'toothpaste': 'ދަތްއުނގުޅާ ބޭސް',
  'toothbrush': 'ދަތްއުނގުޅާ ބުރުސް',
  'detergent': 'ދޮންނަ ކުނޑި',
  'washing powder': 'ދޮންނަ ކުނޑި',
  'liquid detergent': 'ދޮންނަ ދިޔާ އެއްޗެހި',
  'dishwash liquid': 'ތަށިދޮންނަ ދިޔާ އެއްޗެހި',
  'dishwashing liquid': 'ތަށިދޮންނަ ދިޔާ އެއްޗެހި',
  'bleach': 'ކްލޮރޮކްސް',
  'fabric softener': 'ކޮމްފޯޓް',
  'tissue': 'ޓިޝޫ',
  'facial tissue': 'މޫނުފޮހޭ ޓިޝޫ',
  'toilet paper': 'ޓޮއިލެޓް ޕޭޕަރ',
  'paper towel': 'ކުދި ޓަވަލް ޓިޝޫ',
  'sponge': 'ސްޕޮންޖު',
  'trash bag': 'ކުނި ކޮތަޅު',
  'garbage bag': 'ކުނި ކޮތަޅު',
  'mosquito spray': 'މަދިރި ސްޕްރޭ',
  'air freshener': 'އެއަރ ފްރެޝަނަރ',

  // Baby Care
  'diaper': 'ޑައިޕަރ',
  'diapers': 'ޑައިޕަރ',
  'baby wipes': 'ބޭބީ ވައިޕްސް',
  'baby powder': 'ބޭބީ ޕައުޑަރު',
  'baby lotion': 'ބޭބީ ލޯޝަން',
  'baby soap': 'ކުޑަކުދިންގެ ސައިބޯނި',
  'baby oil': 'ބޭބީ އޮއިލް',

  // Packaging & Unit Words
  'can': 'ދަޅު',
  'bottle': 'ފުޅި',
  'packet': 'ޕެކެޓް',
  'pack': 'ޕެކެޓް',
  'box': 'ފޮށި',
  'case': 'ކޭސް',
  'tin': 'ދަޅު',
  'jar': 'ދަޅު',
  'pouch': 'ޕައުޗް',
  'bar': 'ބާރ',
  'roll': 'ރޯލް',
  'bag': 'ކޮތަޅު',
  'small': 'ކުޑަ',
  'large': 'ބޮޑު',
  'medium': 'މެދު'
};

// Phonetic English-to-Thaana Character Map
const PHONETIC_MAP: Record<string, string> = {
  'sh': 'ޝ',
  'th': 'ތ',
  'ch': 'ޗ',
  'kh': 'ޚ',
  'dh': 'ދ',
  'ny': 'ޏ',
  'gn': 'ޏ',
  'gh': 'ޣ',
  'ng': 'ންގ',
  'ck': 'ކ',
  'ph': 'ފ',
  'wh': 'ވ',
  'b': 'ބ',
  'c': 'ކ',
  'd': 'ޑ',
  'f': 'ފ',
  'g': 'ގ',
  'h': 'ހ',
  'j': 'ޖ',
  'k': 'ކ',
  'l': 'ލ',
  'm': 'މ',
  'n': 'ނ',
  'p': 'ޕ',
  'q': 'ޤ',
  'r': 'ރ',
  's': 'ސ',
  't': 'ޓ',
  'v': 'ވ',
  'w': 'ވ',
  'x': 'ކްސް',
  'y': 'ޔ',
  'z': 'ޒ'
};

/**
 * Phonetically transliterate an English word to Thaana
 */
export function transliterateEnglishToThaana(word: string): string {
  if (!word) return '';
  const clean = word.toLowerCase().trim();
  let result = '';
  let i = 0;

  while (i < clean.length) {
    // Check 2-letter combos
    if (i + 1 < clean.length) {
      const pair = clean.slice(i, i + 2);
      if (pair === 'oo') {
        result += 'ޫ';
        i += 2;
        continue;
      }
      if (pair === 'ee') {
        result += 'ީ';
        i += 2;
        continue;
      }
      if (pair === 'aa') {
        result += 'ާ';
        i += 2;
        continue;
      }
      if (PHONETIC_MAP[pair]) {
        result += PHONETIC_MAP[pair];
        i += 2;
        continue;
      }
    }

    const ch = clean[i];
    if (ch === 'a') {
      result += (i === 0 ? 'އަ' : 'ަ');
    } else if (ch === 'e') {
      result += (i === 0 ? 'އެ' : 'ެ');
    } else if (ch === 'i') {
      result += (i === 0 ? 'އި' : 'ި');
    } else if (ch === 'o') {
      result += (i === 0 ? 'އޮ' : 'ޮ');
    } else if (ch === 'u') {
      result += (i === 0 ? 'އު' : 'ު');
    } else if (PHONETIC_MAP[ch]) {
      result += PHONETIC_MAP[ch];
    } else {
      result += ch;
    }
    i++;
  }

  return result;
}

/**
 * Translate an English product name into natural Dhivehi
 * Example: "Coca Cola 330ml Can" -> "ކޮކާ ކޯލާ 330އެމްއެލް ދަޅު"
 * Example: "Fresh Milk 1L" -> "ތާޒާ ކިރު 1ލީޓަރު"
 */
export function translateEnglishToDhivehi(englishName: string): string {
  if (!englishName || !englishName.trim()) return '';

  const clean = englishName.trim().replace(/\s+/g, ' ');
  const lower = clean.toLowerCase();

  // 1. Direct full-phrase match
  if (DICTIONARY[lower]) {
    return DICTIONARY[lower];
  }

  // 2. Multi-word phrase matching with replacement
  let workingText = lower;
  const tokensFound: Array<{ start: number; end: number; dhivehi: string }> = [];

  // Sort dictionary keys by descending length so multi-word expressions match first
  const sortedKeys = Object.keys(DICTIONARY).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (key.length <= 2) continue; // Skip tiny keys for broad matching
    const regex = new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    let match;
    while ((match = regex.exec(workingText)) !== null) {
      tokensFound.push({
        start: match.index,
        end: match.index + match[0].length,
        dhivehi: DICTIONARY[key]
      });
    }
  }

  // If we matched the core phrase
  if (tokensFound.length > 0) {
    // Sort tokens by start position
    tokensFound.sort((a, b) => a.start - b.start);
    
    // Construct translated string
    let result = '';
    let lastIdx = 0;

    for (const t of tokensFound) {
      if (t.start < lastIdx) continue; // overlap
      const before = workingText.slice(lastIdx, t.start).trim();
      if (before) {
        // Transliterate remaining words (sizes, brands, codes)
        const parts = before.split(/\s+/).map(p => translateToken(p));
        result += (result ? ' ' : '') + parts.join(' ');
      }
      result += (result ? ' ' : '') + t.dhivehi;
      lastIdx = t.end;
    }

    if (lastIdx < workingText.length) {
      const remaining = workingText.slice(lastIdx).trim();
      if (remaining) {
        const parts = remaining.split(/\s+/).map(p => translateToken(p));
        result += (result ? ' ' : '') + parts.join(' ');
      }
    }

    return result.trim();
  }

  // 3. Token-by-token fallback
  const words = clean.split(/\s+/);
  const translatedWords = words.map(w => translateToken(w));
  return translatedWords.join(' ');
}

function translateToken(token: string): string {
  const lower = token.toLowerCase();

  // Dictionary lookup
  if (DICTIONARY[lower]) {
    return DICTIONARY[lower];
  }

  // Check for common size formats: e.g. "500ml", "1kg", "2l", "250g"
  const sizeMatch = lower.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc|s)?$/);
  if (sizeMatch) {
    const num = sizeMatch[1];
    const unit = sizeMatch[2];
    if (!unit) return num;
    if (unit === 'kg') return `${num}ކގ`;
    if (unit === 'g') return `${num}ގްރާމް`;
    if (unit === 'l') return `${num}ލީޓަރު`;
    if (unit === 'ml') return `${num}އެމްއެލް`;
    if (unit === 'pcs' || unit === 'pc') return `${num}އެތި`;
    return token;
  }

  // If contains pure numbers or special symbols, preserve as-is
  if (/^[\d#\-./]+$/.test(token)) {
    return token;
  }

  // Phonetic transliteration
  return transliterateEnglishToThaana(token);
}
