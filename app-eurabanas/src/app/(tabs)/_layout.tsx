import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors } from "@/lib/theme";

const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ["home-outline", "home"],
  search: ["search-outline", "search"],
  reservations: ["calendar-outline", "calendar"],
  account: ["person-circle-outline", "person-circle"],
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name] ?? ["ellipse-outline", "ellipse"];
          return <Ionicons name={focused ? pair[1] : pair[0]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="search" options={{ title: "Buscar" }} />
      <Tabs.Screen name="reservations" options={{ title: "Reservas" }} />
      <Tabs.Screen name="account" options={{ title: "Mi cuenta" }} />
    </Tabs>
  );
}
