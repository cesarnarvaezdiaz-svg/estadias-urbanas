import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { PropertyCard } from "@/components/PropertyCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useCatalog } from "@/hooks/useCatalog";
import { colors, radius, shadow, spacing } from "@/lib/theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const { properties, usingFallback } = useCatalog();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Image source={require("../../../assets/images/logo.png")} contentFit="contain" style={styles.logo} />
        <Pressable onPress={() => router.push(user ? "/(tabs)/account" : "/auth")} style={styles.avatar}>
          <Ionicons name={user ? "person" : "person-outline"} size={21} color={colors.navy} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.eyebrow}>CHILE · COLOMBIA · LATINOAMÉRICA</Text>
        <Text style={styles.heroTitle}>Tu próxima estadía empieza aquí.</Text>
        <Text style={styles.heroText}>Alojamientos urbanos seleccionados, reserva segura y beneficios en cada viaje.</Text>
        <AppButton label="Buscar alojamiento" icon="search" onPress={() => router.push("/(tabs)/search")} style={styles.heroButton} />
      </View>

      <View style={styles.trustRow}>
        {[
          ["shield-checkmark", "Pago seguro"],
          ["calendar", "Reserva real"],
          ["gift", "Suma puntos"],
        ].map(([icon, label]) => (
          <View key={label} style={styles.trustItem}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.blue} />
            <Text style={styles.trustText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionEyebrow}>SELECCIÓN URBANA</Text>
          <Text style={styles.sectionTitle}>Alojamientos destacados</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/search")}>
          <Text style={styles.link}>Ver todos</Text>
        </Pressable>
      </View>

      {usingFallback ? <Text style={styles.syncNotice}>Mostrando catálogo guardado. Se actualizará al recuperar conexión.</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
      </ScrollView>

      <View style={styles.clubCard}>
        <View style={styles.clubIcon}><Ionicons name="sparkles" size={24} color={colors.surface} /></View>
        <View style={styles.clubCopy}>
          <Text style={styles.clubTitle}>Club Estadías Urbanas</Text>
          <Text style={styles.clubText}>Acumula puntos, revisa tus reservas y accede a beneficios desde una sola cuenta.</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.sky} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, height: 70, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 178, height: 44 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
  hero: { marginHorizontal: spacing.md, backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg, minHeight: 300, overflow: "hidden", justifyContent: "center" },
  heroGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: colors.blue, opacity: 0.38, right: -90, top: -100 },
  eyebrow: { color: colors.sky, fontSize: 11, letterSpacing: 1.1, fontWeight: "900", marginBottom: spacing.sm },
  heroTitle: { color: colors.surface, fontSize: 35, lineHeight: 40, fontWeight: "900", maxWidth: 310 },
  heroText: { color: "#D7E8F8", fontSize: 15, lineHeight: 22, maxWidth: 310, marginTop: spacing.md },
  heroButton: { backgroundColor: colors.surface, marginTop: spacing.lg, alignSelf: "flex-start" },
  trustRow: { marginHorizontal: spacing.md, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", justifyContent: "space-between", ...shadow },
  trustItem: { alignItems: "center", gap: 5, flex: 1 },
  trustText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  sectionHead: { paddingHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sectionEyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 1, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 4 },
  link: { color: colors.blue, fontWeight: "800" },
  syncNotice: { marginHorizontal: spacing.md, marginBottom: spacing.sm, color: colors.warning, fontSize: 12 },
  cards: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
  clubCard: { margin: spacing.md, backgroundColor: colors.navyDark, borderRadius: radius.lg, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md },
  clubIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  clubCopy: { flex: 1, gap: 4 },
  clubTitle: { color: colors.surface, fontSize: 17, fontWeight: "900" },
  clubText: { color: "#C5D7EA", fontSize: 13, lineHeight: 18 },
});
