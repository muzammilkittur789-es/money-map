import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense, ExpenseScope, FamilyMember } from '../types';
import { getCategoryMeta } from '../utils/categories';

interface AnalyticsChartsProps {
  expenses: Expense[];
  scope: ExpenseScope;
  members: FamilyMember[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  expenses,
  scope,
  members,
}) => {
  const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((item) => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5 categories

  // Group by member (for Family view)
  const memberTotals: Record<string, { member: FamilyMember; total: number }> = {};
  members.forEach((m) => {
    memberTotals[m.id] = { member: m, total: 0 };
  });

  expenses.forEach((item) => {
    if (memberTotals[item.spentBy.id]) {
      memberTotals[item.spentBy.id].total += item.amount;
    } else {
      memberTotals[item.spentBy.id] = { member: item.spentBy, total: item.amount };
    }
  });

  const memberList = Object.values(memberTotals).sort((a, b) => b.total - a.total);

  if (totalAmount === 0) return null;

  return (
    <View style={styles.container}>
      {/* Category Breakdown Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Top Spending Categories</Text>
          <Text style={styles.cardSubtitle}>Share of wallet</Text>
        </View>

        <View style={styles.categoriesList}>
          {sortedCategories.map(([categoryName, amount]) => {
            const meta = getCategoryMeta(categoryName as any);
            const percentage = Math.round((amount / totalAmount) * 100);

            return (
              <View key={categoryName} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleGroup}>
                    <View style={[styles.categoryIconBg, { backgroundColor: meta.bgColor }]}>
                      <Ionicons name={meta.icon as any} size={15} color={meta.color} />
                    </View>
                    <Text style={styles.categoryName}>{categoryName}</Text>
                  </View>

                  <View style={styles.categoryNumbers}>
                    <Text style={styles.categoryAmount}>₹{amount.toLocaleString('en-IN')}</Text>
                    <Text style={styles.categoryPct}>{percentage}%</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${percentage}%`, backgroundColor: meta.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Member Breakdown (Only in Family Pool mode) */}
      {scope === 'FAMILY' && memberList.length > 1 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Household Member Breakdown</Text>
            <Text style={styles.cardSubtitle}>Who paid for what</Text>
          </View>

          <View style={styles.membersList}>
            {memberList.map(({ member, total }) => {
              const pct = totalAmount > 0 ? Math.round((total / totalAmount) * 100) : 0;
              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatarCircle}>
                    <Text style={styles.avatarEmoji}>{member.avatar}</Text>
                  </View>

                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>
                        {member.name} {member.isCurrentUser ? '(You)' : ''}
                      </Text>
                      <Text style={styles.memberAmount}>₹{total.toLocaleString('en-IN')}</Text>
                    </View>

                    <View style={styles.memberBarBg}>
                      <View
                        style={[
                          styles.memberBarFill,
                          { width: `${pct}%`, backgroundColor: member.color || '#10B981' },
                        ]}
                      />
                    </View>
                    <Text style={styles.memberPct}>{pct}% of household spend</Text>
                  </View>
                </View>
              );
            })}
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
    gap: 16,
  },
  card: {
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  categoriesList: {
    gap: 14,
  },
  categoryItem: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryPct: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  barBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  membersList: {
    gap: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  memberAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  memberBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  memberPct: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
