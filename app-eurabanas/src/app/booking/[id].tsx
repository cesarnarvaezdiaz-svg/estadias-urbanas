import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { fallbackProperties } from "@/data/catalog";
import { addDaysIso, isIsoDate, nightsBetween, todayIso } from "@/lib/dates";
import { api } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";
import { BookingInput } from "@/types";

export default function BookingScreen() {
  const { id, option: optionId } = useLocalSearchParams<{ id: string; option?: string }>();
  const { user } = useAuth();
  const property = fallbackProperties.find((item) => item.id === id);
  const option = property?.options.find((item) => item.id === optionId) ?? property?.options[0];
  const [checkIn, setCheckIn] = useState(addDaysIso(todayIso(), 1));
  const [checkOut, setCheckOut] = useState(addDaysIso(todayIso(), 2));
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState<"reserve" | "payment" | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const nightlyPrice = option?.priceUsd ?? property?.priceUsd ?? 0;
  const total = useMemo(() => nights * nightlyPrice, [nightlyPrice, nights]);

  if (!property) return <Screen><Text>Alojamiento no encontrado.</Text></Screen>;
  const selectedProperty = property;

  function payload(): BookingInput | null {
    if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || nights < 1) {
      Alert.alert("Revisa las fechas", "Usa el formato AAAA-MM-DD y selecciona al menos una noche.");
      return null;
    }
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert("Faltan tus datos", "Ingresa tu nombre y un correo válido.");
      return null;
    }
    return {
      property: selectedProperty.title,
      title: option ? `${selectedProperty.title} ${option.title}` : selectedProperty.title,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      check_in: checkIn,
      check_out: checkOut,
      guests,
      nights,
      source: "app",
    };
  }

  async function reserve() {
    const input = payload();
    if (!input) return;
    setLoading("reserve");
    try {
      const availability = await api.availability(input);
      if (!availability.available) throw new Error(availability.message);
      const result = await api.createReservation(input);
      Alert.alert("Reserva creada", `${result.message}\n\nFolio: ${result.reservation_folio}`, [
        { text: "Ver mis reservas", onPress: () => router.replace("/(tabs)/reservations") },
      ]);
    } catch (cause) {
      Alert.alert("No pudimos reservar", cause instanceof Error ? cause.message : "Intenta nuevamente.");
    } finally {
      setLoading(null);
    }
  }

  async function pay() {
    const input = payload();
    if (!input) return;
    setLoading("payment");
    try {
      const availability = await api.availability(input);
      if (!availability.available) throw new Error(availability.message);
      const result = await api.createPayment(input);
      await WebBrowser.openBrowserAsync(result.init_point, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.navy,
      });
      router.replace({ pathname: "/payment-result", params: { hold: result.hold_token } });
    } catch (cause) {
      Alert.alert("No pudimos iniciar el pago", cause instanceof Error ? cause.message : "Intenta nuevamente.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Screen>
      <View style={styles.summary}>
        <Text style={styles.property}>{property.title}</Text>
        <Text style={styles.option}>{option?.title ?? property.type}</Text>
        <Text style={styles.price}>USD ${nightlyPrice} por noche</Text>
      </View>

      <Text style={styles.sectionTitle}>Fechas</Text>
      <View style={styles.twoColumns}>
        <View style={styles.column}><AppInput label="Entrada" value={checkIn} onChangeText={setCheckIn} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" /></View>
        <View style={styles.column}><AppInput label="Salida" value={checkOut} onChangeText={setCheckOut} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" /></View>
      </View>

      <View style={styles.guestRow}>
        <View>
          <Text style={styles.fieldLabel}>Huéspedes</Text>
          <Text style={styles.fieldHint}>Máximo {property.maxGuests}</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable onPress={() => setGuests((value) => Math.max(1, value - 1))} style={styles.step}><Ionicons name="remove" size={20} color={colors.navy} /></Pressable>
          <Text style={styles.stepValue}>{guests}</Text>
          <Pressable onPress={() => setGuests((value) => Math.min(property.maxGuests, value + 1))} style={styles.step}><Ionicons name="add" size={20} color={colors.navy} /></Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Datos del huésped</Text>
      <View style={styles.form}>
        <AppInput label="Nombre" icon="person-outline" value={name} onChangeText={setName} autoComplete="name" />
        <AppInput label="Correo" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <AppInput label="Celular" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      </View>

      <View style={styles.totalCard}>
        <View><Text style={styles.totalLabel}>{nights || 0} noche(s)</Text><Text style={styles.totalHint}>El precio final en CLP se confirma en Mercado Pago.</Text></View>
        <Text style={styles.total}>USD ${total}</Text>
      </View>

      <View style={styles.actions}>
        <AppButton label="Pagar con Mercado Pago" icon="card-outline" loading={loading === "payment"} disabled={Boolean(loading)} onPress={() => void pay()} />
        <AppButton label="Reservar y pagar después" variant="secondary" loading={loading === "reserve"} disabled={Boolean(loading)} onPress={() => void reserve()} />
      </View>
      <Text style={styles.secure}>Las fechas se bloquean en la misma base de datos utilizada por la web.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  property: { color: colors.surface, fontSize: 21, fontWeight: "900" },
  option: { color: "#D7E8F8", marginTop: 5 },
  price: { color: colors.sky, fontWeight: "900", marginTop: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: spacing.xl, marginBottom: spacing.md },
  twoColumns: { flexDirection: "row", gap: spacing.sm },
  column: { flex: 1 },
  guestRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { color: colors.text, fontWeight: "800" },
  fieldHint: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  step: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  stepValue: { color: colors.text, fontWeight: "900", fontSize: 17, minWidth: 18, textAlign: "center" },
  form: { gap: spacing.md },
  totalCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  totalLabel: { color: colors.text, fontWeight: "800" },
  totalHint: { color: colors.textMuted, fontSize: 11, maxWidth: 220, marginTop: 4 },
  total: { color: colors.navy, fontSize: 22, fontWeight: "900" },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  secure: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: spacing.md },
});
