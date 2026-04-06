import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Ошибка входа', result.error);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoArea}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={styles.title}>Школьное питание</Text>
          <Text style={styles.subtitle}>Учет и планирование</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Логин</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите логин"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Войти</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.btnSecondaryText}>Регистрация</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 30 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 64, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50' },
  subtitle: { fontSize: 15, color: '#7F8C8D', marginTop: 4 },
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

export default LoginScreen;
