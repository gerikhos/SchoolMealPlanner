import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE, toISODate } from '../utils';

const StatsScreen = () => {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dishes`);
      const json = await res.json();
      if (json.success) {
        // Группируем по категориям
        const grouped = {};
        json.data.forEach(d => {
          const catName = d.category_name || 'Без категории';
          if (!grouped[catName]) grouped[catName] = { name: catName, count: 0, items: [] };
          grouped[catName].count++;
          grouped[catName].items.push(d);
        });
        setCategories(Object.values(grouped));
      }
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, []);
  useFocusEffect(useCallback(() => { setSelectedCategory(null); }, []));
  const onRefresh = () => { setRefreshing(true); fetchCategories(); };

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
        <Text style={styles.headerTitle}>📊 Статистика</Text>
        <Text style={styles.headerSubtitle}>Справочник блюд</Text>
      </View>

      {selectedCategory ? (
        <>
          {/* Кнопка назад */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedCategory(null)}>
              <Text style={styles.backBtnText}>← Назад к категориям</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>{selectedCategory.name}</Text>
            <Text style={styles.sectionSubtitle}>{selectedCategory.count} блюд</Text>

            {selectedCategory.items.map((d, i) => (
              <View key={d.id || i} style={styles.dishCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>{d.name}</Text>
                  <Text style={styles.dishMeta}>
                    {d.calories ? `${d.calories} ккал` : '—'} · {d.price ? `${d.price} Br` : '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Категории блюд</Text>
          {categories.map((cat, i) => (
            <TouchableOpacity key={i} style={styles.categoryCard} onPress={() => setSelectedCategory(cat)}>
              <View style={styles.catIcon}>
                <Text style={styles.catIconText}>📂</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryMeta}>{cat.count} блюд</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 25, fontWeight: '600', color: '#2C3E50', marginBottom: 15 },
  sectionSubtitle: { fontSize: 14, color: '#7F8C8D', marginBottom: 12 },
  backBtn: { backgroundColor: '#ECF0F1', borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#3498DB' },
  categoryCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  catIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F4FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catIconText: { fontSize: 20 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  categoryMeta: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  arrow: { fontSize: 24, color: '#BDC3C7', fontWeight: '300' },
  dishCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  dishName: { fontSize: 15, fontWeight: '600', color: '#2C3E50' },
  dishMeta: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
});

export default StatsScreen;
