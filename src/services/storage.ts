import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, FamilyGroup, FamilyMember, InflowItem } from '../types';
import {
  clearCloudFamilyRecords,
  fetchCloudFamilyExpenses,
  syncExpenseToCloud,
  syncFamilyGroupToCloud,
  syncInflowToCloud,
} from './supabase';

const STORAGE_KEYS = {
  EXPENSES: '@family_expense_tracker/expenses',
  INFLOWS: '@family_expense_tracker/inflows',
  FAMILY_GROUP: '@family_expense_tracker/family_group',
  USER_PROFILE: '@family_expense_tracker/user_profile',
  INITIALIZED: '@family_expense_tracker/initialized_v5_profile_avatar',
};

export const CURRENT_USER: FamilyMember = {
  id: 'user_1',
  name: 'Myself',
  role: 'HEAD',
  avatar: '👨‍💼',
  color: '#059669', // Emerald
  isCurrentUser: true,
};

const DEFAULT_MEMBERS: FamilyMember[] = [
  CURRENT_USER,
  {
    id: 'user_2',
    name: 'Spouse',
    role: 'MEMBER',
    avatar: '👩‍💼',
    color: '#8B5CF6', // Purple
  },
  {
    id: 'user_3',
    name: 'Kid (Allowance)',
    role: 'MEMBER',
    avatar: '👦',
    color: '#F59E0B', // Amber
  },
];

const DEFAULT_FAMILY_GROUP: FamilyGroup = {
  id: 'group_home_1',
  name: 'Our Family',
  inviteCode: 'FAM786',
  monthlyBudget: 35000,
  members: DEFAULT_MEMBERS,
  createdAt: new Date().toISOString(),
};

const SEED_EXPENSES: Expense[] = [];

const SEED_INFLOWS: InflowItem[] = [];

export async function initializeStorage(): Promise<{
  expenses: Expense[];
  inflows: InflowItem[];
  group: FamilyGroup;
}> {
  try {
    const isInit = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.INFLOWS, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_GROUP, JSON.stringify(DEFAULT_FAMILY_GROUP));
      await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      try {
        await clearCloudFamilyRecords(DEFAULT_FAMILY_GROUP.id);
      } catch {
        // Ignore if cloud is offline
      }
      return { expenses: [], inflows: [], group: DEFAULT_FAMILY_GROUP };
    }

    const rawExpenses = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
    const rawInflows = await AsyncStorage.getItem(STORAGE_KEYS.INFLOWS);
    const rawGroup = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_GROUP);

    const expenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : [];
    const inflows: InflowItem[] = rawInflows ? JSON.parse(rawInflows) : [];
    const group: FamilyGroup = rawGroup ? JSON.parse(rawGroup) : DEFAULT_FAMILY_GROUP;

    return { expenses, inflows, group };
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    return { expenses: [], inflows: [], group: DEFAULT_FAMILY_GROUP };
  }
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading expenses:', e);
    return [];
  }
}

export async function saveExpense(expense: Expense): Promise<Expense[]> {
  try {
    const current = await getExpenses();
    const updated = [expense, ...current.filter((e) => e.id !== expense.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));

    // Cloud sync in background for family pool
    if (expense.scope === 'FAMILY') {
      getFamilyGroup().then((group) => {
        syncExpenseToCloud(expense, group.id, group.name, group.inviteCode);
      });
    }

    return updated;
  } catch (e) {
    console.error('Error saving expense:', e);
    return [];
  }
}

export async function deleteExpense(id: string): Promise<Expense[]> {
  try {
    const current = await getExpenses();
    const updated = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting expense:', e);
    return [];
  }
}

export async function getInflows(): Promise<InflowItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.INFLOWS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading inflows:', e);
    return [];
  }
}

export async function saveInflow(item: InflowItem): Promise<InflowItem[]> {
  try {
    const current = await getInflows();
    const updated = [item, ...current.filter((i) => i.id !== item.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.INFLOWS, JSON.stringify(updated));

    // Cloud sync in background for family pool
    if (item.scope === 'FAMILY') {
      getFamilyGroup().then((group) => {
        syncInflowToCloud(item, group.id, group.name, group.inviteCode);
      });
    }

    return updated;
  } catch (e) {
    console.error('Error saving inflow:', e);
    return [];
  }
}

export async function deleteInflow(id: string): Promise<InflowItem[]> {
  try {
    const current = await getInflows();
    const updated = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.INFLOWS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting inflow:', e);
    return [];
  }
}

export async function getFamilyGroup(): Promise<FamilyGroup> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_GROUP);
    return raw ? JSON.parse(raw) : DEFAULT_FAMILY_GROUP;
  } catch (e) {
    console.error('Error reading family group:', e);
    return DEFAULT_FAMILY_GROUP;
  }
}

export async function saveFamilyGroup(group: FamilyGroup): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_GROUP, JSON.stringify(group));
    syncFamilyGroupToCloud(group);
  } catch (e) {
    console.error('Error saving family group:', e);
  }
}

export async function syncFamilyFromCloud(familyGroupId: string): Promise<Expense[]> {
  try {
    const cloudExpenses = await fetchCloudFamilyExpenses(familyGroupId);
    if (!cloudExpenses || cloudExpenses.length === 0) {
      return await getExpenses();
    }

    const localExpenses = await getExpenses();
    // Keep local personal expenses intact, merge cloud family expenses
    const personalExpenses = localExpenses.filter((e) => e.scope === 'PERSONAL');
    const existingFamilyIds = new Set(cloudExpenses.map((c) => c.id));
    const uniqueLocalFamily = localExpenses.filter(
      (e) => e.scope === 'FAMILY' && !existingFamilyIds.has(e.id)
    );

    const merged = [...cloudExpenses, ...uniqueLocalFamily, ...personalExpenses];
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.warn('Failed to sync from cloud:', error);
    return await getExpenses();
  }
}

export async function syncAllToCloud(): Promise<{ success: boolean; count: number }> {
  try {
    const group = await getFamilyGroup();
    await syncFamilyGroupToCloud(group);

    const expenses = await getExpenses();
    const familyExpenses = expenses.filter((e) => e.scope === 'FAMILY');
    for (const exp of familyExpenses) {
      await syncExpenseToCloud(exp, group.id, group.name, group.inviteCode);
    }

    const inflows = await getInflows();
    const familyInflows = inflows.filter((i) => i.scope === 'FAMILY');
    for (const inf of familyInflows) {
      await syncInflowToCloud(inf, group.id, group.name, group.inviteCode);
    }

    return { success: true, count: familyExpenses.length + familyInflows.length };
  } catch (error) {
    console.warn('Sync all to cloud failed:', error);
    return { success: false, count: 0 };
  }
}

export async function clearAllExpensesAndInflows(): Promise<{ success: boolean }> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.INFLOWS, JSON.stringify([]));

    // Also clear from Supabase cloud if connected!
    const group = await getFamilyGroup();
    await clearCloudFamilyRecords(group.id);
    return { success: true };
  } catch (error) {
    console.warn('Failed to clear records:', error);
    return { success: false };
  }
}

export async function addFamilyMember(member: FamilyMember): Promise<FamilyGroup> {
  const group = await getFamilyGroup();
  const updatedMembers = [...group.members, member];
  const updatedGroup = { ...group, members: updatedMembers };
  await saveFamilyGroup(updatedGroup);
  return updatedGroup;
}
