import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 4 символов');
      return;
    }
    setLoading(true);
    const result = await register(username.trim(), password, fullName.trim());
    setLoading(false);
    if (!result.success) {
      Alert.alert('Ошибка регистрации', result.error);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoArea}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={styles.title}>Регистрация</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>ФИО</Text>
          <TextInput style={styles.input} placeholder="Иванов Иван Иванович" value={fullName} onChangeText={setFullName} />

          <Text style={styles.label}>Логин</Text>
          <TextInput style={styles.input} placeholder="Придумайте логин" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.label}>Пароль</Text>
          <TextInput style={styles.input} placeholder="Минимум 4 символа" value={password} onChangeText={setPassword} secureTextEntry />

          <Text style={styles.label}>Подтверждение пароля</Text>
          <TextInput style={styles.input} placeholder="Повторите пароль" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Зарегистрироваться</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnSecondaryText}>Уже есть аккаунт? Войти</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 30 },
  logoArea: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 64, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50' },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#2C3E50', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, borderWidth: 1, borderColor: '#E0E6ED', color: '#2C3E50',
  },
  btnPrimary: {
    backgroundColor: '#3498DB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  btnSecondary: {
    backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: '#3498DB',
  },
  btnSecondaryText: { color: '#3498DB', fontSize: 16, fontWeight: '600' },
});

export default RegisterScreen;
