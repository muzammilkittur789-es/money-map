import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseScope, FamilyMember, InflowItem } from '../types';
import { InflowCard } from './InflowCard';

interface InflowSavingsViewProps {
  inflows: InflowItem[];
  totalInflow: number;
  totalExpense: number;
  scope: ExpenseScope;
  periodLabel: string;
  members: FamilyMember[];
  onDeleteInflow: (id: string) => void;
  onOpenAddInflow: () => void;
}

export const InflowSavingsView: React.FC<InflowSavingsViewProps> = ({
  inflows,
  totalInflow,
  totalExpense,
  scope,
  periodLabel,
  onDeleteInflow,
  onOpenAddInflow,
}) => {
  const hasTransactions = totalInflow > 0 || totalExpense > 0;
  const netSaved = totalInflow - totalExpense;
  const isSurplus = netSaved >= 0;

  let spentPercent = 0;
  let savedPercent = 0;

  if (!hasTransactions) {
    // Initially neutral grey: no red or green fill
    spentPercent = 0;
    savedPercent = 0;
  } else if (totalInflow === 0 && totalExpense > 0) {
    // Only debited: fills red
    spentPercent = 100;
    savedPercent = 0;
  } else if (totalInflow > 0 && totalExpense === 0) {
    // Only credited: fills green
    spentPercent = 0;
    savedPercent = 100;
  } else {
    // Both debits and credits exist
    if (totalExpense >= totalInflow) {
      spentPercent = 100;
      savedPercent = 0;
    } else {
      spentPercent = Math.min(100, Math.round((totalExpense / totalInflow) * 100));
      savedPercent = Math.max(0, 100 - spentPercent);
    }
  }

  const savingsRate =
    totalInflow > 0 ? Math.max(0, Math.round((netSaved / totalInflow) * 100)) : 0;

  const bankAmount = inflows
    .filter((i) => i.channel === 'BANK_UPI')
    .reduce((sum, item) => sum + item.amount, 0);
  const cashAmount = inflows
    .filter((i) => i.channel === 'CASH')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Net Savings Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroLabelContainer}>
            <Text style={styles.heroLabel} numberOfLines={1} ellipsizeMode="tail">
              NET SAVINGS
            </Text>
            <Text style={styles.heroPeriodPill} numberOfLines={1}>
              • {periodLabel}
            </Text>
          </View>
          <View
            style={[
              styles.scopeBadge,
              scope === 'FAMILY' ? styles.familyBadge : styles.personalBadge,
            ]}
          >
            <Ionicons
              name={scope === 'FAMILY' ? 'people' : 'lock-closed'}
              size={11}
              color={scope === 'FAMILY' ? '#34D399' : '#94A3B8'}
            />
            <Text
              style={[
                styles.scopeBadgeText,
                scope === 'FAMILY' ? styles.familyBadgeText : styles.personalBadgeText,
              ]}
              numberOfLines={1}
            >
              {scope === 'FAMILY' ? 'Family Pool' : 'Personal'}
            </Text>
          </View>
        </View>

        {/* Big Net Saved Number */}
        <View style={styles.netSavedRow}>
          <Text
            style={[
              styles.netSavedAmount,
              !hasTransactions
                ? styles.netZeroAmount
                : !isSurplus
                ? styles.netDeficitAmount
                : undefined,
            ]}
          >
            {!hasTransactions
              ? '₹0'
              : `${isSurplus ? '+' : '-'}₹${Math.abs(netSaved).toLocaleString('en-IN')}`}
          </Text>
          {!hasTransactions ? (
            <View style={[styles.rateBadge, styles.rateBadgeNeutral]}>
              <Ionicons name="sparkles-outline" size={12} color="#94A3B8" />
              <Text style={[styles.rateBadgeText, { color: '#94A3B8' }]}>Clean Slate</Text>
            </View>
          ) : (
            <View style={[styles.rateBadge, isSurplus ? styles.rateBadgePositive : styles.rateBadgeDeficit]}>
              <Ionicons
                name={isSurplus ? 'trending-up' : 'trending-down'}
                size={12}
                color={isSurplus ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.rateBadgeText, isSurplus ? styles.rateTextPositive : styles.rateTextDeficit]}>
                {savingsRate}% Saved
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.heroSubText}>
          {!hasTransactions
            ? `Your ledger is starting clean. Log money received and expenses to track your net savings this ${periodLabel.toLowerCase()}!`
            : isSurplus
            ? `You have saved ${savingsRate}% of the total funds received this ${periodLabel.toLowerCase()}!`
            : `Expenses exceeded inflows by ₹${Math.abs(netSaved).toLocaleString('en-IN')}.`}
        </Text>

        {/* Visual Inflow vs Outflow Comparison Bar (Initially 100% Grey) */}
        <View style={styles.comparisonBarBg}>
          {spentPercent > 0 && (
            <View
              style={[
                styles.comparisonBarSpent,
                { width: `${spentPercent}%` },
              ]}
            />
          )}
          {savedPercent > 0 && (
            <View
              style={[
                styles.comparisonBarSaved,
                { width: `${savedPercent}%` },
              ]}
            />
          )}
        </View>

        <View style={styles.barLegend}>
          <Text style={styles.legendText}>
            🔴 Expenses: <Text style={styles.boldWhite}>₹{totalExpense.toLocaleString('en-IN')}</Text>
          </Text>
          <Text style={styles.legendText}>
            🟢 Inflow: <Text style={styles.boldWhite}>₹{totalInflow.toLocaleString('en-IN')}</Text>
          </Text>
        </View>

        {/* Channels Breakdown */}
        <View style={styles.breakdownRow}>
          <View style={styles.channelBox}>
            <View style={styles.channelTitleRow}>
              <Ionicons name="business" size={13} color="#60A5FA" />
              <Text style={styles.channelLabel}>Bank & UPI</Text>
            </View>
            <Text style={styles.channelAmount}>₹{bankAmount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.channelBox}>
            <View style={styles.channelTitleRow}>
              <Ionicons name="cash" size={13} color="#34D399" />
              <Text style={styles.channelLabel}>Cash in Hand</Text>
            </View>
            <Text style={styles.channelAmount}>₹{cashAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* List Header */}
      <View style={styles.listHeaderRow}>
        <View>
          <Text style={styles.listTitle}>Money Received History</Text>
          <Text style={styles.listSub}>{inflows.length} credits recorded</Text>
        </View>

        <TouchableOpacity style={styles.quickAddBtn} onPress={onOpenAddInflow}>
          <Ionicons name="add-circle" size={16} color="#059669" />
          <Text style={styles.quickAddBtnText}>+ Add Inflow</Text>
        </TouchableOpacity>
      </View>

      {/* Inflow Items */}
      {inflows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="wallet-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No money received yet</Text>
          <Text style={styles.emptySub}>
            Tap "+ Add Inflow" to log your salary, freelance payments, rental income or gifts.
          </Text>
        </View>
      ) : (
        <View style={styles.inflowsList}>
          {inflows.map((item) => (
            <InflowCard key={item.id} inflow={item} onDelete={onDeleteInflow} />
          ))}
        </View>
      )}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 250,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  heroLabelContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  heroLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroPeriodPill: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    flexShrink: 0,
  },
  personalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  familyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  scopeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  personalBadgeText: {
    color: '#94A3B8',
  },
  familyBadgeText: {
    color: '#34D399',
  },
  netSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  netSavedAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  netZeroAmount: {
    color: '#F8FAFC',
  },
  netDeficitAmount: {
    color: '#EF4444',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rateBadgeNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  rateBadgePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  rateBadgeDeficit: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rateTextPositive: {
    color: '#10B981',
  },
  rateTextDeficit: {
    color: '#EF4444',
  },
  heroSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  comparisonBarBg: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155', // Clean neutral slate grey initially
    overflow: 'hidden',
    marginBottom: 8,
  },
  comparisonBarSpent: {
    backgroundColor: '#EF4444', // Red when debited
    height: '100%',
  },
  comparisonBarSaved: {
    backgroundColor: '#10B981', // Green when credited
    height: '100%',
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  legendText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  channelBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  channelLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  channelAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  listSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  quickAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  emptyCard: {
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
  inflowsList: {
    gap: 2,
  },
});
