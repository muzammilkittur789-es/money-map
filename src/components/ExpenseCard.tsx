import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '../types';
import { getCategoryMeta } from '../utils/categories';
import { MemberAvatar } from './MemberAvatar';

interface ExpenseCardProps {
  expense: Expense;
  onDelete: (id: string) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onDelete }) => {
  const meta = getCategoryMeta(expense.category);

  const formattedDate = new Date(expense.date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to remove "${expense.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.id) },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Category Icon */}
      <View style={[styles.iconContainer, { backgroundColor: meta.bgColor }]}>
        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
      </View>

      {/* Main Details */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={styles.amount}>-₹{expense.amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.dot}>•</Text>

          {/* Payment Type Badge */}
          {expense.paymentMode === 'CASH' ? (
            <View style={[styles.badge, styles.cashBadge]}>
              <Ionicons name="cash" size={10} color="#059669" />
              <Text style={styles.cashBadgeText}>Cash</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.upiBadge]}>
              <Ionicons name="flash" size={10} color="#4F46E5" />
              <Text style={styles.upiBadgeText}>
                {expense.upiProvider ? expense.upiProvider : 'UPI'}
              </Text>
            </View>
          )}

          {/* Scope Badge */}
          <View
            style={[
              styles.badge,
              expense.scope === 'FAMILY' ? styles.familyScopeBadge : styles.personalScopeBadge,
            ]}
          >
            <Text
              style={[
                styles.scopeText,
                expense.scope === 'FAMILY' ? styles.familyScopeText : styles.personalScopeText,
              ]}
            >
              {expense.scope === 'FAMILY' ? 'Family' : 'Personal'}
            </Text>
          </View>
        </View>

        {/* Spender Info */}
        <View style={styles.spenderRow}>
          <MemberAvatar size={16} />
          <Text style={styles.spenderText}>
            Paid by <Text style={styles.spenderName}>{expense.spentBy?.name || 'You'}</Text>
          </Text>
        </View>
      </View>

      {/* Delete Icon */}
      <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton} hitSlop={10}>
        <Ionicons name="trash-outline" size={16} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  dot: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  cashBadge: {
    backgroundColor: '#ECFDF5',
  },
  cashBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  upiBadge: {
    backgroundColor: '#EEF2FF',
  },
  upiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  familyScopeBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 0.5,
    borderColor: '#BBF7D0',
  },
  familyScopeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },
  personalScopeBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  personalScopeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeText: {
    fontSize: 10,
  },
  spenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  spenderEmoji: {
    fontSize: 11,
  },
  spenderText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  spenderName: {
    fontWeight: '600',
    color: '#475569',
  },
  deleteButton: {
    padding: 6,
  },
});
