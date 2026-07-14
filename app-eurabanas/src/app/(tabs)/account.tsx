import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { LoadingState } from "@/components/States";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/hooks/useAccount";
import { colors, radius, shadow, spacing } from "@/lib/theme";

export default function AccountScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const { summary, loading, error, refresh } = useAccount();

  if (authLoading) return <Screen scroll={false}><LoadingState label="Recuperando tu cuenta..." /></Screen>;
  if (!user) {
    return (
      <Screen>
        <View style={styles.guestHero}>
          <Ionicons name="person-circle-outline" size={72} color={colors.sky} />
          <Text style={styles.guestTitle}>Tu cuenta Estadías Urbanas</Text>
          <Text style={styles.guestText}>Consulta puntos, reservas y datos personales sincronizados con la web.</Text>
          <AppButton label="Iniciar sesión o registrarme" onPress={() => router.push("/auth")} style={styles.guestButton} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.blue} />}>
      <View style={styles.profileRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.profileCopy}>
          <Text style={styles.hello}>Hola, {user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.levelCard}>
        <View>
          <Text style={styles.levelEyebrow}>CLUB ESTADÍAS URBANAS</Text>
          <Text style={styles.level}>{summary?.loyalty.tier ?? "Club"}</Text>
          <Text style={styles.points}>{summary?.loyalty.points ?? 0} puntos disponibles</Text>
        </View>
        <Ionicons name="diamond-outline" size={42} color={colors.sky} />
      </View>

      <View style={styles.metrics}>
        {[
          ["calendar-outline", summary?.loyalty.bookings ?? 0, "Reservas"],
          ["moon-outline", summary?.loyalty.nights ?? 0, "Noches"],
          ["airplane-outline", summary?.reservations.active ?? 0, "Activas"],
        ].map(([icon, value, label]) => (
          <View key={String(label)} style={styles.metric}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.blue} />
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.actions}>
        <AppButton label="Ver mis reservas" icon="calendar-outline" variant="ghost" onPress={() => router.push("/(tabs)/reservations")} />
        <AppButton label="Buscar alojamiento" icon="search-outline" variant="ghost" onPress={() => router.push("/(tabs)/search")} />
        <AppButton label="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={() => Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta?", [{ text: "Cancelar", style: "cancel" }, { text: "Cerrar sesión", style: "destructive", onPress: () => void logout() }])} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestHero: { minHeight: 520, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  guestTitle: { color: colors.text, fontSize: 27, fontWeight: "900", textAlign: "center" },
  guestText: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  guestButton: { marginTop: spacing.sm, alignSelf: "stretch" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.surface, fontSize: 24, fontWeight: "900" },
  profileCopy: { flex: 1 },
  hello: { color: colors.text, fontSize: 22, fontWeight: "900" },
  email: { color: colors.textMuted, marginTop: 3 },
  error: { color: colors.danger, marginTop: spacing.md },
  levelCard: { backgroundColor: colors.navyDark, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelEyebrow: { color: colors.sky, fontSize: 11, letterSpacing: 1, fontWeight: "900" },
  level: { color: colors.surface, fontSize: 30, fontWeight: "900", marginTop: 5 },
  points: { color: "#C4D7EA", marginTop: 4 },
  metrics: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  metric: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", gap: 5, ...shadow },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: spacing.xl, marginBottom: spacing.md },
  actions: { gap: spacing.sm },
});
