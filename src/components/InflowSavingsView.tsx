import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseScope, FamilyMember, InflowItem } from '../types';
import { InflowCard } from './InflowCard';
import { MemberAvatar } from './MemberAvatar';

interface MemberSpendContribution {
  member: FamilyMember;
  amount: number;
  count: number;
  pct: number;
}

interface InflowSavingsViewProps {
  inflows: InflowItem[];
  totalInflow: number;
  totalExpense: number;
  scope: ExpenseScope;
  periodLabel: string;
  members: FamilyMember[];
  onDeleteInflow: (id: string) => void;
  onOpenAddInflow: () => void;
  mySpentOnFamilyAmount?: number;
  myPrivateAmount?: number;
  memberSpending?: MemberSpendContribution[];
  familyTotalSpent?: number;
}

export const InflowSavingsView: React.FC<InflowSavingsViewProps> = ({
  inflows,
  totalInflow,
  totalExpense,
  scope,
  periodLabel,
  onDeleteInflow,
  onOpenAddInflow,
  mySpentOnFamilyAmount = 0,
  myPrivateAmount = 0,
  memberSpending = [],
  familyTotalSpent = 0,
}) => {
  const hasTransactions = totalInflow > 0 || totalExpense > 0;
  const netSaved = totalInflow - totalExpense;
  const isSurplus = netSaved >= 0;

  let spentPercent = 0;
  let savedPercent = 0;

  if (!hasTransactions) {
    spentPercent = 0;
    savedPercent = 0;
  } else if (totalInflow === 0 && totalExpense > 0) {
    spentPercent = 100;
    savedPercent = 0;
  } else if (totalInflow > 0 && totalExpense === 0) {
    spentPercent = 0;
    savedPercent = 100;
  } else {
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
      {/* If viewing in FAMILY mode: explain that inflows are strictly individual, and show member spending for family */}
      {scope === 'FAMILY' ? (
        <View style={styles.familyNoticeContainer}>
          <View style={styles.familyNoticeCard}>
            <View style={styles.noticeIconBg}>
              <Ionicons name="information-circle" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Individual Inflows & Net Savings</Text>
              <Text style={styles.noticeText}>
                All cash inflows and savings belong strictly to each individual member's private account. The Family Pool is strictly for collective household expenses.
              </Text>
            </View>
          </View>

          {/* Household Member Spending Breakdown Card */}
          <View style={styles.memberSpendingCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Household Member Spending</Text>
                <Text style={styles.cardSubtitle}>
                  Who paid how much for the family ({periodLabel})
                </Text>
              </View>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>
                  Total: ₹{familyTotalSpent.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {memberSpending.length === 0 ? (
              <View style={styles.emptyMemberBox}>
                <Text style={styles.emptyMemberText}>No household expenses recorded yet.</Text>
              </View>
            ) : (
              <View style={styles.memberList}>
                {memberSpending.map(({ member, amount, count, pct }) => (
                  <View key={member.id} style={styles.memberRow}>
                    <MemberAvatar size={38} />
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>
                          {member.name} {member.isCurrentUser ? '(You)' : ''}
                        </Text>
                        <Text style={styles.memberAmount}>₹{amount.toLocaleString('en-IN')}</Text>
                      </View>

                      {/* Progress bar */}
                      <View style={styles.memberBarBg}>
                        <View
                          style={[
                            styles.memberBarFill,
                            { width: `${pct}%`, backgroundColor: member.color || '#059669' },
                          ]}
                        />
                      </View>

                      <View style={styles.memberSubRow}>
                        <Text style={styles.memberPct}>{pct}% of household spend</Text>
                        <Text style={styles.memberCount}>{count} expenses</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : (
        /* PERSONAL MODE: Complete Personal Net Savings Ledger */
        <>
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
              <View style={[styles.scopeBadge, styles.personalBadge]}>
                <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                <Text style={[styles.scopeBadgeText, styles.personalBadgeText]} numberOfLines={1}>
                  Personal Ledger
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
                : `Total expenses exceeded inflows by ₹${Math.abs(netSaved).toLocaleString('en-IN')}.`}
            </Text>

            {/* Visual Inflow vs Outflow Comparison Bar */}
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
                🔴 Total Outflow: <Text style={styles.boldWhite}>₹{totalExpense.toLocaleString('en-IN')}</Text>
              </Text>
              <Text style={styles.legendText}>
                🟢 Inflow: <Text style={styles.boldWhite}>₹{totalInflow.toLocaleString('en-IN')}</Text>
              </Text>
            </View>

            {/* Out-of-pocket spend breakdown (Family vs Private) */}
            {(mySpentOnFamilyAmount > 0 || myPrivateAmount > 0) && (
              <View style={styles.spendSplitRow}>
                <View style={styles.spendSplitPill}>
                  <Ionicons name="people" size={12} color="#34D399" />
                  <Text style={styles.spendSplitText}>
                    Paid for Family: <Text style={styles.boldGreen}>₹{mySpentOnFamilyAmount.toLocaleString('en-IN')}</Text>
                  </Text>
                </View>
                <View style={styles.spendSplitPill}>
                  <Ionicons name="lock-closed" size={11} color="#818CF8" />
                  <Text style={styles.spendSplitText}>
                    Private: <Text style={styles.boldIndigo}>₹{myPrivateAmount.toLocaleString('en-IN')}</Text>
                  </Text>
                </View>
              </View>
            )}

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
                Tap "+ Add Inflow" to log your salary, freelance payments, rental income or pocket money.
              </Text>
            </View>
          ) : (
            <View style={styles.inflowsList}>
              {inflows.map((item) => (
                <InflowCard key={item.id} inflow={item} onDelete={onDeleteInflow} />
              ))}
            </View>
          )}
        </>
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
  familyNoticeContainer: {
    gap: 16,
  },
  familyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
  },
  noticeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  noticeText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 17,
  },
  memberSpendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyMemberBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyMemberText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  memberList: {
    gap: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  memberBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  memberBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  memberSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberPct: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  memberCount: {
    fontSize: 11,
    color: '#94A3B8',
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
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  heroPeriodPill: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
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
  scopeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  personalBadgeText: {
    color: '#94A3B8',
  },
  netSavedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginVertical: 4,
  },
  netSavedAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  netDeficitAmount: {
    color: '#EF4444',
  },
  netZeroAmount: {
    color: '#94A3B8',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  rateBadgePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  rateBadgeDeficit: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  rateBadgeNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  rateBadgeText: {
    fontSize: 11,
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
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  comparisonBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 8,
  },
  comparisonBarSpent: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  comparisonBarSaved: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  spendSplitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  spendSplitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  spendSplitText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  boldGreen: {
    color: '#34D399',
    fontWeight: '700',
  },
  boldIndigo: {
    color: '#A5B4FC',
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  channelBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  channelLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  channelAmount: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  listSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  quickAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },
  inflowsList: {
    gap: 10,
  },
});
