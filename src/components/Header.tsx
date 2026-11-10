import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseScope, TimeFilter } from '../types';

interface HeaderProps {
  currentScope: ExpenseScope;
  onScopeChange: (scope: ExpenseScope) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  familyName: string;
  onOpenFamilyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScope,
  onScopeChange,
  timeFilter,
  onTimeFilterChange,
  familyName,
  onOpenFamilyModal,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 38 : 20) + 8;

  const isSoloOrUnlinked =
    !familyName ||
    familyName.includes('Personal Space') ||
    familyName.toLowerCase().includes('not in family');

  const displayedBadgeName = isSoloOrUnlinked ? 'Personal' : (familyName.length > 12 ? familyName.substring(0, 10) + '…' : familyName);

  const getSubtitle = () => {
    if (currentScope === 'PERSONAL') {
      return 'Private Ledger';
    }
    if (isSoloOrUnlinked) {
      return 'Household Shared';
    }
    return `${familyName} Ledger`;
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <Text style={styles.appTitle}>Money Map</Text>
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {getSubtitle()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.familyBadge, isSoloOrUnlinked && styles.familyBadgePrompt]}
          onPress={onOpenFamilyModal}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSoloOrUnlinked ? 'people-outline' : 'people'}
            size={15}
            color={isSoloOrUnlinked ? '#0D9488' : '#059669'}
          />
          <Text
            style={[
              styles.familyBadgeText,
              isSoloOrUnlinked && styles.familyBadgeTextPrompt,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayedBadgeName}
          </Text>
          <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Scope Switcher: My Spends vs Family Pool */}
      <View style={styles.scopeSwitcher}>
        <TouchableOpacity
          style={[styles.scopeTab, currentScope === 'PERSONAL' && styles.scopeTabActive]}
          onPress={() => onScopeChange('PERSONAL')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person"
            size={16}
            color={currentScope === 'PERSONAL' ? '#0F172A' : '#64748B'}
          />
          <Text
            style={[styles.scopeTabText, currentScope === 'PERSONAL' && styles.scopeTabTextActive]}
          >
            My Spends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scopeTab, currentScope === 'FAMILY' && styles.scopeTabActive]}
          onPress={() => onScopeChange('FAMILY')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people"
            size={16}
            color={currentScope === 'FAMILY' ? '#0F172A' : '#64748B'}
          />
          <Text
            style={[styles.scopeTabText, currentScope === 'FAMILY' && styles.scopeTabTextActive]}
          >
            Family Pool
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Filter Pills - Horizontally Scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeFilterScroll}
      >
        {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'] as TimeFilter[]).map((filter) => {
          const labels: Record<TimeFilter, string> = {
            TODAY: 'Today',
            WEEK: 'This Week',
            MONTH: 'This Month',
            YEAR: 'This Year',
            ALL: 'All Time',
          };
          const isActive = timeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.timePill, isActive && styles.timePillActive]}
              onPress={() => onTimeFilterChange(filter)}
            >
              <Text style={[styles.timePillText, isActive && styles.timePillTextActive]}>
                {labels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  topRowLeft: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    marginRight: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
    maxWidth: 120,
    flexShrink: 0,
  },
  familyBadgePrompt: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  familyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    flexShrink: 1,
  },
  familyBadgeTextPrompt: {
    color: '#0F766E',
  },
  scopeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
  },
  scopeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeTabTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  timeFilterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 12,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timePillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
