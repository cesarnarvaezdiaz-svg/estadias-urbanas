import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { colors, spacing } from "@/lib/theme";

export default function PaymentResultScreen() {
  const { hold } = useLocalSearchParams<{ hold?: string }>();
  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <Ionicons name="time-outline" size={72} color={colors.blue} />
        <Text style={styles.title}>Estamos verificando tu pago</Text>
        <Text style={styles.detail}>Mercado Pago notificará al servidor mediante el webhook. Cuando el pago sea aprobado, la reserva cambiará a “pagada” tanto en la web como en la app.</Text>
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
