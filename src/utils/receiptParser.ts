import { ExpenseCategory } from '../types';

export interface ParsedItem {
  id: string;
  name: string;
  price: number;
  category: ExpenseCategory;
  selected: boolean;
}

export interface OrderReceipt {
  storeName: string;
  orderNumber?: string;
  date: string;
  items: ParsedItem[];
  total: number;
}

const CATEGORY_KEYWORD_RULES: { keywords: string[]; category: ExpenseCategory }[] = [
  {
    category: 'Groceries',
    keywords: [
      'milk', 'bread', 'butter', 'oil', 'dal', 'rice', 'atta', 'flour', 'tea', 'sugar',
      'vegetable', 'tomato', 'potato', 'onion', 'fruit', 'apple', 'banana', 'paneer',
      'curd', 'yogurt', 'cheese', 'egg', 'spice', 'masala', 'biscuit', 'maggi', 'noodle',
      'water', 'juice', 'ghee', 'salt', 'chips', 'snack', 'almond', 'cashew',
    ],
  },
  {
    category: 'Home & Maintenance',
    keywords: [
      'detergent', 'surf', 'washing', 'powder', 'dishwash', 'vim', 'harpic', 'cleaner',
      'mop', 'brush', 'broom', 'soap', 'shampoo', 'conditioner', 'garbage', 'bag', 'foil',
      'tissue', 'napkin', 'sponge', 'rin', 'ariel', 'tide', 'colgate', 'toothpaste',
    ],
  },
  {
    category: 'Health & Medical',
    keywords: [
      'tablet', 'syrup', 'paracetamol', 'dolo', 'medicine', 'balm', 'ointment', 'bandage',
      'dettol', 'savlon', 'antiseptic', 'vitamin', 'calcium', 'capsule', 'mask', 'thermometer',
      'crocin', 'cough', 'drops', 'strips', 'sanitizer', 'cotton',
    ],
  },
  {
    category: 'Education',
    keywords: [
      'book', 'notebook', 'pen', 'pencil', 'eraser', 'sharpener', 'scale', 'geometry',
      'classmate', 'marker', 'highlighter', 'stationery', 'paper', 'stapler', 'calculator',
      'dictionary', 'guide', 'register',
    ],
  },
  {
    category: 'Dining & Food',
    keywords: [
      'pizza', 'burger', 'biryani', 'sandwich', 'roll', 'momo', 'thali', 'coffee', 'tea',
      'dessert', 'cake', 'pastry', 'coke', 'pepsi', 'meal', 'combo', 'gravy', 'curry',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'shirt', 't-shirt', 'pant', 'trousers', 'jeans', 'kurti', 'saree', 'shoe', 'sneaker',
      'slipper', 'sandal', 'socks', 'jacket', 'hoodie', 'watch', 'belt', 'wallet', 'bag',
      'backpack', 'perfume', 'deodorant', 'case', 'cover', 'sunglasses',
    ],
  },
  {
    category: 'Bills & Utilities',
    keywords: [
      'bulb', 'led', 'cable', 'charger', 'adapter', 'wire', 'battery', 'plug', 'switch',
      'torch', 'extension',
    ],
  },
];

export function autoDetectCategory(itemName: string): ExpenseCategory {
  const lower = itemName.toLowerCase();

  for (const rule of CATEGORY_KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return rule.category;
      }
    }
  }

  return 'Shopping'; // Default for online orders
}

/**
 * Demo sample receipts mimicking real Amazon, Blinkit, and Flipkart invoices
 */
export const DEMO_RECEIPTS: Record<string, OrderReceipt> = {
  blinkit: {
    storeName: 'Blinkit (Quick Delivery)',
    orderNumber: 'BLK-928410',
    date: new Date().toLocaleDateString('en-IN'),
    total: 1045,
    items: [
      {
        id: 'item_1',
        name: 'Amul Taaza Homogenised Toned Milk (1L)',
        price: 74,
        category: 'Groceries',
        selected: true,
      },
      {
        id: 'item_2',
        name: 'Surf Excel Matic Liquid Detergent Refill (1L)',
        price: 240,
        category: 'Home & Maintenance',
        selected: true,
      },
      {
        id: 'item_3',
        name: 'Classmate 6-Subject Spiral Notebook',
        price: 185,
        category: 'Education',
        selected: true,
      },
      {
        id: 'item_4',
        name: 'Dolo 650mg Paracetamol Strips (Pack of 15)',
        price: 34,
        category: 'Health & Medical',
        selected: true,
      },
      {
        id: 'item_5',
        name: 'Tata Tea Gold Leaf Tea (500g)',
        price: 310,
        category: 'Groceries',
        selected: true,
      },
      {
        id: 'item_6',
        name: 'Dettol Original Germ Protection Soap (Pack of 4)',
        price: 202,
        category: 'Home & Maintenance',
        selected: true,
      },
    ],
  },
  amazon: {
    storeName: 'Amazon India Order',
    orderNumber: '402-9812401-81726',
    date: new Date().toLocaleDateString('en-IN'),
    total: 2179,
    items: [
      {
        id: 'amz_1',
        name: 'US Polo Assn. Men Solid Slim Fit Cotton T-Shirt',
        price: 899,
        category: 'Shopping',
        selected: true,
      },
      {
        id: 'amz_2',
        name: 'Atomic Habits Book by James Clear (Paperback)',
        price: 430,
        category: 'Education',
        selected: true,
      },
      {
        id: 'amz_3',
        name: 'Portronics Fast USB-C Charging Cable (65W, Braided)',
        price: 299,
        category: 'Bills & Utilities',
        selected: true,
      },
      {
        id: 'amz_4',
        name: 'Himalayan Organic Kashmiri Green Tea (100g)',
        price: 349,
        category: 'Groceries',
        selected: true,
      },
      {
        id: 'amz_5',
        name: 'Fastrack Aviator Sunglasses for Men',
        price: 202,
        category: 'Shopping',
        selected: true,
      },
    ],
  },
};

/**
 * Parse text lines (e.g. from clipboard or OCR) into structured items
 */
export function parseReceiptText(rawText: string): ParsedItem[] {
  const lines = rawText.split('\n');
  const items: ParsedItem[] = [];

  // Regex to match "Item name ... [₹ or Rs] 450" or "Item name 450.00"
  const priceRegex = /(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/i;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length < 3) return;

    const match = trimmed.match(priceRegex);
    if (match && match[1]) {
      const price = parseFloat(match[1]);
      if (price > 0 && price < 1000000) {
        const namePart = trimmed.replace(match[0], '').trim();
        const itemName = namePart.replace(/^[-*•\d+.\s]+/, '').trim() || `Item #${index + 1}`;
        const category = autoDetectCategory(itemName);

        items.push({
          id: `parsed_${Date.now()}_${index}`,
          name: itemName,
          price,
          category,
          selected: true,
        });
      }
    }
  });

  return items;
}
