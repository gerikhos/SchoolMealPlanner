import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE, toISODate, mealIcon } from '../utils';
import { useAuth } from '../context/AuthContext';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MEAL_TYPES = [
  { id: 1, name: 'Завтрак' },
  { id: 2, name: 'Обед' },
  { id: 3, name: 'Полдник' },
];

const StudentCalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const [dishes, setDishes] = useState([]);
  const [myOrders, setMyOrders] = useState({});
  const [selectedDay, setSelectedDay] = useState(today);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchData = async () => {
    try {
      const dishesRes = await fetch(`${API_BASE}/dishes`);
      const dishesJson = await dishesRes.json();
      if (dishesJson.success) setDishes(dishesJson.data);

      // Заказы для всех дней недели
      const ordersByDate = {};
      for (const d of weekDates) {
        const res = await fetch(`${API_BASE}/orders/my/${toISODate(d)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) ordersByDate[toISODate(d)] = json.data;
      }
      setMyOrders(ordersByDate);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openPicker = (mt) => {
    setSelectedMealType(mt);
    setShowPicker(true);
  };

  const addOrder = async (dishId) => {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          menu_date: toISODate(selectedDay),
          meal_type_id: selectedMealType.id,
          dish_id: dishId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPicker(false);
        fetchData();
      } else {
        Alert.alert('Ошибка', json.error);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить');
    }
  };

  const removeOrder = async (id) => {
    try {
      await fetch(`${API_BASE}/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось удалить');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Мой выбор</Text>
        <Text style={styles.headerSubtitle}>Выбери блюда на день</Text>
      </View>

      {/* Дни недели */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
        {weekDates.map((d, i) => {
          const iso = toISODate(d);
          const isSelected = toISODate(selectedDay) === iso;
          const hasOrders = myOrders[iso] && myOrders[iso].length > 0;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{WEEKDAYS[i]}</Text>
              <Text style={[styles.dayDate, isSelected && styles.dayDateSelected]}>{d.getDate()}</Text>
              {hasOrders && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Мои заказы */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
        </Text>

        {MEAL_TYPES.map((mt) => {
          const iso = toISODate(selectedDay);
          const items = (myOrders[iso] || []).filter(it => it.meal_type === mt.name);
          return (
            <View key={mt.id} style={{ marginBottom: 16 }}>
              <View style={styles.mealRow}>
                <Text style={styles.mealTypeText}>{mealIcon(mt.name)} {mt.name}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => openPicker(mt)}>
                  <Text style={styles.addBtnText}>+ Выбрать</Text>
                </TouchableOpacity>
              </View>

              {items.length > 0 ? items.map(item => (
                <View key={item.id} style={styles.dishItem}>
                  <Text style={styles.dishItemText}>{item.dish_name}</Text>
                  <TouchableOpacity onPress={() => removeOrder(item.id)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              )) : (
                <Text style={styles.emptyMeal}>Ничего не выбрано</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Модалка выбора */}
      {showPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedMealType?.name}</Text>
            <ScrollView style={styles.dishList}>
              {dishes
                .filter(d => !((myOrders[toISODate(selectedDay)] || []).some(it => it.dish_id === d.id && it.meal_type === selectedMealType.name)))
                .map(d => (
                  <TouchableOpacity key={d.id} style={styles.dishOption} onPress={() => addOrder(d.id)}>
                    <Text style={styles.dishOptionText}>{d.name}</Text>
                    <Text style={styles.dishOptionMeta}>{d.category} · {d.price} ₽</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPicker(false)}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  weekStrip: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, backgroundColor: '#FFF', marginTop: 10 },
  dayChip: { alignItems: 'center', padding: 10, marginHorizontal: 5, borderRadius: 12, backgroundColor: '#ECF0F1', minWidth: 50 },
  dayChipSelected: { backgroundColor: '#3498DB' },
  dayLabel: { fontSize: 13, color: '#7F8C8D', marginBottom: 4 },
  dayLabelSelected: { color: '#FFF', fontWeight: '600' },
  dayDate: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  dayDateSelected: { color: '#FFF' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71', marginTop: 4 },
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', marginBottom: 12, textTransform: 'capitalize' },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTypeText: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  addBtn: { backgroundColor: '#3498DB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  dishItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1 },
  dishItemText: { fontSize: 14, color: '#2C3E50', flex: 1 },
  removeBtn: { fontSize: 18, color: '#E74C3C', paddingHorizontal: 8 },
  emptyMeal: { fontSize: 13, color: '#95A5A6', marginBottom: 8, fontStyle: 'italic' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '85%', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
  dishList: { maxHeight: 300 },
  dishOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECF0F1' },
  dishOptionText: { fontSize: 15, color: '#2C3E50' },
  dishOptionMeta: { fontSize: 12, color: '#95A5A6', marginTop: 2 },
  modalClose: { backgroundColor: '#3498DB', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  modalCloseText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});

export default StudentCalendarScreen;
