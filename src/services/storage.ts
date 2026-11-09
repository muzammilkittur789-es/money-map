import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, FamilyGroup, FamilyMember, InflowItem } from '../types';
import {
  clearCloudFamilyRecords,
  deleteCloudExpense,
  deleteCloudInflow,
  deleteFamilyMemberFromCloud,
  fetchCloudFamilyExpenses,
  fetchCloudFamilyGroup,
  fetchCloudFamilyInflows,
  syncExpenseToCloud,
  syncFamilyGroupToCloud,
  syncInflowToCloud,
  updateCloudAdminCode,
} from './supabase';

const STORAGE_KEYS = {
  EXPENSES: '@family_expense_tracker/expenses',
  INFLOWS: '@family_expense_tracker/inflows',
  FAMILY_GROUP: '@family_expense_tracker/family_group',
  USER_PROFILE: '@family_expense_tracker/user_profile',
  DEVICE_ID: '@money_map/device_id',
  DEVICE_MEMBER_ID: '@money_map/device_member_id',
  FAMILY_LINKED: '@money_map/family_linked',
  INITIALIZED: '@family_expense_tracker/initialized_v7_clean_solo',
};

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'dev_' + Date.now().toString(36);
  }
}

export async function getDeviceMemberId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_MEMBER_ID);
    if (existing) return existing;

    const rawProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile);
      if (parsed.id && typeof parsed.id === 'string') {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_MEMBER_ID, parsed.id);
        return parsed.id;
      }
    }

    const devId = await getDeviceId();
    const newMemberId = 'user_' + devId.replace('dev_', '');
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_MEMBER_ID, newMemberId);
    return newMemberId;
  } catch {
    return 'user_1';
  }
}

export const CURRENT_USER: FamilyMember = {
  id: 'user_1',
  name: 'Muzammil',
  role: 'HEAD',
  avatar: 'default',
  color: '#059669', // Emerald
  isCurrentUser: true,
};

const DEFAULT_MEMBERS: FamilyMember[] = [
  CURRENT_USER,
];

export const SOLO_GROUP: FamilyGroup = {
  id: 'solo_group',
  name: 'Personal Space',
  inviteCode: '',
  adminCode: '',
  monthlyBudget: 0,
  members: [CURRENT_USER],
  createdAt: new Date().toISOString(),
};

const DEFAULT_FAMILY_GROUP: FamilyGroup = {
  id: 'group_home_1',
  name: 'Our Family',
  inviteCode: 'FAM78601',
  adminCode: 'FAM78699',
  monthlyBudget: 35000,
  members: [
    {
      id: 'user_1',
      name: 'Muzammil',
      role: 'HEAD',
      avatar: 'default',
      color: '#059669',
      isCurrentUser: true,
    },
  ],
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
    // Ensure this device has a persistent unique device ID & member identity
    await getDeviceId();
    const devMemberId = await getDeviceMemberId();
    CURRENT_USER.id = devMemberId;

    const rawProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        if (parsed.name) {
          CURRENT_USER.name = parsed.name;
        }
      } catch {}
    }

    const isInit = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      // Determine if this is the household admin device or a new member install
      const isAdminDevice =
        CURRENT_USER.id === 'user_1' || CURRENT_USER.name?.toLowerCase() === 'muzammil';

      const initialGroup = isAdminDevice ? DEFAULT_FAMILY_GROUP : SOLO_GROUP;
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.INFLOWS, JSON.stringify([]));
      await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_GROUP, JSON.stringify(initialGroup));
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAMILY_LINKED,
        isAdminDevice ? 'true' : 'false'
      );
      await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return { expenses: [], inflows: [], group: initialGroup };
    }

    const rawExpenses = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
    const rawInflows = await AsyncStorage.getItem(STORAGE_KEYS.INFLOWS);
    const rawGroup = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_GROUP);
    const isFamilyLinked = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_LINKED);

    const expenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : [];
    const inflows: InflowItem[] = rawInflows ? JSON.parse(rawInflows) : [];
    let group: FamilyGroup = rawGroup ? JSON.parse(rawGroup) : DEFAULT_FAMILY_GROUP;

    // If device is not admin and has not explicitly joined via invite code, keep it in solo mode
    const isAdminDevice =
      CURRENT_USER.id === 'user_1' || CURRENT_USER.name?.toLowerCase() === 'muzammil';

    if (!isAdminDevice && isFamilyLinked !== 'true') {
      group = SOLO_GROUP;
    }

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
    deleteCloudExpense(id);
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
    deleteCloudInflow(id);
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

export async function syncInflowsFromCloud(familyGroupId: string): Promise<InflowItem[]> {
  try {
    const cloudInflows = await fetchCloudFamilyInflows(familyGroupId);
    if (!cloudInflows || cloudInflows.length === 0) {
      return await getInflows();
    }

    const localInflows = await getInflows();
    const personalInflows = localInflows.filter((i) => i.scope === 'PERSONAL');
    const existingFamilyIds = new Set(cloudInflows.map((c) => c.id));
    const uniqueLocalFamily = localInflows.filter(
      (i) => i.scope === 'FAMILY' && !existingFamilyIds.has(i.id)
    );

    const merged = [...cloudInflows, ...uniqueLocalFamily, ...personalInflows];
    await AsyncStorage.setItem(STORAGE_KEYS.INFLOWS, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.warn('Failed to sync inflows from cloud:', error);
    return await getInflows();
  }
}

/**
 * Synchronize Family Group metadata & members list from Supabase cloud
 */
export async function syncFamilyGroupFromCloud(familyGroupId: string): Promise<FamilyGroup> {
  if (!familyGroupId || familyGroupId === 'solo_group') {
    return await getFamilyGroup();
  }

  try {
    const cloudGroup = await fetchCloudFamilyGroup(familyGroupId);
    if (cloudGroup) {
      const localGroup = await getFamilyGroup();

      const mergedGroup: FamilyGroup = {
        ...localGroup,
        id: cloudGroup.id,
        name: cloudGroup.name || localGroup.name,
        inviteCode: cloudGroup.inviteCode || localGroup.inviteCode,
        adminCode: cloudGroup.adminCode || localGroup.adminCode || 'FAM78699',
        activeAdminDeviceId: cloudGroup.activeAdminDeviceId,
        activeAdminName: cloudGroup.activeAdminName,
        activeAdminAt: cloudGroup.activeAdminAt,
        monthlyBudget: cloudGroup.monthlyBudget || localGroup.monthlyBudget,
        members: cloudGroup.members.length > 0 ? cloudGroup.members : [CURRENT_USER],
      };

      await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_GROUP, JSON.stringify(mergedGroup));
      return mergedGroup;
    }
  } catch (err) {
    console.warn('Failed to sync family group from cloud:', err);
  }
  return await getFamilyGroup();
}

/**
 * Disconnect/Leave family group (returns to personal solo ledger)
 */
export async function leaveFamilyGroup(): Promise<FamilyGroup> {
  try {
    const devMemberId = await getDeviceMemberId();
    await deleteFamilyMemberFromCloud(devMemberId);
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_LINKED, 'false');
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_GROUP, JSON.stringify(SOLO_GROUP));
  } catch {}
  return SOLO_GROUP;
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
  await syncFamilyGroupToCloud(updatedGroup);
  return updatedGroup;
}

export async function deleteFamilyMember(memberId: string): Promise<FamilyGroup> {
  const group = await getFamilyGroup();
  const updatedMembers = group.members.filter((m) => m.id !== memberId);
  const updatedGroup = { ...group, members: updatedMembers };
  await saveFamilyGroup(updatedGroup);
  await deleteFamilyMemberFromCloud(memberId);
  return updatedGroup;
}

export async function updateCurrentUserName(newName: string): Promise<{ user: FamilyMember; group: FamilyGroup }> {
  const trimmed = newName.trim();
  CURRENT_USER.name = trimmed;
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(CURRENT_USER));

  const group = await getFamilyGroup();
  const updatedMembers = group.members.map((m) => {
    if (m.isCurrentUser || m.id === CURRENT_USER.id) {
      return { ...m, name: trimmed };
    }
    return m;
  });
  const updatedGroup = { ...group, members: updatedMembers };
  await saveFamilyGroup(updatedGroup);
  await syncFamilyGroupToCloud(updatedGroup);
  return { user: CURRENT_USER, group: updatedGroup };
}

export async function updateFamilyInviteCode(newCode: string): Promise<FamilyGroup> {
  const group = await getFamilyGroup();
  const updatedGroup = { ...group, inviteCode: newCode.trim().toUpperCase() };
  await saveFamilyGroup(updatedGroup);
  await syncFamilyGroupToCloud(updatedGroup);
  return updatedGroup;
}

export async function updateFamilyAdminCode(newAdminCode: string): Promise<FamilyGroup> {
  const group = await getFamilyGroup();
  const cleanCode = newAdminCode.trim().toUpperCase();
  const updatedGroup = { ...group, adminCode: cleanCode };
  await saveFamilyGroup(updatedGroup);
  await updateCloudAdminCode(group.id, cleanCode);
  return updatedGroup;
}
