// ============================================================
// Sahakari Mobile - More Screen
// Additional modules: Accounting, HR, Inventory, Assets, etc.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { formatNPR, toNepaliDigits, getTodayBS, formatBSDate } from '@/lib/bs-calendar';

interface MoreModule {
  key: string;
  title: string;
  titleNep: string;
  icon: string;
  color: string;
  description: string;
}

const modules: MoreModule[] = [
  { key: 'accounting', title: 'Accounting', titleNep: 'लेखा', icon: '📒', color: '#7c3aed', description: 'Chart of Accounts & Journal Entries' },
  { key: 'hr', title: 'HR & Payroll', titleNep: 'मानव संसाधन', icon: '👤', color: '#0d9488', description: 'Employees, Attendance & Payroll' },
  { key: 'inventory', title: 'Inventory', titleNep: 'सूची', icon: '📦', color: '#ea580c', description: 'Stock Management & Tracking' },
  { key: 'assets', title: 'Assets', titleNep: 'सम्पत्ति', icon: '🏢', color: '#0891b2', description: 'Fixed Assets & Depreciation' },
  { key: 'shares', title: 'Shares', titleNep: 'शेयर', icon: '📈', color: '#4f46e5', description: 'Share Capital & Certificates' },
  { key: 'meetings', title: 'Meetings', titleNep: 'बैठक', icon: '📅', color: '#db2777', description: 'AGM, Board & Committee Meetings' },
  { key: 'reports', title: 'Reports', titleNep: 'प्रतिवेदन', icon: '📊', color: '#475569', description: 'NRB Reports & Analytics' },
  { key: 'notifications', title: 'Notifications', titleNep: 'सूचना', icon: '🔔', color: '#f59e0b', description: 'Alerts & SMS' },
  { key: 'settings', title: 'Settings', titleNep: 'सेटिङ', icon: '⚙️', color: '#6b7280', description: 'Organization & System Config' },
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadModuleData = async (key: string) => {
    setActiveModule(key);
    setLoading(true);

    const apiMap: Record<string, string> = {
      accounting: '/api/accounting',
      hr: '/api/hr',
      inventory: '/api/inventory',
      assets: '/api/assets',
      shares: '/api/shares',
      meetings: '/api/meetings',
      reports: '/api/reports',
      notifications: '/api/notifications',
    };

    const endpoint = apiMap[key];
    if (endpoint) {
      const result = await api.get(endpoint);
      if (result.data) {
        setModuleData(result.data);
      }
    }
    setLoading(false);
  };

  const todayBS = getTodayBS();

  const handleLogout = () => {
    Alert.alert(
      'लगआउट',
      'के तपाईं लगआउट गर्न चाहनुहुन्छ?',
      [
        { text: 'रद्द गर्नुहोस्', style: 'cancel' },
        { text: 'लगआउट', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileRole}>{user?.role || 'STAFF'}</Text>
          <Text style={styles.profileDate}>
            {formatBSDate(todayBS.year, todayBS.month, todayBS.day)}
          </Text>
        </View>
      </View>

      {/* Modules Grid */}
      <ScrollView style={styles.modulesContainer}>
        <Text style={styles.sectionTitle}>सुविधाहरू</Text>
        <View style={styles.modulesGrid}>
          {modules.map(mod => (
            <TouchableOpacity
              key={mod.key}
              style={styles.moduleCard}
              onPress={() => loadModuleData(mod.key)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '20' }]}>
                <Text style={styles.moduleIconText}>{mod.icon}</Text>
              </View>
              <Text style={styles.moduleTitle}>{mod.titleNep}</Text>
              <Text style={styles.moduleSubtitle}>{mod.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>लगआउट गर्नुहोस्</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>सहकारी प्रणाली v2.0</Text>
          <Text style={styles.appInfoText}>Cooperative Act 2047 Compliant</Text>
          <Text style={styles.appInfoText}>© 2082 Janata Sahakari Sanstha Ltd.</Text>
        </View>
      </ScrollView>

      {/* Module Detail Modal */}
      <Modal visible={!!activeModule} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modules.find(m => m.key === activeModule)?.titleNep || 'विवरण'}
            </Text>
            <TouchableOpacity onPress={() => { setActiveModule(null); setModuleData(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>लोड हुँदैछ...</Text>
              </View>
            ) : (
              <ModuleContent moduleKey={activeModule!} data={moduleData} />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Dynamic Module Content Renderer
function ModuleContent({ moduleKey, data }: { moduleKey: string; data: any }) {
  switch (moduleKey) {
    case 'accounting':
      return <AccountingModule data={data} />;
    case 'hr':
      return <HRModule data={data} />;
    case 'inventory':
      return <InventoryModule data={data} />;
    case 'assets':
      return <AssetsModule data={data} />;
    case 'shares':
      return <SharesModule data={data} />;
    case 'meetings':
      return <MeetingsModule data={data} />;
    case 'reports':
      return <ReportsModule />;
    case 'notifications':
      return <NotificationsModule data={data} />;
    case 'settings':
      return <SettingsModule />;
    default:
      return <Text style={styles.noData}>मोड्युल भेटिएन</Text>;
  }
}

// Accounting Module
function AccountingModule({ data }: { data: any }) {
  const accounts = data?.accounts || [];
  const journalEntries = data?.journalEntries || data?.entries || [];

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>चार्ट अफ अकाउन्ट्स ({toNepaliDigits(accounts.length)})</Text>
      {accounts.slice(0, 10).map((acc: any, i: number) => (
        <View key={i} style={styles.dataRow}>
          <View style={[styles.dataIcon, { backgroundColor: acc.type === 'ASSET' ? '#dbeafe' : acc.type === 'LIABILITY' ? '#fce7f3' : acc.type === 'INCOME' ? '#d1fae5' : '#fef3c7' }]}>
            <Text style={styles.dataIconText}>{acc.type === 'ASSET' ? '🏦' : acc.type === 'LIABILITY' ? '📋' : acc.type === 'INCOME' ? '📈' : '📉'}</Text>
          </View>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{acc.code} - {acc.name}</Text>
            <Text style={styles.dataSub}>{acc.type} {acc.subType ? `| ${acc.subType}` : ''}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.moduleSectionTitle}>जर्नल प्रविष्टि ({toNepaliDigits(journalEntries.length)})</Text>
      {journalEntries.slice(0, 5).map((entry: any, i: number) => (
        <View key={i} style={styles.dataRow}>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{entry.voucherNo}</Text>
            <Text style={styles.dataSub}>{entry.narration}</Text>
            <Text style={styles.dataSub}>{entry.date} | {entry.status}</Text>
          </View>
        </View>
      ))}
      {accounts.length === 0 && journalEntries.length === 0 && (
        <Text style={styles.noData}>कुनै लेखा डाटा भेटिएन</Text>
      )}
    </View>
  );
}

// HR Module
function HRModule({ data }: { data: any }) {
  const employees = data?.employees || [];

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>कर्मचारी ({toNepaliDigits(employees.length)})</Text>
      {employees.slice(0, 10).map((emp: any, i: number) => (
        <View key={i} style={styles.dataRow}>
          <View style={styles.empAvatar}>
            <Text style={styles.empAvatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
          </View>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{emp.firstName} {emp.lastName}</Text>
            <Text style={styles.dataSub}>{emp.position || emp.department || '—'} | {emp.employeeId}</Text>
            <Text style={styles.dataSub}>{emp.status} | {formatNPR(emp.salary)}</Text>
          </View>
        </View>
      ))}
      {employees.length === 0 && <Text style={styles.noData}>कुनै कर्मचारी भेटिएन</Text>}
    </View>
  );
}

// Inventory Module
function InventoryModule({ data }: { data: any }) {
  const items = data?.items || data?.inventory || [];

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>सूची वस्तुहरू ({toNepaliDigits(items.length)})</Text>
      {items.slice(0, 10).map((item: any, i: number) => (
        <View key={i} style={styles.dataRow}>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{item.code} - {item.name}</Text>
            <Text style={styles.dataSub}>मात्रा: {toNepaliDigits(item.quantity)} {item.unit} | {formatNPR(item.totalValue)}</Text>
            <Text style={styles.dataSub}>{item.category || '—'} | {item.location || '—'}</Text>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: item.quantity <= item.minStockLevel ? '#fee2e2' : '#d1fae5' }]}>
            <Text style={[styles.stockBadgeText, { color: item.quantity <= item.minStockLevel ? '#dc2626' : '#059669' }]}>
              {item.quantity <= item.minStockLevel ? 'कम' : 'पर्याप्त'}
            </Text>
          </View>
        </View>
      ))}
      {items.length === 0 && <Text style={styles.noData}>कुनै सूची वस्तु भेटिएन</Text>}
    </View>
  );
}

// Assets Module
function AssetsModule({ data }: { data: any }) {
  const assets = data?.assets || [];

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>सम्पत्तिहरू ({toNepaliDigits(assets.length)})</Text>
      {assets.slice(0, 10).map((asset: any, i: number) => (
        <View key={i} style={styles.dataRow}>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{asset.code} - {asset.name}</Text>
            <Text style={styles.dataSub}>खरिद: {formatNPR(asset.purchasePrice)} | हाल: {formatNPR(asset.currentValue)}</Text>
            <Text style={styles.dataSub}>{asset.category || '—'} | {asset.status}</Text>
          </View>
        </View>
      ))}
      {assets.length === 0 && <Text style={styles.noData}>कुनै सम्पत्ति भेटिएन</Text>}
    </View>
  );
}

// Shares Module
function SharesModule({ data }: { data: any }) {
  const holdings = data?.holdings || data?.shareHoldings || [];
  const products = data?.products || data?.shareProducts || [];

  return (
    <View>
      {products.length > 0 && (
        <View>
          <Text style={styles.moduleSectionTitle}>शेयर उत्पादन</Text>
          {products.map((p: any, i: number) => (
            <View key={i} style={styles.dataRow}>
              <View style={styles.dataInfo}>
                <Text style={styles.dataName}>{p.name}</Text>
                <Text style={styles.dataSub}>अंकित मूल्य: {formatNPR(p.faceValue)} | जारी: {toNepaliDigits(p.issuedShares)}/{toNepaliDigits(p.totalShares)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.moduleSectionTitle}>शेयरधनी ({toNepaliDigits(holdings.length)})</Text>
      {holdings.slice(0, 10).map((h: any, i: number) => (
        <View key={i} style={styles.dataRow}>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{h.member?.firstName || '—'} {h.member?.lastName || ''}</Text>
            <Text style={styles.dataSub}>{toNepaliDigits(h.shareCount)} शेयर | {formatNPR(h.shareValue)}</Text>
          </View>
        </View>
      ))}
      {holdings.length === 0 && <Text style={styles.noData}>कुनै शेयर डाटा भेटिएन</Text>}
    </View>
  );
}

// Meetings Module
function MeetingsModule({ data }: { data: any }) {
  const meetings = data?.meetings || [];

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>बैठकहरू ({toNepaliDigits(meetings.length)})</Text>
      {meetings.slice(0, 10).map((m: any, i: number) => (
        <View key={i} style={styles.meetingCard}>
          <View style={styles.meetingHeader}>
            <Text style={styles.meetingTitle}>{m.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: m.status === 'COMPLETED' ? '#d1fae5' : m.status === 'CANCELLED' ? '#fee2e2' : '#dbeafe' }]}>
              <Text style={[styles.statusText, { color: m.status === 'COMPLETED' ? '#059669' : m.status === 'CANCELLED' ? '#dc2626' : '#2563eb' }]}>{m.status}</Text>
            </View>
          </View>
          <Text style={styles.meetingDetails}>{m.type} | {m.date} {m.time || ''}</Text>
          {m.venue && <Text style={styles.meetingDetails}>स्थान: {m.venue}</Text>}
        </View>
      ))}
      {meetings.length === 0 && <Text style={styles.noData}>कुनै बैठक भेटिएन</Text>}
    </View>
  );
}

// Reports Module
function ReportsModule() {
  const reports = [
    { name: 'Balance Sheet', nameNep: 'निश्शेष जानकारी', icon: '📋', type: 'balance-sheet' },
    { name: 'Income Statement', nameNep: 'आय-व्यय जानकारी', icon: '📈', type: 'income-statement' },
    { name: 'NRB Return', nameNep: 'नेपाल राष्ट्र बैंक रिटर्न', icon: '🏛', type: 'nrb-return' },
    { name: 'Capital Adequacy', nameNep: 'पूँजी पर्याप्तता', icon: '🛡', type: 'capital-adequacy' },
    { name: 'Loan Portfolio', nameNep: 'ऋण विवरण', icon: '💰', type: 'loan-portfolio' },
    { name: 'Savings Report', nameNep: 'बचत विवरण', icon: '🏦', type: 'savings-report' },
    { name: 'Cash Flow', nameNep: 'नगद प्रवाह', icon: '💵', type: 'cash-flow' },
    { name: 'Member Directory', nameNep: 'सदस्य निर्देशिका', icon: '👥', type: 'member-directory' },
  ];

  const handleViewReport = async (type: string) => {
    const result = await api.get(`/api/reports/nrb?type=${type}`);
    if (result.data) {
      Alert.alert('प्रतिवेदन', `${type} प्रतिवेदन तयार छ। वेब संस्करणमा डाउनलोड गर्न सकिन्छ।`);
    }
  };

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>प्रतिवेदनहरू</Text>
      {reports.map((r, i) => (
        <TouchableOpacity key={i} style={styles.dataRow} onPress={() => handleViewReport(r.type)}>
          <View style={styles.dataIcon}>
            <Text style={styles.dataIconText}>{r.icon}</Text>
          </View>
          <View style={styles.dataInfo}>
            <Text style={styles.dataName}>{r.nameNep}</Text>
            <Text style={styles.dataSub}>{r.name}</Text>
          </View>
          <Text style={styles.viewArrow}>→</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Notifications Module
function NotificationsModule({ data }: { data: any }) {
  const notifications = data?.notifications || [];

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>सूचनाहरू ({toNepaliDigits(notifications.length)})</Text>
      {notifications.length > 0 ? notifications.slice(0, 10).map((n: any, i: number) => (
        <View key={i} style={styles.notificationItem}>
          <View style={[styles.notifDot, { backgroundColor: n.type === 'WARNING' ? '#f59e0b' : n.type === 'ERROR' ? '#ef4444' : '#3b82f6' }]} />
          <View style={styles.notifInfo}>
            <Text style={styles.notifTitle}>{n.title}</Text>
            <Text style={styles.notifMessage}>{n.message}</Text>
          </View>
        </View>
      )) : (
        <Text style={styles.noData}>कुनै सूचना भेटिएन</Text>
      )}
    </View>
  );
}

// Settings Module
function SettingsModule() {
  const { user, signOut } = useAuth();

  return (
    <View>
      <Text style={styles.moduleSectionTitle}>सेटिङ</Text>

      <View style={styles.settingSection}>
        <Text style={styles.settingSectionTitle}>प्रयोगकर्ता जानकारी</Text>
        <SettingRow label="नाम" value={user?.name || '—'} />
        <SettingRow label="ईमेल" value={user?.email || '—'} />
        <SettingRow label="भूमिका" value={user?.role || '—'} />
      </View>

      <View style={styles.settingSection}>
        <Text style={styles.settingSectionTitle}>संस्था</Text>
        <SettingRow label="संस्था" value="Janata Sahakari Sanstha Ltd." />
        <SettingRow label="आर्थिक वर्ष" value="2082/83" />
      </View>

      <View style={styles.settingSection}>
        <Text style={styles.settingSectionTitle}>प्रणाली</Text>
        <SettingRow label="संस्करण" value="2.0.0" />
        <SettingRow label="डाटाबेस" value="SQLite" />
        <SettingRow label="अनुपालन" value="Cooperative Act 2047" />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>लगआउट गर्नुहोस्</Text>
      </TouchableOpacity>
    </View>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xxl, backgroundColor: Colors.primary, gap: Spacing.lg },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: '#ffffff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSizes.xl, fontWeight: 'bold', color: '#ffffff' },
  profileRole: { fontSize: FontSizes.sm, color: '#d1fae5', marginTop: 2 },
  profileDate: { fontSize: FontSizes.xs, color: '#a7f3d0', marginTop: 2 },
  modulesContainer: { flex: 1 },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  moduleCard: { width: '31%', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  moduleIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  moduleIconText: { fontSize: 24 },
  moduleTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  moduleSubtitle: { fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  logoutButton: { margin: Spacing.xxl, backgroundColor: '#fee2e2', borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontSize: FontSizes.lg, fontWeight: '600' },
  appInfo: { alignItems: 'center', paddingBottom: Spacing.xxxl },
  appInfoText: { fontSize: FontSizes.xs, color: Colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary },
  modalClose: { fontSize: FontSizes.xxl, color: Colors.textMuted },
  modalContent: { flex: 1, padding: Spacing.lg },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { fontSize: FontSizes.md, color: Colors.textMuted },
  moduleSectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.lg },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: Spacing.md },
  dataIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  dataIconText: { fontSize: 20 },
  dataInfo: { flex: 1 },
  dataName: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  dataSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  empAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  empAvatarText: { fontSize: FontSizes.md, fontWeight: 'bold', color: Colors.primary },
  stockBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  stockBadgeText: { fontSize: FontSizes.xs, fontWeight: '600' },
  meetingCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#e2e8f0' },
  meetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  meetingTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  meetingDetails: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  viewArrow: { fontSize: FontSizes.lg, color: Colors.textMuted },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  notifDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: FontSizes.md, fontWeight: '500', color: Colors.textPrimary },
  notifMessage: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  noData: { fontSize: FontSizes.md, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xxxl },
  settingSection: { marginBottom: Spacing.xxl },
  settingSectionTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingLabel: { fontSize: FontSizes.md, color: Colors.textPrimary },
  settingValue: { fontSize: FontSizes.md, color: Colors.textSecondary },
});
