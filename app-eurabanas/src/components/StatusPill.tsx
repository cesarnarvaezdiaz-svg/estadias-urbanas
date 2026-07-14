import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/theme";

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const kind = ["pagada", "confirmada", "approved"].includes(normalized)
    ? "success"
    : ["cancelada", "rechazada", "cancelled"].includes(normalized)
      ? "danger"
      : "warning";
  return (
    <View style={[styles.pill, styles[`${kind}Pill`]]}>
      <Text style={[styles.text, styles[`${kind}Text`]]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  text: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  successPill: { backgroundColor: colors.successSoft },
  successText: { color: colors.success },
  warningPill: { backgroundColor: colors.warningSoft },
  warningText: { color: colors.warning },
  dangerPill: { backgroundColor: colors.dangerSoft },
  dangerText: { color: colors.danger },
});
