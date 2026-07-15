import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/lib/theme";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://www.facebook.com/v20.0/dialog/oauth",
  tokenEndpoint: "https://graph.facebook.com/v20.0/oauth/access_token",
};

function isConfigured(value: string) {
  return Boolean(value && !value.toLowerCase().includes("not-configured") && !value.toLowerCase().includes("client_id"));
}

export default function AuthScreen() {
  const { login, register, completeOAuth } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || googleClientId;
  const facebookClientId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "";
  const configuredGoogleId = useMemo(() => Platform.select({ ios: iosClientId, android: androidClientId, default: webClientId }) || "", [androidClientId, iosClientId, webClientId]);
  const facebookRedirectUri = AuthSession.makeRedirectUri({ scheme: "estadiasurbanas", path: "auth/facebook" });
  const googleReady = isConfigured(configuredGoogleId);
  const facebookReady = isConfigured(facebookClientId);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: googleClientId || "not-configured.apps.googleusercontent.com",
      iosClientId: iosClientId || "not-configured.apps.googleusercontent.com",
      androidClientId: androidClientId || "not-configured.apps.googleusercontent.com",
      webClientId: webClientId || "not-configured.apps.googleusercontent.com",
      selectAccount: true,
    },
    { scheme: "estadiasurbanas" },
  );
  const [facebookRequest, facebookResponse, promptFacebookAsync] = AuthSession.useAuthRequest(
    {
      clientId: facebookClientId || "not-configured",
      redirectUri: facebookRedirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: ["public_profile", "email"],
    },
    discovery,
  );

  useEffect(() => {
    if (response?.type !== "success") return;
    const identityToken = response.params.id_token || response.authentication?.idToken;
    if (!identityToken) return;
    setLoading("google");
    completeOAuth("google", { identity_token: identityToken })
      .then(() => router.back())
      .catch((cause) => Alert.alert("Google", cause instanceof Error ? cause.message : "No se pudo iniciar sesión."))
      .finally(() => setLoading(null));
  }, [completeOAuth, response]);

  useEffect(() => {
    if (facebookResponse?.type !== "success") return;
    const accessToken = facebookResponse.params.access_token || facebookResponse.authentication?.accessToken;
    if (!accessToken) return;
    setLoading("facebook");
    completeOAuth("facebook", { access_token: accessToken })
      .then(() => router.back())
      .catch((cause) => Alert.alert("Facebook", cause instanceof Error ? cause.message : "No se pudo iniciar sesión."))
      .finally(() => setLoading(null));
  }, [completeOAuth, facebookResponse]);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8) {
      Alert.alert("Revisa tus datos", "Ingresa un correo válido y una contraseña de al menos 8 caracteres.");
      return;
    }
    if (mode === "register" && name.trim().length < 2) {
      Alert.alert("Falta tu nombre", "Ingresa tu nombre para crear la cuenta.");
      return;
    }
    setLoading("form");
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password, phone);
      router.back();
    } catch (cause) {
      Alert.alert(mode === "login" ? "No pudimos iniciar sesión" : "No pudimos crear la cuenta", cause instanceof Error ? cause.message : "Intenta nuevamente.");
    } finally {
      setLoading(null);
    }
  }

  async function appleLogin() {
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.authorizationCode || !credential.identityToken) throw new Error("Apple no entregó una credencial válida.");
      await completeOAuth("apple", {
        authorization_code: credential.authorizationCode,
        identity_token: credential.identityToken,
        name: [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" "),
      });
      router.back();
    } catch (cause) {
      if ((cause as { code?: string }).code !== "ERR_REQUEST_CANCELED") Alert.alert("Apple", cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>UNA CUENTA, WEB Y APP</Text>
      <Text style={styles.title}>{mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}</Text>
      <Text style={styles.subtitle}>Tus reservas, pagos y puntos se guardan en la misma base de datos.</Text>

      <View style={styles.toggle}>
        {(["login", "register"] as const).map((item) => (
          <Pressable key={item} onPress={() => setMode(item)} style={[styles.toggleButton, mode === item && styles.toggleActive]}>
            <Text style={[styles.toggleText, mode === item && styles.toggleTextActive]}>{item === "login" ? "Ingresar" : "Registrarme"}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.form}>
        {mode === "register" ? <AppInput label="Nombre completo" icon="person-outline" value={name} onChangeText={setName} autoComplete="name" /> : null}
        <AppInput label="Correo" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        {mode === "register" ? <AppInput label="Celular" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" /> : null}
        <AppInput label="Contraseña" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <AppButton label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"} loading={loading === "form"} disabled={Boolean(loading)} onPress={() => void submit()} />
      </View>

      <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>o continúa con</Text><View style={styles.line} /></View>
      <View style={styles.social}>
        <AppButton
          label="Google"
          icon="logo-google"
          variant="ghost"
          loading={loading === "google"}
          disabled={Boolean(loading) || !request || !googleReady}
          onPress={() => {
            if (!googleReady) Alert.alert("Google pendiente", "Configura el Client ID real de Google para esta plataforma.");
            else void promptAsync();
          }}
        />
        <AppButton
          label="Facebook"
          icon="logo-facebook"
          variant="ghost"
          loading={loading === "facebook"}
          disabled={Boolean(loading) || !facebookRequest || !facebookReady}
          onPress={() => {
            if (!facebookReady) Alert.alert("Facebook pendiente", "Configura EXPO_PUBLIC_FACEBOOK_APP_ID y el proveedor en el servidor.");
            else void promptFacebookAsync();
          }}
        />
        {Platform.OS === "ios" ? <AppButton label="Apple" icon="logo-apple" variant="ghost" loading={loading === "apple"} disabled={Boolean(loading)} onPress={() => void appleLogin()} /> : null}
      </View>
      <View style={styles.validationCard}>
        <Text style={styles.validationTitle}>Validación de integraciones</Text>
        <Text style={styles.validationItem}>• Google: {googleReady ? "configurado para esta plataforma" : "pendiente de Client ID"}</Text>
        <Text style={styles.validationItem}>• Facebook: {facebookReady ? "App ID configurado" : "pendiente de App ID"}</Text>
        <Text style={styles.validationItem}>• Apple: disponible en iOS con credenciales del servidor</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 1, fontWeight: "900", marginTop: spacing.md },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm },
  toggle: { flexDirection: "row", backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 4, marginTop: spacing.lg },
  toggleButton: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { color: colors.textMuted, fontWeight: "700" },
  toggleTextActive: { color: colors.navy, fontWeight: "900" },
  form: { gap: spacing.md, marginTop: spacing.lg },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.lg },
  line: { height: 1, backgroundColor: colors.border, flex: 1 },
  or: { color: colors.textMuted, fontSize: 12 },
  social: { gap: spacing.sm },
  validationCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 4 },
  validationTitle: { color: colors.navy, fontWeight: "900" },
  validationItem: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
