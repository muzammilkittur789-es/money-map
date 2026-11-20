import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseScope, FamilyMember } from '../types';
import { MemberAvatar } from './MemberAvatar';

interface MemberSpendContribution {
  member: FamilyMember;
  amount: number;
  count: number;
  pct: number;
}

interface StatSummaryProps {
  totalAmount: number;
  onlineAmount: number;
  cashAmount: number;
  scope: ExpenseScope;
  monthlyBudget?: number;
  periodLabel: string;
  // Personal mode split & filter props
  myTotalSpentAmount?: number;
  mySpentOnFamilyAmount?: number;
  myPrivateAmount?: number;
  personalSpendFilter?: 'ALL' | 'FAMILY' | 'PERSONAL';
  onPersonalSpendFilterChange?: (filter: 'ALL' | 'FAMILY' | 'PERSONAL') => void;
  // Family mode member spending props
  memberSpending?: MemberSpendContribution[];
  selectedFamilyMemberId?: string | null;
  onSelectFamilyMemberId?: (id: string | null) => void;
}

export const StatSummary: React.FC<StatSummaryProps> = ({
  totalAmount,
  onlineAmount,
  cashAmount,
  scope,
  monthlyBudget,
  periodLabel,
  myTotalSpentAmount = totalAmount,
  mySpentOnFamilyAmount = 0,
  myPrivateAmount = 0,
  personalSpendFilter = 'ALL',
  onPersonalSpendFilterChange,
  memberSpending = [],
  selectedFamilyMemberId = null,
  onSelectFamilyMemberId,
}) => {
  const onlinePct = totalAmount > 0 ? Math.round((onlineAmount / totalAmount) * 100) : 0;
  const cashPct = totalAmount > 0 ? Math.round((cashAmount / totalAmount) * 100) : 0;

  const budgetProgress =
    monthlyBudget && monthlyBudget > 0 ? Math.min(Math.round((totalAmount / monthlyBudget) * 100), 100) : 0;
  const isBudgetWarning = budgetProgress >= 80;

  const familySpendPct =
    myTotalSpentAmount > 0 ? Math.round((mySpentOnFamilyAmount / myTotalSpentAmount) * 100) : 0;
  const privateSpendPct =
    myTotalSpentAmount > 0 ? Math.round((myPrivateAmount / myTotalSpentAmount) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Primary Total Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroLabelContainer}>
            <Text style={styles.heroLabel} numberOfLines={1} ellipsizeMode="tail">
              {scope === 'PERSONAL'
                ? personalSpendFilter === 'FAMILY'
                  ? 'PAID FOR FAMILY'
                  : personalSpendFilter === 'PERSONAL'
                  ? 'MY PRIVATE SPENDS'
                  : 'MY TOTAL OUTFLOW'
                : selectedFamilyMemberId
                ? 'MEMBER SPENT FOR FAMILY'
                : 'TOTAL OUTFLOW'}
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
              {scope === 'FAMILY' ? 'Family Pool' : 'Personal Spends'}
            </Text>
          </View>
        </View>

        <Text style={styles.heroAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>

        {/* Visual Split Bar */}
        {scope === 'PERSONAL' ? (
          myTotalSpentAmount > 0 ? (
            <View>
              <View style={styles.splitBarContainer}>
                <View
                  style={[
                    styles.splitBarFamily,
                    { flex: mySpentOnFamilyAmount > 0 ? mySpentOnFamilyAmount : 0.001 },
                  ]}
                />
                <View
                  style={[
                    styles.splitBarPrivate,
                    { flex: myPrivateAmount > 0 ? myPrivateAmount : 0.001 },
                  ]}
                />
              </View>
              <View style={styles.splitLegendRow}>
                <Text style={styles.splitLegendText}>
                  👥 For Family: <Text style={styles.legendBoldGreen}>₹{mySpentOnFamilyAmount.toLocaleString('en-IN')} ({familySpendPct}%)</Text>
                </Text>
                <Text style={styles.splitLegendText}>
                  🔒 Private: <Text style={styles.legendBoldIndigo}>₹{myPrivateAmount.toLocaleString('en-IN')} ({privateSpendPct}%)</Text>
                </Text>
              </View>
            </View>
          ) : null
        ) : (
          totalAmount > 0 ? (
            <View style={styles.splitBarContainer}>
              <View style={[styles.splitBarOnline, { flex: onlineAmount || 0.001 }]} />
              <View style={[styles.splitBarCash, { flex: cashAmount || 0.001 }]} />
            </View>
          ) : null
        )}

        {/* Breakdown Cards */}
        {scope === 'PERSONAL' ? (
          <View style={styles.breakdownRow}>
            {/* Spent for Family Pool */}
            <TouchableOpacity
              style={[
                styles.channelBox,
                personalSpendFilter === 'FAMILY' && styles.channelBoxActive,
              ]}
              onPress={() => onPersonalSpendFilterChange?.(personalSpendFilter === 'FAMILY' ? 'ALL' : 'FAMILY')}
              activeOpacity={0.8}
            >
              <View style={styles.channelIconRow}>
                <View style={[styles.channelIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="people" size={13} color="#059669" />
                </View>
                <Text style={styles.channelTitle}>For Family Pool</Text>
              </View>
              <Text style={styles.channelAmount}>₹{mySpentOnFamilyAmount.toLocaleString('en-IN')}</Text>
              <Text style={styles.channelSub}>{familySpendPct}% of your spend</Text>
            </TouchableOpacity>

            {/* Spent on Private Expenses */}
            <TouchableOpacity
              style={[
                styles.channelBox,
                personalSpendFilter === 'PERSONAL' && styles.channelBoxActive,
              ]}
              onPress={() => onPersonalSpendFilterChange?.(personalSpendFilter === 'PERSONAL' ? 'ALL' : 'PERSONAL')}
              activeOpacity={0.8}
            >
              <View style={styles.channelIconRow}>
                <View style={[styles.channelIconBg, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="lock-closed" size={13} color="#4F46E5" />
                </View>
                <Text style={styles.channelTitle}>Private Spends</Text>
              </View>
              <Text style={styles.channelAmount}>₹{myPrivateAmount.toLocaleString('en-IN')}</Text>
              <Text style={styles.channelSub}>{privateSpendPct}% of your spend</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </View>

      {/* Scope-Specific Interactive Filters */}

      {/* 1. PERSONAL MODE: Filter chips between All / For Family / Private Only */}
      {scope === 'PERSONAL' && onPersonalSpendFilterChange ? (
        <View style={styles.filterChipContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              personalSpendFilter === 'ALL' && styles.filterChipActive,
            ]}
            onPress={() => onPersonalSpendFilterChange('ALL')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                personalSpendFilter === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All Outflow (₹{myTotalSpentAmount.toLocaleString('en-IN')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              personalSpendFilter === 'FAMILY' && styles.filterChipActive,
            ]}
            onPress={() => onPersonalSpendFilterChange('FAMILY')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people"
              size={12}
              color={personalSpendFilter === 'FAMILY' ? '#FFFFFF' : '#059669'}
            />
            <Text
              style={[
                styles.filterChipText,
                personalSpendFilter === 'FAMILY' && styles.filterChipTextActive,
              ]}
            >
              👥 For Family (₹{mySpentOnFamilyAmount.toLocaleString('en-IN')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              personalSpendFilter === 'PERSONAL' && styles.filterChipActive,
            ]}
            onPress={() => onPersonalSpendFilterChange('PERSONAL')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="lock-closed"
              size={12}
              color={personalSpendFilter === 'PERSONAL' ? '#FFFFFF' : '#4F46E5'}
            />
            <Text
              style={[
                styles.filterChipText,
                personalSpendFilter === 'PERSONAL' && styles.filterChipTextActive,
              ]}
            >
              🔒 Private (₹{myPrivateAmount.toLocaleString('en-IN')})
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 2. FAMILY MODE: Household Monthly Budget Card */}
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

      {/* 3. FAMILY MODE: Member Spending Filter Chips */}
      {scope === 'FAMILY' && memberSpending.length > 0 && onSelectFamilyMemberId ? (
        <View style={styles.memberFilterSection}>
          <View style={styles.memberFilterHeader}>
            <Ionicons name="people" size={14} color="#059669" />
            <Text style={styles.memberFilterTitle}>Household Member Contributions</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberChipScroll}>
            {/* All Household chip */}
            <TouchableOpacity
              style={[
                styles.memberChip,
                selectedFamilyMemberId === null && styles.memberChipActive,
              ]}
              onPress={() => onSelectFamilyMemberId(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.memberChipName,
                  selectedFamilyMemberId === null && styles.memberChipNameActive,
                ]}
              >
                All Household
              </Text>
            </TouchableOpacity>

            {/* Individual member chips */}
            {memberSpending.map(({ member, amount, pct }) => {
              const isSelected = selectedFamilyMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberChip,
                    isSelected && styles.memberChipActive,
                  ]}
                  onPress={() => onSelectFamilyMemberId(isSelected ? null : member.id)}
                  activeOpacity={0.7}
                >
                  <MemberAvatar size={20} />
                  <Text
                    style={[
                      styles.memberChipName,
                      isSelected && styles.memberChipNameActive,
                    ]}
                  >
                    {member.name}
                  </Text>
                  <View
                    style={[
                      styles.memberChipAmountBadge,
                      isSelected && styles.memberChipAmountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberChipAmountText,
                        isSelected && styles.memberChipAmountTextActive,
                      ]}
                    >
                      ₹{amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#0F172A', // Deep obsidian slate
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  heroPeriodPill: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  personalBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  familyBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
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
    marginBottom: 8,
  },
  splitBarOnline: {
    backgroundColor: '#6366F1', // Indigo
  },
  splitBarCash: {
    backgroundColor: '#10B981', // Emerald
  },
  splitBarFamily: {
    backgroundColor: '#10B981', // Emerald
  },
  splitBarPrivate: {
    backgroundColor: '#6366F1', // Indigo
  },
  splitLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  splitLegendText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  legendBoldGreen: {
    color: '#34D399',
    fontWeight: '700',
  },
  legendBoldIndigo: {
    color: '#818CF8',
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  channelBoxActive: {
    borderColor: '#34D399',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
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
  filterChipContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  memberFilterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  memberFilterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberChipScroll: {
    flexDirection: 'row',
  },
  memberChip: {
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
  memberChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  memberChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  memberChipNameActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  memberChipAmountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberChipAmountBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  memberChipAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  memberChipAmountTextActive: {
    color: '#059669',
  },
});
