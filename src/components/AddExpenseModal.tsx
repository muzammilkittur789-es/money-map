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
  Expense,
  ExpenseCategory,
  ExpenseScope,
  FamilyMember,
  ParsedUpiData,
  PaymentMode,
  UpiProvider,
} from '../types';
import { CATEGORIES } from '../utils/categories';
import { launchPaymentApp } from '../utils/upi';
import { MemberAvatar } from './MemberAvatar';
import { DatePickerSection } from './DatePickerSection';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  scannedData?: ParsedUpiData | null;
  defaultMode?: PaymentMode;
  currentUser: FamilyMember;
  familyMembers: FamilyMember[];
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  onSave,
  scannedData,
  defaultMode = 'ONLINE',
  currentUser,
  familyMembers,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(defaultMode);
  const [upiProvider, setUpiProvider] = useState<UpiProvider>('PHONEPE');
  const [scope, setScope] = useState<ExpenseScope>('FAMILY');
  const [selectedSpender, setSelectedSpender] = useState<FamilyMember>(currentUser);
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());

  // Whenever scannedData or modal visibility changes, initialize state
  useEffect(() => {
    if (visible) {
      setExpenseDate(new Date());
      if (scannedData) {
        setTitle(scannedData.payeeName || 'UPI Merchant');
        if (scannedData.amount) {
          setAmount(scannedData.amount.toString());
        } else {
          setAmount('');
        }
        setPaymentMode('ONLINE');
        if (scannedData.suggestedCategory) {
          setCategory(scannedData.suggestedCategory);
        }
      } else {
        setPaymentMode(defaultMode);
        setTitle('');
        setAmount('');
        setCategory(defaultMode === 'CASH' ? 'Transport & Fuel' : 'Groceries');
      }
      setSelectedSpender(currentUser);
    }
  }, [visible, scannedData, defaultMode]);

  const handleAddAmountChip = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSaveAndProceed = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }

    const expenseTitle = title.trim() || (paymentMode === 'CASH' ? 'Cash Expense' : 'UPI Payment');

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      title: expenseTitle,
      amount: parsedAmount,
      category,
      paymentMode,
      upiProvider: paymentMode === 'ONLINE' ? upiProvider : undefined,
      payeeUpiId: scannedData?.payeeUpiId,
      payeeName: scannedData?.payeeName || expenseTitle,
      scope,
      spentBy: selectedSpender,
      date: expenseDate.toISOString(),
      notes: notes.trim() || undefined,
      status: 'COMPLETED',
    };

    // Save expense in app
    onSave(newExpense);

    // If online via UPI with payee details, trigger deep link to payment app
    if (paymentMode === 'ONLINE' && scannedData?.payeeUpiId) {
      await launchPaymentApp(
        scannedData.payeeUpiId,
        scannedData.payeeName,
        parsedAmount,
        notes || expenseTitle,
        upiProvider
      );
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          {/* Top Drag Notch */}
          <View style={styles.notch} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {scannedData ? 'UPI Scan & Pay' : paymentMode === 'CASH' ? 'Log Cash Expense' : 'Add Expense'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {scannedData
                  ? `To: ${scannedData.payeeName || scannedData.payeeUpiId}`
                  : 'Track and budget for yourself or family'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus={!scannedData?.amount}
              />
            </View>

            {/* Quick Amount Chips */}
            <View style={styles.chipsRow}>
              {[50, 100, 200, 500].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.chip}
                  onPress={() => handleAddAmountChip(val)}
                >
                  <Text style={styles.chipText}>+₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title / Expense Name */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>Expense Description / Merchant</Text>
              <TextInput
                style={styles.textInput}
                placeholder={
                  paymentMode === 'CASH'
                    ? 'e.g. Auto to station, Vegetables, Tea'
                    : 'Merchant or description'
                }
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Date Selection */}
            <DatePickerSection
              value={expenseDate}
              onChange={setExpenseDate}
              label="Transaction Date"
            />

            {/* Scope Selector: Personal vs Family */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>Where should this be tracked?</Text>
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

            {/* Category Selector */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => {
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

            {/* Payment Method Selector (Only if not fixed by scanned QR) */}
            {!scannedData && (
              <View style={styles.fieldSection}>
                <Text style={styles.sectionLabel}>Payment Mode</Text>
                <View style={styles.modeButtonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.modeOption,
                      paymentMode === 'CASH' && styles.modeOptionActiveCash,
                    ]}
                    onPress={() => setPaymentMode('CASH')}
                  >
                    <Ionicons
                      name="cash"
                      size={16}
                      color={paymentMode === 'CASH' ? '#FFFFFF' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeOptionText,
                        paymentMode === 'CASH' && styles.modeOptionTextActive,
                      ]}
                    >
                      Cash Payment
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeOption,
                      paymentMode === 'ONLINE' && styles.modeOptionActiveUpi,
                    ]}
                    onPress={() => setPaymentMode('ONLINE')}
                  >
                    <Ionicons
                      name="flash"
                      size={16}
                      color={paymentMode === 'ONLINE' ? '#FFFFFF' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeOptionText,
                        paymentMode === 'ONLINE' && styles.modeOptionTextActive,
                      ]}
                    >
                      UPI / Online
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* UPI Provider Selector (If paymentMode is Online) */}
            {paymentMode === 'ONLINE' && (
              <View style={styles.fieldSection}>
                <Text style={styles.sectionLabel}>Preferred UPI App</Text>
                <View style={styles.providerRow}>
                  {(
                    [
                      { id: 'PHONEPE', label: 'PhonePe', icon: 'wallet-outline', color: '#6739B7' },
                      { id: 'GPAY', label: 'Google Pay', icon: 'logo-google', color: '#1A73E8' },
                      { id: 'PAYTM', label: 'Paytm', icon: 'card-outline', color: '#00BAF2' },
                      { id: 'GENERIC_UPI', label: 'Any UPI', icon: 'flash-outline', color: '#0F172A' },
                    ] as const
                  ).map((prov) => {
                    const isSelected = upiProvider === prov.id;
                    return (
                      <TouchableOpacity
                        key={prov.id}
                        style={[
                          styles.providerBtn,
                          isSelected && { borderColor: prov.color, backgroundColor: '#F8FAFC' },
                        ]}
                        onPress={() => setUpiProvider(prov.id)}
                      >
                        <Ionicons
                          name={prov.icon as any}
                          size={16}
                          color={isSelected ? prov.color : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.providerBtnText,
                            isSelected && { color: prov.color, fontWeight: '700' },
                          ]}
                        >
                          {prov.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Who Paid (Spender Selector in Family scope) */}
            {scope === 'FAMILY' && familyMembers.length > 1 && (
              <View style={styles.fieldSection}>
                <Text style={styles.sectionLabel}>Paid By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spendersScroll}>
                  {familyMembers.map((member) => {
                    const isSelected = selectedSpender.id === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.spenderPill,
                          isSelected && styles.spenderPillActive,
                        ]}
                        onPress={() => setSelectedSpender(member)}
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
            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveAndProceed}>
              <Ionicons
                name={paymentMode === 'ONLINE' && scannedData ? 'paper-plane' : 'checkmark-circle'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.submitBtnText}>
                {paymentMode === 'ONLINE' && scannedData
                  ? `Pay via ${upiProvider === 'PHONEPE' ? 'PhonePe' : upiProvider === 'GPAY' ? 'GPay' : 'UPI'} & Save`
                  : 'Save Expense'}
              </Text>
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: '#059669',
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
  modeOptionActiveCash: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modeOptionActiveUpi: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
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
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  providerBtnText: {
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
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#059669',
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
