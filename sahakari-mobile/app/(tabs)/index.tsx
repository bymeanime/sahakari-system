// ============================================================
// Sahakari Mobile - Dashboard Screen
// Main dashboard with KPIs, charts, and recent activities
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { getTodayBS, formatBSDate, formatNPR, toNepaliDigits } from '@/lib/bs-calendar';

interface KPIs {
  totalMembers: number;
  totalSavings: number;
  totalLoansDisbursed: number;
  totalOutstanding: number;
  totalAssets: number;
  totalShareCapital: number;
  pendingLoans: number;
  totalEmployees: number;
  totalDeposits: number;
  totalSalaryExpense: number;
}

interface DashboardData {
  kpis: KPIs;
  monthlyTrend: Array<{ month: string; savings: number; loans: number; income: number }>;
  loanStatusDist: Array<{ name: string; value: number; color: string }>;
  savingsByProduct: Array<{ name: string; total: number; count: number }>;
  recentActivities: Array<{ type: string; description: string; time: string; icon: string }>;
  members: any[];
  savingsAccounts: any[];
  loanApps: any[];
}

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const result = await api.get<DashboardData>('/api/dashboard');
    if (result.data) {
      setData(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const todayBS = getTodayBS();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>सहकारी प्रणाली लोड हुँदैछ...</Text>
      </View>
    );
  }

  const kpis = data?.kpis;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeGreeting}>नमस्ते, {user?.name || 'प्रयोगकर्ता'}</Text>
        <Text style={styles.welcomeDate}>
          {formatBSDate(todayBS.year, todayBS.month, todayBS.day)}
        </Text>
        <Text style={styles.welcomeRole}>
          {user?.role || 'STAFF'} | {formatNPR(0)} balance
        </Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <KPICard
          title="कुल सदस्य"
          value={toNepaliDigits(kpis?.totalMembers || 0)}
          subtitle="Total Members"
          color={Colors.modules.members}
          icon="👥"
        />
        <KPICard
          title="कुल बचत"
          value={formatNPR(kpis?.totalSavings || 0)}
          subtitle="Total Savings"
          color={Colors.modules.savings}
          icon="🏦"
        />
        <KPICard
          title="ऋण वितरण"
          value={formatNPR(kpis?.totalLoansDisbursed || 0)}
          subtitle="Loans Disbursed"
          color={Colors.modules.loans}
          icon="💰"
        />
        <KPICard
          title="बक्यौता"
          value={formatNPR(kpis?.totalOutstanding || 0)}
          subtitle="Outstanding"
          color={Colors.modules.accounting}
          icon="📊"
        />
        <KPICard
          title="सम्पत्ति"
          value={formatNPR(kpis?.totalAssets || 0)}
          subtitle="Total Assets"
          color={Colors.modules.assets}
          icon="🏢"
        />
        <KPICard
          title="शेयर पूँजी"
          value={formatNPR(kpis?.totalShareCapital || 0)}
          subtitle="Share Capital"
          color={Colors.modules.shares}
          icon="📈"
        />
      </View>

      {/* Loan Status Distribution */}
      {data?.loanStatusDist && data.loanStatusDist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ऋण स्थिति वितरण</Text>
          <View style={styles.chartContainer}>
            {data.loanStatusDist.map((item, index) => (
              <View key={index} style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                <Text style={styles.statusLabel}>{item.name}</Text>
                <Text style={styles.statusValue}>{toNepaliDigits(item.value)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Savings by Product */}
      {data?.savingsByProduct && data.savingsByProduct.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>बचत उत्पादन अनुसार</Text>
          <View style={styles.savingsList}>
            {data.savingsByProduct.map((item, index) => (
              <View key={index} style={styles.savingsItem}>
                <View style={styles.savingsItemHeader}>
                  <Text style={styles.savingsItemName}>{item.name}</Text>
                  <Text style={styles.savingsItemCount}>{toNepaliDigits(item.count)} खाताहरू</Text>
                </View>
                <View style={styles.savingsBar}>
                  <View
                    style={[
                      styles.savingsBarFill,
                      {
                        width: `${Math.min(100, (item.total / (kpis?.totalSavings || 1)) * 100)}%`,
                        backgroundColor: Colors.modules.savings,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.savingsItemAmount}>{formatNPR(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent Activities */}
      {data?.recentActivities && data.recentActivities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>हालको गतिविधि</Text>
          {data.recentActivities.slice(0, 5).map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <Text style={styles.activityIcon}>{activity.icon || '📋'}</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityDesc}>{activity.description}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Pending Loans Alert */}
      {kpis?.pendingLoans && kpis.pendingLoans > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>विचाराधीन ऋण</Text>
            <Text style={styles.alertText}>
              {toNepaliDigits(kpis.pendingLoans)} ऋण आवेदनहरू विचाराधीन छन्
            </Text>
          </View>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// KPI Card Component
function KPICard({ title, value, subtitle, color, icon }: {
  title: string; value: string; subtitle: string; color: string; icon: string;
}) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiIcon}>{icon}</Text>
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.kpiSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  welcomeCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
  },
  welcomeGreeting: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  welcomeDate: {
    fontSize: FontSizes.md,
    color: '#d1fae5',
    marginTop: Spacing.xs,
  },
  welcomeRole: {
    fontSize: FontSizes.sm,
    color: '#a7f3d0',
    marginTop: Spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  kpiCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  kpiIcon: {
    fontSize: 18,
  },
  kpiTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  kpiSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  section: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  savingsList: {
    gap: Spacing.lg,
  },
  savingsItem: {
    gap: Spacing.xs,
  },
  savingsItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savingsItemName: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  savingsItemCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  savingsBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  savingsBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  savingsItemAmount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityDesc: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  activityTime: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#fef3c7',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: '#92400e',
  },
  alertText: {
    fontSize: FontSizes.sm,
    color: '#a16207',
    marginTop: Spacing.xs,
  },
  bottomSpacer: {
    height: 24,
  },
});
