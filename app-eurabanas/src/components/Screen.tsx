import { PropsWithChildren } from "react";
import { ScrollView, ScrollViewProps, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/lib/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
}>;

export function Screen({ children, scroll = true, padded = true, refreshControl }: Props) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={[styles.content, padded && styles.padded]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scroll, padded && styles.padded]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 120 },
  padded: { paddingHorizontal: spacing.md },
});
