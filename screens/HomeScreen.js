import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  API_BASE,
  formatDate,
  getDayOfWeek,
  toISODate,
  mealIcon,
} from "../utils";
import { useAuth } from "../context/AuthContext";

const MEAL_TYPES = ["Завтрак", "Обед", "Полдник"];

const HomeScreen = () => {
  const { user, logout, isAdmin, token } = useAuth();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const todayISO = toISODate(today);

  // Для ученика — его подтверждённые заказы на сегодня
  const [studentOrders, setStudentOrders] = useState({});
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudentOrders = useCallback(async () => {
    try {
      const confRes = await fetch(
        `${API_BASE}/orders/confirmed/${todayISO}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const confJson = await confRes.json();

      if (confJson.success && confJson.confirmed) {
        setIsConfirmed(true);
        const ordersRes = await fetch(
          `${API_BASE}/orders/my/${todayISO}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ordersJson = await ordersRes.json();
        if (ordersJson.success) {
          const grouped = {};
          ordersJson.data.forEach((item) => {
            if (!grouped[item.meal_type]) {
              grouped[item.meal_type] = { time: item.meal_time, dishes: [] };
            }
            grouped[item.meal_type].dishes.push(item);
          });
          setStudentOrders(grouped);
        }
      } else {
        setIsConfirmed(false);
        setStudentOrders({});
      }
    } catch (err) {
      console.error("Ошибка загрузки заказов:", err);
    }
  }, [todayISO, token]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) {
      await fetchStudentOrders();
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAdmin, fetchStudentOrders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Данные для отображения
  const displayData = studentOrders;
  const hasData = Object.keys(displayData).length > 0;
  const emptyMessage = isConfirmed
    ? "Заказ на сегодня ещё не выбран"
    : "Заказ на сегодня не подтверждён. Перейдите в «Мой выбор»";

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3498DB"]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>🍽️ Школьное питание</Text>
              <Text style={styles.headerSubtitle}>Учет и планирование</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() =>
                Alert.alert("Выход", "Выйти из аккаунта?", [
                  { text: "Отмена", style: "cancel" },
                  { text: "Выйти", onPress: logout },
                ])
              }
            >
              <Text style={styles.logoutText}>🚪</Text>
            </TouchableOpacity>
          </View>
          {user && (
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>
                {isAdmin ? "🔑" : "🎓"} {user.full_name}
              </Text>
            </View>
          )}
        </View>

        {!isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Мой заказ на сегодня</Text>
            <Text style={styles.sectionDate}>
              {getDayOfWeek(today)}, {formatDate(today)}
            </Text>

            {hasData ? (
              MEAL_TYPES.map((mealType) => {
                const data = displayData[mealType];
                if (!data) return null;
                return (
                  <View key={mealType} style={styles.menuCard}>
                    <View style={styles.menuCardLeft}>
                      <View style={styles.mealIcon}>
                        <Text style={styles.mealIconText}>{mealIcon(mealType)}</Text>
                      </View>
                      <View style={styles.menuInfo}>
                        <Text style={styles.mealName}>{mealType}</Text>
                        {data.dishes.map((dish, i) => (
                          <Text key={i} style={styles.dishName}>
                            • {dish.dish_name}
                          </Text>
                        ))}
                      </View>
                    </View>
                    <Text style={styles.mealTime}>
                      {data.time ? data.time.substring(0, 5) : ""}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
  },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#7F8C8D" },
  scrollView: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#bebcec",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    borderRadius: 25,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#2C3E50" },
  headerSubtitle: { fontSize: 16, color: "#7F8C8D", marginTop: 4 },
  logoutBtn: { padding: 10 },
  logoutText: { fontSize: 24 },
  userBadge: {
    marginTop: 10,
    backgroundColor: "#E8F4FD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  userBadgeText: { fontSize: 14, fontWeight: "600", color: "#2980B9" },
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 10,
  },
  sectionDate: { fontSize: 14, color: "#7F8C8D", marginBottom: 12 },
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mealIconText: { fontSize: 20 },
  menuInfo: { flex: 1 },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  dishName: { fontSize: 14, color: "#7F8C8D", marginTop: 1 },
  mealTime: {
    fontSize: 14,
    color: "#3498DB",
    fontWeight: "600",
    minWidth: 50,
    textAlign: "right",
    flexShrink: 0,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: { fontSize: 14, color: "#95A5A6", textAlign: "center" },
});

export default HomeScreen;
