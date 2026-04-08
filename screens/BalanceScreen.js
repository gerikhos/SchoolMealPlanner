import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

const TOPUP_AMOUNTS = [10, 20, 50, 100, 200, 500];

const BalanceScreen = () => {
  const insets = useSafeAreaInsets();
  const { token, isAdmin } = useAuth();
  const today = new Date();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (isAdmin) {
        setBalance(0);
        setTransactions([]);
      } else {
        const [balRes, txRes] = await Promise.all([
          fetch(`${API_BASE}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const balText = await balRes.text();
        const txText = await txRes.text();

        if (balText.startsWith('{')) {
          const balJson = JSON.parse(balText);
          if (balJson.success) setBalance(balJson.amount);
        } else {
          console.error('Ошибка /balance:', balText.substring(0, 100));
        }

        if (txText.startsWith('[') || txText.startsWith('{')) {
          const txJson = JSON.parse(txText);
          if (txJson.success) {
            const txs = txJson.data.map(t => ({
              id: t.id,
              date: new Date(t.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
              desc: `Заказ на ${new Date(t.menu_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`,
              amount: -parseFloat(t.total_amount),
              type: 'expense',
            }));
            setTransactions(txs);
          }
        } else {
          console.error('Ошибка /transactions:', txText.substring(0, 100));
        }
      }
    } catch (err) {
      console.error('Ошибка:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAdmin]);

  useEffect(() => { fetchData(); }, []);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleTopup = async (amount) => {
    const val = amount || parseFloat(topupAmount);
    if (!val || val <= 0) {
      Alert.alert('Ошибка', 'Введите сумму');
      return;
    }
    setTopupLoading(true);
    try {
      const res = await fetch(`${API_BASE}/balance/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: val }),
      });
      const json = await res.json();
      if (json.success) {
        setBalance(json.amount);
        setShowTopup(false);
        setTopupAmount('');
        Alert.alert('Успешно!', `Баланс пополнен на ${val.toFixed(2)} Br`);
        fetchData();
      } else {
        Alert.alert('Ошибка', json.error);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось пополнить');
    }
    setTopupLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  if (isAdmin) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 80 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💰 Баланс</Text>
          <Text style={styles.headerSubtitle}>Раздел доступен только ученикам</Text>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Баланс</Text>
      </View>

      {/* Карточка баланса */}
      <View style={styles.balanceSection}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Текущий баланс</Text>
          <Text style={styles.balanceAmount}>{balance.toFixed(2)} Br</Text>
        </View>
        <TouchableOpacity style={styles.topupBtn} onPress={() => setShowTopup(true)}>
          <Text style={styles.topupBtnText}>+ Пополнить баланс</Text>
        </TouchableOpacity>
      </View>

      {/* Транзакции */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Последние операции</Text>
        {transactions.length > 0 ? transactions.map(t => (
          <View key={t.id} style={styles.transactionCard}>
            <View>
              <Text style={styles.transactionDate}>{t.date}</Text>
              <Text style={styles.transactionDesc}>{t.desc}</Text>
            </View>
            <Text style={[styles.transactionAmount, t.type === 'income' ? styles.income : styles.expense]}>
              {t.amount > 0 ? '+' : ''}{Math.abs(t.amount).toFixed(2)} Br
            </Text>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Нет операций</Text>
          </View>
        )}
      </View>

      {/* Модалка пополнения */}
      <Modal visible={showTopup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Пополнение баланса</Text>

            <Text style={styles.label}>Быстрый выбор:</Text>
            <View style={styles.amountGrid}>
              {TOPUP_AMOUNTS.map(a => (
                <TouchableOpacity key={a} style={styles.amountBtn} onPress={() => handleTopup(a)}>
                  <Text style={styles.amountBtnText}>{a} Br</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Или введите сумму:</Text>
            <TextInput
              style={styles.input}
              value={topupAmount}
              onChangeText={setTopupAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.modalSave, topupLoading && styles.modalSaveDisabled]}
              onPress={() => handleTopup(null)}
              disabled={topupLoading}
            >
              {topupLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSaveText}>Пополнить</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTopup(false)}>
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  headerSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },
  balanceSection: { marginTop: 10, paddingHorizontal: 20, alignItems: 'center' },
  balanceCard: {
    backgroundColor: '#776682', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 12, width: '100%',
  },
  balanceLabel: { fontSize: 14, color: '#BDC3C7', marginBottom: 6 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },
  topupBtn: { backgroundColor: '#2ECC71', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30 },
  topupBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#2C3E50', marginBottom: 12 },
  transactionCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', elevation: 2,
  },
  transactionDate: { fontSize: 12, color: '#95A5A6' },
  transactionDesc: { fontSize: 14, color: '#2C3E50', marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },
  income: { color: '#2ECC71' },
  expense: { color: '#E74C3C' },
  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  emptyText: { fontSize: 14, color: '#95A5A6', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#2C3E50', marginBottom: 8 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  amountBtn: { backgroundColor: '#E8F4FD', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  amountBtnText: { fontSize: 16, fontWeight: '600', color: '#2980B9' },
  input: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E0E6ED', fontSize: 18, marginBottom: 16 },
  modalSave: { backgroundColor: '#2ECC71', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalSaveDisabled: { backgroundColor: '#BDC3C7' },
  modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  modalCancel: { padding: 14, alignItems: 'center', marginTop: 6 },
  modalCancelText: { color: '#95A5A6', fontSize: 14 },
});

export default BalanceScreen;
