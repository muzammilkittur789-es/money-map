import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InflowItem } from '../types';
import { getInflowCategoryMeta } from '../utils/inflowCategories';

interface InflowCardProps {
  inflow: InflowItem;
  onDelete: (id: string) => void;
}

export const InflowCard: React.FC<InflowCardProps> = ({ inflow, onDelete }) => {
  const meta = getInflowCategoryMeta(inflow.category);

  const formattedDate = new Date(inflow.date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete Inflow Entry',
      `Are you sure you want to remove "${inflow.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(inflow.id) },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: meta.bgColor }]}>
        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {inflow.title}
          </Text>
          <Text style={styles.amount}>+₹{inflow.amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.dot}>•</Text>

          {/* Channel Badge */}
          {inflow.channel === 'CASH' ? (
            <View style={[styles.badge, styles.cashBadge]}>
              <Ionicons name="cash" size={10} color="#059669" />
              <Text style={styles.cashBadgeText}>Cash in Hand</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.bankBadge]}>
              <Ionicons name="business" size={10} color="#2563EB" />
              <Text style={styles.bankBadgeText}>Bank / UPI</Text>
            </View>
          )}

          {/* Scope Badge */}
          <View
            style={[
              styles.badge,
              inflow.scope === 'FAMILY' ? styles.familyScopeBadge : styles.personalScopeBadge,
            ]}
          >
            <Text
              style={[
                styles.scopeText,
                inflow.scope === 'FAMILY' ? styles.familyScopeText : styles.personalScopeText,
              ]}
            >
              {inflow.scope === 'FAMILY' ? 'Family' : 'Personal'}
            </Text>
          </View>
        </View>

        {/* Recipient */}
        <View style={styles.spenderRow}>
          <Text style={styles.spenderEmoji}>{inflow.receivedBy?.avatar || '👤'}</Text>
          <Text style={styles.spenderText}>
            Received by <Text style={styles.spenderName}>{inflow.receivedBy?.name || 'You'}</Text>
          </Text>
        </View>
      </View>

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
    color: '#16A34A',
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
  bankBadge: {
    backgroundColor: '#EFF6FF',
  },
  bankBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
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
