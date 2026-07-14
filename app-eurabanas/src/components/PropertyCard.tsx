import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadow, spacing } from "@/lib/theme";
import { Property } from "@/types";
import { useAppPreferences } from "@/context/AppPreferencesContext";

export function PropertyCard({ property, compact = false }: { property: Property; compact?: boolean }) {
  const { formatPrice, isFavorite, toggleFavorite } = useAppPreferences();
  const favorite = isFavorite(property.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${property.title}`}
      onPress={() => router.push({ pathname: "/property/[id]", params: { id: property.id } })}
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}
    >
      <Image source={{ uri: property.image }} style={[styles.image, compact && styles.imageCompact]} contentFit="cover" transition={250} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Quitar de guardados" : "Guardar alojamiento"}
        hitSlop={10}
        onPress={(event) => {
          event.stopPropagation();
          void toggleFavorite(property.id);
        }}
        style={styles.favorite}
      >
        <Ionicons name={favorite ? "heart" : "heart-outline"} size={22} color={favorite ? colors.danger : colors.navy} />
      </Pressable>
      <View style={styles.body}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.blue} />
          <Text numberOfLines={1} style={styles.location}>{property.city} · {property.location}</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>{property.title}</Text>
        <View style={styles.detailsRow}>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color="#F3A81B" />
            <Text style={styles.ratingText}>{property.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(property.priceUsd)}<Text style={styles.night}> / noche</Text></Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", width: 292, ...shadow },
  compact: { width: "100%", flexDirection: "row", minHeight: 132 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  image: { width: "100%", height: 174, backgroundColor: colors.surfaceMuted },
  imageCompact: { width: 132, height: "100%" },
  favorite: { position: "absolute", top: 10, right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  body: { flex: 1, padding: spacing.md, gap: spacing.sm },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  location: { color: colors.textMuted, fontSize: 13, flex: 1 },
  title: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: "800" },
  detailsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: colors.text, fontWeight: "700" },
  price: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  night: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
});
