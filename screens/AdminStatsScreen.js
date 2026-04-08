import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import { API_BASE, toISODate } from '../utils';
import { useAuth } from '../context/AuthContext';

const CHART_CATEGORIES = ['Каши', 'Супы', 'Вторые блюда', 'Гарниры'];
const COLORS = ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];

const AdminStatsScreen = () => {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [categoryCharts, setCategoryCharts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/stats/by-category/${toISODate(monday)}/${toISODate(sunday)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();

      if (json.success) {
        const grouped = {};
        const colorIndex = {};
        json.data.forEach(d => {
          if (!grouped[d.category_name]) grouped[d.category_name] = [];
          if (!colorIndex[d.category_name]) colorIndex[d.category_name] = 0;
          const color = COLORS[colorIndex[d.category_name] % COLORS.length];
          colorIndex[d.category_name]++;
          grouped[d.category_name].push({
            value: d.order_count,
            color,
            fullName: d.dish_name,
            count: d.order_count,
          });
        });
        setCategoryCharts(grouped);
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
      </View>
    );
  }

  const hasData = Object.keys(categoryCharts).length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📈 Популярность блюд</Text>
        <Text style={styles.headerSubtitle}>Заказы учеников за неделю</Text>
      </View>

      <View style={styles.section}>
        {hasData ? (
          CHART_CATEGORIES.map(catName => {
            const items = categoryCharts[catName];
            if (!items || items.length === 0) return null;
            return (
              <View key={catName} style={styles.chartBlock}>
                <Text style={styles.chartTitle}>{catName}</Text>
                <View style={styles.chartContainer}>
                  <PieChart
                    data={items}
                    donut
                    showText={false}
                    innerRadius={55}
                    radius={90}
                    focusOnPress
                  />
                </View>
                {/* Легенда */}
                {items.map((item, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendText}>{item.fullName}</Text>
                    </View>
                    <Text style={styles.legendCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Нет заказов за эту неделю</Text>
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
  chartBlock: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  chartTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', marginBottom: 12, textAlign: 'center' },
  chartContainer: { alignItems: 'center', paddingVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { fontSize: 14, color: '#2C3E50' },
  legendCount: { fontSize: 14, fontWeight: 'bold', color: '#3498DB', marginLeft: 10 },
  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  emptyText: { fontSize: 14, color: '#95A5A6', textAlign: 'center' },
});

export default AdminStatsScreen;
