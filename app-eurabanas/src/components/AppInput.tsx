import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
};

export const AppInput = forwardRef<TextInput, Props>(function AppInput({ label, icon, error, style, ...props }, ref) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {icon ? <Ionicons name={icon} size={19} color={colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.blue}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { color: colors.text, fontWeight: "700", fontSize: 14 },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  error: { color: colors.danger, fontSize: 12 },
});
