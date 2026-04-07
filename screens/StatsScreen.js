import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE, toISODate } from '../utils';

const StatsScreen = () => {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [stats, setStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats/${toISODate(monday)}/${toISODate(sunday)}`);
      const json = await res.json();
      if (json.success) setStats(json.data);

      const dishesRes = await fetch(`${API_BASE}/dishes`);
      const dishesJson = await dishesRes.json();
      if (dishesJson.success) {
        const cats = {};
        dishesJson.data.forEach(d => {
          const catName = d.category_name || d.category || 'Без категории';
          if (!cats[catName]) cats[catName] = { count: 0, total: 0 };
          cats[catName].count++;
          cats[catName].total += parseFloat(d.price || 0);
        });
        setCategoryStats(Object.entries(cats).map(([name, v]) => ({ name, ...v, avg: v.total / v.count })));
      }
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Загрузка статистики...</Text>
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
        <Text style={styles.headerTitle}>📊 Статистика</Text>
        <Text style={styles.headerSubtitle}>За текущую неделю</Text>
      </View>

      {stats && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Общие показатели</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total_meals}</Text>
                <Text style={styles.statLabel}>Блюд запланировано</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{Number(stats.total_cost).toLocaleString('ru-RU')} Br</Text>
                <Text style={styles.statLabel}>Общие затраты</Text>
              </View>
            </View>
            <View style={styles.statCardFull}>
              <Text style={styles.statNumber}>{stats.days_with_menu}</Text>
              <Text style={styles.statLabel}>Дней с меню из 7</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Справочник блюд</Text>
            {categoryStats.map((cat, i) => (
              <View key={i} style={styles.categoryCard}>
                <View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryMeta}>{cat.count} блюд · средняя цена {Math.round(cat.avg)} ₽</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.bottomPadding} />
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
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#2C3E50', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, flex: 1, marginHorizontal: 4, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statCardFull: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#7F8C8D', textAlign: 'center' },
  categoryCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  categoryMeta: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  bottomPadding: { height: 20 },
});

export default StatsScreen;
