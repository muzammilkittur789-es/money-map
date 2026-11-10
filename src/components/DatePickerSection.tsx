import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerSectionProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerSection: React.FC<DatePickerSectionProps> = ({
  value,
  onChange,
  label = 'TRANSACTION DATE',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(new Date(value));
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const now = new Date();
  const isToday =
    value.getDate() === now.getDate() &&
    value.getMonth() === now.getMonth() &&
    value.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    value.getDate() === yesterday.getDate() &&
    value.getMonth() === yesterday.getMonth() &&
    value.getFullYear() === yesterday.getFullYear();

  const formattedDate = value.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const getDisplayBadge = () => {
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return null;
  };

  const handleSelectQuick = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    onChange(target);
  };

  const openCalendar = () => {
    setCurrentViewDate(new Date(value));
    setShowManualInput(false);
    setManualInput('');
    setModalVisible(true);
  };

  const changeMonth = (delta: number) => {
    setCurrentViewDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      return next;
    });
  };

  const handlePickDay = (day: number) => {
    const chosen = new Date(
      currentViewDate.getFullYear(),
      currentViewDate.getMonth(),
      day,
      value.getHours(),
      value.getMinutes()
    );
    onChange(chosen);
    setModalVisible(false);
  };

  const handleApplyManual = () => {
    // Format expected: DD/MM/YYYY or DD-MM-YYYY
    const parts = manualInput.trim().split(/[/-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000 && year < 2100) {
        const manualDate = new Date(year, month, day, value.getHours(), value.getMinutes());
        if (!isNaN(manualDate.getTime())) {
          onChange(manualDate);
          setModalVisible(false);
          return;
        }
      }
    }
  };

  // Calendar calculations
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{label}</Text>

      {/* Main Date Display Row */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateSelectorCard} onPress={openCalendar} activeOpacity={0.7}>
          <View style={styles.dateIconBg}>
            <Ionicons name="calendar-outline" size={18} color="#059669" />
          </View>
          <View style={styles.dateTextGroup}>
            <View style={styles.dateMainLine}>
              <Text style={styles.dateText}>{formattedDate}</Text>
              {getDisplayBadge() && (
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{getDisplayBadge()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.dateSubText}>Tap to change date</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Quick Date Pills */}
      <View style={styles.quickPillsRow}>
        <TouchableOpacity
          style={[styles.quickPill, isToday && styles.quickPillActive]}
          onPress={() => handleSelectQuick(0)}
        >
          <Text style={[styles.quickPillText, isToday && styles.quickPillTextActive]}>Today</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickPill, isYesterday && styles.quickPillActive]}
          onPress={() => handleSelectQuick(1)}
        >
          <Text style={[styles.quickPillText, isYesterday && styles.quickPillTextActive]}>
            Yesterday
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickPill, !isToday && !isYesterday && styles.quickPillActive]}
          onPress={openCalendar}
        >
          <Ionicons
            name="calendar"
            size={12}
            color={!isToday && !isYesterday ? '#FFFFFF' : '#059669'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.quickPillText, !isToday && !isYesterday && styles.quickPillTextActive]}>
            {!isToday && !isYesterday ? 'Custom Date' : 'Choose Date...'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date</Text>
                <Text style={styles.modalSubTitle}>{formattedDate}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Month Switcher */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Weekday Names */}
            <View style={styles.weekdayRow}>
              {WEEK_DAYS.map((wd) => (
                <Text key={wd} style={styles.weekdayText}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }

                const isSelected =
                  value.getDate() === day &&
                  value.getMonth() === month &&
                  value.getFullYear() === year;

                const isTodayCell =
                  now.getDate() === day &&
                  now.getMonth() === month &&
                  now.getFullYear() === year;

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.dayCell,
                      isTodayCell && styles.todayCell,
                      isSelected && styles.selectedDayCell,
                    ]}
                    onPress={() => handlePickDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isTodayCell && styles.todayText,
                        isSelected && styles.selectedDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Manual Typing Toggle */}
            <View style={styles.manualOptionSection}>
              {!showManualInput ? (
                <TouchableOpacity
                  style={styles.manualInputToggle}
                  onPress={() => setShowManualInput(true)}
                >
                  <Ionicons name="create-outline" size={14} color="#059669" />
                  <Text style={styles.manualInputToggleText}>Type date manually (DD/MM/YYYY)</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.manualInputContainer}>
                  <TextInput
                    style={styles.manualTextInput}
                    placeholder="DD/MM/YYYY (e.g. 05/11/2026)"
                    placeholderTextColor="#94A3B8"
                    value={manualInput}
                    onChangeText={setManualInput}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TouchableOpacity style={styles.manualApplyBtn} onPress={handleApplyManual}>
                    <Text style={styles.manualApplyBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Modal Quick Footer Actions */}
            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.footerActionBtn}
                onPress={() => {
                  handleSelectQuick(0);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.footerActionBtnText}>Set to Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.footerActionBtn}
                onPress={() => {
                  handleSelectQuick(1);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.footerActionBtnText}>Set to Yesterday</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    marginBottom: 8,
  },
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  dateIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTextGroup: {
    flex: 1,
  },
  dateMainLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dateSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  quickPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
    borderRadius: 19,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  selectedDayCell: {
    backgroundColor: '#059669',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  todayText: {
    color: '#059669',
    fontWeight: '800',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  manualOptionSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  manualInputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  manualInputToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  manualInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  manualApplyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  manualApplyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalFooterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  footerActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
