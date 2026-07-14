import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";

import { EmptyState, LoadingState } from "@/components/States";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/dates";
import { api } from "@/lib/api";
import { colors, radius, shadow, spacing } from "@/lib/theme";
import { Reservation } from "@/types";

export default function ReservationsScreen() {
  const { token, user, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setReservations(await api.reservations(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar tus reservas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (authLoading) return <Screen scroll={false}><LoadingState label="Recuperando tu sesión..." /></Screen>;
  if (!user || !token) {
    return <Screen scroll={false}><EmptyState title="Tus reservas, en un solo lugar" detail="Inicia sesión para ver reservas creadas en la web y en la app." actionLabel="Iniciar sesión" onAction={() => router.push("/auth")} /></Screen>;
  }
  if (loading && !reservations.length) return <Screen scroll={false}><LoadingState label="Sincronizando reservas..." /></Screen>;

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.blue} />}>
      <Text style={styles.eyebrow}>SINCRONIZADAS CON LA WEB</Text>
      <Text style={styles.title}>Mis reservas</Text>
      <Text style={styles.subtitle}>{user.email}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.list}>
        {reservations.map((reservation) => (
          <View key={reservation.folio} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.folio}>{reservation.folio}</Text>
              <StatusPill status={reservation.status} />
            </View>
            <Text style={styles.property}>{reservation.property}</Text>
            <Text style={styles.dates}>{formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}</Text>
            <Text style={styles.meta}>{reservation.guests} huésped(es) · Origen: {reservation.source === "app" ? "App" : "Web"}</Text>
          </View>
        ))}
        {!reservations.length ? <EmptyState title="Aún no tienes reservas" detail="Cuando reserves en la web o en la app, aparecerá aquí automáticamente." actionLabel="Buscar alojamiento" onAction={() => router.push("/(tabs)/search")} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 1, fontWeight: "900", marginTop: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  list: { gap: spacing.md, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm, ...shadow },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  folio: { color: colors.blue, fontWeight: "900" },
  property: { color: colors.text, fontSize: 18, fontWeight: "900" },
  dates: { color: colors.text, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 13 },
});
