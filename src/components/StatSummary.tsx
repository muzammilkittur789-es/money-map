import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseScope } from '../types';

interface StatSummaryProps {
  totalAmount: number;
  onlineAmount: number;
  cashAmount: number;
  scope: ExpenseScope;
  monthlyBudget?: number;
  periodLabel: string;
}

export const StatSummary: React.FC<StatSummaryProps> = ({
  totalAmount,
  onlineAmount,
  cashAmount,
  scope,
  monthlyBudget,
  periodLabel,
}) => {
  const onlinePct = totalAmount > 0 ? Math.round((onlineAmount / totalAmount) * 100) : 0;
  const cashPct = totalAmount > 0 ? Math.round((cashAmount / totalAmount) * 100) : 0;

  const budgetProgress =
    monthlyBudget && monthlyBudget > 0 ? Math.min(Math.round((totalAmount / monthlyBudget) * 100), 100) : 0;
  const isBudgetWarning = budgetProgress >= 80;

  return (
    <View style={styles.container}>
      {/* Primary Total Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroLabelContainer}>
            <Text style={styles.heroLabel} numberOfLines={1} ellipsizeMode="tail">
              TOTAL OUTFLOW • {periodLabel.toUpperCase()}
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

        <Text style={styles.heroAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>

        {/* Visual Split Bar */}
        {totalAmount > 0 ? (
          <View style={styles.splitBarContainer}>
            <View style={[styles.splitBarOnline, { flex: onlineAmount || 0.001 }]} />
            <View style={[styles.splitBarCash, { flex: cashAmount || 0.001 }]} />
          </View>
        ) : null}

        {/* Cash vs Online Breakdown Cards */}
        <View style={styles.breakdownRow}>
          {/* Online / UPI */}
          <View style={styles.channelBox}>
            <View style={styles.channelIconRow}>
              <View style={[styles.channelIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="card" size={14} color="#4F46E5" />
              </View>
              <Text style={styles.channelTitle}>UPI & Online</Text>
            </View>
            <Text style={styles.channelAmount}>₹{onlineAmount.toLocaleString('en-IN')}</Text>
            <Text style={styles.channelSub}>{onlinePct}% of total</Text>
          </View>

          {/* Cash */}
          <View style={styles.channelBox}>
            <View style={styles.channelIconRow}>
              <View style={[styles.channelIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="cash" size={14} color="#059669" />
              </View>
              <Text style={styles.channelTitle}>Cash Spent</Text>
            </View>
            <Text style={styles.channelAmount}>₹{cashAmount.toLocaleString('en-IN')}</Text>
            <Text style={styles.channelSub}>{cashPct}% of total</Text>
          </View>
        </View>
      </View>

      {/* Household Monthly Budget Card (Visible if Budget exists) */}
      {monthlyBudget && scope === 'FAMILY' ? (
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetTitleRow}>
              <Ionicons name="shield-checkmark" size={16} color={isBudgetWarning ? '#EF4444' : '#059669'} />
              <Text style={styles.budgetTitle}>Monthly Household Budget</Text>
            </View>
            <Text style={[styles.budgetPercent, isBudgetWarning && styles.budgetPercentWarning]}>
              {budgetProgress}% used
            </Text>
          </View>

          <View style={styles.budgetProgressBarBg}>
            <View
              style={[
                styles.budgetProgressBarFill,
                { width: `${budgetProgress}%` },
                isBudgetWarning && styles.budgetProgressBarFillWarning,
              ]}
            />
          </View>

          <View style={styles.budgetFooter}>
            <Text style={styles.budgetFooterText}>
              Spent: <Text style={styles.boldText}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </Text>
            <Text style={styles.budgetFooterText}>
              Cap: <Text style={styles.boldText}>₹{monthlyBudget.toLocaleString('en-IN')}</Text>
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabelContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  heroLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
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
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  splitBarContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginTop: 10,
    marginBottom: 16,
  },
  splitBarOnline: {
    backgroundColor: '#6366F1', // Indigo
  },
  splitBarCash: {
    backgroundColor: '#10B981', // Emerald
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
  channelIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  channelIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelTitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  channelAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  channelSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  budgetPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  budgetPercentWarning: {
    color: '#EF4444',
  },
  budgetProgressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  budgetProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  budgetProgressBarFillWarning: {
    backgroundColor: '#EF4444',
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  budgetFooterText: {
    fontSize: 11,
    color: '#64748B',
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
});
