import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { LoadingState } from "@/components/States";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/hooks/useAccount";
import { api } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { UserProfile } from "@/types";

const blank: UserProfile = { billing_name: "", document_id: "", phone: "", address: "", city: "", region: "", country: "", postal_code: "", preferred_payment: "", cardholder_name: "", card_last4: "" };

export default function ProfileScreen() {
  const { token } = useAuth();
  const { summary, loading, refresh } = useAccount();
  const [profile, setProfile] = useState<UserProfile>(blank);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof UserProfile) => (value: string) => setProfile((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (summary?.profile) setProfile({ ...blank, ...summary.profile });
  }, [summary?.profile]);

  if (loading && !summary) return <Screen scroll={false}><LoadingState label="Cargando tus datos..." /></Screen>;

  async function save() {
    if (!token) return;
    if (profile.card_last4 && !/^\d{4}$/.test(profile.card_last4)) {
      Alert.alert("Tarjeta inválida", "Ingresa solamente los últimos cuatro dígitos.");
      return;
    }
    setSaving(true);
    try {
      await api.profile(token, profile);
      await refresh();
      Alert.alert("Datos guardados", "Tu perfil quedó sincronizado con la misma cuenta de la web.");
    } catch (error) {
      Alert.alert("No pudimos guardar", error instanceof Error ? error.message : "Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Datos personales y de facturación</Text>
      <Text style={styles.copy}>Estos datos se guardan en tu perfil de Estadías Urbanas y se pueden reutilizar en próximas reservas.</Text>
      <View style={styles.form}>
        <AppInput label="Nombre o razón social" value={profile.billing_name} onChangeText={set("billing_name")} />
        <AppInput label="Documento / RUT" value={profile.document_id} onChangeText={set("document_id")} />
        <AppInput label="Teléfono" value={profile.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
        <AppInput label="Dirección" value={profile.address} onChangeText={set("address")} />
        <AppInput label="Ciudad" value={profile.city} onChangeText={set("city")} />
        <AppInput label="Región / Estado" value={profile.region} onChangeText={set("region")} />
        <AppInput label="País" value={profile.country} onChangeText={set("country")} />
        <AppInput label="Código postal" value={profile.postal_code} onChangeText={set("postal_code")} />
        <Text style={styles.section}>Preferencias de pago</Text>
        <AppInput label="Medio preferido" value={profile.preferred_payment} onChangeText={set("preferred_payment")} placeholder="Mercado Pago, transferencia..." />
        <AppInput label="Nombre del titular" value={profile.cardholder_name} onChangeText={set("cardholder_name")} />
        <AppInput label="Últimos cuatro dígitos" value={profile.card_last4} onChangeText={set("card_last4")} keyboardType="number-pad" maxLength={4} />
        <Text style={styles.security}>Nunca guardamos el número completo de una tarjeta ni su código de seguridad.</Text>
        <AppButton label="Guardar datos" icon="save-outline" loading={saving} onPress={() => void save()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: spacing.md },
  copy: { color: colors.textMuted, lineHeight: 22, marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.lg },
  section: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: spacing.md },
  security: { color: colors.success, fontSize: 12, lineHeight: 18 },
});
