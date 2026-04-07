import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

const DishesScreen = () => {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', category_id: '', calories: '', price: '' });

  const fetchData = async () => {
    try {
      const [dishesRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/dishes`),
        fetch(`${API_BASE}/categories`),
      ]);
      const dishesJson = await dishesRes.json();
      const catJson = await catRes.json();
      if (dishesJson.success) setDishes(dishesJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', category_id: categories[0]?.id || '', calories: '', price: '' });
    setShowForm(true);
  };

  const openEdit = (d) => {
    setEditId(d.id);
    setForm({ name: d.name, category_id: d.category_id, calories: String(d.calories || ''), price: String(d.price || '') });
    setShowForm(true);
  };

  const saveDish = async () => {
    if (!form.name.trim() || !form.category_id) {
      Alert.alert('Ошибка', 'Заполните название и категорию');
      return;
    }
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_BASE}/dishes/${editId}` : `${API_BASE}/dishes`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          category_id: parseInt(form.category_id),
          calories: form.calories ? parseInt(form.calories) : null,
          price: form.price ? parseFloat(form.price) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowForm(false);
        fetchData();
      } else {
        Alert.alert('Ошибка', json.error);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    }
  };

  const deleteDish = (id, name) => {
    Alert.alert('Удалить блюдо', `${name}?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/dishes/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchData();
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  // Группировка по категориям
  const grouped = {};
  dishes.forEach(d => {
    const cat = d.category_name || 'Без категории';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(d);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍲 Справочник блюд</Text>
        <Text style={styles.headerSubtitle}>Управление каталогом блюд</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Добавить блюдо</Text>
        </TouchableOpacity>

        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat}>
            <Text style={styles.categoryTitle}>{cat}</Text>
            {items.map(d => (
              <TouchableOpacity key={d.id} style={styles.dishCard} onLongPress={() => openEdit(d)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>{d.name}</Text>
                  <Text style={styles.dishMeta}>
                    {d.calories ? `${d.calories} ккал` : '—'} · {d.price ? `${d.price} ₽` : '—'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteDish(d.id, d.name)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Модалка формы */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editId ? 'Редактировать' : 'Новое блюдо'}</Text>

            <Text style={styles.label}>Название</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="Борщ" />

            <Text style={styles.label}>Категория</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, parseInt(form.category_id) === c.id && styles.catChipActive]}
                  onPress={() => setForm({ ...form, category_id: String(c.id) })}
                >
                  <Text style={[styles.catChipText, parseInt(form.category_id) === c.id && styles.catChipTextActive]}>
                    {c.name} ({c.meal_type_name})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Калории (ккал)</Text>
                <TextInput style={styles.input} value={form.calories} onChangeText={t => setForm({ ...form, calories: t })} placeholder="250" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.label}>Цена (₽)</Text>
                <TextInput style={styles.input} value={form.price} onChangeText={t => setForm({ ...form, price: t })} placeholder="80" keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity style={styles.modalSave} onPress={saveDish}>
              <Text style={styles.modalSaveText}>Сохранить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowForm(false)}>
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
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  headerSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 4 },
  section: { marginTop: 15, paddingHorizontal: 20 },
  addBtn: { backgroundColor: '#3498DB', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  categoryTitle: { fontSize: 16, fontWeight: '600', color: '#2C3E50', marginTop: 8, marginBottom: 6 },
  dishCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  dishName: { fontSize: 15, fontWeight: '600', color: '#2C3E50' },
  dishMeta: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 20, color: '#E74C3C' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#2C3E50', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E0E6ED', fontSize: 15 },
  catScroll: { flexDirection: 'row', marginTop: 6 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#ECF0F1', marginRight: 6 },
  catChipActive: { backgroundColor: '#3498DB' },
  catChipText: { fontSize: 13, color: '#7F8C8D', fontWeight: '600' },
  catChipTextActive: { color: '#FFF' },
  row: { flexDirection: 'row', marginTop: 6 },
  modalSave: { backgroundColor: '#3498DB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  modalCancel: { padding: 14, alignItems: 'center', marginTop: 6 },
  modalCancelText: { color: '#95A5A6', fontSize: 14 },
});

export default DishesScreen;
