import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, FamilyGroup, FamilyMember, InflowItem } from '../types';

const STORAGE_KEYS = {
  SUPABASE_URL: '@money_map/supabase_url',
  SUPABASE_ANON_KEY: '@money_map/supabase_anon_key',
};

// Default placeholder or configured credentials
let supabaseClient: SupabaseClient | null = null;

export async function getSupabaseCredentials(): Promise<{ url: string; anonKey: string } | null> {
  try {
    const url = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const anonKey = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    if (url && anonKey) {
      return { url, anonKey };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSupabaseCredentials(url: string, anonKey: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
    await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey.trim());
    supabaseClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: false,
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to save Supabase credentials:', error);
    return false;
  }
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (supabaseClient) return supabaseClient;

  const creds = await getSupabaseCredentials();
  if (creds) {
    supabaseClient = createClient(creds.url, creds.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    return supabaseClient;
  }

  return null;
}

/**
 * Upload an expense to the cloud family pool
 */
export async function syncExpenseToCloud(expense: Expense, familyGroupId: string): Promise<boolean> {
  // Only sync if expense is designated for the family pool
  if (expense.scope !== 'FAMILY') return true;

  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('expenses').upsert({
      id: expense.id,
      family_group_id: familyGroupId,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      payment_mode: expense.paymentMode,
      upi_provider: expense.upiProvider,
      payee_name: expense.payeeName,
      payee_upi_id: expense.payeeUpiId,
      scope: expense.scope,
      spent_by_id: expense.spentBy.id,
      spent_by_name: expense.spentBy.name,
      spent_by_avatar: expense.spentBy.avatar,
      notes: expense.notes,
      date: expense.date,
    });

    if (error) {
      console.warn('Cloud sync error for expense:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error syncing expense:', err);
    return false;
  }
}

/**
 * Upload an inflow item to the cloud family pool
 */
export async function syncInflowToCloud(inflow: InflowItem, familyGroupId: string): Promise<boolean> {
  if (inflow.scope !== 'FAMILY') return true;

  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('inflows').upsert({
      id: inflow.id,
      family_group_id: familyGroupId,
      title: inflow.title,
      amount: inflow.amount,
      category: inflow.category,
      channel: inflow.channel,
      scope: inflow.scope,
      received_by_id: inflow.receivedBy.id,
      received_by_name: inflow.receivedBy.name,
      received_by_avatar: inflow.receivedBy.avatar,
      notes: inflow.notes,
      date: inflow.date,
    });

    if (error) {
      console.warn('Cloud sync error for inflow:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error syncing inflow:', err);
    return false;
  }
}

/**
 * Fetch all family expenses from the cloud
 */
export async function fetchCloudFamilyExpenses(familyGroupId: string): Promise<Expense[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('family_group_id', familyGroupId)
      .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      amount: parseFloat(row.amount),
      category: row.category,
      paymentMode: row.payment_mode,
      upiProvider: row.upi_provider,
      payeeName: row.payee_name,
      payeeUpiId: row.payee_upi_id,
      scope: row.scope,
      spentBy: {
        id: row.spent_by_id,
        name: row.spent_by_name,
        role: 'MEMBER',
        avatar: row.spent_by_avatar || '👤',
        color: '#059669',
      },
      date: row.date,
      notes: row.notes,
      status: 'COMPLETED',
    }));
  } catch {
    return [];
  }
}

/**
 * Join an existing family group using the 6-digit invite code
 */
export async function joinFamilyGroupByCode(
  inviteCode: string,
  joiningUser: FamilyMember
): Promise<FamilyGroup | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  try {
    const { data: groupData, error } = await supabase
      .from('family_groups')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single();

    if (error || !groupData) return null;

    // Add user to family_members table in cloud
    await supabase.from('family_members').upsert({
      id: joiningUser.id,
      family_group_id: groupData.id,
      name: joiningUser.name,
      avatar: joiningUser.avatar,
      role: 'MEMBER',
    });

    // Fetch all current members in this group
    const { data: membersData } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_group_id', groupData.id);

    const members: FamilyMember[] = membersData
      ? membersData.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role || 'MEMBER',
          avatar: m.avatar || '👤',
          color: '#3B82F6',
          isCurrentUser: m.id === joiningUser.id,
        }))
      : [joiningUser];

    return {
      id: groupData.id,
      name: groupData.name,
      inviteCode: groupData.invite_code,
      monthlyBudget: parseFloat(groupData.monthly_budget) || 35000,
      members,
      createdAt: groupData.created_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Register or update family group in the cloud
 */
export async function syncFamilyGroupToCloud(group: FamilyGroup): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    await supabase.from('family_groups').upsert({
      id: group.id,
      name: group.name,
      invite_code: group.inviteCode,
      monthly_budget: group.monthlyBudget,
    });

    for (const member of group.members) {
      await supabase.from('family_members').upsert({
        id: member.id,
        family_group_id: group.id,
        name: member.name,
        avatar: member.avatar,
        role: member.role,
      });
    }

    return true;
  } catch {
    return false;
  }
}
