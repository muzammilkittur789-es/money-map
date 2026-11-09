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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FamilyGroup, FamilyMember } from '../types';
import {
  getSupabaseCredentials,
  joinFamilyGroupByCode,
  saveSupabaseCredentials,
} from '../services/supabase';
import { CURRENT_USER, syncAllToCloud } from '../services/storage';

interface FamilyGroupModalProps {
  visible: boolean;
  onClose: () => void;
  group: FamilyGroup;
  onUpdateGroup: (group: FamilyGroup) => void;
}

export const FamilyGroupModal: React.FC<FamilyGroupModalProps> = ({
  visible,
  onClose,
  group,
  onUpdateGroup,
}) => {
  const [groupName, setGroupName] = useState(group.name);
  const [budget, setBudget] = useState(group.monthlyBudget.toString());
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAvatar, setNewMemberAvatar] = useState('👤');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cloud Sync state
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

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

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the family member.');
      return;
    }

    const newMember: FamilyMember = {
      id: `user_${Date.now()}`,
      name: newMemberName.trim(),
      role: 'MEMBER',
      avatar: newMemberAvatar,
      color: '#3B82F6',
    };

    const updated = {
      ...group,
      members: [...group.members, newMember],
    };

    onUpdateGroup(updated);
    setNewMemberName('');
    setIsAddingMember(false);
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
    if (!joinCodeInput.trim()) {
      Alert.alert('Enter Code', 'Please enter the 6-character family invite code.');
      return;
    }

    setIsJoining(true);
    const joined = await joinFamilyGroupByCode(joinCodeInput.trim(), CURRENT_USER);
    setIsJoining(false);

    if (joined) {
      onUpdateGroup(joined);
      setJoinCodeInput('');
      Alert.alert(
        'Welcome to Family! 👨‍👩‍👧‍👦',
        `You have successfully joined "${joined.name}". All household expenses and budget limits are now synced.`
      );
    } else {
      Alert.alert(
        'Pairing Notice',
        'Could not link family group. Please ensure Cloud Sync is connected and the invite code is correct.'
      );
    }
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
            {/* Cloud Sync Status & Setup Card */}
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

            {/* Join Existing Family Card */}
            <View style={styles.joinFamilyCard}>
              <View style={styles.joinHeader}>
                <Ionicons name="link" size={16} color="#2563EB" />
                <Text style={styles.joinTitle}>Join Existing Family Group</Text>
              </View>
              <Text style={styles.joinSub}>
                Have an invite code from another family member's phone? Enter it here to link:
              </Text>

              <View style={styles.joinInputRow}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="e.g. FAM786"
                  placeholderTextColor="#94A3B8"
                  value={joinCodeInput}
                  onChangeText={(val) => setJoinCodeInput(val.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
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

            {/* Invite Code Card */}
            <View style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <Ionicons name="key" size={18} color="#059669" />
                <Text style={styles.inviteTitle}>Family Invite Code</Text>
              </View>
              <Text style={styles.inviteSub}>
                Share this 6-character code with your family members to link their phones:
              </Text>

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
            </View>

            {/* Monthly Budget Setting */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Monthly Household Budget Limit</Text>
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
            </View>

            {/* Members List */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Active Household Members ({group.members.length})</Text>
                <TouchableOpacity
                  onPress={() => setIsAddingMember((prev) => !prev)}
                  style={styles.addMemberToggle}
                >
                  <Ionicons name={isAddingMember ? 'close' : 'add-circle'} size={18} color="#059669" />
                  <Text style={styles.addMemberToggleText}>
                    {isAddingMember ? 'Cancel' : 'Add Member'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Add Member Form */}
              {isAddingMember && (
                <View style={styles.addMemberBox}>
                  <Text style={styles.addMemberSub}>Select Avatar:</Text>
                  <View style={styles.avatarRow}>
                    {AVATARS.map((av) => (
                      <TouchableOpacity
                        key={av}
                        style={[
                          styles.avatarSelectBtn,
                          newMemberAvatar === av && styles.avatarSelectBtnActive,
                        ]}
                        onPress={() => setNewMemberAvatar(av)}
                      >
                        <Text style={{ fontSize: 20 }}>{av}</Text>
                      </TouchableOpacity>
                    ))}
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
                {group.members.map((member) => (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberLeft}>
                      <View style={styles.avatarBg}>
                        <Text style={{ fontSize: 20 }}>{member.avatar}</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>
                          {member.name} {member.isCurrentUser ? '(You)' : ''}
                        </Text>
                        <Text style={styles.memberRole}>
                          {member.role === 'HEAD' ? 'Household Admin' : 'Family Member'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.memberStatusBadge}>
                      <View style={styles.greenDot} />
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 30 }} />
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
    paddingBottom: 24,
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
  memberRole: {
    fontSize: 11,
    color: '#64748B',
  },
  memberStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },
});
