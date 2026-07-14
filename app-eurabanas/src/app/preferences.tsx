import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { CurrencyCode, useAppPreferences } from "@/context/AppPreferencesContext";
import { colors, radius, spacing } from "@/lib/theme";

const currencies: Array<{ code: CurrencyCode; name: string }> = [
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "CLP", name: "Peso chileno" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "COP", name: "Peso colombiano" },
];

export default function PreferencesScreen() {
  const { currency, setCurrency } = useAppPreferences();
  return (
    <Screen>
      <Text style={styles.title}>Moneda de visualización</Text>
      <Text style={styles.copy}>Los precios se convierten con las mismas tasas referenciales de la web. El monto definitivo se confirma antes del pago.</Text>
      <View style={styles.list}>
        {currencies.map((item) => {
          const active = item.code === currency;
          return (
            <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => void setCurrency(item.code)} style={[styles.option, active && styles.optionActive]}>
              <View><Text style={[styles.code, active && styles.activeText]}>{item.code}</Text><Text style={[styles.name, active && styles.activeSubtext]}>{item.name}</Text></View>
              <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.dot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: spacing.md },
  copy: { color: colors.textMuted, lineHeight: 22, marginTop: spacing.sm },
  list: { gap: spacing.sm, marginTop: spacing.lg },
  option: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  code: { color: colors.text, fontWeight: "900", fontSize: 17 },
  name: { color: colors.textMuted, marginTop: 3 },
  activeText: { color: colors.surface },
  activeSubtext: { color: "#C6D9EA" },
  radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.sky },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.sky },
});
