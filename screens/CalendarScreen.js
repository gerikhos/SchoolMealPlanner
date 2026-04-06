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

const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const { token, isAdmin } = useAuth();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const [dishes, setDishes] = useState([]);
  const [weekMenu, setWeekMenu] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchData = async () => {
    try {
      const [dishesRes, ...menuResps] = await Promise.all(
        [fetch(`${API_BASE}/dishes`), ...weekDates.map(d => fetch(`${API_BASE}/menu/${toISODate(d)}`))]
      );

      const dishesJson = await dishesRes.json();
      if (dishesJson.success) setDishes(dishesJson.data);

      const menuByDate = {};
      for (let i = 0; i < weekDates.length; i++) {
        const menuJson = await menuResps[i].json();
        if (menuJson.success) {
          menuByDate[toISODate(weekDates[i])] = menuJson.data;
        }
      }
      setWeekMenu(menuByDate);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openPicker = (date, mealType) => {
    setSelectedDay(date);
    setSelectedMealType(mealType);
    setShowPicker(true);
  };

  const addDish = async (dishId) => {
    try {
      const res = await fetch(`${API_BASE}/menu`, {
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
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить блюдо');
    }
  };

  const removeDish = async (id) => {
    try {
      await fetch(`${API_BASE}/menu/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось удалить');
    }
  };

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
        <Text style={styles.headerTitle}>📅 Календарь</Text>
        <Text style={styles.headerSubtitle}>Планирование меню на неделю</Text>
      </View>

      {/* Дни недели */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
        {weekDates.map((d, i) => {
          const iso = toISODate(d);
          const menuItems = weekMenu[iso] || [];
          const isSelected = selectedDay && toISODate(selectedDay) === iso;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{WEEKDAYS[i]}</Text>
              <Text style={[styles.dayDate, isSelected && styles.dayDateSelected]}>{d.getDate()}</Text>
              {menuItems.length > 0 && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Меню выбранного дня */}
      {selectedDay && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
          </Text>

          {MEAL_TYPES.map((mt) => {
            const iso = toISODate(selectedDay);
            const items = (weekMenu[iso] || []).filter(it => it.meal_type === mt.name);
            return (
              <View key={mt.id}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTypeText}>{mealIcon(mt.name)} {mt.name}</Text>
                  <TouchableOpacity style={styles.addBtn} onPress={() => openPicker(selectedDay, mt)}>
                    <Text style={styles.addBtnText}>+ Добавить</Text>
                  </TouchableOpacity>
                </View>

                {items.length > 0 ? items.map(item => (
                  <View key={item.id} style={styles.dishItem}>
                    <Text style={styles.dishItemText}>{item.dish_name}</Text>
                    <TouchableOpacity onPress={() => removeDish(item.id)}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )) : (
                  <Text style={styles.emptyMeal}>Нет блюд</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Модалка выбора блюда */}
      {showPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Выберите блюдо</Text>
            <ScrollView style={styles.dishList}>
              {dishes
                .filter(d => !((weekMenu[toISODate(selectedDay)] || []).some(it => it.dish_id === d.id && it.meal_type === selectedMealType.name)))
                .map(d => (
                  <TouchableOpacity key={d.id} style={styles.dishOption} onPress={() => addDish(d.id)}>
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
  weekStrip: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, backgroundColor: '#FFFFFF', marginTop: 10 },
  dayChip: { alignItems: 'center', padding: 10, marginHorizontal: 5, borderRadius: 12, backgroundColor: '#ECF0F1', minWidth: 50 },
  dayChipSelected: { backgroundColor: '#3498DB' },
  dayLabel: { fontSize: 13, color: '#7F8C8D', marginBottom: 4 },
  dayLabelSelected: { color: '#FFFFFF', fontWeight: '600' },
  dayDate: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  dayDateSelected: { color: '#FFFFFF' },
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

export default CalendarScreen;
