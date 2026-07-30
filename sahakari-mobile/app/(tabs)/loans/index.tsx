// ============================================================
// Sahakari Mobile - Loans Screen
// Loan applications, approvals, disbursements, and EMI tracking
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import api from '@/lib/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { formatNPR, toNepaliDigits } from '@/lib/bs-calendar';

interface LoanApplication {
  id: string;
  applicationNo: string;
  requestedAmount: number;
  approvedAmount?: number;
  disbursedAmount?: number;
  outstandingAmount?: number;
  term: number;
  interestRate?: number;
  emiAmount?: number;
  status: string;
  purpose?: string;
  applicationDate: string;
  nextDueDate?: string;
  member?: { firstName: string; lastName: string; memberNo: string };
  product?: { name: string; interestRate: number };
}

type FilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'DISBURSED' | 'OVERDUE';

export default function LoansScreen() {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);

  const loadLoans = useCallback(async () => {
    const result = await api.get<any>('/api/loans');
    if (result.data) {
      setLoans(Array.isArray(result.data) ? result.data : result.data.loans || result.data.applications || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const onRefresh = () => { setRefreshing(true); loadLoans(); };

  const tabs: FilterTab[] = ['ALL', 'PENDING', 'APPROVED', 'DISBURSED', 'OVERDUE'];

  const filteredLoans = activeTab === 'ALL'
    ? loans
    : loans.filter(l => l.status === activeTab);

  const handleApprove = async (loanId: string) => {
    const result = await api.put(`/api/loans/${loanId}`, { action: 'approve' });
    if (result.data) {
      Alert.alert('सफल', 'ऋण स्वीकृत भयो');
      setSelectedLoan(null);
      loadLoans();
    } else {
      Alert.alert('त्रुटि', result.error || 'स्वीकृति असफल');
    }
  };

  const handleDisburse = async (loanId: string) => {
    const result = await api.put(`/api/loans/${loanId}`, { action: 'disburse' });
    if (result.data) {
      Alert.alert('सफल', 'ऋण वितरण भयो');
      setSelectedLoan(null);
      loadLoans();
    } else {
      Alert.alert('त्रुटि', result.error || 'वितरण असफल');
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: '#f59e0b', UNDER_REVIEW: '#8b5cf6', APPROVED: '#3b82f6',
      DISBURSED: '#10b981', REJECTED: '#ef4444', CLOSED: '#6b7280',
      OVERDUE: '#dc2626', WRITTEN_OFF: '#991b1b',
    };
    return map[status] || '#94a3b8';
  };

  const totalDisbursed = loans.filter(l => l.status === 'DISBURSED').reduce((s, l) => s + (l.disbursedAmount || l.requestedAmount), 0);
  const totalOutstanding = loans.filter(l => l.status === 'DISBURSED').reduce((s, l) => s + (l.outstandingAmount || 0), 0);
  const pendingCount = loans.filter(l => l.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatNPR(totalDisbursed)}</Text>
          <Text style={styles.summaryLabel}>वितरण भएको</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatNPR(totalOutstanding)}</Text>
          <Text style={styles.summaryLabel}>बक्यौता</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: pendingCount > 0 ? '#f59e0b' : Colors.primary }]}>{toNepaliDigits(pendingCount)}</Text>
          <Text style={styles.summaryLabel}>विचाराधीन</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'ALL' ? 'सबै' : tab === 'PENDING' ? 'विचाराधीन' : tab === 'APPROVED' ? 'स्वीकृत' : tab === 'DISBURSED' ? 'वितरण' : 'अनुत्तीर्ण'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loans List */}
      <FlatList
        data={filteredLoans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.loanCard}
            onPress={() => setSelectedLoan(item)}
          >
            <View style={styles.loanHeader}>
              <View>
                <Text style={styles.loanAppNo}>{item.applicationNo}</Text>
                <Text style={styles.loanMember}>
                  {item.member ? `${item.member.firstName} ${item.member.lastName}` : '—'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.loanFooter}>
              <View>
                <Text style={styles.loanAmountLabel}>अनुरोधित रकम</Text>
                <Text style={styles.loanAmount}>{formatNPR(item.requestedAmount)}</Text>
              </View>
              <View style={styles.loanTermInfo}>
                <Text style={styles.loanTerm}>{toNepaliDigits(item.term)} महिना</Text>
                {item.product && <Text style={styles.loanRate}>{item.product.interestRate}%</Text>}
              </View>
            </View>
            {item.nextDueDate && (
              <View style={styles.dueDateRow}>
                <Text style={styles.dueDateLabel}>अर्को किस्ता:</Text>
                <Text style={styles.dueDateValue}>{item.nextDueDate}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>कुनै ऋण आवेदन भेटिएन</Text>
          </View>
        }
      />

      {/* Loan Detail Modal */}
      <Modal visible={!!selectedLoan} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ऋण विवरण</Text>
            <TouchableOpacity onPress={() => setSelectedLoan(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedLoan && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailHeader, { borderLeftColor: statusColor(selectedLoan.status) }]}>
                <Text style={styles.detailAppNo}>{selectedLoan.applicationNo}</Text>
                <View style={[styles.detailStatusBadge, { backgroundColor: statusColor(selectedLoan.status) + '20' }]}>
                  <Text style={[styles.detailStatusText, { color: statusColor(selectedLoan.status) }]}>{selectedLoan.status}</Text>
                </View>
              </View>

              <View style={styles.detailAmountCard}>
                <Text style={styles.detailAmountLabel}>अनुरोधित रकम</Text>
                <Text style={styles.detailAmountValue}>{formatNPR(selectedLoan.requestedAmount)}</Text>
                {selectedLoan.disbursedAmount && (
                  <Text style={styles.detailDisbursed}>वितरण: {formatNPR(selectedLoan.disbursedAmount)}</Text>
                )}
                {selectedLoan.outstandingAmount && (
                  <Text style={styles.detailOutstanding}>बक्यौता: {formatNPR(selectedLoan.outstandingAmount)}</Text>
                )}
              </View>

              <View style={styles.detailInfo}>
                <DetailRow label="सदस्य" value={selectedLoan.member ? `${selectedLoan.member.firstName} ${selectedLoan.member.lastName}` : '—'} />
                <DetailRow label="उत्पादन" value={selectedLoan.product?.name || '—'} />
                <DetailRow label="अवधि" value={`${toNepaliDigits(selectedLoan.term)} महिना`} />
                <DetailRow label="ब्याज दर" value={selectedLoan.interestRate ? `${selectedLoan.interestRate}%` : (selectedLoan.product ? `${selectedLoan.product.interestRate}%` : '—')} />
                <DetailRow label="EMI" value={selectedLoan.emiAmount ? formatNPR(selectedLoan.emiAmount) : '—'} />
                <DetailRow label="आवेदन मिति" value={selectedLoan.applicationDate} />
                <DetailRow label="अर्को किस्ता" value={selectedLoan.nextDueDate || '—'} />
                <DetailRow label="प्रयोजन" value={selectedLoan.purpose || '—'} />
              </View>

              {/* Action Buttons */}
              {(selectedLoan.status === 'PENDING' || selectedLoan.status === 'UNDER_REVIEW') && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                    onPress={() => handleApprove(selectedLoan.id)}
                  >
                    <Text style={styles.actionButtonText}>स्वीकृत गर्नुहोस्</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => {
                      Alert.alert('अस्वीकृत', 'के तपाईं यो ऋण अस्वीकृत गर्न चाहनुहुन्छ?');
                    }}
                  >
                    <Text style={styles.actionButtonText}>अस्वीकृत गर्नुहोस्</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedLoan.status === 'APPROVED' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#3b82f6', marginHorizontal: 0 }]}
                  onPress={() => handleDisburse(selectedLoan.id)}
                >
                  <Text style={styles.actionButtonText}>ऋण वितरण गर्नुहोस्</Text>
                </TouchableOpacity>
              )}

              {/* EMI Schedule Info */}
              {selectedLoan.status === 'DISBURSED' && selectedLoan.emiAmount && (
                <View style={styles.emiCard}>
                  <Text style={styles.emiTitle}>EMI जानकारी</Text>
                  <Text style={styles.emiAmount}>मासिक किस्ता: {formatNPR(selectedLoan.emiAmount)}</Text>
                  <Text style={styles.emiOutstanding}>बक्यौता: {formatNPR(selectedLoan.outstandingAmount || 0)}</Text>
                  <Text style={styles.emiDueDate}>अर्को किस्ता: {selectedLoan.nextDueDate || '—'}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summaryRow: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  summaryValue: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.primary },
  summaryLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  tabsContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: '#f1f5f9', marginRight: Spacing.sm },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  listContainer: { padding: Spacing.lg, gap: Spacing.md },
  loanCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  loanAppNo: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary },
  loanMember: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  loanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  loanAmountLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  loanAmount: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.modules.loans },
  loanTermInfo: { alignItems: 'flex-end' },
  loanTerm: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  loanRate: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  dueDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dueDateLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  dueDateValue: { fontSize: FontSizes.xs, color: '#ef4444', fontWeight: '600' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary },
  modalClose: { fontSize: FontSizes.xxl, color: Colors.textMuted },
  modalContent: { flex: 1, padding: Spacing.lg },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, paddingLeft: Spacing.lg, marginBottom: Spacing.xxl },
  detailAppNo: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary },
  detailStatusBadge: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  detailStatusText: { fontSize: FontSizes.sm, fontWeight: '600' },
  detailAmountCard: { backgroundColor: Colors.modules.loans, borderRadius: BorderRadius.xl, padding: Spacing.xxl, alignItems: 'center', marginBottom: Spacing.xxl },
  detailAmountLabel: { fontSize: FontSizes.md, color: '#fecdd3' },
  detailAmountValue: { fontSize: FontSizes.xxxl, fontWeight: 'bold', color: '#ffffff', marginTop: Spacing.xs },
  detailDisbursed: { fontSize: FontSizes.sm, color: '#fecdd3', marginTop: Spacing.sm },
  detailOutstanding: { fontSize: FontSizes.sm, color: '#ffffff', fontWeight: '600', marginTop: Spacing.xs },
  detailInfo: { gap: Spacing.md, marginBottom: Spacing.xxl },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  detailValue: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  actionButton: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  actionButtonText: { color: '#ffffff', fontSize: FontSizes.md, fontWeight: '600' },
  emiCard: { backgroundColor: '#eff6ff', borderRadius: BorderRadius.lg, padding: Spacing.xxl, borderWidth: 1, borderColor: '#bfdbfe' },
  emiTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: '#1e40af', marginBottom: Spacing.md },
  emiAmount: { fontSize: FontSizes.md, color: '#1e3a8a', fontWeight: '600' },
  emiOutstanding: { fontSize: FontSizes.md, color: '#1e3a8a', marginTop: Spacing.xs },
  emiDueDate: { fontSize: FontSizes.md, color: '#dc2626', marginTop: Spacing.xs, fontWeight: '600' },
});
