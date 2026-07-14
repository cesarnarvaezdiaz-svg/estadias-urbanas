import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { colors, spacing } from "@/lib/theme";

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.detail}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, detail, actionLabel, onAction }: { title: string; detail: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.state}>
      <Ionicons name="bed-outline" size={42} color={colors.sky} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "center" },
  detail: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 330 },
  action: { marginTop: spacing.sm, minWidth: 220 },
});
