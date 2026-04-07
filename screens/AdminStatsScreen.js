import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import { API_BASE, toISODate } from '../utils';
import { useAuth } from '../context/AuthContext';

const AdminStatsScreen = () => {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [popularDishes, setPopularDishes] = useState([]);
  const [generalStats, setGeneralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const COLORS = ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#C0392B'];

  const fetchData = async () => {
    try {
      const [statsRes, popularRes] = await Promise.all([
        fetch(`${API_BASE}/stats/${toISODate(monday)}/${toISODate(sunday)}`),
        fetch(`${API_BASE}/stats/popular-dishes/${toISODate(monday)}/${toISODate(sunday)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsJson = await statsRes.json();
      const popularJson = await popularRes.json();

      if (statsJson.success) setGeneralStats(statsJson.data);
      if (popularJson.success) setPopularDishes(popularJson.data);
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
      </View>
    );
  }

  const pieData = popularDishes.map((d, i) => ({
    value: d.order_count,
    color: COLORS[i % COLORS.length],
    text: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 Популярность блюд</Text>
        <Text style={styles.headerSubtitle}>За текущую неделю</Text>
      </View>

      {generalStats && (
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{generalStats.total_meals}</Text>
              <Text style={styles.statLabel}>Блюд в меню</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Number(generalStats.total_cost).toLocaleString('ru-RU')} Br</Text>
              <Text style={styles.statLabel}>Затраты</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Топ блюд</Text>

        {pieData.length > 0 ? (
          <>
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                donut
                showText
                textColor="#2C3E50"
                innerRadius={70}
                radius={120}
                textSize={12}
                focusOnPress
                centerLabelComponent={() => (
                  <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#2C3E50' }}>{popularDishes.length}</Text>
                    <Text style={{ fontSize: 11, color: '#7F8C8D' }}>блюд</Text>
                  </View>
                )}
              />
            </View>

            {popularDishes.map((d, i) => (
              <View key={d.id || i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.legendName}>{d.name}</Text>
                  <Text style={styles.legendMeta}>{d.category_name} · {d.order_count} раз · {Math.round(d.total_price)} ₽</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Нет данных за эту неделю</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  headerSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#2C3E50', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, flex: 1, marginHorizontal: 4, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#7F8C8D', textAlign: 'center' },
  chartContainer: { alignItems: 'center', paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendName: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
  legendMeta: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  emptyText: { fontSize: 14, color: '#95A5A6', textAlign: 'center' },
});

export default AdminStatsScreen;
