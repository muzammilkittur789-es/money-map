export type PaymentMode = 'ONLINE' | 'CASH';

export type UpiProvider = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM' | 'GENERIC_UPI';

export type ExpenseScope = 'PERSONAL' | 'FAMILY';

export type ExpenseCategory =
  | 'Groceries'
  | 'Dining & Food'
  | 'Transport & Fuel'
  | 'Bills & Utilities'
  | 'Shopping'
  | 'Health & Medical'
  | 'Education'
  | 'Home & Maintenance'
  | 'Other';

export type InflowCategory =
  | 'Salary'
  | 'Business & Freelance'
  | 'Rental Income'
  | 'Gifts & Pocket Money'
  | 'Investments & Returns'
  | 'Refunds & Cashback'
  | 'Other Inflow';

export type InflowChannel = 'BANK_UPI' | 'CASH';

export type AppTab = 'EXPENSES' | 'INFLOW_SAVINGS';

export interface FamilyMember {
  id: string;
  name: string;
  phone?: string;
  role: 'HEAD' | 'MEMBER';
  avatar: string;
  color: string;
  isCurrentUser?: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  inviteCode: string;
  adminCode?: string;
  activeAdminDeviceId?: string | null;
  activeAdminName?: string | null;
  activeAdminAt?: string | null;
  monthlyBudget: number;
  members: FamilyMember[];
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  upiProvider?: UpiProvider;
  payeeUpiId?: string;
  payeeName?: string;
  scope: ExpenseScope;
  spentBy: FamilyMember;
  date: string; // ISO string
  notes?: string;
  status: 'COMPLETED' | 'PENDING';
}

export interface InflowItem {
  id: string;
  title: string;
  amount: number;
  category: InflowCategory;
  channel: InflowChannel;
  scope: ExpenseScope;
  receivedBy: FamilyMember;
  date: string; // ISO string
  notes?: string;
}

export interface ParsedUpiData {
  payeeUpiId: string;
  payeeName: string;
  amount?: number;
  currency: string;
  merchantCode?: string;
  suggestedCategory?: ExpenseCategory;
  rawUrl: string;
}

export type TimeFilter = 'WEEK' | 'TODAY' | 'MONTH' | 'YEAR' | 'ALL';
