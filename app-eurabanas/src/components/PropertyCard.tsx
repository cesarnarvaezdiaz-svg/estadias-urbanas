import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadow, spacing } from "@/lib/theme";
import { Property } from "@/types";

export function PropertyCard({ property, compact = false }: { property: Property; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${property.title}`}
      onPress={() => router.push({ pathname: "/property/[id]", params: { id: property.id } })}
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}
    >
      <Image source={{ uri: property.image }} style={[styles.image, compact && styles.imageCompact]} contentFit="cover" transition={250} />
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
          <Text style={styles.price}>USD ${property.priceUsd}<Text style={styles.night}> / noche</Text></Text>
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
