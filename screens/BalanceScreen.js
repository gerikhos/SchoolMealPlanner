import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE, toISODate } from '../utils';
import { useAuth } from '../context/AuthContext';

const BalanceScreen = () => {
  const insets = useSafeAreaInsets();
  const { token, isAdmin } = useAuth();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [balance, setBalance] = useState({ budget: 50000, spent: 0, remaining: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (isAdmin) {
        // Для админа — общая статистика
        const res = await fetch(`${API_BASE}/stats/${toISODate(monthStart)}/${toISODate(monthEnd)}`);
        const json = await res.json();
        const spent = json.success ? parseFloat(json.data.total_cost) : 0;
        const budget = 50000;
        setBalance({ budget, spent, remaining: budget - spent });

        setTransactions([
          { id: 1, date: '1 апреля', desc: 'Пополнение бюджета', amount: budget, type: 'income' },
          { id: 2, date: '4 апреля', desc: `Закупка продуктов (${json.success ? json.data.total_meals : 0} блюд)`, amount: -spent, type: 'expense' },
        ]);
      } else {
        // Для ученика — его транзакции
        const txRes = await fetch(`${API_BASE}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const txJson = await txRes.json();
        if (txJson.success) {
          const txs = txJson.data.map(t => ({
            id: t.id,
            date: new Date(t.menu_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
            desc: `Заказ на ${new Date(t.menu_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`,
            amount: -parseFloat(t.total_amount),
            type: 'expense',
          }));
          setTransactions(txs);

          const totalSpent = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const budget = 50000;
          setBalance({ budget, spent: totalSpent, remaining: budget - totalSpent });
        }
      }
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAdmin]);

  useEffect(() => { fetchData(); }, []);

  // Обновлять при каждом фокусе вкладки
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const spentPercent = balance.budget > 0 ? Math.round((balance.spent / balance.budget) * 100) : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Баланс</Text>
        <Text style={styles.headerSubtitle}>
          {isAdmin ? 'Бюджет столовой' : `Бюджет на ${today.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`}
        </Text>
      </View>

      {/* Баланс карточка */}
      <View style={styles.balanceSection}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Остаток</Text>
          <Text style={styles.balanceAmount}>{balance.remaining.toLocaleString('ru-RU')} ₽</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Потрачено</Text>
            <Text style={styles.progressPercent}>{spentPercent}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${spentPercent}%` }]} />
          </View>
          <View style={styles.progressDetails}>
            <Text style={styles.progressDetail}>Бюджет: {balance.budget.toLocaleString('ru-RU')} ₽</Text>
            <Text style={styles.progressDetail}>Потрачено: {balance.spent.toLocaleString('ru-RU')} ₽</Text>
          </View>
        </View>
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
              {t.amount > 0 ? '+' : ''}{Math.round(Math.abs(t.amount)).toLocaleString('ru-RU')} ₽
            </Text>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Нет операций</Text>
          </View>
        )}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#7F8C8D' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  headerSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },
  balanceSection: { marginTop: 15, paddingHorizontal: 20 },
  balanceCard: {
    backgroundColor: '#776682', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 15,
  },
  balanceLabel: { fontSize: 14, color: '#BDC3C7', marginBottom: 6 },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  progressSection: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 3 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, color: '#7F8C8D' },
  progressPercent: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50' },
  progressBar: { height: 8, backgroundColor: '#ECF0F1', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3498DB', borderRadius: 4 },
  progressDetails: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  progressDetail: { fontSize: 12, color: '#95A5A6' },
  section: { marginTop: 15, paddingHorizontal: 20 },
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
});

export default BalanceScreen;
