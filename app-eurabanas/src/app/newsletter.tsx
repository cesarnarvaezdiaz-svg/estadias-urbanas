import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useAppPreferences } from "@/context/AppPreferencesContext";
import { api } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";

export default function NewsletterScreen() {
  const { user } = useAuth();
  const { currency } = useAppPreferences();
  const [email, setEmail] = useState(user?.email ?? "");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert("Email inválido", "Ingresa un correo válido.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.subscribeNewsletter(email.trim().toLowerCase(), city.trim(), currency);
      Alert.alert("Suscripción registrada", result.message);
    } catch (error) {
      Alert.alert("No pudimos suscribirte", error instanceof Error ? error.message : "Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Ionicons name="notifications-outline" size={46} color={colors.sky} />
        <Text style={styles.title}>Alertas de precios y ofertas</Text>
        <Text style={styles.copy}>Recibe novedades de Estadías Urbanas usando el mismo sistema de suscripción de la web.</Text>
      </View>
      <View style={styles.form}>
        <AppInput label="Correo electrónico" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <AppInput label="Ciudad de interés" icon="location-outline" value={city} onChangeText={setCity} placeholder="Santiago, Guatavita..." />
        <Text style={styles.consent}>Al suscribirte aceptas recibir alertas de precios, novedades y ofertas. Puedes solicitar la baja en cualquier momento.</Text>
        <AppButton label="Suscribirme" icon="notifications" loading={loading} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  title: { color: colors.surface, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  copy: { color: "#C8DBED", lineHeight: 22 },
  form: { marginTop: spacing.lg, gap: spacing.md },
  consent: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
