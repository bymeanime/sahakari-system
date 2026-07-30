// ============================================================
// Sahakari Mobile - Savings Screen
// Savings accounts, deposits, and withdrawals
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

interface SavingsAccount {
  id: string;
  accountNo: string;
  balance: number;
  interestEarned: number;
  status: string;
  openedDate: string;
  member?: { firstName: string; lastName: string; memberNo: string };
  product?: { name: string; interestRate: number };
}

interface SavingsTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  transactionDate: string;
}

export default function SavingsScreen() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDesc, setTransactionDesc] = useState('');

  const loadAccounts = useCallback(async () => {
    const result = await api.get<any>('/api/savings');
    if (result.data) {
      setAccounts(Array.isArray(result.data) ? result.data : result.data.accounts || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const onRefresh = () => { setRefreshing(true); loadAccounts(); };

  const loadTransactions = async (accountNo: string) => {
    const result = await api.get(`/api/savings?accountNo=${accountNo}&include=transactions`);
    if (result.data?.transactions) {
      setTransactions(result.data.transactions);
    }
  };

  const handleAccountSelect = (account: SavingsAccount) => {
    setSelectedAccount(account);
    loadTransactions(account.accountNo);
  };

  const handleTransaction = async () => {
    if (!selectedAccount || !transactionAmount) {
      Alert.alert('त्रुटि', 'रकम प्रविष्ट गर्नुहोस्');
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('त्रुटि', 'वैध रकम प्रविष्ट गर्नुहोस्');
      return;
    }

    if (transactionType === 'WITHDRAWAL' && amount > (selectedAccount.balance || 0)) {
      Alert.alert('त्रुटि', 'अपर्याप्त शेषराशि');
      return;
    }

    const result = await api.post(`/api/savings/${selectedAccount.id}`, {
      type: transactionType,
      amount,
      description: transactionDesc || `${transactionType === 'DEPOSIT' ? 'जम्मा' : 'निकासा'}`,
    });

    if (result.data) {
      Alert.alert(
        'सफल',
        `${transactionType === 'DEPOSIT' ? 'जम्मा' : 'निकासा'} ${formatNPR(amount)} सफल`,
      );
      setShowTransactionModal(false);
      setTransactionAmount('');
      setTransactionDesc('');
      loadAccounts();
      if (selectedAccount) {
        loadTransactions(selectedAccount.accountNo);
      }
    } else {
      Alert.alert('त्रुटि', result.error || 'लेनदेन असफल');
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: '#10b981', CLOSED: '#94a3b8', DORMANT: '#f59e0b', FROZEN: '#3b82f6',
    };
    return map[status] || '#94a3b8';
  };

  const totalSavings = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE').length;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatNPR(totalSavings)}</Text>
          <Text style={styles.summaryLabel}>कुल बचत</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{toNepaliDigits(activeAccounts)}</Text>
          <Text style={styles.summaryLabel}>सक्रिय खाता</Text>
        </View>
      </View>

      {/* Accounts List */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.accountCard}
            onPress={() => handleAccountSelect(item)}
          >
            <View style={styles.accountHeader}>
              <View>
                <Text style={styles.accountNo}>{item.accountNo}</Text>
                <Text style={styles.accountHolder}>
                  {item.member ? `${item.member.firstName} ${item.member.lastName}` : '—'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.accountFooter}>
              <View>
                <Text style={styles.balanceLabel}>शेषराशि</Text>
                <Text style={styles.balanceAmount}>{formatNPR(item.balance)}</Text>
              </View>
              {item.product && (
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <Text style={styles.productRate}>{item.product.interestRate}% ब्याज</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>कुनै बचत खाता भेटिएन</Text>
          </View>
        }
      />

      {/* Account Detail Modal */}
      <Modal visible={!!selectedAccount} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>बचत खाता विवरण</Text>
            <TouchableOpacity onPress={() => setSelectedAccount(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedAccount && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailBalanceCard}>
                <Text style={styles.detailBalanceLabel}>शेषराशि</Text>
                <Text style={styles.detailBalanceAmount}>{formatNPR(selectedAccount.balance)}</Text>
                <Text style={styles.detailInterest}>ब्याज: {formatNPR(selectedAccount.interestEarned)}</Text>
              </View>

              <View style={styles.detailInfo}>
                <DetailRow label="खाता नं." value={selectedAccount.accountNo} />
                <DetailRow label="सदस्य" value={selectedAccount.member ? `${selectedAccount.member.firstName} ${selectedAccount.member.lastName}` : '—'} />
                <DetailRow label="उत्पादन" value={selectedAccount.product?.name || '—'} />
                <DetailRow label="ब्याज दर" value={selectedAccount.product ? `${selectedAccount.product.interestRate}%` : '—'} />
                <DetailRow label="खोलेको मिति" value={selectedAccount.openedDate} />
                <DetailRow label="स्थिति" value={selectedAccount.status} />
              </View>

              {/* Transaction Buttons */}
              <View style={styles.transactionButtons}>
                <TouchableOpacity
                  style={[styles.transactionButton, { backgroundColor: '#10b981' }]}
                  onPress={() => { setTransactionType('DEPOSIT'); setShowTransactionModal(true); }}
                >
                  <Text style={styles.transactionButtonText}>जम्मा गर्नुहोस्</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.transactionButton, { backgroundColor: '#ef4444' }]}
                  onPress={() => { setTransactionType('WITHDRAWAL'); setShowTransactionModal(true); }}
                >
                  <Text style={styles.transactionButtonText}>निकासा गर्नुहोस्</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Transactions */}
              <Text style={styles.sectionTitle}>हालको लेनदेन</Text>
              {transactions.length > 0 ? transactions.map((tx, i) => (
                <View key={i} style={styles.transactionItem}>
                  <View style={[styles.txIcon, { backgroundColor: tx.type === 'DEPOSIT' ? '#d1fae5' : '#fee2e2' }]}>
                    <Text style={styles.txIconText}>{tx.type === 'DEPOSIT' ? '↓' : '↑'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txType}>{tx.type === 'DEPOSIT' ? 'जम्मा' : 'निकासा'}</Text>
                    <Text style={styles.txDate}>{tx.transactionDate}</Text>
                  </View>
                  <View style={styles.txAmount}>
                    <Text style={[styles.txAmountText, { color: tx.type === 'DEPOSIT' ? '#10b981' : '#ef4444' }]}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{formatNPR(tx.amount)}
                    </Text>
                    <Text style={styles.txBalance}>{formatNPR(tx.balanceAfter)}</Text>
                  </View>
                </View>
              )) : (
                <Text style={styles.noTxText}>कुनै लेनदेन भेटिएन</Text>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Transaction Modal */}
      <Modal visible={showTransactionModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {transactionType === 'DEPOSIT' ? 'जम्मा' : 'निकासा'} गर्नुहोस्
            </Text>
            <TouchableOpacity onPress={() => setShowTransactionModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeButton, transactionType === 'DEPOSIT' && styles.typeButtonActive]}
                onPress={() => setTransactionType('DEPOSIT')}
              >
                <Text style={[styles.typeButtonText, transactionType === 'DEPOSIT' && styles.typeButtonTextActive]}>जम्मा</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, transactionType === 'WITHDRAWAL' && styles.typeButtonActiveWithdraw]}
                onPress={() => setTransactionType('WITHDRAWAL')}
              >
                <Text style={[styles.typeButtonText, transactionType === 'WITHDRAWAL' && styles.typeButtonTextActiveWithdraw]}>निकासा</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>रकम (NPR)</Text>
              <TextInput
                style={styles.formInput}
                value={transactionAmount}
                onChangeText={setTransactionAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>विवरण</Text>
              <TextInput
                style={styles.formInput}
                value={transactionDesc}
                onChangeText={setTransactionDesc}
                placeholder="विवरण प्रविष्ट गर्नुहोस्"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: transactionType === 'DEPOSIT' ? '#10b981' : '#ef4444' }]}
              onPress={handleTransaction}
            >
              <Text style={styles.submitButtonText}>
                {transactionType === 'DEPOSIT' ? 'जम्मा गर्नुहोस्' : 'निकासा गर्नुहोस्'}
              </Text>
            </TouchableOpacity>
          </View>
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
  summaryRow: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  summaryValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.primary },
  summaryLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  listContainer: { padding: Spacing.lg, gap: Spacing.md },
  accountCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  accountNo: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary },
  accountHolder: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  accountFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  balanceLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  balanceAmount: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.primary },
  productInfo: { alignItems: 'flex-end' },
  productName: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  productRate: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary },
  modalClose: { fontSize: FontSizes.xxl, color: Colors.textMuted },
  modalContent: { flex: 1, padding: Spacing.lg },
  detailBalanceCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xxl, alignItems: 'center', marginBottom: Spacing.xxl },
  detailBalanceLabel: { fontSize: FontSizes.md, color: '#d1fae5' },
  detailBalanceAmount: { fontSize: FontSizes.xxxl, fontWeight: 'bold', color: '#ffffff', marginTop: Spacing.xs },
  detailInterest: { fontSize: FontSizes.sm, color: '#a7f3d0', marginTop: Spacing.xs },
  detailInfo: { gap: Spacing.md, marginBottom: Spacing.xxl },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  detailValue: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  transactionButtons: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  transactionButton: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  transactionButtonText: { color: '#ffffff', fontSize: FontSizes.md, fontWeight: '600' },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.lg },
  transactionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txIconText: { fontSize: FontSizes.lg, fontWeight: 'bold' },
  txInfo: { flex: 1 },
  txType: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  txDate: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  txAmount: { alignItems: 'flex-end' },
  txAmountText: { fontSize: FontSizes.md, fontWeight: '600' },
  txBalance: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  noTxText: { fontSize: FontSizes.md, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
  typeToggle: { flexDirection: 'row', marginBottom: Spacing.xxl, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  typeButton: { flex: 1, paddingVertical: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surface },
  typeButtonActive: { backgroundColor: '#10b981' },
  typeButtonActiveWithdraw: { backgroundColor: '#ef4444' },
  typeButtonText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textSecondary },
  typeButtonTextActive: { color: '#ffffff' },
  typeButtonTextActiveWithdraw: { color: '#ffffff' },
  formGroup: { marginBottom: Spacing.lg },
  formLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  formInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSizes.lg, color: Colors.textPrimary, backgroundColor: Colors.surface },
  submitButton: { borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg },
  submitButtonText: { color: '#ffffff', fontSize: FontSizes.lg, fontWeight: '600' },
});
