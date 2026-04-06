import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../utils';
import { useAuth } from '../context/AuthContext';

const UsersScreen = () => {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', username: '', password: '', role: 'student' });

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser),
      });
      const json = await res.json();
      if (json.success) {
        setShowAdd(false);
        setNewUser({ full_name: '', username: '', password: '', role: 'student' });
        fetchUsers();
      } else {
        Alert.alert('Ошибка', json.error);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось создать пользователя');
    }
  };

  const deleteUser = (id, name) => {
    Alert.alert('Удалить пользователя', `${name}?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            fetchUsers();
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Пользователи</Text>
        <Text style={styles.headerSubtitle}>Управление аккаунтами</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Добавить пользователя</Text>
        </TouchableOpacity>

        {users.map(u => (
          <View key={u.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.full_name}</Text>
              <Text style={styles.userMeta}>@{u.username} · {u.role === 'admin' ? '🔑 Админ' : '🎓 Ученик'}</Text>
            </View>
            {u.role !== 'admin' && (
              <TouchableOpacity onPress={() => deleteUser(u.id, u.full_name)}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Модалка добавления */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Новый пользователь</Text>

            <Text style={styles.label}>ФИО</Text>
            <TextInput style={styles.input} value={newUser.full_name} onChangeText={t => setNewUser({ ...newUser, full_name: t })} placeholder="Иванов Иван" />

            <Text style={styles.label}>Логин</Text>
            <TextInput style={styles.input} value={newUser.username} onChangeText={t => setNewUser({ ...newUser, username: t })} placeholder="ivanov" autoCapitalize="none" />

            <Text style={styles.label}>Пароль</Text>
            <TextInput style={styles.input} value={newUser.password} onChangeText={t => setNewUser({ ...newUser, password: t })} placeholder="Пароль" secureTextEntry />

            <Text style={styles.label}>Роль</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity style={[styles.roleBtn, newUser.role === 'student' && styles.roleBtnActive]} onPress={() => setNewUser({ ...newUser, role: 'student' })}>
                <Text style={[styles.roleBtnText, newUser.role === 'student' && styles.roleBtnTextActive]}>🎓 Ученик</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roleBtn, newUser.role === 'admin' && styles.roleBtnActive]} onPress={() => setNewUser({ ...newUser, role: 'admin' })}>
                <Text style={[styles.roleBtnText, newUser.role === 'admin' && styles.roleBtnTextActive]}>🔑 Админ</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalSave} onPress={addUser}>
              <Text style={styles.modalSaveText}>Создать</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAdd(false)}>
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
  userCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  userName: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  userMeta: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  deleteBtn: { fontSize: 20, color: '#E74C3C', padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#2C3E50', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E0E6ED', fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#ECF0F1', alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#3498DB' },
  roleBtnText: { fontSize: 14, color: '#7F8C8D', fontWeight: '600' },
  roleBtnTextActive: { color: '#FFF' },
  modalSave: { backgroundColor: '#3498DB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  modalSaveText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  modalCancel: { padding: 14, alignItems: 'center', marginTop: 6 },
  modalCancelText: { color: '#95A5A6', fontSize: 14 },
});

export default UsersScreen;
