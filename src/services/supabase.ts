import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, FamilyGroup, FamilyMember, InflowItem } from '../types';

const STORAGE_KEYS = {
  SUPABASE_URL: '@money_map/supabase_url',
  SUPABASE_ANON_KEY: '@money_map/supabase_anon_key',
};

// Default baked-in Supabase cloud credentials for seamless multi-phone sync
export const DEFAULT_SUPABASE_URL = 'https://cngnywqdtsbxwjytcxgl.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuZ255d3FkdHNieHdqeXRjeGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMDY3MDUsImV4cCI6MjEwOTc4MjcwNX0.YcHhcdC8qH-UWrGhFRURa-DzHpzwl6H3baWEaCSPz1I';

let supabaseClient: SupabaseClient | null = null;

function sanitizeSupabaseUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim();
  // Remove /rest/v1 or trailing slashes
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export async function getSupabaseCredentials(): Promise<{ url: string; anonKey: string }> {
  try {
    const url = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const anonKey = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    if (url && anonKey) {
      return { url: sanitizeSupabaseUrl(url), anonKey };
    }
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  } catch {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }
}

export async function saveSupabaseCredentials(url: string, anonKey: string): Promise<boolean> {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = anonKey.trim();

    await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
    await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);
    supabaseClient = createClient(cleanUrl, cleanKey, {
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

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseClient) return supabaseClient;

  const creds = await getSupabaseCredentials();
  supabaseClient = createClient(creds.url, creds.anonKey, {
    auth: {
      persistSession: false,
    },
  });
  return supabaseClient;
}

/**
 * Upload an expense to the cloud family pool
 */
export async function syncExpenseToCloud(
  expense: Expense,
  familyGroupId: string,
  groupName = 'Our Family',
  inviteCode = 'FAM78601'
): Promise<boolean> {
  // Only sync if expense is designated for the family pool
  if (expense.scope !== 'FAMILY') return true;

  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    // 1. Ensure the parent family group exists in DB first (avoids foreign key constraint error)
    await supabase.from('family_groups').upsert({
      id: familyGroupId,
      name: groupName,
      invite_code: inviteCode,
    });

    // 2. Upsert the expense
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
      spent_by_id: expense.spentBy?.id || 'user_1',
      spent_by_name: expense.spentBy?.name || 'Myself',
      spent_by_avatar: expense.spentBy?.avatar || '👤',
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
export async function syncInflowToCloud(
  inflow: InflowItem,
  familyGroupId: string,
  groupName = 'Our Family',
  inviteCode = 'FAM78601'
): Promise<boolean> {
  if (inflow.scope !== 'FAMILY') return true;

  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    // Ensure parent family group exists
    await supabase.from('family_groups').upsert({
      id: familyGroupId,
      name: groupName,
      invite_code: inviteCode,
    });

    const { error } = await supabase.from('inflows').upsert({
      id: inflow.id,
      family_group_id: familyGroupId,
      title: inflow.title,
      amount: inflow.amount,
      category: inflow.category,
      channel: inflow.channel,
      scope: inflow.scope,
      received_by_id: inflow.receivedBy?.id || 'user_1',
      received_by_name: inflow.receivedBy?.name || 'Myself',
      received_by_avatar: inflow.receivedBy?.avatar || '👤',
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
 * Fetch all family inflows from the cloud
 */
export async function fetchCloudFamilyInflows(familyGroupId: string): Promise<InflowItem[]> {
  const supabase = await getSupabase();

  try {
    const { data, error } = await supabase
      .from('inflows')
      .select('*')
      .eq('family_group_id', familyGroupId)
      .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      amount: parseFloat(row.amount),
      category: row.category,
      channel: row.channel,
      scope: row.scope,
      receivedBy: {
        id: row.received_by_id,
        name: row.received_by_name,
        role: 'MEMBER',
        avatar: row.received_by_avatar || 'default',
        color: '#10B981',
      },
      date: row.date,
      notes: row.notes,
    }));
  } catch {
    return [];
  }
}

export async function deleteCloudExpense(expenseId: string): Promise<boolean> {
  const supabase = await getSupabase();
  try {
    await supabase.from('expenses').delete().eq('id', expenseId);
    return true;
  } catch {
    return false;
  }
}

export async function deleteCloudInflow(inflowId: string): Promise<boolean> {
  const supabase = await getSupabase();
  try {
    await supabase.from('inflows').delete().eq('id', inflowId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch all members of a family group from the cloud
 */
export async function fetchCloudFamilyMembers(familyGroupId: string): Promise<FamilyMember[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_group_id', familyGroupId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return [];

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role || 'MEMBER',
      avatar: row.avatar || 'default',
      color: row.role === 'HEAD' ? '#059669' : '#3B82F6',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch full family group metadata & members from the cloud
 */
export async function fetchCloudFamilyGroup(familyGroupId: string): Promise<FamilyGroup | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;

  try {
    const { data: groupData, error: groupErr } = await supabase
      .from('family_groups')
      .select('*')
      .eq('id', familyGroupId)
      .single();

    if (groupErr || !groupData) return null;

    const members = await fetchCloudFamilyMembers(familyGroupId);

    return {
      id: groupData.id,
      name: groupData.name,
      inviteCode: groupData.invite_code || 'FAM78601',
      adminCode: groupData.admin_code || 'FAM78699',
      activeAdminDeviceId: groupData.active_admin_device_id || null,
      activeAdminName: groupData.active_admin_name || null,
      activeAdminAt: groupData.active_admin_at || null,
      monthlyBudget: parseFloat(groupData.monthly_budget) || 35000,
      members,
      createdAt: groupData.created_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Mutual Exclusivity Admin Mutex:
 * Attempts to claim exclusive admin rights on the family group.
 * If another phone is currently holding the admin session, rejects the request.
 */
export async function claimAdminSession(
  familyGroupId: string,
  deviceId: string,
  adminName: string,
  enteredCode: string
): Promise<{ success: boolean; message?: string; group?: FamilyGroup; currentAdminName?: string }> {
  const supabase = await getSupabase();
  if (!supabase) {
    return { success: false, message: 'Cloud database connection is currently unavailable.' };
  }

  try {
    // 1. Fetch current live group state directly from Supabase
    const { data: groupData, error } = await supabase
      .from('family_groups')
      .select('*')
      .eq('id', familyGroupId)
      .single();

    if (error || !groupData) {
      return { success: false, message: 'Could not locate family group in the cloud.' };
    }

    const cloudAdminCode = (groupData.admin_code || 'FAM78699').trim().toUpperCase();
    const cleanEntered = enteredCode.trim().toUpperCase();

    // 2. Validate admin code
    if (cleanEntered !== cloudAdminCode) {
      return {
        success: false,
        message: 'Incorrect Admin Security Code. Please enter the current universal family admin code.',
      };
    }

    // 3. Mutual Exclusivity Mutex Check:
    // If active_admin_device_id is set to a different device, check if session is still active
    const activeDeviceId = groupData.active_admin_device_id;
    const activeAdminName = groupData.active_admin_name || 'Another Household Member';
    const activeAt = groupData.active_admin_at ? new Date(groupData.active_admin_at).getTime() : 0;
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    if (activeDeviceId && activeDeviceId !== deviceId) {
      // Check if session has expired (> 2 hours without renewal)
      const isExpired = now - activeAt > TWO_HOURS_MS;
      if (!isExpired) {
        return {
          success: false,
          currentAdminName: activeAdminName,
          message: `Admin access is currently locked to "${activeAdminName}". Only ONE universal admin can be active at a time to prevent conflicting changes. Ask them to lock admin controls, or choose "Take Over Session" if that device is inactive.`,
        };
      }
    }

    // 4. Claim the mutex lock in Supabase
    const timestamp = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('family_groups')
      .update({
        active_admin_device_id: deviceId,
        active_admin_name: adminName.trim() || 'Admin Phone',
        active_admin_at: timestamp,
      })
      .eq('id', familyGroupId);

    if (updateErr) {
      return { success: false, message: 'Failed to acquire admin lock. Please try again.' };
    }

    const fullGroup = await fetchCloudFamilyGroup(familyGroupId);
    return { success: true, group: fullGroup || undefined };
  } catch (err) {
    console.warn('Error claiming admin session:', err);
    return { success: false, message: 'Network error while validating admin session.' };
  }
}

/**
 * Force takeover of admin session (if previous device died, closed app without locking, etc.)
 */
export async function forceTakeoverAdminSession(
  familyGroupId: string,
  deviceId: string,
  adminName: string,
  enteredCode: string
): Promise<{ success: boolean; message?: string; group?: FamilyGroup }> {
  const supabase = await getSupabase();
  if (!supabase) return { success: false, message: 'Cloud connection unavailable.' };

  try {
    const { data: groupData } = await supabase
      .from('family_groups')
      .select('admin_code')
      .eq('id', familyGroupId)
      .single();

    const cloudAdminCode = (groupData?.admin_code || 'FAM78699').trim().toUpperCase();
    if (enteredCode.trim().toUpperCase() !== cloudAdminCode) {
      return { success: false, message: 'Incorrect Admin Security Code.' };
    }

    const timestamp = new Date().toISOString();
    await supabase
      .from('family_groups')
      .update({
        active_admin_device_id: deviceId,
        active_admin_name: adminName.trim() || 'Admin Phone',
        active_admin_at: timestamp,
      })
      .eq('id', familyGroupId);

    const fullGroup = await fetchCloudFamilyGroup(familyGroupId);
    return { success: true, group: fullGroup || undefined };
  } catch (err) {
    return { success: false, message: 'Failed to take over admin session.' };
  }
}

/**
 * Release admin lock when the admin logs out or locks controls
 */
export async function releaseAdminSession(
  familyGroupId: string,
  deviceId: string
): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    await supabase
      .from('family_groups')
      .update({
        active_admin_device_id: null,
        active_admin_name: null,
        active_admin_at: null,
      })
      .eq('id', familyGroupId)
      .eq('active_admin_device_id', deviceId);

    return true;
  } catch {
    return false;
  }
}

/**
 * Update the Universal Admin Security Code across the cloud for all devices
 */
export async function updateCloudAdminCode(
  familyGroupId: string,
  newAdminCode: string
): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    const cleanCode = newAdminCode.trim().toUpperCase();
    const { error } = await supabase
      .from('family_groups')
      .update({ admin_code: cleanCode })
      .eq('id', familyGroupId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Join an existing family group using the 8-digit invite code
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

    // Add user to family_members table in cloud as MEMBER (never override existing HEAD)
    await supabase.from('family_members').upsert({
      id: joiningUser.id,
      family_group_id: groupData.id,
      name: joiningUser.name,
      avatar: 'default',
      role: 'MEMBER',
    });

    // Fetch all current members in this group
    const members = await fetchCloudFamilyMembers(groupData.id);

    return {
      id: groupData.id,
      name: groupData.name,
      inviteCode: groupData.invite_code,
      adminCode: groupData.admin_code || 'FAM78699',
      activeAdminDeviceId: groupData.active_admin_device_id || null,
      activeAdminName: groupData.active_admin_name || null,
      activeAdminAt: groupData.active_admin_at || null,
      monthlyBudget: parseFloat(groupData.monthly_budget) || 35000,
      members: members.length > 0 ? members : [joiningUser],
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
      admin_code: group.adminCode || 'FAM78699',
      monthly_budget: group.monthlyBudget,
    });

    for (const member of group.members) {
      await supabase.from('family_members').upsert({
        id: member.id,
        family_group_id: group.id,
        name: member.name,
        avatar: 'default',
        role: member.role,
      });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all expenses and inflows in the cloud for this family group
 */
export async function clearCloudFamilyRecords(familyGroupId: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    await supabase.from('expenses').delete().eq('family_group_id', familyGroupId);
    await supabase.from('inflows').delete().eq('family_group_id', familyGroupId);
    return true;
  } catch (err) {
    console.warn('Failed to clear cloud records:', err);
    return false;
  }
}

/**
 * Remove a member from the cloud family group
 */
export async function deleteFamilyMemberFromCloud(memberId: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;

  try {
    await supabase.from('family_members').delete().eq('id', memberId);
    return true;
  } catch (err) {
    console.warn('Failed to delete member from cloud:', err);
    return false;
  }
}

/**
 * Real-time WebSocket listener: Auto-refreshes the dashboard within 1 second
 * whenever any family member on any phone logs a new expense or inflow,
 * or when group settings / members / admin session change!
 */
export function subscribeToFamilyUpdates(
  familyGroupId: string,
  onUpdate: () => void
): () => void {
  let activeChannel: any = null;

  getSupabase().then((supabase) => {
    if (!supabase) return;

    activeChannel = supabase
      .channel(`realtime_family_${familyGroupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `family_group_id=eq.${familyGroupId}`,
        },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inflows',
          filter: `family_group_id=eq.${familyGroupId}`,
        },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_groups',
          filter: `id=eq.${familyGroupId}`,
        },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `family_group_id=eq.${familyGroupId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();
  });

  return () => {
    if (activeChannel) {
      getSupabase().then((supabase) => {
        supabase?.removeChannel(activeChannel);
      });
    }
  };
}
