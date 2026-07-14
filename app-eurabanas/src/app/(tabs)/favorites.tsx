import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { PropertyCard } from "@/components/PropertyCard";
import { Screen } from "@/components/Screen";
import { useAppPreferences } from "@/context/AppPreferencesContext";
import { useCatalog } from "@/hooks/useCatalog";
import { colors, spacing } from "@/lib/theme";

export default function FavoritesScreen() {
  const { favoriteIds } = useAppPreferences();
  const { properties } = useCatalog();
  const favorites = properties.filter((property) => favoriteIds.includes(property.id));

  return (
    <Screen>
      <Text style={styles.eyebrow}>TU PRÓXIMO VIAJE</Text>
      <Text style={styles.title}>Alojamientos guardados</Text>
      <Text style={styles.subtitle}>Tus favoritos quedan guardados de forma segura en este dispositivo.</Text>
      {favorites.length ? (
        <View style={styles.list}>
          {favorites.map((property) => <PropertyCard key={property.id} property={property} compact />)}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={colors.sky} />
          <Text style={styles.emptyTitle}>Todavía no guardaste alojamientos</Text>
          <Text style={styles.emptyText}>Toca el corazón de una propiedad para encontrarla rápidamente aquí.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 1, fontWeight: "900", marginTop: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  list: { gap: spacing.md, marginTop: spacing.lg },
  empty: { minHeight: 430, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: "900", textAlign: "center" },
  emptyText: { color: colors.textMuted, lineHeight: 21, textAlign: "center" },
});
