import { Linking, Platform } from 'react-native';
import { ExpenseCategory, ParsedUpiData, UpiProvider } from '../types';

/**
 * Merchant Category Code (MCC) to App Category mapping
 */
const MCC_MAP: Record<string, ExpenseCategory> = {
  // Groceries & Supermarkets
  '5411': 'Groceries',
  '5422': 'Groceries',
  '5441': 'Groceries',
  '5499': 'Groceries',
  // Restaurants & Fast Food
  '5812': 'Dining & Food',
  '5814': 'Dining & Food',
  '5811': 'Dining & Food',
  // Fuel & Transport
  '5541': 'Transport & Fuel',
  '5542': 'Transport & Fuel',
  '4121': 'Transport & Fuel', // Taxicabs & Rides
  '4111': 'Transport & Fuel', // Commuter transport
  // Utilities & Bills
  '4900': 'Bills & Utilities',
  '4814': 'Bills & Utilities', // Telecom
  // Health & Medicine
  '5912': 'Health & Medical', // Drug stores / Pharmacy
  '8011': 'Health & Medical', // Doctors
  '8062': 'Health & Medical', // Hospitals
  // Education
  '8211': 'Education',
  '8220': 'Education',
  // Shopping
  '5311': 'Shopping',
  '5651': 'Shopping',
  '5691': 'Shopping',
};

/**
 * Parse a raw QR scan string into UPI components
 */
export function parseUpiQr(rawString: string): ParsedUpiData | null {
  if (!rawString || typeof rawString !== 'string') return null;

  const trimmed = rawString.trim();

  // Standard UPI URI format: upi://pay?pa=...&pn=...
  if (trimmed.startsWith('upi://pay')) {
    try {
      const url = new URL(trimmed);
      const params = url.searchParams;

      const pa = params.get('pa') || '';
      const pn = params.get('pn') ? decodeURIComponent(params.get('pn')!) : '';
      const am = params.get('am') ? parseFloat(params.get('am')!) : undefined;
      const cu = params.get('cu') || 'INR';
      const mc = params.get('mc') || undefined;

      const suggestedCategory = mc ? MCC_MAP[mc] : undefined;

      return {
        payeeUpiId: pa,
        payeeName: pn || pa,
        amount: isNaN(Number(am)) ? undefined : am,
        currency: cu,
        merchantCode: mc,
        suggestedCategory,
        rawUrl: trimmed,
      };
    } catch {
      // Regex fallback if URL constructor fails with non-standard scheme
      return parseWithRegex(trimmed);
    }
  }

  // Plain UPI ID (e.g., username@okhdfcbank or 9876543210@paytm)
  if (trimmed.includes('@')) {
    return {
      payeeUpiId: trimmed,
      payeeName: trimmed.split('@')[0],
      currency: 'INR',
      rawUrl: `upi://pay?pa=${encodeURIComponent(trimmed)}&pn=${encodeURIComponent(trimmed)}&cu=INR`,
    };
  }

  return null;
}

function parseWithRegex(uri: string): ParsedUpiData | null {
  const getParam = (key: string): string | undefined => {
    const match = uri.match(new RegExp(`[?&]${key}=([^&#]*)`, 'i'));
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : undefined;
  };

  const pa = getParam('pa');
  if (!pa) return null;

  const pn = getParam('pn') || pa;
  const amStr = getParam('am');
  const am = amStr ? parseFloat(amStr) : undefined;
  const mc = getParam('mc');
  const cu = getParam('cu') || 'INR';

  return {
    payeeUpiId: pa,
    payeeName: pn,
    amount: isNaN(Number(am)) ? undefined : am,
    currency: cu,
    merchantCode: mc,
    suggestedCategory: mc ? MCC_MAP[mc] : undefined,
    rawUrl: uri,
  };
}

/**
 * Builds the customized UPI deep link with the entered amount and note
 */
export function buildUpiDeepLink(
  payeeUpiId: string,
  payeeName: string,
  amount: number,
  note?: string,
  provider: UpiProvider = 'GENERIC_UPI'
): string {
  const encodedName = encodeURIComponent(payeeName.trim() || 'Merchant');
  const encodedNote = encodeURIComponent(note?.trim() || 'Payment via Family Expense Tracker');
  const query = `pa=${encodeURIComponent(payeeUpiId.trim())}&pn=${encodedName}&am=${amount.toFixed(2)}&cu=INR&tn=${encodedNote}`;

  switch (provider) {
    case 'PHONEPE':
      // PhonePe Android scheme
      return Platform.OS === 'android' ? `phonepe://upi/pay?${query}` : `upi://pay?${query}`;
    case 'GPAY':
      // Google Pay Tez scheme
      return Platform.OS === 'android' ? `tez://upi/pay?${query}` : `upi://pay?${query}`;
    case 'PAYTM':
      // Paytm scheme
      return Platform.OS === 'android' ? `paytmmp://pay?${query}` : `upi://pay?${query}`;
    default:
      // Standard generic UPI intent chooser
      return `upi://pay?${query}`;
  }
}

/**
 * Trigger launch of the chosen payment app
 */
export async function launchPaymentApp(
  payeeUpiId: string,
  payeeName: string,
  amount: number,
  note?: string,
  provider: UpiProvider = 'GENERIC_UPI'
): Promise<boolean> {
  const uri = buildUpiDeepLink(payeeUpiId, payeeName, amount, note, provider);

  try {
    const supported = await Linking.canOpenURL(uri).catch(() => true);
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      // Fallback to generic upi://pay
      const genericUri = buildUpiDeepLink(payeeUpiId, payeeName, amount, note, 'GENERIC_UPI');
      await Linking.openURL(genericUri);
      return true;
    }
  } catch (error) {
    console.warn('Failed to open specific UPI provider, trying generic upi://', error);
    try {
      const fallbackUri = `upi://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
      await Linking.openURL(fallbackUri);
      return true;
    } catch (fallbackError) {
      console.error('Failed to open any UPI app', fallbackError);
      return false;
    }
  }
}
