import { InflowCategory } from '../types';

export interface InflowCategoryMeta {
  name: InflowCategory;
  icon: string;
  color: string;
  bgColor: string;
}

export const INFLOW_CATEGORIES: InflowCategoryMeta[] = [
  {
    name: 'Salary',
    icon: 'briefcase-outline',
    color: '#059669', // Emerald
    bgColor: '#ECFDF5',
  },
  {
    name: 'Business & Freelance',
    icon: 'laptop-outline',
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
  },
  {
    name: 'Rental Income',
    icon: 'home-outline',
    color: '#8B5CF6', // Purple
    bgColor: '#F5F3FF',
  },
  {
    name: 'Gifts & Pocket Money',
    icon: 'gift-outline',
    color: '#EC4899', // Pink
    bgColor: '#FDF2F8',
  },
  {
    name: 'Investments & Returns',
    icon: 'trending-up-outline',
    color: '#10B981', // Teal/Green
    bgColor: '#F0FDF4',
  },
  {
    name: 'Refunds & Cashback',
    icon: 'refresh-outline',
    color: '#F59E0B', // Amber
    bgColor: '#FFFBEB',
  },
  {
    name: 'Other Inflow',
    icon: 'cash-outline',
    color: '#64748B', // Slate
    bgColor: '#F8FAFC',
  },
];

export function getInflowCategoryMeta(catName: InflowCategory): InflowCategoryMeta {
  const match = INFLOW_CATEGORIES.find((c) => c.name === catName);
  return (
    match || {
      name: 'Other Inflow',
      icon: 'cash-outline',
      color: '#059669',
      bgColor: '#ECFDF5',
    }
  );
}
