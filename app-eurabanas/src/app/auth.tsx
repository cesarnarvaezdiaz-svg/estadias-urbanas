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

export default function AuthScreen() {
  const { login, register, completeOAuth } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || googleClientId;
  const configuredGoogleId = useMemo(() => Platform.select({ ios: iosClientId, android: androidClientId, default: webClientId }) || "", [androidClientId, iosClientId, webClientId]);
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


  async function facebookLogin() {
    if (!facebookAppId) {
      Alert.alert("Facebook pendiente", "Configura el App ID de Facebook para habilitar este acceso.");
      return;
    }
    setLoading("facebook");
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: "estadiasurbanas" });
      const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?${new URLSearchParams({
        client_id: facebookAppId,
        redirect_uri: redirectUri,
        response_type: "token",
        scope: "email,public_profile",
        display: Platform.OS === "web" ? "page" : "touch",
      }).toString()}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type !== "success") return;
      const tokenPart = result.url.split("#")[1] || result.url.split("?")[1] || "";
      const accessToken = (new URLSearchParams(tokenPart).get("access_token") || "").toString();
      if (!accessToken) throw new Error("Facebook no entregó una credencial válida.");
      await completeOAuth("facebook", { access_token: accessToken });
      router.back();
    } catch (cause) {
      Alert.alert("Facebook", cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
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
      <Text style={styles.subtitle}>Tus reservas y puntos se guardan en la misma base de datos.</Text>

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
          disabled={Boolean(loading) || !request || !configuredGoogleId}
          onPress={() => {
            if (!configuredGoogleId) Alert.alert("Google pendiente", "Configura el Client ID de Google para esta plataforma.");
            else void promptAsync();
          }}
        />
        <AppButton
          label="Facebook"
          icon="logo-facebook"
          variant="ghost"
          loading={loading === "facebook"}
          disabled={Boolean(loading) || !facebookAppId}
          onPress={() => void facebookLogin()}
        />
        {Platform.OS === "ios" ? <AppButton label="Apple" icon="logo-apple" variant="ghost" loading={loading === "apple"} disabled={Boolean(loading)} onPress={() => void appleLogin()} /> : null}
      </View>
      {!configuredGoogleId || !facebookAppId ? <Text style={styles.configNote}>Google y Facebook quedarán habilitados cuando agregues los Client ID/App ID reales para cada plataforma.</Text> : null}
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
  configNote: { color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: radius.md, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
});
