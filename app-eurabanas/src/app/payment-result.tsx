import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { colors, spacing } from "@/lib/theme";

export default function PaymentResultScreen() {
  const { hold, status, url } = useLocalSearchParams<{ hold?: string; status?: string; url?: string }>();
  const returnedStatus = status || (url ? new URLSearchParams(String(url).split("?")[1] || "").get("status") || undefined : undefined);
  const icon = returnedStatus === "failure" ? "alert-circle-outline" : returnedStatus === "success" ? "checkmark-circle-outline" : "time-outline";
  const title = returnedStatus === "failure" ? "El pago no fue completado" : returnedStatus === "success" ? "Pago enviado a verificación" : "Estamos verificando tu pago";
  const detail = returnedStatus === "failure"
    ? "Puedes intentar nuevamente desde la reserva. Si Mercado Pago aprobó el cobro después, el webhook actualizará el estado automáticamente."
    : "Mercado Pago notificará al servidor mediante el webhook. Cuando el pago sea aprobado, la reserva cambiará a “pagada” tanto en la web como en la app.";
  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <Ionicons name={icon} size={72} color={returnedStatus === "failure" ? colors.danger : colors.blue} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
        {hold ? <Text style={styles.reference}>Referencia segura: {hold.slice(0, 10)}…</Text> : null}
        <AppButton label="Ver mis reservas" onPress={() => router.replace("/(tabs)/reservations")} style={styles.button} />
        <AppButton label="Volver al inicio" variant="ghost" onPress={() => router.replace("/(tabs)")} style={styles.button} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 27, fontWeight: "900", textAlign: "center" },
  detail: { color: colors.textMuted, fontSize: 15, lineHeight: 23, textAlign: "center" },
  reference: { color: colors.blue, fontSize: 12, fontWeight: "700" },
  button: { alignSelf: "stretch" },
});
