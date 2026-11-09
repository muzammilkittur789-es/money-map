import { ExpenseCategory } from '../types';

export interface CategoryMeta {
  name: ExpenseCategory;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    name: 'Groceries',
    icon: 'cart-outline',
    color: '#10B981', // Emerald
    bgColor: '#ECFDF5',
  },
  {
    name: 'Dining & Food',
    icon: 'restaurant-outline',
    color: '#F59E0B', // Amber
    bgColor: '#FFFBEB',
  },
  {
    name: 'Transport & Fuel',
    icon: 'car-outline',
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
  },
  {
    name: 'Bills & Utilities',
    icon: 'flash-outline',
    color: '#8B5CF6', // Purple
    bgColor: '#F5F3FF',
  },
  {
    name: 'Shopping',
    icon: 'bag-handle-outline',
    color: '#EC4899', // Pink
    bgColor: '#FDF2F8',
  },
  {
    name: 'Health & Medical',
    icon: 'medkit-outline',
    color: '#EF4444', // Red
    bgColor: '#FEF2F2',
  },
  {
    name: 'Education',
    icon: 'school-outline',
    color: '#06B6D4', // Cyan
    bgColor: '#ECFEFF',
  },
  {
    name: 'Home & Maintenance',
    icon: 'home-outline',
    color: '#6366F1', // Indigo
    bgColor: '#EEF2FF',
  },
  {
    name: 'Leisure & Entertainment',
    icon: 'game-controller-outline',
    color: '#14B8A6', // Teal
    bgColor: '#F0FDFA',
  },
  {
    name: 'Other',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#64748B', // Slate
    bgColor: '#F8FAFC',
  },
];

export function getCategoryMeta(categoryName: ExpenseCategory): CategoryMeta {
  const match = CATEGORIES.find((c) => c.name === categoryName);
  return (
    match || {
      name: 'Other',
      icon: 'receipt-outline',
      color: '#64748B',
      bgColor: '#F1F5F9',
    }
  );
}
