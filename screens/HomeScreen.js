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

const HomeScreen = () => {
  const { user, logout, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const todayISO = toISODate(today);

  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const menuRes = await fetch(`${API_BASE}/menu/${todayISO}`);
      const menuJson = await menuRes.json();

      if (menuJson.success) {
        const grouped = {};
        menuJson.data.forEach((item) => {
          if (!grouped[item.meal_type]) {
            grouped[item.meal_type] = { time: item.meal_time, dishes: [] };
          }
          grouped[item.meal_type].dishes.push(item);
        });
        setMenuData(grouped);
      }
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayISO]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Загрузка меню...</Text>
      </View>
    );
  }

  return (
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Сегодняшнее меню</Text>
        <Text style={styles.sectionDate}>
          {getDayOfWeek(today)}, {formatDate(today)}
        </Text>

        {Object.keys(menuData).length > 0 ? (
          Object.entries(menuData).map(([mealType, data], idx) => (
            <View key={idx} style={styles.menuCard}>
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
              <Text style={styles.mealTime}>{data.time.substring(0, 5)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Меню на сегодня ещё не составлено
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
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
    backgroundColor: "#dacdff",
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
