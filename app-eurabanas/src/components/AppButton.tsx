import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({ label, onPress, icon, variant = "primary", loading, disabled, style }: Props) {
  const inactive = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? colors.surface : colors.navy} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={variant === "primary" || variant === "danger" ? colors.surface : colors.navy} /> : null}
          <Text style={[styles.label, variant !== "primary" && variant !== "danger" && styles.labelDark]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.cyan, borderWidth: 1, borderColor: colors.sky },
  ghost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  label: { color: colors.surface, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  labelDark: { color: colors.navy },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
