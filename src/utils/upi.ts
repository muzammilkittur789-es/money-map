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
 * Parse a raw QR scan string into UPI components, preserving all raw parameters
 */
export function parseUpiQr(rawString: string): ParsedUpiData | null {
  if (!rawString || typeof rawString !== 'string') return null;

  const trimmed = rawString.trim();
  const lower = trimmed.toLowerCase();

  // Check if string contains standard UPI scheme (upi://pay...)
  const upiIndex = lower.indexOf('upi://pay');
  if (upiIndex !== -1) {
    const upiUri = trimmed.substring(upiIndex);
    const rawParams = extractQueryParams(upiUri);

    const pa = rawParams['pa']?.trim() || '';
    if (!pa) return null;

    const pn = rawParams['pn'] || pa;
    const amStr = rawParams['am'];
    const am = amStr ? parseFloat(amStr) : undefined;
    const cu = rawParams['cu'] || 'INR';
    const mc = rawParams['mc'];
    const suggestedCategory = mc ? MCC_MAP[mc] : undefined;

    return {
      payeeUpiId: pa,
      payeeName: pn,
      amount: isNaN(Number(am)) ? undefined : am,
      currency: cu,
      merchantCode: mc,
      suggestedCategory,
      rawParams,
      rawUrl: trimmed,
    };
  }

  // Plain UPI ID (e.g., username@okhdfcbank or 9876543210@paytm)
  if (trimmed.includes('@') && !trimmed.includes(' ') && !trimmed.includes('http')) {
    const pa = trimmed;
    const pn = trimmed.split('@')[0];
    const rawParams: Record<string, string> = {
      pa,
      pn,
      cu: 'INR',
    };

    return {
      payeeUpiId: pa,
      payeeName: pn,
      currency: 'INR',
      rawParams,
      rawUrl: `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&cu=INR`,
    };
  }

  return null;
}

/**
 * Robust query parameter extractor that handles standard & non-standard URI formats
 */
function extractQueryParams(uri: string): Record<string, string> {
  const params: Record<string, string> = {};
  const queryIndex = uri.indexOf('?');
  if (queryIndex === -1) return params;

  const queryString = uri.substring(queryIndex + 1);
  const pairs = queryString.split('&');
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      const rawKey = pair.substring(0, eqIdx).trim();
      const rawVal = pair.substring(eqIdx + 1).trim();
      if (!rawKey) continue;
      // Store keys normalized to lower-case for predictable lookup
      const key = rawKey.toLowerCase();
      let decodedVal = rawVal;
      try {
        decodedVal = decodeURIComponent(rawVal.replace(/\+/g, ' '));
      } catch {
        decodedVal = rawVal;
      }
      params[key] = decodedVal;
    }
  }
  return params;
}

/**
 * Builds the compliant UPI deep link.
 * Preserves all original merchant parameters (mc, mode, orgid, tr, mid, msid, mtid, sign)
 * and ensures payee UPI ID keeps the literal '@' character to prevent bank gateway rejections.
 */
export function buildUpiDeepLink(
  payeeUpiId: string,
  payeeName: string,
  amount: number,
  note?: string,
  provider: UpiProvider = 'GENERIC_UPI',
  rawParams?: Record<string, string>
): string {
  // Merge scanned parameters so all merchant attributes are preserved
  const merged: Record<string, string> = { ...(rawParams || {}) };

  // 1. Payee VPA
  merged['pa'] = payeeUpiId.trim();

  // 2. Payee Name
  if (payeeName && payeeName.trim()) {
    merged['pn'] = payeeName.trim();
  } else if (!merged['pn']) {
    merged['pn'] = merged['pa'];
  }

  // 3. Amount & Currency
  if (amount > 0) {
    merged['am'] = amount.toFixed(2);
  }
  if (!merged['cu']) {
    merged['cu'] = 'INR';
  }

  // 4. Note (Keep original merchant note if present, or override with user note if typed)
  if (note && note.trim()) {
    merged['tn'] = note.trim();
  }

  // Build query string ensuring 'pa' has literal '@' (NOT '%40' which breaks bank PSP validation)
  const queryParts: string[] = [];

  // Mandatory / Primary params in standard order
  const safePa = merged['pa'].replace(/\s+/g, '');
  queryParts.push(`pa=${safePa}`);
  queryParts.push(`pn=${encodeURIComponent(merged['pn'])}`);

  if (merged['mc']) {
    queryParts.push(`mc=${encodeURIComponent(merged['mc'])}`);
  }
  if (merged['tr']) {
    queryParts.push(`tr=${encodeURIComponent(merged['tr'])}`);
  }
  if (merged['am']) {
    queryParts.push(`am=${merged['am']}`);
  }
  if (merged['cu']) {
    queryParts.push(`cu=${encodeURIComponent(merged['cu'])}`);
  }

  // Append all remaining preserved parameters (mode, orgid, mid, msid, mtid, sign, url, tn, etc.)
  const handledKeys = new Set(['pa', 'pn', 'mc', 'tr', 'am', 'cu']);
  for (const [key, val] of Object.entries(merged)) {
    if (!handledKeys.has(key) && val !== undefined && val !== null && val !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }

  const query = queryParts.join('&');

  // Check if this is an offline/physical merchant QR
  const isMerchantQr = Boolean(merged['mc'] || merged['mode'] || merged['orgid']);

  switch (provider) {
    case 'PHONEPE':
      // PhonePe registers phonepe://pay and upi://pay on Android
      return Platform.OS === 'android' ? `phonepe://pay?${query}` : `upi://pay?${query}`;

    case 'GPAY':
      // CRITICAL: tez:// is Google Pay's web-checkout gateway scheme. When invoked with offline
      // merchant QRs (mode=02 or merchant MCC), Google Pay actively blocks it with
      // "Merchant is facing bank issue". Standard upi://pay correctly routes through NPCI rails.
      if (Platform.OS === 'android' && !isMerchantQr) {
        return `tez://upi/pay?${query}`;
      }
      return `upi://pay?${query}`;

    case 'PAYTM':
      return Platform.OS === 'android' ? `paytmmp://pay?${query}` : `upi://pay?${query}`;

    case 'GENERIC_UPI':
    default:
      // Standard NPCI UPI URI - universally supported by all apps on Android & iOS
      return `upi://pay?${query}`;
  }
}

/**
 * Trigger launch of the chosen payment app with full merchant parameter preservation
 */
export async function launchPaymentApp(
  payeeUpiId: string,
  payeeName: string,
  amount: number,
  note?: string,
  provider: UpiProvider = 'GENERIC_UPI',
  rawParams?: Record<string, string>,
  _rawUrl?: string
): Promise<boolean> {
  const primaryUri = buildUpiDeepLink(payeeUpiId, payeeName, amount, note, provider, rawParams);
  const genericUri = buildUpiDeepLink(payeeUpiId, payeeName, amount, note, 'GENERIC_UPI', rawParams);

  try {
    const supported = await Linking.canOpenURL(primaryUri).catch(() => true);
    if (supported) {
      await Linking.openURL(primaryUri);
      return true;
    } else {
      // Fallback to standard NPCI upi://pay
      await Linking.openURL(genericUri);
      return true;
    }
  } catch (error) {
    console.warn('Failed to open primary UPI provider, falling back to generic upi://', error);
    try {
      await Linking.openURL(genericUri);
      return true;
    } catch (fallbackError) {
      console.error('Failed to open any UPI payment app', fallbackError);
      return false;
    }
  }
}
