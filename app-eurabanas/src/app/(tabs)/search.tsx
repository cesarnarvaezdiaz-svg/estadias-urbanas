import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PropertyCard } from "@/components/PropertyCard";
import { Screen } from "@/components/Screen";
import { useCatalog } from "@/hooks/useCatalog";
import { colors, radius, spacing } from "@/lib/theme";

export default function SearchScreen() {
  const { properties } = useCatalog();
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return properties.filter((property) => {
      const matchesText = !needle || [property.title, property.city, property.country, property.location].some((value) => value.toLocaleLowerCase("es").includes(needle));
      return matchesText && property.maxGuests >= guests;
    });
  }, [guests, properties, query]);

  return (
    <Screen>
      <Text style={styles.eyebrow}>EXPLORA LATINOAMÉRICA</Text>
      <Text style={styles.title}>Encuentra tu estadía</Text>
      <Text style={styles.subtitle}>Busca por ciudad, alojamiento o ubicación.</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Buscar destino"
          value={query}
          onChangeText={setQuery}
          placeholder="Santiago, Guatavita..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.guestRow}>
        <View>
          <Text style={styles.guestLabel}>Huéspedes</Text>
          <Text style={styles.guestDetail}>Capacidad mínima requerida</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable onPress={() => setGuests((value) => Math.max(1, value - 1))} style={styles.step}><Ionicons name="remove" size={20} color={colors.navy} /></Pressable>
          <Text style={styles.stepValue}>{guests}</Text>
          <Pressable onPress={() => setGuests((value) => Math.min(12, value + 1))} style={styles.step}><Ionicons name="add" size={20} color={colors.navy} /></Pressable>
        </View>
      </View>

      <Text style={styles.results}>{filtered.length} {filtered.length === 1 ? "alojamiento" : "alojamientos"}</Text>
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
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: spacing.sm },
  searchBox: { marginTop: spacing.lg, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  guestRow: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  guestLabel: { color: colors.text, fontWeight: "800", fontSize: 15 },
  guestDetail: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  stepValue: { color: colors.text, fontWeight: "900", minWidth: 18, textAlign: "center" },
  results: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.md },
  list: { gap: spacing.md },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
});
