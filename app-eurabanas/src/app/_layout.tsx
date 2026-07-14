import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@/context/AuthContext";
import { AppPreferencesProvider } from "@/context/AppPreferencesContext";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") document.body.style.backgroundColor = colors.background;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppPreferencesProvider>
          <StatusBar style="dark" />
          <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.navy,
            headerTitleStyle: { fontWeight: "800" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="property/[id]" options={{ title: "Alojamiento" }} />
          <Stack.Screen name="booking/[id]" options={{ title: "Tu reserva", presentation: "card" }} />
          <Stack.Screen name="auth" options={{ title: "Tu cuenta", presentation: "modal" }} />
          <Stack.Screen name="payment-result" options={{ title: "Estado del pago", presentation: "modal" }} />
          <Stack.Screen name="profile" options={{ title: "Datos personales" }} />
          <Stack.Screen name="host-request" options={{ title: "Publica tu alojamiento" }} />
          <Stack.Screen name="newsletter" options={{ title: "Alertas y ofertas" }} />
          <Stack.Screen name="information" options={{ title: "Información" }} />
          <Stack.Screen name="preferences" options={{ title: "Preferencias" }} />
        </Stack>
        </AppPreferencesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
