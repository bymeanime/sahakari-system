// ============================================================
// Sahakari Mobile - BS Calendar Picker Component
// Bikram Sambat date picker for Nepal
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  getBSMonthDays,
  getBSMonthGrid,
  getBSYearRange,
  bsMonths,
  bsMonthsNep,
  bsDays,
  toNepaliDigits,
  formatBSDate,
  getTodayBS,
} from '@/lib/bs-calendar';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';

interface BSCalendarPickerProps {
  visible: boolean;
  onSelect: (year: number, month: number, day: number) => void;
  onClose: () => void;
  selectedDate?: { year: number; month: number; day: number };
  minYear?: number;
  maxYear?: number;
}

export function BSCalendarPicker({
  visible,
  onSelect,
  onClose,
  selectedDate,
}: BSCalendarPickerProps) {
  const today = getTodayBS();
  const [year, setYear] = useState(selectedDate?.year || today.year);
  const [month, setMonth] = useState(selectedDate?.month || today.month);
  const [day, setDay] = useState(selectedDate?.day || today.day);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const yearRange = useMemo(() => getBSYearRange(), []);
  const weeks = useMemo(() => getBSMonthGrid(year, month), [year, month]);
  const daysInMonth = useMemo(() => getBSMonthDays(year, month), [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setDay(1);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setDay(1);
  };

  const handleSelectDay = (selectedDay: number) => {
    setDay(selectedDay);
    onSelect(year, month, selectedDay);
  };

  const handleToday = () => {
    setYear(today.year);
    setMonth(today.month);
    setDay(today.day);
    onSelect(today.year, today.month, today.day);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>बिक्रम सम्बत पात्रो</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Year & Month Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity style={styles.navButton} onPress={handlePrevMonth}>
            <Text style={styles.navButtonText}>◀</Text>
          </TouchableOpacity>

          <View style={styles.monthYearDisplay}>
            <TouchableOpacity onPress={() => setShowYearPicker(!showYearPicker)}>
              <Text style={styles.monthYearText}>
                {toNepaliDigits(year)} {bsMonthsNep[month - 1]}
              </Text>
              <Text style={styles.monthYearSubtext}>
                {year} {bsMonths[month - 1]}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
            <Text style={styles.navButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Year Picker */}
        {showYearPicker && (
          <ScrollView style={styles.yearPicker} horizontal showsHorizontalScrollIndicator={false}>
            {yearRange.map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.yearItem, y === year && styles.yearItemActive]}
                onPress={() => { setYear(y); setShowYearPicker(false); }}
              >
                <Text style={[styles.yearItemText, y === year && styles.yearItemTextActive]}>
                  {toNepaliDigits(y)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Month Quick Select */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroller}>
          {bsMonthsNep.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.monthChip, month === i + 1 && styles.monthChipActive]}
              onPress={() => { setMonth(i + 1); setDay(1); }}
            >
              <Text style={[styles.monthChipText, month === i + 1 && styles.monthChipTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {bsDays.map((d, i) => (
            <View key={i} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderText, i === 0 && styles.dayHeaderHoliday]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((d, di) => (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.dayCell,
                    d === day && styles.dayCellSelected,
                    d === today.day && month === today.month && year === today.year && styles.dayCellToday,
                    di === 0 && d && styles.dayCellHoliday,
                  ]}
                  onPress={() => d && handleSelectDay(d)}
                  disabled={!d}
                >
                  {d ? (
                    <Text
                      style={[
                        styles.dayCellText,
                        d === day && styles.dayCellTextSelected,
                        d === today.day && month === today.month && year === today.year && d !== day && styles.dayCellTextToday,
                        di === 0 && d !== day && styles.dayCellTextHoliday,
                      ]}
                    >
                      {toNepaliDigits(d)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Selected Date & Today Button */}
        <View style={styles.footer}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedDateText}>
              {formatBSDate(year, month, day)}
            </Text>
            <Text style={styles.selectedDateSubtext}>
              {year}/{String(month).padStart(2, '0')}/{String(day).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.todayButton} onPress={handleToday}>
              <Text style={styles.todayButtonText}>आज</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => { onSelect(year, month, day); onClose(); }}
            >
              <Text style={styles.selectButtonText}>छान्नुहोस्</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    fontSize: FontSizes.xxl,
    color: '#ffffff',
    padding: Spacing.sm,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  monthYearDisplay: {
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  monthYearSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  yearPicker: {
    maxHeight: 60,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  yearItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f1f5f9',
    marginRight: Spacing.sm,
  },
  yearItemActive: {
    backgroundColor: Colors.primary,
  },
  yearItemText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  yearItemTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  monthScroller: {
    maxHeight: 50,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  monthChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f1f5f9',
    marginRight: Spacing.sm,
  },
  monthChipActive: {
    backgroundColor: Colors.primary,
  },
  monthChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  monthChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dayHeaderHoliday: {
    color: '#ef4444',
  },
  calendarGrid: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  dayCell: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayCellHoliday: {
    backgroundColor: '#fef2f2',
  },
  dayCellText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  dayCellTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dayCellTextToday: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dayCellTextHoliday: {
    color: '#ef4444',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 'auto',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedDateText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  selectedDateSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  todayButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f1f5f9',
  },
  todayButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  selectButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  selectButtonText: {
    fontSize: FontSizes.md,
    color: '#ffffff',
    fontWeight: '600',
  },
});
