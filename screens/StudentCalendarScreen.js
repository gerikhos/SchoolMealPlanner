import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
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

  const [myOrders, setMyOrders] = useState({});
  const [confirmed, setConfirmed] = useState({});
  const [selectedDay, setSelectedDay] = useState(today);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [pickerDishes, setPickerDishes] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Только будни (пн-пт)
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchOrders = async () => {
    const ordersByDate = {};
    const confirmedByDate = {};
    for (const d of weekDates) {
      const iso = toISODate(d);
      try {
        const [ordersRes, confRes] = await Promise.all([
          fetch(`${API_BASE}/orders/my/${iso}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/orders/confirmed/${iso}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const ordersText = await ordersRes.text();
        const confText = await confRes.text();

        if (ordersText.startsWith('{') || ordersText.startsWith('[')) {
          const ordersJson = JSON.parse(ordersText);
          if (ordersJson.success) {
            ordersByDate[iso] = ordersJson.data;
            console.log(`Заказы за ${iso}:`, ordersJson.data.length, 'шт');
          }
        } else {
          console.error(`Ошибка /orders/my/${iso}:`, ordersText.substring(0, 100));
        }

        if (confText.startsWith('{') || confText.startsWith('[')) {
          const confJson = JSON.parse(confText);
          if (confJson.success) confirmedByDate[iso] = confJson.confirmed;
        } else {
          console.error(`Ошибка /orders/confirmed/${iso}:`, confText.substring(0, 100));
        }
      } catch (err) {
        console.error(`Ошибка загрузки заказов за ${iso}:`, err.message);
      }
    }
    console.log('Все заказы:', ordersByDate);
    console.log('Все подтверждения:', confirmedByDate);
    setMyOrders(ordersByDate);
    setConfirmed(confirmedByDate);
  };

  useEffect(() => {
    fetchOrders().then(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders().then(() => setRefreshing(false));
  };

  const openPicker = async (mt) => {
    setSelectedMealType(mt);
    setPickerLoading(true);
    setPickerDishes([]);
    try {
      const res = await fetch(`${API_BASE}/dishes/for-meal-type/${mt.id}`);
      const json = await res.json();
      if (json.success) {
        setPickerDishes(json.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки блюд:', err);
    }
    setPickerLoading(false);
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
        // Проверяем, есть ли уже в локальном состоянии
        const iso = toISODate(selectedDay);
        const alreadySelected = (myOrders[iso] || []).some(
          o => o.dish_id === dishId && o.meal_type === selectedMealType.name
        );

        if (!alreadySelected) {
          const newOrder = {
            id: json.id || 0,
            menu_date: toISODate(selectedDay),
            meal_type: selectedMealType.name,
            dish_id: dishId,
            dish_name: pickerDishes.find(d => d.id === dishId)?.name || '',
            category: pickerDishes.find(d => d.id === dishId)?.category_name || '',
            calories: pickerDishes.find(d => d.id === dishId)?.calories,
            price: pickerDishes.find(d => d.id === dishId)?.price,
          };
          setMyOrders(prev => ({
            ...prev,
            [iso]: [...(prev[iso] || []), newOrder],
          }));
        }
        setShowPicker(false);
      } else {
        Alert.alert('Ошибка', json.error || 'Не удалось добавить');
      }
    } catch (err) {
      console.error('Ошибка добавления заказа:', err);
      Alert.alert('Ошибка', 'Не удалось добавить');
    }
  };

  const removeOrder = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const iso = toISODate(selectedDay);
        setMyOrders(prev => ({
          ...prev,
          [iso]: (prev[iso] || []).filter(o => o.id !== id),
        }));
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const confirmOrders = async () => {
    const iso = toISODate(selectedDay);
    const orders = myOrders[iso] || [];
    if (orders.length === 0) {
      Alert.alert('Ошибка', 'Сначала выберите блюда');
      return;
    }

    // Считаем сумму перед отправкой
    const total = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);

    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/orders/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ menu_date: iso }),
      });
      const responseText = await res.text();

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        console.error('Не JSON ответ:', responseText.substring(0, 200));
        Alert.alert('Ошибка', `Сервер вернул: ${responseText.substring(0, 100)}`);
        setConfirming(false);
        return;
      }

      if (json.success) {
        setConfirmed(prev => ({ ...prev, [iso]: true }));
        Alert.alert('Готово!', `Заказ подтверждён на ${json.total?.toFixed(2) || '0.00'} Br`);
      } else {
        Alert.alert('Ошибка', json.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      console.error('Ошибка подтверждения:', err.message);
      Alert.alert('Ошибка', `Не удалось подтвердить заказ: ${err.message}`);
    }
    setConfirming(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  // Определяем прошедшие дни
  const todayISO = toISODate(today);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
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
            const isPast = iso < todayISO;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayChip, isSelected && styles.dayChipSelected, isPast && styles.dayChipDisabled]}
                onPress={() => !isPast && setSelectedDay(d)}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected, isPast && styles.dayLabelDisabled]}>{WEEKDAYS[i]}</Text>
                <Text style={[styles.dayDate, isSelected && styles.dayDateSelected, isPast && styles.dayDateDisabled]}>{d.getDate()}</Text>
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
            const isConfirmed = confirmed[iso];
            const isPast = iso < todayISO;
            const disabled = isConfirmed || isPast;
            const items = (myOrders[iso] || []).filter(it => it.meal_type === mt.name);
            return (
              <View key={mt.id} style={{ marginBottom: 16 }}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealTypeText}>{mealIcon(mt.name)} {mt.name}</Text>
                  {!disabled && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => openPicker(mt)}>
                      <Text style={styles.addBtnText}>+ Выбрать</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {items.length > 0 ? items.map(item => (
                  <View key={item.id} style={styles.dishItem}>
                    <Text style={styles.dishItemText}>{item.dish_name}</Text>
                    {!disabled && (
                      <TouchableOpacity onPress={() => removeOrder(item.id)}>
                        <Text style={styles.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )) : (
                  <Text style={styles.emptyMeal}>Ничего не выбрано</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Плашка подтверждения */}
      {!confirmed[toISODate(selectedDay)] && toISODate(selectedDay) >= todayISO && (
        <View style={styles.confirmBar}>
          <View style={styles.confirmInfo}>
            <Text style={styles.confirmLabel}>Итого за день:</Text>
            <Text style={styles.confirmTotal}>
              {(myOrders[toISODate(selectedDay)] || []).reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0).toFixed(2)} Br
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, (myOrders[toISODate(selectedDay)] || []).length === 0 && styles.confirmBtnDisabled]}
            onPress={confirmOrders}
            disabled={confirming || (myOrders[toISODate(selectedDay)] || []).length === 0}
          >
            {confirming ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.confirmBtnText}>Подтвердить</Text>}
          </TouchableOpacity>
        </View>
      )}

      {confirmed[toISODate(selectedDay)] && (
        <View style={styles.confirmedBar}>
          <Text style={styles.confirmedText}>✅ Заказ подтверждён</Text>
        </View>
      )}

      {/* Модалка выбора — ВНЕ ScrollView через Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedMealType?.name}</Text>

            {pickerLoading ? (
              <ActivityIndicator size="large" color="#3498DB" style={{ padding: 20 }} />
            ) : pickerDishes.length > 0 ? (
              <ScrollView style={styles.dishList} showsVerticalScrollIndicator={false}>
                {(() => {
                  const grouped = {};
                  pickerDishes.forEach(d => {
                    if (!grouped[d.category_name]) grouped[d.category_name] = [];
                    grouped[d.category_name].push(d);
                  });
                  return Object.entries(grouped).map(([catName, catItems]) => (
                    <View key={catName}>
                      <Text style={styles.catHeader}>{catName}</Text>
                      {catItems.map(d => (
                        <TouchableOpacity key={d.id} style={styles.dishOption} onPress={() => addOrder(d.id)}>
                          <Text style={styles.dishOptionText}>{d.name}</Text>
                          <Text style={styles.dishOptionMeta}>{d.calories ? `${d.calories} ккал` : ''} {d.price ? `· ${d.price} Br` : ''}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ));
                })()}
              </ScrollView>
            ) : (
              <Text style={styles.emptyPicker}>Нет доступных блюд</Text>
            )}

            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPicker(false)}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  headerSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },
  weekStrip: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, backgroundColor: '#FFF', marginTop: 10 },
  dayChip: { alignItems: 'center', padding: 10, marginHorizontal: 5, borderRadius: 12, backgroundColor: '#ECF0F1', minWidth: 50 },
  dayChipSelected: { backgroundColor: '#3498DB' },
  dayLabel: { fontSize: 13, color: '#7F8C8D', marginBottom: 4 },
  dayLabelSelected: { color: '#FFF', fontWeight: '600' },
  dayDate: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  dayDateSelected: { color: '#FFF' },
  dayChipDisabled: { backgroundColor: '#E8E8E8', opacity: 0.5 },
  dayLabelDisabled: { color: '#BDC3C7' },
  dayDateDisabled: { color: '#BDC3C7' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16, textAlign: 'center' },
  catHeader: { fontSize: 13, fontWeight: '600', color: '#3498DB', marginTop: 8, marginBottom: 4, paddingHorizontal: 4 },
  dishList: { maxHeight: 400 },
  dishOption: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#ECF0F1' },
  dishOptionText: { fontSize: 15, color: '#2C3E50' },
  dishOptionMeta: { fontSize: 12, color: '#95A5A6', marginTop: 2 },
  emptyPicker: { textAlign: 'center', color: '#95A5A6', padding: 20 },
  modalClose: { backgroundColor: '#3498DB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  modalCloseText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  confirmBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', padding: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#ECF0F1',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  confirmInfo: { flex: 1 },
  confirmLabel: { fontSize: 14, color: '#7F8C8D' },
  confirmTotal: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50' },
  confirmBtn: { backgroundColor: '#2ECC71', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  confirmBtnDisabled: { backgroundColor: '#BDC3C7' },
  confirmBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  confirmedBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#D5F5E3', padding: 16, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#2ECC71',
  },
  confirmedText: { fontSize: 15, fontWeight: '600', color: '#27AE60' },
});

export default StudentCalendarScreen;
