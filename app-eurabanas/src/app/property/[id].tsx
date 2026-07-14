import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/AppButton";
import { EmptyState } from "@/components/States";
import { fallbackProperties } from "@/data/catalog";
import { colors, radius, shadow, spacing } from "@/lib/theme";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = fallbackProperties.find((item) => item.id === id);

  if (!property) return <SafeAreaView style={styles.safe}><EmptyState title="Alojamiento no encontrado" detail="Este alojamiento ya no está disponible en el catálogo." actionLabel="Volver a buscar" onAction={() => router.replace("/(tabs)/search")} /></SafeAreaView>;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {property.gallery.map((image) => <Image key={image} source={{ uri: image }} contentFit="cover" style={styles.heroImage} transition={200} />)}
        </ScrollView>
        <View style={styles.body}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={18} color={colors.blue} />
            <Text style={styles.location}>{property.city} · {property.location} · {property.country}</Text>
          </View>
          <Text style={styles.title}>{property.title}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={17} color="#F3A81B" />
            <Text style={styles.rating}>{property.rating.toFixed(1)} · {property.reviewCount} comentarios</Text>
          </View>
          <Text style={styles.description}>{property.description}</Text>

          <Text style={styles.sectionTitle}>Lo que ofrece</Text>
          <View style={styles.amenities}>
            {property.amenities.map((amenity) => (
              <View key={amenity} style={styles.amenity}>
                <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>

          {property.options.length ? (
            <>
              <Text style={styles.sectionTitle}>Tipos de departamento</Text>
              <View style={styles.options}>
                {property.options.map((option) => (
                  <View key={option.id} style={styles.option}>
                    <View style={styles.optionTop}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionPrice}>USD ${option.priceUsd}</Text>
                    </View>
                    <Text style={styles.optionMeta}>{option.occupancy} · {option.rooms} · {option.baths}</Text>
                    <AppButton label="Elegir" variant="secondary" onPress={() => router.push({ pathname: "/booking/[id]", params: { id: property.id, option: option.id } })} />
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View>
          <Text style={styles.from}>Desde</Text>
          <Text style={styles.footerPrice}>USD ${property.priceUsd}<Text style={styles.perNight}> / noche</Text></Text>
        </View>
        <AppButton label="Reservar" onPress={() => router.push({ pathname: "/booking/[id]", params: { id: property.id } })} style={styles.reserveButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 120 },
  heroImage: { width: 390, maxWidth: "100%", height: 280, backgroundColor: colors.surfaceMuted },
  body: { padding: spacing.md },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  location: { color: colors.textMuted, flex: 1 },
  title: { color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: "900", marginTop: spacing.sm },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  rating: { color: colors.text, fontWeight: "700" },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginTop: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: spacing.xl, marginBottom: spacing.md },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  amenity: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  amenityText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  options: { gap: spacing.md },
  option: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow },
  optionTop: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  optionTitle: { color: colors.text, fontWeight: "900", flex: 1, lineHeight: 20 },
  optionPrice: { color: colors.blue, fontWeight: "900" },
  optionMeta: { color: colors.textMuted, fontSize: 13 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  from: { color: colors.textMuted, fontSize: 12 },
  footerPrice: { color: colors.navy, fontSize: 20, fontWeight: "900" },
  perNight: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
  reserveButton: { minWidth: 150 },
});
