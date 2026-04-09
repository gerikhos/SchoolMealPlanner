import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, toISODate } from "../utils";
import { useAuth } from "../context/AuthContext";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MEAL_TYPES = ["Завтрак", "Обед", "Полдник"];

const AdminCalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const [selectedDay, setSelectedDay] = useState(today);
  const [orderStats, setOrderStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchStats = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/orders/stats/${toISODate(selectedDay)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = await res.json();
      if (json.success) setOrderStats(json.data);
    } catch (err) {
      console.error("Ошибка:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDay]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#3498DB"]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Выбор учеников</Text>
        <Text style={styles.headerSubtitle}>Статистика заказов по дням</Text>
      </View>

      {/* Дни недели */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekStrip}
      >
        {weekDates.map((d, i) => {
          const isSelected = toISODate(selectedDay) === toISODate(d);
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setSelectedDay(d)}
            >
              <Text
                style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}
              >
                {WEEKDAYS[i]}
              </Text>
              <Text
                style={[styles.dayDate, isSelected && styles.dayDateSelected]}
              >
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Статистика */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedDay.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          })}
        </Text>

        {orderStats.length > 0 ? (
          orderStats.map((d) => (
            <View key={d.id} style={styles.statCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dishName}>{d.dish_name}</Text>
                <Text style={styles.dishMeta}>{d.category_name || ""}</Text>
              </View>
              <View style={styles.orderCount}>
                <Text style={styles.orderCountNum}>{d.order_count}</Text>
                <Text style={styles.orderCountLabel}>заказов</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Нет заказов на этот день</Text>
          </View>
        )}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#2C3E50" },
  headerSubtitle: { fontSize: 16, color: "#7F8C8D", marginTop: 4 },
  weekStrip: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#FFF",
    marginTop: 10,
  },
  dayChip: {
    alignItems: "center",
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 12,
    backgroundColor: "#ECF0F1",
    minWidth: 50,
  },
  dayChipSelected: { backgroundColor: "#3498DB" },
  dayLabel: { fontSize: 13, color: "#7F8C8D", marginBottom: 4 },
  dayLabelSelected: { color: "#FFF", fontWeight: "600" },
  dayDate: { fontSize: 18, fontWeight: "bold", color: "#2C3E50" },
  dayDateSelected: { color: "#FFF" },
  section: { marginTop: 15, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dishName: { fontSize: 15, fontWeight: "600", color: "#2C3E50" },
  dishMeta: { fontSize: 12, color: "#7F8C8D", marginTop: 2 },
  orderCount: {
    alignItems: "center",
    backgroundColor: "#E8F4FD",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  orderCountNum: { fontSize: 18, fontWeight: "bold", color: "#2980B9" },
  orderCountLabel: { fontSize: 10, color: "#3498DB" },
  emptyCard: {
    backgroundColor: "#FFF",
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

export default AdminCalendarScreen;
