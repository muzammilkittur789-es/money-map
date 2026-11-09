import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AppTab,
  Expense,
  ExpenseScope,
  FamilyGroup,
  InflowItem,
  ParsedUpiData,
  PaymentMode,
  TimeFilter,
} from '../types';
import {
  CURRENT_USER,
  deleteExpense,
  deleteInflow,
  getFamilyGroup,
  initializeStorage,
  saveExpense,
  saveFamilyGroup,
  saveInflow,
  syncFamilyFromCloud,
} from '../services/storage';
import { subscribeToFamilyUpdates } from '../services/supabase';
import { generateAndSharePdfReport } from '../utils/pdfGenerator';
import { Header } from '../components/Header';
import { StatSummary } from '../components/StatSummary';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { ExpenseCard } from '../components/ExpenseCard';
import { ScanModal } from '../components/ScanModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { FamilyGroupModal } from '../components/FamilyGroupModal';
import { AddInflowModal } from '../components/AddInflowModal';
import { InflowSavingsView } from '../components/InflowSavingsView';
import { ReceiptScannerModal } from '../components/ReceiptScannerModal';

export const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('EXPENSES');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inflows, setInflows] = useState<InflowItem[]>([]);
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);

  // Filters
  const [currentScope, setCurrentScope] = useState<ExpenseScope>('FAMILY');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MONTH');

  // Modals
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [addExpenseVisible, setAddExpenseVisible] = useState(false);
  const [addInflowVisible, setAddInflowVisible] = useState(false);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  const [scannedUpiData, setScannedUpiData] = useState<ParsedUpiData | null>(null);
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<PaymentMode>('ONLINE');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadData = async () => {
    try {
      const { expenses: storedExpenses, inflows: storedInflows, group } = await initializeStorage();
      setExpenses(storedExpenses);
      setInflows(storedInflows);
      setFamilyGroup(group);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time Auto-Refresh Subscription via Supabase WebSockets
  useEffect(() => {
    if (!familyGroup) return;

    // Fetch latest cloud state on load
    syncFamilyFromCloud(familyGroup.id).then((cloudMerged) => {
      setExpenses(cloudMerged);
    });

    // Subscribe to live push events from other household devices
    const unsubscribe = subscribeToFamilyUpdates(familyGroup.id, async () => {
      const refreshed = await syncFamilyFromCloud(familyGroup.id);
      setExpenses(refreshed);
    });

    return () => {
      unsubscribe();
    };
  }, [familyGroup?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Date filtering helper
  const isWithinTimeFilter = (isoDate: string, filter: TimeFilter): boolean => {
    const itemDate = new Date(isoDate);
    const now = new Date();

    if (filter === 'TODAY') {
      return (
        itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (filter === 'WEEK') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return itemDate >= oneWeekAgo && itemDate <= now;
    } else if (filter === 'MONTH') {
      return (
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (filter === 'YEAR') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    return true; // ALL
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((item) => {
    if (currentScope === 'PERSONAL') {
      if (item.scope !== 'PERSONAL' || item.spentBy.id !== CURRENT_USER.id) {
        return false;
      }
    } else {
      if (item.scope !== 'FAMILY') {
        return false;
      }
    }
    return isWithinTimeFilter(item.date, timeFilter);
  });

  // Filter inflows
  const filteredInflows = inflows.filter((item) => {
    if (currentScope === 'PERSONAL') {
      if (item.scope !== 'PERSONAL' || item.receivedBy.id !== CURRENT_USER.id) {
        return false;
      }
    } else {
      if (item.scope !== 'FAMILY') {
        return false;
      }
    }
    return isWithinTimeFilter(item.date, timeFilter);
  });

  // Calculate stats
  const totalExpenseAmount = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalInflowAmount = filteredInflows.reduce((sum, item) => sum + item.amount, 0);

  const onlineExpenseAmount = filteredExpenses
    .filter((i) => i.paymentMode === 'ONLINE')
    .reduce((sum, item) => sum + item.amount, 0);
  const cashExpenseAmount = filteredExpenses
    .filter((i) => i.paymentMode === 'CASH')
    .reduce((sum, item) => sum + item.amount, 0);

  // Expense Handlers
  const handleSaveExpense = async (newExpense: Expense) => {
    const updated = await saveExpense(newExpense);
    setExpenses(updated);
  };

  const handleSaveMultipleExpenses = async (newExpenses: Expense[]) => {
    let updated = expenses;
    for (const exp of newExpenses) {
      updated = await saveExpense(exp);
    }
    setExpenses(updated);
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = await deleteExpense(id);
    setExpenses(updated);
  };

  // Inflow Handlers
  const handleSaveInflow = async (newInflow: InflowItem) => {
    const updated = await saveInflow(newInflow);
    setInflows(updated);
  };

  const handleDeleteInflow = async (id: string) => {
    const updated = await deleteInflow(id);
    setInflows(updated);
  };

  const handleUpdateFamilyGroup = async (group: FamilyGroup) => {
    await saveFamilyGroup(group);
    setFamilyGroup(group);
  };

  const handleScanSuccess = (data: ParsedUpiData) => {
    setScanModalVisible(false);
    setScannedUpiData(data);
    setDefaultPaymentMode('ONLINE');
    setAddExpenseVisible(true);
  };

  const handleOpenCashEntry = () => {
    setScannedUpiData(null);
    setDefaultPaymentMode('CASH');
    setAddExpenseVisible(true);
  };

  const handleOpenGenericEntry = () => {
    setScannedUpiData(null);
    setDefaultPaymentMode('ONLINE');
    setAddExpenseVisible(true);
  };

  const handleDownloadPdf = async () => {
    if (!familyGroup) return;
    setIsGeneratingPdf(true);
    await generateAndSharePdfReport({
      expenses: filteredExpenses,
      inflows: filteredInflows,
      scope: currentScope,
      group: familyGroup,
      periodLabel: getPeriodLabel(),
    });
    setIsGeneratingPdf(false);
  };

  const getPeriodLabel = (): string => {
    switch (timeFilter) {
      case 'TODAY':
        return 'Today';
      case 'WEEK':
        return 'This Week';
      case 'MONTH':
        return 'This Month';
      case 'YEAR':
        return 'This Year';
      default:
        return 'All Time';
    }
  };

  if (loading || !familyGroup) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading Money Map...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Header with Scope Switcher & Time Filter */}
      <Header
        currentScope={currentScope}
        onScopeChange={setCurrentScope}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        familyName={familyGroup.name}
        onOpenFamilyModal={() => setFamilyModalVisible(true)}
      />

      {/* View Switch: Expenses vs Inflow & Savings */}
      {activeTab === 'EXPENSES' ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Stat Summary */}
          <StatSummary
            totalAmount={totalExpenseAmount}
            onlineAmount={onlineExpenseAmount}
            cashAmount={cashExpenseAmount}
            scope={currentScope}
            monthlyBudget={familyGroup.monthlyBudget}
            periodLabel={getPeriodLabel()}
          />

          {/* Itemized Order & Invoice Banner */}
          <TouchableOpacity
            style={styles.scanReceiptBanner}
            onPress={() => setReceiptModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.scanReceiptBannerLeft}>
              <View style={styles.scanReceiptIconBg}>
                <Ionicons name="document-text" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanReceiptTitle}>Import Online Order / Invoice</Text>
                <Text style={styles.scanReceiptSub}>
                  Auto-breaks Blinkit & Amazon carts into itemized expenses
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Analytics Breakdown */}
          <AnalyticsCharts
            expenses={filteredExpenses}
            scope={currentScope}
            members={familyGroup.members}
          />

          {/* Recent Transactions Section */}
          <View style={styles.transactionsHeader}>
            <View>
              <Text style={styles.transactionsTitle}>
                {currentScope === 'FAMILY' ? 'Family Expenses' : 'My Personal Spends'}
              </Text>
              <Text style={styles.transactionsCount}>{filteredExpenses.length} entries</Text>
            </View>

            <TouchableOpacity
              style={styles.pdfDownloadBtn}
              onPress={handleDownloadPdf}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <>
                  <Ionicons name="document-text" size={14} color="#059669" />
                  <Text style={styles.pdfDownloadBtnText}>PDF Statement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {filteredExpenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No expenses logged</Text>
              <Text style={styles.emptySub}>
                Tap the Scan QR button below to pay and track, or log a cash payment.
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onDelete={handleDeleteExpense}
                />
              ))}
            </View>
          )}

          <View style={{ height: 130 }} />
        </ScrollView>
      ) : (
        <InflowSavingsView
          inflows={filteredInflows}
          totalInflow={totalInflowAmount}
          totalExpense={totalExpenseAmount}
          scope={currentScope}
          periodLabel={getPeriodLabel()}
          members={familyGroup.members}
          onDeleteInflow={handleDeleteInflow}
          onOpenAddInflow={() => setAddInflowVisible(true)}
        />
      )}

      {/* Floating Action Dock for Expenses Tab */}
      {activeTab === 'EXPENSES' ? (
        <View style={styles.actionDock}>
          <TouchableOpacity
            style={styles.dockButtonSecondary}
            onPress={handleOpenCashEntry}
            activeOpacity={0.8}
          >
            <Ionicons name="cash" size={18} color="#059669" />
            <Text style={styles.dockButtonSecondaryText}>+ Cash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButtonPrimary}
            onPress={() => setScanModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code" size={24} color="#FFFFFF" />
            <Text style={styles.dockButtonPrimaryText}>Scan & Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockButtonSecondary}
            onPress={() => setReceiptModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text" size={18} color="#2563EB" />
            <Text style={styles.dockButtonSecondaryText}>+ Invoice</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionDock}>
          <TouchableOpacity
            style={[styles.dockButtonPrimary, { backgroundColor: '#16A34A' }]}
            onPress={() => setAddInflowVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.dockButtonPrimaryText}>+ Add Money Received</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'EXPENSES' && styles.navTabActive]}
          onPress={() => setActiveTab('EXPENSES')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'EXPENSES' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'EXPENSES' ? '#059669' : '#64748B'}
          />
          <Text
            style={[styles.navTabText, activeTab === 'EXPENSES' && styles.navTabTextActive]}
          >
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'INFLOW_SAVINGS' && styles.navTabActive]}
          onPress={() => setActiveTab('INFLOW_SAVINGS')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'INFLOW_SAVINGS' ? 'trending-up' : 'trending-up-outline'}
            size={22}
            color={activeTab === 'INFLOW_SAVINGS' ? '#059669' : '#64748B'}
          />
          <Text
            style={[
              styles.navTabText,
              activeTab === 'INFLOW_SAVINGS' && styles.navTabTextActive,
            ]}
          >
            Money In & Savings
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Scanner Viewfinder Modal */}
      <ScanModal
        visible={scanModalVisible}
        onClose={() => setScanModalVisible(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Add / Confirm Expense Modal */}
      <AddExpenseModal
        visible={addExpenseVisible}
        onClose={() => {
          setAddExpenseVisible(false);
          setScannedUpiData(null);
        }}
        onSave={handleSaveExpense}
        scannedData={scannedUpiData}
        defaultMode={defaultPaymentMode}
        currentUser={CURRENT_USER}
        familyMembers={familyGroup.members}
      />

      {/* Add Inflow Modal */}
      <AddInflowModal
        visible={addInflowVisible}
        onClose={() => setAddInflowVisible(false)}
        onSave={handleSaveInflow}
        currentUser={CURRENT_USER}
        familyMembers={familyGroup.members}
      />

      {/* Family Hub Management Modal */}
      <FamilyGroupModal
        visible={familyModalVisible}
        onClose={() => setFamilyModalVisible(false)}
        group={familyGroup}
        onUpdateGroup={handleUpdateFamilyGroup}
        onRecordsCleared={() => {
          setExpenses([]);
          setInflows([]);
        }}
      />

      {/* Itemized Order & Invoice Scanner Modal */}
      <ReceiptScannerModal
        visible={receiptModalVisible}
        onClose={() => setReceiptModalVisible(false)}
        onSaveExpenses={handleSaveMultipleExpenses}
        currentUser={CURRENT_USER}
        familyMembers={familyGroup.members}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scanReceiptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  scanReceiptBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  scanReceiptIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanReceiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  scanReceiptSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  transactionsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  pdfDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  pdfDownloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  transactionsList: {
    paddingHorizontal: 20,
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionDock: {
    position: 'absolute',
    bottom: 74,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dockButtonPrimary: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  dockButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dockButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dockButtonSecondaryText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  navTabActive: {},
  navTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  navTabTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
});
