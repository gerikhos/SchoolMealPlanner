import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Main screens
import HomeScreen from './screens/HomeScreen';
import StudentCalendarScreen from './screens/StudentCalendarScreen';
import AdminCalendarScreen from './screens/AdminCalendarScreen';
import StatsScreen from './screens/StatsScreen';
import BalanceScreen from './screens/BalanceScreen';
import UsersScreen from './screens/UsersScreen';
import DishesScreen from './screens/DishesScreen';
import AdminStatsScreen from './screens/AdminStatsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const icons = {
  Home: '🏠',
  Calendar: '📅',
  Stats: '📊',
  Balance: '💰',
  Users: '👥',
  Dishes: '🍲',
  AdminStats: '📈',
  AdminCalendar: '📋',
};

const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => (
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
          {icons[route.name] || '📌'}
        </Text>
      ),
      tabBarActiveTintColor: '#3498DB',
      tabBarInactiveTintColor: '#95A5A6',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#ECF0F1',
        paddingBottom: 8,
        paddingTop: 8,
        height: 60,
        elevation: 8,
        marginBottom: 10,
        marginHorizontal: 10,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
    <Tab.Screen name="Calendar" component={StudentCalendarScreen} options={{ title: 'Мой выбор' }} />
    <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Статистика' }} />
    <Tab.Screen name="Balance" component={BalanceScreen} options={{ title: 'Баланс' }} />
  </Tab.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => (
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
          {icons[route.name] || '📌'}
        </Text>
      ),
      tabBarActiveTintColor: '#3498DB',
      tabBarInactiveTintColor: '#95A5A6',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#ECF0F1',
        paddingBottom: 8,
        paddingTop: 8,
        height: 60,
        elevation: 8,
        marginBottom: 20,
        marginHorizontal: 10,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
    <Tab.Screen name="AdminCalendar" component={AdminCalendarScreen} options={{ title: 'Выбор учеников' }} />
    <Tab.Screen name="Dishes" component={DishesScreen} options={{ title: 'Блюда' }} />
    <Tab.Screen name="AdminStats" component={AdminStatsScreen} options={{ title: 'Популярность' }} />
    <Tab.Screen name="Users" component={UsersScreen} options={{ title: 'Пользователи' }} />
    <Tab.Screen name="Balance" component={BalanceScreen} options={{ title: 'Баланс' }} />
  </Tab.Navigator>
);

const MainNavigator = () => {
  const { user, isAdmin } = useAuth();
  return isAdmin ? <AdminTabs /> : <StudentTabs />;
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? <Stack.Screen name="Main" component={MainNavigator} /> : <Stack.Screen name="Auth" component={AuthStack} />}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
