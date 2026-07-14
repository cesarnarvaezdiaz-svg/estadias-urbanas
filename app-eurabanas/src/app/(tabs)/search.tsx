import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppInput } from "@/components/AppInput";
import { PropertyCard } from "@/components/PropertyCard";
import { Screen } from "@/components/Screen";
import { useCatalog } from "@/hooks/useCatalog";
import { addDaysIso, isIsoDate, todayIso } from "@/lib/dates";
import { colors, radius, spacing } from "@/lib/theme";
import { Property } from "@/types";

function firstNumber(value: string) {
  return Number(value.match(/\d+/)?.[0] ?? 0);
}

function capacity(property: Property, field: "rooms" | "beds") {
  return Math.max(1, ...property.options.map((option) => firstNumber(option[field])));
}

function Stepper({ label, detail, value, minimum, maximum, onChange }: { label: string; detail: string; value: number; minimum: number; maximum: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperCopy}>
        <Text style={styles.guestLabel}>{label}</Text>
        <Text style={styles.guestDetail}>{detail}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable accessibilityLabel={`Reducir ${label}`} onPress={() => onChange(Math.max(minimum, value - 1))} style={styles.step}>
          <Ionicons name="remove" size={20} color={colors.navy} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable accessibilityLabel={`Aumentar ${label}`} onPress={() => onChange(Math.min(maximum, value + 1))} style={styles.step}>
          <Ionicons name="add" size={20} color={colors.navy} />
        </Pressable>
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const { properties } = useCatalog();
  const [query, setQuery] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [maxPrice, setMaxPrice] = useState("");
  const [type, setType] = useState("");
  const [checkIn, setCheckIn] = useState(todayIso());
  const [checkOut, setCheckOut] = useState(addDaysIso(todayIso(), 1));
  const [expanded, setExpanded] = useState(false);

  const types = useMemo(() => [...new Set(properties.map((property) => property.type))], [properties]);
  const datesValid = isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut > checkIn && checkIn >= todayIso();

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    const guests = adults + children;
    const priceLimit = Number(maxPrice || 0);
    return properties.filter((property) => {
      const matchesText = !needle || [property.title, property.city, property.country, property.location].some((value) => value.toLocaleLowerCase("es").includes(needle));
      const matchesType = !type || property.type === type;
      const matchesPrice = !priceLimit || property.priceUsd <= priceLimit;
      return matchesText && matchesType && matchesPrice && property.maxGuests >= guests && capacity(property, "rooms") >= rooms && capacity(property, "beds") >= beds;
    });
  }, [adults, beds, children, maxPrice, properties, query, rooms, type]);

  function resetFilters() {
    setQuery("");
    setAdults(2);
    setChildren(0);
    setRooms(1);
    setBeds(1);
    setMaxPrice("");
    setType("");
    setCheckIn(todayIso());
    setCheckOut(addDaysIso(todayIso(), 1));
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>EXPLORA LATINOAMÉRICA</Text>
      <Text style={styles.title}>Encuentra tu estadía</Text>
      <Text style={styles.subtitle}>Filtra por destino, fechas, huéspedes, habitaciones, camas, tipo y precio.</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput accessibilityLabel="Buscar destino" value={query} onChangeText={setQuery} placeholder="Santiago, Guatavita..." placeholderTextColor={colors.textMuted} style={styles.searchInput} />
      </View>

      <View style={styles.dateGrid}>
        <View style={styles.dateField}><AppInput label="Entrada" icon="calendar-outline" value={checkIn} onChangeText={setCheckIn} placeholder="AAAA-MM-DD" autoCapitalize="none" error={!datesValid ? "Revisa las fechas" : undefined} /></View>
        <View style={styles.dateField}><AppInput label="Salida" icon="calendar-outline" value={checkOut} onChangeText={setCheckOut} placeholder="AAAA-MM-DD" autoCapitalize="none" /></View>
      </View>

      <View style={styles.filterCard}>
        <Stepper label="Adultos" detail="Mayores de 12 años" value={adults} minimum={1} maximum={20} onChange={setAdults} />
        <Stepper label="Niños" detail="Hasta 12 años" value={children} minimum={0} maximum={12} onChange={setChildren} />
        {expanded ? (
          <>
            <Stepper label="Habitaciones" detail="Cantidad mínima" value={rooms} minimum={1} maximum={10} onChange={setRooms} />
            <Stepper label="Camas" detail="Cantidad mínima" value={beds} minimum={1} maximum={20} onChange={setBeds} />
            <AppInput label="Precio máximo por noche (USD)" icon="cash-outline" value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" placeholder="Sin límite" />
            <Text style={styles.filterLabel}>Tipo de alojamiento</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setType("")} style={[styles.chip, !type && styles.chipActive]}><Text style={[styles.chipText, !type && styles.chipTextActive]}>Todos</Text></Pressable>
              {types.map((item) => <Pressable key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.chipActive]}><Text style={[styles.chipText, type === item && styles.chipTextActive]}>{item}</Text></Pressable>)}
            </View>
          </>
        ) : null}
        <Pressable onPress={() => setExpanded((value) => !value)} style={styles.expandButton}>
          <Text style={styles.expandText}>{expanded ? "Ocultar filtros" : "Más filtros"}</Text>
          <Ionicons name={expanded ? "chevron-up" : "options-outline"} size={18} color={colors.blue} />
        </Pressable>
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.results}>{filtered.length} {filtered.length === 1 ? "alojamiento" : "alojamientos"}</Text>
        <Pressable onPress={resetFilters}><Text style={styles.reset}>Limpiar</Text></Pressable>
      </View>
      <View style={styles.list}>
        {filtered.map((property) => <PropertyCard key={property.id} property={property} compact />)}
        {!filtered.length ? <Text style={styles.empty}>No encontramos alojamientos para esos filtros.</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 1, fontWeight: "900", marginTop: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  searchBox: { marginTop: spacing.lg, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  dateGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  dateField: { flex: 1 },
  filterCard: { marginTop: spacing.md, padding: spacing.md, gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  stepperCopy: { flex: 1 },
  guestLabel: { color: colors.text, fontWeight: "800", fontSize: 15 },
  guestDetail: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  stepValue: { color: colors.text, fontWeight: "900", minWidth: 18, textAlign: "center" },
  filterLabel: { color: colors.text, fontWeight: "800", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { borderColor: colors.navy, backgroundColor: colors.navy },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: colors.surface },
  expandButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingTop: spacing.xs },
  expandText: { color: colors.blue, fontWeight: "800" },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.md },
  results: { color: colors.text, fontSize: 16, fontWeight: "800" },
  reset: { color: colors.blue, fontWeight: "800" },
  list: { gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
});
