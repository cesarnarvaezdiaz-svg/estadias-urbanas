import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";
import { HostRequest } from "@/types";

const empty: HostRequest = { nombre: "", email: "", telefono: "", ciudad: "", tipo_vivienda: "", capacidad: "", direccion: "", mensaje: "", fotos_url: "", precio_noche: "" };

export default function HostRequestScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState<HostRequest>({ ...empty, nombre: user?.name ?? "", email: user?.email ?? "" });
  const [loading, setLoading] = useState(false);
  const set = (key: keyof HostRequest) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    const required: Array<keyof HostRequest> = ["nombre", "email", "telefono", "ciudad", "tipo_vivienda", "capacidad", "direccion", "mensaje"];
    if (required.some((key) => !form[key]?.trim())) {
      Alert.alert("Faltan datos", "Completa los datos del propietario y del inmueble.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.createHostRequest(form);
      Alert.alert("Solicitud enviada", `${result.message}\n\nNúmero de solicitud: ${result.id}`);
      setForm({ ...empty, nombre: user?.name ?? "", email: user?.email ?? "" });
    } catch (error) {
      Alert.alert("No pudimos enviarla", error instanceof Error ? error.message : "Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>ANFITRIONES</Text>
        <Text style={styles.title}>Publica tu alojamiento</Text>
        <Text style={styles.copy}>Envía la misma solicitud de evaluación disponible en la web. Quedará guardada en MySQL para revisión.</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.section}>Datos del propietario</Text>
        <AppInput label="Nombre completo" value={form.nombre} onChangeText={set("nombre")} autoComplete="name" />
        <AppInput label="Email" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
        <AppInput label="Teléfono / WhatsApp" value={form.telefono} onChangeText={set("telefono")} keyboardType="phone-pad" placeholder="+56 9 1234 5678" />
        <Text style={styles.section}>Datos del inmueble</Text>
        <AppInput label="Ciudad y comuna" value={form.ciudad} onChangeText={set("ciudad")} />
        <AppInput label="Tipo de vivienda" value={form.tipo_vivienda} onChangeText={set("tipo_vivienda")} placeholder="Departamento, casa, apart hotel..." />
        <AppInput label="Capacidad" value={form.capacidad} onChangeText={set("capacidad")} placeholder="2 habitaciones, 4 huéspedes" />
        <AppInput label="Dirección o sector" value={form.direccion} onChangeText={set("direccion")} />
        <AppInput label="Precio sugerido por noche (USD)" value={form.precio_noche} onChangeText={set("precio_noche")} keyboardType="decimal-pad" />
        <AppInput label="Enlaces de fotografías" value={form.fotos_url} onChangeText={set("fotos_url")} placeholder="Links separados por coma" />
        <AppInput label="Descripción del inmueble" value={form.mensaje} onChangeText={set("mensaje")} multiline numberOfLines={5} style={styles.multiline} />
        <AppButton label="Enviar solicitud" icon="send" loading={loading} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.cyan, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 5 },
  copy: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.lg },
  section: { color: colors.text, fontSize: 19, fontWeight: "900", marginTop: spacing.sm },
  multiline: { minHeight: 110, textAlignVertical: "top" },
});
