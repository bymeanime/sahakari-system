// ============================================================
// Sahakari Mobile - Members Screen
// Member management with search, list, and detail view
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

interface Member {
  id: string;
  memberNo: string;
  firstName: string;
  lastName: string;
  firstNameNep?: string;
  lastNameNep?: string;
  phone?: string;
  email?: string;
  status: string;
  memberType: string;
  membershipDate?: string;
  gender?: string;
  citizenshipNo?: string;
  permanentAddr?: string;
  nomineeName?: string;
  nomineeRelation?: string;
}

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    firstName: '', lastName: '', phone: '', email: '', gender: 'MALE',
    citizenshipNo: '', permanentAddr: '', nomineeName: '', nomineeRelation: '',
  });

  const loadMembers = useCallback(async () => {
    const result = await api.get<any>('/api/members');
    if (result.data) {
      setMembers(Array.isArray(result.data) ? result.data : result.data.members || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const onRefresh = () => { setRefreshing(true); loadMembers(); };

  const filteredMembers = members.filter(m =>
    `${m.firstName} ${m.lastName} ${m.memberNo}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddMember = async () => {
    if (!newMember.firstName || !newMember.lastName) {
      Alert.alert('त्रुटि', 'पहिलो नाम र थर आवश्यक छ');
      return;
    }
    const result = await api.post('/api/members', newMember);
    if (result.data) {
      Alert.alert('सफल', 'सदस्य सफलतापूर्वक थपियो');
      setShowAddModal(false);
      setNewMember({ firstName: '', lastName: '', phone: '', email: '', gender: 'MALE', citizenshipNo: '', permanentAddr: '', nomineeName: '', nomineeRelation: '' });
      loadMembers();
    } else {
      Alert.alert('त्रुटि', result.error || 'सदस्य थप्न असफल');
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: '#10b981', INACTIVE: '#94a3b8', RESIGNED: '#f59e0b',
      DECEASED: '#6b7280', SUSPENDED: '#ef4444',
    };
    return map[status] || '#94a3b8';
  };

  const renderMember = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => setSelectedMember(item)}
    >
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {item.firstName[0]}{item.lastName[0]}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.firstNameNep ? `${item.firstNameNep} ${item.lastNameNep}` : `${item.firstName} ${item.lastName}`}
        </Text>
        <Text style={styles.memberNo}>{item.memberNo}</Text>
        {item.phone && <Text style={styles.memberPhone}>{item.phone}</Text>}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
        <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="सदस्य खोज्नुहोस्..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ थप</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{toNepaliDigits(members.length)}</Text>
          <Text style={styles.statLabel}>कुल सदस्य</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{toNepaliDigits(members.filter(m => m.status === 'ACTIVE').length)}</Text>
          <Text style={styles.statLabel}>सक्रिय</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{toNepaliDigits(members.filter(m => m.status === 'INACTIVE').length)}</Text>
          <Text style={styles.statLabel}>निष्क्रिय</Text>
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>कुनै सदस्य भेटिएन</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Member Detail Modal */}
      <Modal visible={!!selectedMember} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>सदस्य विवरण</Text>
            <TouchableOpacity onPress={() => setSelectedMember(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedMember && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>
                  {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                </Text>
              </View>
              <Text style={styles.detailName}>
                {selectedMember.firstName} {selectedMember.lastName}
              </Text>
              {selectedMember.firstNameNep && (
                <Text style={styles.detailNameNep}>
                  {selectedMember.firstNameNep} {selectedMember.lastNameNep}
                </Text>
              )}
              <View style={[styles.detailStatus, { backgroundColor: statusColor(selectedMember.status) + '20' }]}>
                <Text style={[styles.detailStatusText, { color: statusColor(selectedMember.status) }]}>
                  {selectedMember.status}
                </Text>
              </View>
              <View style={styles.detailGrid}>
                <DetailRow label="सदस्य नं." value={selectedMember.memberNo} />
                <DetailRow label="फोन" value={selectedMember.phone || '—'} />
                <DetailRow label="ईमेल" value={selectedMember.email || '—'} />
                <DetailRow label="लिङ्ग" value={selectedMember.gender || '—'} />
                <DetailRow label="नागरिकता नं." value={selectedMember.citizenshipNo || '—'} />
                <DetailRow label="ठेगाना" value={selectedMember.permanentAddr || '—'} />
                <DetailRow label="सदस्यता मिति" value={selectedMember.membershipDate || '—'} />
                <DetailRow label="सदस्य प्रकार" value={selectedMember.memberType} />
                <DetailRow label="नामिती" value={selectedMember.nomineeName || '—'} />
                <DetailRow label="नामिती सम्बन्ध" value={selectedMember.nomineeRelation || '—'} />
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>नयाँ सदस्य थप्नुहोस्</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>पहिलो नाम *</Text>
              <TextInput style={styles.formInput} value={newMember.firstName} onChangeText={t => setNewMember({ ...newMember, firstName: t })} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>थर *</Text>
              <TextInput style={styles.formInput} value={newMember.lastName} onChangeText={t => setNewMember({ ...newMember, lastName: t })} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>फोन</Text>
              <TextInput style={styles.formInput} value={newMember.phone} onChangeText={t => setNewMember({ ...newMember, phone: t })} keyboardType="phone-pad" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ईमेल</Text>
              <TextInput style={styles.formInput} value={newMember.email} onChangeText={t => setNewMember({ ...newMember, email: t })} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>नागरिकता नं.</Text>
              <TextInput style={styles.formInput} value={newMember.citizenshipNo} onChangeText={t => setNewMember({ ...newMember, citizenshipNo: t })} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ठेगाना</Text>
              <TextInput style={styles.formInput} value={newMember.permanentAddr} onChangeText={t => setNewMember({ ...newMember, permanentAddr: t })} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>नामिती नाम</Text>
              <TextInput style={styles.formInput} value={newMember.nomineeName} onChangeText={t => setNewMember({ ...newMember, nomineeName: t })} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>नामिती सम्बन्ध</Text>
              <TextInput style={styles.formInput} value={newMember.nomineeRelation} onChangeText={t => setNewMember({ ...newMember, nomineeRelation: t })} />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleAddMember}>
              <Text style={styles.submitButtonText}>सदस्य थप्नुहोस्</Text>
            </TouchableOpacity>
          </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff', fontWeight: '600', fontSize: FontSizes.md },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.primary },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  listContainer: { padding: Spacing.lg, gap: Spacing.md },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary },
  memberNo: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  memberPhone: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: FontSizes.md, color: Colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary },
  modalClose: { fontSize: FontSizes.xxl, color: Colors.textMuted },
  modalContent: { flex: 1, padding: Spacing.lg },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  detailAvatarText: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.primary },
  detailName: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary, textAlign: 'center' },
  detailNameNep: { fontSize: FontSizes.lg, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
  detailStatus: { alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginTop: Spacing.md },
  detailStatusText: { fontSize: FontSizes.sm, fontWeight: '600' },
  detailGrid: { marginTop: Spacing.xxl, gap: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  detailValue: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '500' },
  formGroup: { marginBottom: Spacing.lg },
  formLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  formInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  submitButtonText: { color: '#ffffff', fontSize: FontSizes.lg, fontWeight: '600' },
});
