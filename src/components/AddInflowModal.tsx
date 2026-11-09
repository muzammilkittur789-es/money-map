import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpenseScope,
  FamilyMember,
  InflowCategory,
  InflowChannel,
  InflowItem,
} from '../types';
import { INFLOW_CATEGORIES } from '../utils/inflowCategories';
import { MemberAvatar } from './MemberAvatar';

interface AddInflowModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (inflow: InflowItem) => void;
  currentUser: FamilyMember;
  familyMembers: FamilyMember[];
}

export const AddInflowModal: React.FC<AddInflowModalProps> = ({
  visible,
  onClose,
  onSave,
  currentUser,
  familyMembers,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<InflowCategory>('Salary');
  const [channel, setChannel] = useState<InflowChannel>('BANK_UPI');
  const [scope, setScope] = useState<ExpenseScope>('FAMILY');
  const [selectedRecipient, setSelectedRecipient] = useState<FamilyMember>(currentUser);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setAmount('');
      setCategory('Salary');
      setChannel('BANK_UPI');
      setScope('FAMILY');
      setSelectedRecipient(currentUser);
    }
  }, [visible]);

  const handleAddChip = (val: number) => {
    const curr = parseFloat(amount) || 0;
    setAmount((curr + val).toString());
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid incoming amount.');
      return;
    }

    const inflowTitle = title.trim() || `${category} Inflow`;

    const newInflow: InflowItem = {
      id: `inf_${Date.now()}`,
      title: inflowTitle,
      amount: parsedAmount,
      category,
      channel,
      scope,
      receivedBy: selectedRecipient,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    onSave(newInflow);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          <View style={styles.notch} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Record Money Received</Text>
              <Text style={styles.headerSubtitle}>Log salary, business revenue, cash gifts or rent</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>+₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {/* Quick Chips */}
            <View style={styles.chipsRow}>
              {[1000, 5000, 10000, 25000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.chip}
                  onPress={() => handleAddChip(val)}
                >
                  <Text style={styles.chipText}>+₹{val.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>Source / Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. October Salary, Client Website, Eid Gift"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Scope: Personal vs Family */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>Where does this money go?</Text>
              <View style={styles.scopeButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.scopeOption,
                    scope === 'PERSONAL' && styles.scopeOptionActivePersonal,
                  ]}
                  onPress={() => setScope('PERSONAL')}
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color={scope === 'PERSONAL' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.scopeOptionText,
                      scope === 'PERSONAL' && styles.scopeOptionTextActive,
                    ]}
                  >
                    Personal (Private)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scopeOption,
                    scope === 'FAMILY' && styles.scopeOptionActiveFamily,
                  ]}
                  onPress={() => setScope('FAMILY')}
                >
                  <Ionicons
                    name="people"
                    size={16}
                    color={scope === 'FAMILY' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.scopeOptionText,
                      scope === 'FAMILY' && styles.scopeOptionTextActive,
                    ]}
                  >
                    Family Pool
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Channel: Bank/UPI vs Cash */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>How was it received?</Text>
              <View style={styles.modeButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    channel === 'BANK_UPI' && styles.modeOptionActiveBank,
                  ]}
                  onPress={() => setChannel('BANK_UPI')}
                >
                  <Ionicons
                    name="business"
                    size={16}
                    color={channel === 'BANK_UPI' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      channel === 'BANK_UPI' && styles.modeOptionTextActive,
                    ]}
                  >
                    Bank Transfer / UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    channel === 'CASH' && styles.modeOptionActiveCash,
                  ]}
                  onPress={() => setChannel('CASH')}
                >
                  <Ionicons
                    name="cash"
                    size={16}
                    color={channel === 'CASH' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      channel === 'CASH' && styles.modeOptionTextActive,
                    ]}
                  >
                    Physical Cash
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>Inflow Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {INFLOW_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.categoryPill,
                        isSelected && { borderColor: cat.color, backgroundColor: cat.bgColor },
                      ]}
                      onPress={() => setCategory(cat.name)}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={16}
                        color={isSelected ? cat.color : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && { color: cat.color, fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Recipient */}
            {scope === 'FAMILY' && familyMembers.length > 1 && (
              <View style={styles.fieldSection}>
                <Text style={styles.sectionLabel}>Received By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spendersScroll}>
                  {familyMembers.map((member) => {
                    const isSelected = selectedRecipient.id === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.spenderPill,
                          isSelected && styles.spenderPillActive,
                        ]}
                        onPress={() => setSelectedRecipient(member)}
                      >
                        <MemberAvatar size={20} style={{ marginRight: 6 }} />
                        <Text
                          style={[
                            styles.spenderPillText,
                            isSelected && styles.spenderPillTextActive,
                          ]}
                        >
                          {member.name} {member.isCurrentUser ? '(You)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Add Money Inflow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16A34A',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 100,
    textAlign: 'left',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  fieldSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scopeButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  scopeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  scopeOptionActivePersonal: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },
  scopeOptionActiveFamily: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  scopeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modeButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  modeOptionActiveBank: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modeOptionActiveCash: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  spendersScroll: {
    flexDirection: 'row',
  },
  spenderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 6,
  },
  spenderPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  spenderPillEmoji: {
    fontSize: 13,
  },
  spenderPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  spenderPillTextActive: {
    color: '#FFFFFF',
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
