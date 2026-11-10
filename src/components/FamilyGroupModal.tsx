import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FamilyGroup, FamilyMember } from '../types';
import {
  claimAdminSession,
  forceTakeoverAdminSession,
  getSupabaseCredentials,
  joinFamilyGroupByCode,
  releaseAdminSession,
  saveSupabaseCredentials,
} from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENT_USER,
  SOLO_GROUP,
  addFamilyMember,
  clearAllExpensesAndInflows,
  syncAllToCloud,
  deleteFamilyMember,
  getDeviceId,
  getDeviceMemberId,
  leaveFamilyGroup,
  saveFamilyGroup,
  syncFamilyGroupFromCloud,
  updateCurrentUserName,
  updateFamilyInviteCode,
  updateFamilyAdminCode,
  syncFamilyFromCloud,
  syncInflowsFromCloud,
} from '../services/storage';
import { MemberAvatar } from './MemberAvatar';

interface FamilyGroupModalProps {
  visible: boolean;
  onClose: () => void;
  group: FamilyGroup;
  onUpdateGroup: (group: FamilyGroup) => void;
  onRecordsCleared?: () => void;
}

export const FamilyGroupModal: React.FC<FamilyGroupModalProps> = ({
  visible,
  onClose,
  group,
  onUpdateGroup,
  onRecordsCleared,
}) => {
  const [groupName, setGroupName] = useState(group.name);
  const [budget, setBudget] = useState(group.monthlyBudget.toString());
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [copied, setCopied] = useState(false);

  // Admin permissions state (Universal mutex lock)
  const [isAdmin, setIsAdmin] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [editingAdminCode, setEditingAdminCode] = useState(false);
  const [newAdminCodeInput, setNewAdminCodeInput] = useState(group.adminCode || 'FAM78699');

  // 8-Digit Invite Code editing (must start with FAM)
  const [editingInviteCode, setEditingInviteCode] = useState(false);
  const [newInviteCodeInput, setNewInviteCodeInput] = useState(group.inviteCode || 'FAM78601');

  // Change Profile Name state (available to all members for themselves!)
  const [editingMyName, setEditingMyName] = useState(false);
  const [myNewName, setMyNewName] = useState(CURRENT_USER.name || 'Myself');

  // Cloud Sync state
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    getDeviceId().then((id) => {
      setDeviceId(id);
      if (group.activeAdminDeviceId && group.activeAdminDeviceId === id) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
  }, [group.activeAdminDeviceId, visible]);

  useEffect(() => {
    if (visible && group?.id) {
      syncFamilyGroupFromCloud(group.id).then((freshGroup) => {
        if (freshGroup) onUpdateGroup(freshGroup);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      getSupabaseCredentials().then((creds) => {
        if (creds && creds.url && creds.anonKey) {
          setIsCloudConnected(true);
          setSupabaseUrl(creds.url);
          setSupabaseKey(creds.anonKey);
        } else {
          setIsCloudConnected(false);
        }
      });
    }
  }, [visible]);

  const AVATARS = ['👨‍💼', '👩‍💼', '👦', '👧', '👵', '👴', '🧑‍🍳', '🚗'];

  const handleCopyInviteCode = async () => {
    await Clipboard.setStringAsync(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join our family expense ledger on Money Map! Use Invite Code: ${group.inviteCode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMember = async () => {
    if (!isAdmin) {
      Alert.alert('Admin Access Required', 'Only the household admin can add new members.');
      return;
    }
    if (!newMemberName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the family member.');
      return;
    }

    const newMember: FamilyMember = {
      id: `user_${Date.now()}`,
      name: newMemberName.trim(),
      role: 'MEMBER',
      avatar: 'default',
      color: '#3B82F6',
    };

    const updated = await addFamilyMember(newMember);
    onUpdateGroup(updated);
    setNewMemberName('');
    setIsAddingMember(false);
    Alert.alert('Member Added 🎉', `"${newMember.name}" has been added to the family group.`);
  };

  const handleDeleteMember = (member: FamilyMember) => {
    if (!isAdmin) {
      Alert.alert('Admin Access Required', 'Only the household admin can remove members.');
      return;
    }
    if (member.isCurrentUser || member.role === 'HEAD') {
      Alert.alert('Protected Account', 'The household admin profile cannot be deleted.');
      return;
    }

    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove "${member.name}" from ${group.name}? They will no longer appear in the household list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Member',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteFamilyMember(member.id);
            onUpdateGroup(updated);
            Alert.alert('Member Removed', `"${member.name}" has been removed from the family group.`);
          },
        },
      ]
    );
  };

  const handleSaveMyName = async () => {
    if (!myNewName.trim()) {
      Alert.alert('Name Required', 'Please enter your profile name.');
      return;
    }
    const res = await updateCurrentUserName(myNewName.trim());
    onUpdateGroup(res.group);
    setEditingMyName(false);
    Alert.alert('Profile Updated 👤', `Your name is now set to "${res.user.name}".`);
  };

  const handleSaveInviteCode = async () => {
    if (!isAdmin) {
      Alert.alert('Admin Access Required', 'Only the household admin can change the family invite code.');
      return;
    }
    const code = newInviteCodeInput.trim().toUpperCase();
    if (!code.startsWith('FAM') || code.length !== 8) {
      Alert.alert(
        'Invalid Invite Code',
        'The family invite code must be exactly 8 characters and start with "FAM" (for example: FAM78601, FAM12345).'
      );
      return;
    }
    const updated = await updateFamilyInviteCode(code);
    onUpdateGroup(updated);
    setEditingInviteCode(false);
    Alert.alert('Invite Code Updated 🎉', `New 8-digit invite code is: ${code}`);
  };

  const handleSaveAdminCode = async () => {
    if (!isAdmin) return;
    const code = newAdminCodeInput.trim().toUpperCase();
    if (!code.startsWith('FAM') || code.length !== 8) {
      Alert.alert(
        'Invalid Admin Code',
        'The Universal Admin Security Code must be exactly 8 characters starting with "FAM" (for example: FAM78699, FAM88888).'
      );
      return;
    }
    const updated = await updateFamilyAdminCode(code);
    onUpdateGroup(updated);
    setEditingAdminCode(false);
    Alert.alert(
      'Universal Admin Code Updated 🛡️',
      `New Universal Admin Code is: ${code}. This code is synchronized across all family phones via the cloud.`
    );
  };

  const handleUnlockAdmin = async () => {
    const entered = adminCodeInput.trim().toUpperCase();
    if (!entered) {
      Alert.alert('Admin Code Required', 'Please enter the family admin security code.');
      return;
    }

    setIsClaimingAdmin(true);
    const res = await claimAdminSession(
      group.id,
      deviceId,
      CURRENT_USER.name || 'Admin Phone',
      entered
    );
    setIsClaimingAdmin(false);

    if (res.success) {
      setIsAdmin(true);
      setShowAdminUnlock(false);
      setAdminCodeInput('');
      if (res.group) onUpdateGroup(res.group);
      Alert.alert(
        'Admin Access Granted',
        'You are now logged in as the universal household admin. Admin controls are active on this phone.'
      );
    } else {
      if (res.currentAdminName) {
        Alert.alert(
          'Admin Session Active ⚠️',
          res.message || 'Another phone is currently holding the admin session.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Take Over Admin',
              style: 'destructive',
              onPress: async () => {
                setIsClaimingAdmin(true);
                const forceRes = await forceTakeoverAdminSession(
                  group.id,
                  deviceId,
                  CURRENT_USER.name || 'Admin Phone',
                  entered
                );
                setIsClaimingAdmin(false);
                if (forceRes.success) {
                  setIsAdmin(true);
                  setShowAdminUnlock(false);
                  setAdminCodeInput('');
                  if (forceRes.group) onUpdateGroup(forceRes.group);
                  Alert.alert('Session Transferred', 'Admin session has been transferred to this phone.');
                } else {
                  Alert.alert('Notice', forceRes.message || 'Could not transfer admin session.');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Access Denied', res.message || 'Incorrect Admin Security Code.');
      }
    }
  };

  const handleLockAdmin = async () => {
    await releaseAdminSession(group.id, deviceId);
    setIsAdmin(false);
    setShowAdminUnlock(false);
    setIsAddingMember(false);
    setShowCloudConfig(false);
    setEditingInviteCode(false);
    setEditingAdminCode(false);
    const updated = {
      ...group,
      activeAdminDeviceId: null,
      activeAdminName: null,
      activeAdminAt: null,
    };
    onUpdateGroup(updated);
    Alert.alert('Member Mode 👤', 'Admin controls are now locked.');
  };

  const handleSaveBudget = () => {
    const num = parseFloat(budget);
    if (isNaN(num) || num < 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid monthly budget amount.');
      return;
    }

    const updated: FamilyGroup = {
      ...group,
      name: groupName.trim() || 'Our Family',
      monthlyBudget: num,
    };

    onUpdateGroup(updated);
    Alert.alert('Saved', 'Family group settings updated successfully.');
  };

  const handleSaveCloudCredentials = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      Alert.alert('Credentials Required', 'Please enter your Supabase Project URL and Anon Key.');
      return;
    }
    const success = await saveSupabaseCredentials(supabaseUrl, supabaseKey);
    if (success) {
      setIsCloudConnected(true);
      setShowCloudConfig(false);
      const res = await syncAllToCloud();
      Alert.alert(
        'Connected & Synced! 🎉',
        `Real-time cloud sync is now active. Uploaded ${res.count} existing family records to Supabase.`
      );
    } else {
      Alert.alert('Connection Failed', 'Could not initialize cloud connection.');
    }
  };

  const handleManualSyncAll = async () => {
    setIsSyncingAll(true);
    const res = await syncAllToCloud();
    setIsSyncingAll(false);
    if (res.success) {
      Alert.alert(
        'Sync Complete! ☁️',
        `Successfully uploaded ${res.count} household expenses & inflows to Supabase.`
      );
    } else {
      Alert.alert('Sync Error', 'Please verify your Supabase URL and Key in Setup Cloud.');
    }
  };

  const handleJoinFamily = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      Alert.alert('Enter Code', 'Please enter the 8-character family invite code starting with FAM.');
      return;
    }

    setIsJoining(true);
    const devMemberId = await getDeviceMemberId();
    const joinedUser: FamilyMember = {
      id: devMemberId,
      name: myNewName.trim() || CURRENT_USER.name || 'Family Member',
      role: 'MEMBER',
      avatar: 'default',
      color: '#3B82F6',
      isCurrentUser: true,
    };
    const joined = await joinFamilyGroupByCode(code, joinedUser);
    setIsJoining(false);

    if (joined) {
      await AsyncStorage.setItem('@money_map/family_linked', 'true');
      await saveFamilyGroup(joined);
      onUpdateGroup(joined);
      setJoinCodeInput('');
      setIsAdmin(false);
      try {
        await syncFamilyFromCloud(joined.id);
        await syncInflowsFromCloud(joined.id);
      } catch {}
      Alert.alert(
        'Welcome to Family! 👨‍👩‍👧‍👦',
        `You have successfully joined "${joined.name}". All household expenses, members, and budget limits are now synced.`
      );
    } else {
      Alert.alert(
        'Pairing Notice',
        'Could not link family group. Please ensure the 8-character code starting with FAM is correct.'
      );
    }
  };

  const handleLeaveFamily = () => {
    Alert.alert(
      'Disconnect from Family Group? 🚪',
      'Are you sure you want to disconnect? You will be removed from the household list and returned to personal mode until you enter the family code again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Family',
          style: 'destructive',
          onPress: async () => {
            const solo = await leaveFamilyGroup();
            onUpdateGroup(solo);
            setIsAdmin(false);
            Alert.alert(
              'Disconnected 👤',
              'You have left the family group. You can re-join anytime by entering the 8-digit family code.'
            );
          },
        },
      ]
    );
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleClearAllRecords = () => {
    Alert.alert(
      'Reset All Records? 🗑️',
      'Are you sure you want to clear all existing expenses and net savings to start fresh from ₹0? This will wipe demo and test records permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            const res = await clearAllExpensesAndInflows();
            setIsResetting(false);
            if (res.success) {
              if (onRecordsCleared) {
                onRecordsCleared();
              }
              onClose();
              Alert.alert(
                'Ledger Reset Successfully 🎉',
                'All expenses, inflows, and net savings have been cleared. You are now starting from a fresh ₹0 slate!'
              );
            } else {
              Alert.alert('Notice', 'Failed to clear some records. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.notch} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Family Hub</Text>
              <Text style={styles.headerSubtitle}>Manage household members and group budget</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Admin vs Member Status Banner */}
            <View style={[styles.roleBanner, isAdmin ? styles.roleBannerAdmin : styles.roleBannerMember]}>
              <View style={styles.roleBannerLeft}>
                <Ionicons
                  name={isAdmin ? 'shield-checkmark' : 'person-circle-outline'}
                  size={22}
                  color={isAdmin ? '#B45309' : '#2563EB'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleBannerTitle, { color: isAdmin ? '#92400E' : '#1E40AF' }]}>
                    {isAdmin
                      ? 'Household Admin Active (This Phone)'
                      : group.activeAdminDeviceId && group.activeAdminDeviceId !== deviceId
                      ? '🔒 Universal Admin In Use'
                      : '👤 Family Member Mode'}
                  </Text>
                  <Text style={[styles.roleBannerSub, { color: isAdmin ? '#B45309' : '#3B82F6' }]}>
                    {isAdmin
                      ? 'Full universal control: add/delete members, invite code & cloud'
                      : group.activeAdminDeviceId && group.activeAdminDeviceId !== deviceId
                      ? `Locked by "${group.activeAdminName || 'Another phone'}". Only 1 admin active at a time.`
                      : 'Restricted: edit personal profile name only'}
                  </Text>
                </View>
              </View>

              {isAdmin ? (
                <TouchableOpacity style={styles.lockRoleBtn} onPress={handleLockAdmin}>
                  <Ionicons name="lock-closed" size={12} color="#64748B" />
                  <Text style={styles.lockRoleBtnText}>Lock</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.unlockRoleBtn}
                  onPress={() => setShowAdminUnlock((prev) => !prev)}
                >
                  <Ionicons name="key" size={12} color="#FFFFFF" />
                  <Text style={styles.unlockRoleBtnText}>Admin Login</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Admin Code Entry Sheet (when member wants to unlock admin) */}
            {showAdminUnlock && !isAdmin && (
              <View style={styles.adminUnlockCard}>
                <View style={styles.adminUnlockHeader}>
                  <Ionicons name="key-outline" size={16} color="#B45309" />
                  <Text style={styles.adminUnlockTitle}>Enter Family Admin Code</Text>
                </View>
                <Text style={styles.adminUnlockSub}>
                  Enter the universal 8-digit admin passcode (e.g. FAM78699) to unlock member management and cloud setup:
                </Text>
                <View style={styles.adminUnlockInputRow}>
                  <TextInput
                    style={styles.adminUnlockInput}
                    placeholder="Enter Admin Code (e.g. FAM78699)"
                    placeholderTextColor="#94A3B8"
                    value={adminCodeInput}
                    onChangeText={setAdminCodeInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.adminUnlockSubmitBtn}
                    onPress={handleUnlockAdmin}
                    disabled={isClaimingAdmin}
                  >
                    {isClaimingAdmin ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.adminUnlockSubmitText}>Unlock</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Cloud Sync Status & Setup Card (ONLY FOR ADMIN) */}
            {isAdmin && (
              <View style={styles.cloudCard}>
                <View style={styles.cloudCardHeader}>
                  <View style={styles.cloudStatusRow}>
                    <View
                      style={[
                        styles.cloudIndicator,
                        { backgroundColor: isCloudConnected ? '#10B981' : '#94A3B8' },
                      ]}
                    />
                    <Text style={styles.cloudStatusTitle}>
                      {isCloudConnected ? 'Cloud Sync Active' : 'Local Offline Mode'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cloudConfigToggle}
                    onPress={() => setShowCloudConfig((prev) => !prev)}
                  >
                    <Ionicons name="cloud-outline" size={14} color="#059669" />
                    <Text style={styles.cloudConfigToggleText}>
                      {isCloudConnected ? 'Configured' : 'Setup Cloud'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cloudCardSub}>
                  {isCloudConnected
                    ? 'All family expenses sync live across all household phones automatically.'
                    : 'Connect to free Supabase cloud to synchronize expenses between multiple phones.'}
                </Text>

                {/* Manual Upload Button when connected */}
                {isCloudConnected && !showCloudConfig && (
                  <TouchableOpacity
                    style={styles.syncNowBtn}
                    onPress={handleManualSyncAll}
                    disabled={isSyncingAll}
                  >
                    {isSyncingAll ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={15} color="#059669" />
                        <Text style={styles.syncNowBtnText}>Upload All Family Records to Supabase Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Cloud Credentials Form */}
                {showCloudConfig && (
                  <View style={styles.cloudForm}>
                    <Text style={styles.cloudInputLabel}>Supabase Project URL:</Text>
                    <TextInput
                      style={styles.cloudInput}
                      placeholder="https://xyzcompany.supabase.co"
                      placeholderTextColor="#94A3B8"
                      value={supabaseUrl}
                      onChangeText={setSupabaseUrl}
                      autoCapitalize="none"
                    />

                    <Text style={styles.cloudInputLabel}>Anon API Key:</Text>
                    <TextInput
                      style={styles.cloudInput}
                      placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                      placeholderTextColor="#94A3B8"
                      value={supabaseKey}
                      onChangeText={setSupabaseKey}
                      autoCapitalize="none"
                      secureTextEntry
                    />

                    <TouchableOpacity
                      style={styles.saveCloudBtn}
                      onPress={handleSaveCloudCredentials}
                    >
                      <Text style={styles.saveCloudBtnText}>Connect Cloud Database</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Join Existing Family Card */}
            <View style={styles.joinFamilyCard}>
              <View style={styles.joinHeader}>
                <Ionicons name="link" size={16} color="#2563EB" />
                <Text style={styles.joinTitle}>Join Existing Family Group</Text>
              </View>
              <Text style={styles.joinSub}>
                Have an 8-character invite code from another family phone? Enter it here:
              </Text>

              <View style={styles.joinInputRow}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="e.g. FAM78601"
                  placeholderTextColor="#94A3B8"
                  value={joinCodeInput}
                  onChangeText={(val) => setJoinCodeInput(val.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TouchableOpacity
                  style={styles.joinSubmitBtn}
                  onPress={handleJoinFamily}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.joinSubmitBtnText}>Join Group</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 8-Digit Invite Code Card */}
            <View style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="key" size={18} color="#059669" />
                  <Text style={styles.inviteTitle}>8-Digit Family Invite Code</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editCodeToggleBtn}
                    onPress={() => setEditingInviteCode((prev) => !prev)}
                  >
                    <Ionicons name="pencil-outline" size={13} color="#059669" />
                    <Text style={styles.editCodeToggleText}>
                      {editingInviteCode ? 'Cancel' : 'Change Code'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.inviteSub}>
                Family members use this 8-digit code (starts with FAM) to link their devices:
              </Text>

              {!editingInviteCode ? (
                <View style={styles.codeRow}>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{group.inviteCode}</Text>
                  </View>

                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyInviteCode}>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.shareBtn} onPress={handleShareInvite}>
                    <Ionicons name="share-social-outline" size={16} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.editCodeBox}>
                  <Text style={styles.editCodeHint}>Must be exactly 8 characters starting with FAM:</Text>
                  <View style={styles.editCodeInputRow}>
                    <TextInput
                      style={styles.editCodeInput}
                      value={newInviteCodeInput}
                      onChangeText={(val) => setNewInviteCodeInput(val.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={8}
                    />
                    <TouchableOpacity style={styles.saveCodeBtn} onPress={handleSaveInviteCode}>
                      <Text style={styles.saveCodeBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Admin Security Code Card (Visible ONLY to Admin) */}
            {isAdmin && (
              <View style={styles.adminCodeCard}>
                <View style={styles.adminCodeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="shield" size={18} color="#D97706" />
                    <Text style={styles.adminCodeTitle}>Admin Security Code</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editAdminCodeToggleBtn}
                    onPress={() => setEditingAdminCode((prev) => !prev)}
                  >
                    <Ionicons name="pencil-outline" size={13} color="#D97706" />
                    <Text style={styles.editAdminCodeToggleText}>
                      {editingAdminCode ? 'Cancel' : 'Change'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.adminCodeSub}>
                  Keep this passcode confidential. Anyone with this code can manage members and settings:
                </Text>

                {!editingAdminCode ? (
                  <View style={styles.adminCodeDisplayRow}>
                    <View style={styles.adminCodeBox}>
                      <Text style={styles.adminCodeText}>{group.adminCode || 'FAM78699'}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.editCodeBox}>
                    <View style={styles.editCodeInputRow}>
                      <TextInput
                        style={styles.editCodeInput}
                        value={newAdminCodeInput}
                        onChangeText={(val) => setNewAdminCodeInput(val.toUpperCase())}
                        autoCapitalize="characters"
                        placeholder="e.g. FAM78699"
                      />
                      <TouchableOpacity style={styles.saveAdminCodeBtn} onPress={handleSaveAdminCode}>
                        <Text style={styles.saveAdminCodeBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Monthly Budget Setting */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Monthly Household Budget Limit</Text>
              {isAdmin ? (
                <View style={styles.budgetInputRow}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    value={budget}
                    onChangeText={setBudget}
                  />
                  <TouchableOpacity style={styles.saveBudgetBtn} onPress={handleSaveBudget}>
                    <Text style={styles.saveBudgetBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.readOnlyBudgetBox}>
                  <Text style={styles.readOnlyBudgetText}>
                    ₹{group.monthlyBudget.toLocaleString('en-IN')} / month
                  </Text>
                </View>
              )}
            </View>

            {/* Members List */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Household Members ({group.members.length})</Text>
                {/* Add Member button is ONLY visible to Admin */}
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => setIsAddingMember((prev) => !prev)}
                    style={styles.addMemberToggle}
                  >
                    <Ionicons name={isAddingMember ? 'close' : 'add-circle'} size={18} color="#059669" />
                    <Text style={styles.addMemberToggleText}>
                      {isAddingMember ? 'Cancel' : 'Add Member'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Prominent Household Admin Banner so everyone sees who the admin is */}
              {group.id !== 'solo_group' && (
                <View style={styles.adminSummaryCard}>
                  <View style={styles.adminSummaryIcon}>
                    <Ionicons name="shield-checkmark" size={20} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminSummaryLabel}>Household Admin</Text>
                    <Text style={styles.adminSummaryName}>
                      {group.members.find((m) => m.role === 'HEAD')?.name || 'Muzammil'}
                    </Text>
                  </View>
                  <View style={styles.adminBadgePill}>
                    <Text style={styles.adminBadgePillText}>Admin</Text>
                  </View>
                </View>
              )}

              {/* Add Member Form (Admin Only) */}
              {isAdmin && isAddingMember && (
                <View style={styles.addMemberBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <MemberAvatar size={42} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>New Member Profile</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Uses household profile picture</Text>
                    </View>
                  </View>

                  <TextInput
                    style={styles.memberInput}
                    placeholder="Enter name (e.g. Sibling, Maid, Driver)"
                    placeholderTextColor="#94A3B8"
                    value={newMemberName}
                    onChangeText={setNewMemberName}
                  />

                  <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddMember}>
                    <Text style={styles.confirmAddBtnText}>Add to Family Group</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* List of members */}
              <View style={styles.membersList}>
                {group.members.map((member) => {
                  const isCurrent = member.isCurrentUser || member.id === CURRENT_USER.id;
                  const isHead = member.role === 'HEAD';
                  return (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={styles.memberLeft}>
                        <MemberAvatar size={40} />
                        <View style={{ flex: 1 }}>
                          {isCurrent && editingMyName ? (
                            <View style={styles.inlineNameEditRow}>
                              <TextInput
                                style={styles.inlineNameInput}
                                value={myNewName}
                                onChangeText={setMyNewName}
                                placeholder="Your Name"
                              />
                              <TouchableOpacity style={styles.inlineSaveNameBtn} onPress={handleSaveMyName}>
                                <Text style={styles.inlineSaveNameText}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.inlineCancelNameBtn}
                                onPress={() => setEditingMyName(false)}
                              >
                                <Ionicons name="close" size={16} color="#64748B" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={styles.memberName}>
                                {member.name} {isCurrent ? '(You)' : ''}
                              </Text>
                              {/* Option for member to change their own profile name */}
                              {isCurrent && (
                                <TouchableOpacity
                                  style={styles.changeMyNameBtn}
                                  onPress={() => {
                                    setMyNewName(member.name);
                                    setEditingMyName(true);
                                  }}
                                >
                                  <Ionicons name="pencil" size={11} color="#2563EB" />
                                  <Text style={styles.changeMyNameBtnText}>Change Name</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                          <View style={styles.roleTagRow}>
                            {isHead ? (
                              <View style={styles.adminRoleTag}>
                                <Text style={styles.adminRoleTagText}>Admin</Text>
                              </View>
                            ) : (
                              <View style={styles.memberRoleTag}>
                                <Text style={styles.memberRoleTagText}>👤 Member</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={styles.memberActionsRight}>
                        {/* Delete member is ONLY visible to Admin for non-head other members */}
                        {isAdmin && !isCurrent && member.role !== 'HEAD' && (
                          <TouchableOpacity
                            style={styles.deleteMemberBtn}
                            onPress={() => handleDeleteMember(member)}
                            hitSlop={10}
                          >
                            <Ionicons name="trash-outline" size={17} color="#DC2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Leave Family Group (For non-admin members) */}
            {!isAdmin && group.id !== 'solo_group' && (
              <View style={styles.leaveGroupCard}>
                <TouchableOpacity style={styles.leaveGroupBtn} onPress={handleLeaveFamily}>
                  <Ionicons name="log-out-outline" size={16} color="#DC2626" />
                  <Text style={styles.leaveGroupBtnText}>Leave Family Group</Text>
                </TouchableOpacity>
                <Text style={styles.leaveGroupSub}>
                  Disconnects this phone from the family ledger. You can re-join anytime using the 8-digit code.
                </Text>
              </View>
            )}

            {/* Reset & Start Fresh Section (Admin Only) */}
            {isAdmin && (
              <View style={styles.resetCard}>
                <View style={styles.resetCardHeader}>
                  <Ionicons name="refresh-circle-outline" size={22} color="#DC2626" />
                  <Text style={styles.resetTitle}>Reset Ledger & Start Fresh</Text>
                </View>
                <Text style={styles.resetSubtitle}>
                  Wipe all existing expenses, inflows, and net savings from both this phone and the cloud to begin tracking on a fresh ₹0 slate.
                </Text>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleClearAllRecords}
                  disabled={isResetting}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.resetButtonText}>
                    {isResetting ? 'Clearing Records...' : 'Clear All Records & Start Fresh'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 85 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 38 : 34,
  },
  notch: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cloudCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cloudCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cloudStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cloudIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cloudStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cloudConfigToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cloudConfigToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  cloudCardSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 6,
  },
  syncNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  cloudForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  cloudInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cloudInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  saveCloudBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveCloudBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  joinFamilyCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  joinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  joinSub: {
    fontSize: 11,
    color: '#2563EB',
    marginBottom: 10,
    lineHeight: 16,
  },
  joinInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#1E3A8A',
  },
  joinSubmitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  inviteCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 20,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  inviteSub: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 12,
    lineHeight: 18,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#059669',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  currency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  budgetInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  saveBudgetBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBudgetBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  addMemberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMemberToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  addMemberBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 10,
  },
  addMemberSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  avatarSelectBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelectBtnActive: {
    borderColor: '#059669',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  memberInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  confirmAddBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  membersList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  adminSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminSummaryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
    marginTop: 1,
  },
  adminBadgePill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  roleTagRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminRoleTag: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  adminRoleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  memberRoleTag: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  memberRoleTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  leaveGroupCard: {
    marginTop: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  leaveGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  leaveGroupBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  leaveGroupSub: {
    fontSize: 11,
    color: '#991B1B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  resetCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  resetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  resetSubtitle: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 14,
  },
  resetButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  roleBannerAdmin: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  roleBannerMember: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  roleBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  roleBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  roleBannerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  lockRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockRoleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  unlockRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  unlockRoleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminUnlockCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  adminUnlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  adminUnlockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  adminUnlockSub: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
    marginBottom: 10,
  },
  adminUnlockInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adminUnlockInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminUnlockSubmitBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminUnlockSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  editCodeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editCodeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  editCodeBox: {
    marginTop: 10,
    gap: 6,
  },
  editCodeHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  editCodeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editCodeInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  saveCodeBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveCodeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  adminCodeCard: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  adminCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminCodeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  editAdminCodeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editAdminCodeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  adminCodeSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 10,
  },
  adminCodeDisplayRow: {
    flexDirection: 'row',
  },
  adminCodeBox: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 2,
  },
  saveAdminCodeBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveAdminCodeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  readOnlyBudgetBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyBudgetText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  inlineNameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  inlineNameInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  inlineSaveNameBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineSaveNameText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inlineCancelNameBtn: {
    padding: 4,
  },
  changeMyNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changeMyNameBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  memberActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
